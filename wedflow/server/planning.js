import { durationHours, overlaps, windowsCover, toMinutes } from '../public/js/lib/time.js';
import { HttpError, round2 } from './util.js';

export function getCompany(db, cid) {
  return db.get('SELECT * FROM companies WHERE id = ?', cid);
}

/**
 * Tarifa vigente para un trabajador en una función y fecha.
 * Prioridad: tarifa propia del trabajador para esa función > tarifa propia general
 * > tarifa de la función diferenciada por tipo y categoría de evento > por categoría
 * > por tipo > tarifa general de la función. Si no hay ninguna vigente, devuelve null:
 * el sistema no inventa tarifas.
 */
export function resolveRate(db, cid, { workerId = null, roleId, date, eventTypeId = null, categoryId = null }) {
  const rows = db.all(
    `SELECT r.*, ro.name AS role_name FROM rates r LEFT JOIN roles ro ON ro.id = r.role_id
      WHERE r.company_id = ? AND r.valid_from <= ? AND (r.valid_to IS NULL OR r.valid_to >= ?)
        AND ((r.worker_id IS NULL AND r.role_id = ?) OR (r.worker_id = ? AND (r.role_id IS NULL OR r.role_id = ?)))`,
    cid, date, date, roleId, workerId ?? -1, roleId,
  );
  let best = null;
  let bestScore = -1;
  for (const r of rows) {
    if (r.event_type_id && r.event_type_id !== eventTypeId) continue;
    if (r.category_id && r.category_id !== categoryId) continue;
    let score = 0;
    if (r.worker_id) score += 100 + (r.role_id ? 50 : 0);
    if (r.event_type_id) score += 10;
    if (r.category_id) score += 20;
    // A igual especificidad gana la vigencia más reciente.
    if (score > bestScore || (score === bestScore && r.valid_from > best.valid_from)) {
      best = r;
      bestScore = score;
    }
  }
  if (!best) return null;
  return {
    rate_id: best.id,
    amount: best.amount,
    unit: best.unit,
    overtime_hourly: best.overtime_hourly,
    source: best.worker_id ? 'trabajador' : 'funcion',
    valid_from: best.valid_from,
    valid_to: best.valid_to,
    differentiated: Boolean(best.event_type_id || best.category_id),
  };
}

/** Costo de un turno: tarifa por turno (o por hora) y, solo si la empresa la configuró, tarifa de hora extra. */
export function shiftCost(rate, hours, refHours) {
  const base = rate.unit === 'hora' ? rate.amount * hours : rate.amount;
  const extraHours = Math.max(0, round2(hours - refHours));
  let overtime = 0;
  let note = null;
  if (extraHours > 0) {
    if (rate.overtime_hourly != null) overtime = extraHours * rate.overtime_hourly;
    else note = 'Supera la duración de referencia y no hay tarifa de hora extra configurada: no se suma costo adicional.';
  }
  return { base: round2(base), overtime: round2(overtime), extraHours, total: round2(base + overtime), note };
}

/** Reúne todo lo necesario para planificar un evento de la empresa. */
export function loadEventContext(db, cid, eventId) {
  const company = getCompany(db, cid);
  const event = db.get(
    `SELECT e.*, c.name AS category_name, t.name AS type_name FROM events e
       LEFT JOIN event_categories c ON c.id = e.category_id
       LEFT JOIN event_types t ON t.id = e.event_type_id
      WHERE e.id = ? AND e.company_id = ?`,
    eventId, cid,
  );
  if (!event) throw new HttpError(404, 'El evento no existe en tu empresa.');
  const roles = db.all('SELECT * FROM roles WHERE company_id = ? ORDER BY sort_order, name', cid);
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const shifts = db
    .all('SELECT * FROM shifts WHERE event_id = ? AND company_id = ? ORDER BY start_at, role_id, id', eventId, cid)
    .map((s) => ({ ...s, role_name: roleById.get(s.role_id)?.name, hours: round2(durationHours(s.start_at, s.end_at)) }));
  const requirements = db
    .all('SELECT role_id, min_count FROM event_roles WHERE event_id = ? AND company_id = ?', eventId, cid)
    .map((r) => ({ ...r, role_name: roleById.get(r.role_id)?.name }));
  const workers = db.all('SELECT * FROM workers WHERE company_id = ? ORDER BY id', cid);
  const workerRoles = db.all('SELECT * FROM worker_roles WHERE company_id = ?', cid);
  const avail = db.all('SELECT * FROM availability WHERE company_id = ?', cid);
  // Asignaciones vigentes de otros eventos (plan oficial de cada uno, sin cancelados).
  const other = db.all(
    `SELECT a.worker_id, s.start_at, s.end_at, e.id AS event_id, e.name AS event_name
       FROM assignments a JOIN shifts s ON s.id = a.shift_id JOIN events e ON e.id = a.event_id
      WHERE a.company_id = ? AND e.id <> ? AND a.plan = e.official_plan AND e.status <> 'cancelado'`,
    cid, eventId,
  );
  for (const w of workers) {
    w.roles = workerRoles.filter((x) => x.worker_id === w.id);
    w.windows = avail.filter((a) => a.worker_id === w.id);
    w.busy = other.filter((o) => o.worker_id === w.id);
  }
  return { company, event, roles, roleById, shifts, requirements, workers, refHours: company.shift_reference_hours };
}

/** ¿Puede el trabajador cubrir el turno? Devuelve { ok, reasons, cost }. */
export function checkEligibility(db, ctx, worker, shift) {
  const reasons = [];
  if (worker.status === 'inactivo') reasons.push('Trabajador inactivo.');
  if (worker.status === 'ocupado') reasons.push('Estado «ocupado»: no recibe asignaciones nuevas.');
  const roleName = shift.role_name || 'la función';
  const wr = worker.roles.find((r) => r.role_id === shift.role_id && r.authorized);
  const isPrimary = worker.primary_role_id === shift.role_id;
  if (!wr && !isPrimary) reasons.push(`Sin competencia autorizada para ${roleName}.`);
  else if (!isPrimary && !ctx.company.allow_multi_role) reasons.push('La empresa no autoriza asignar funciones distintas a la principal.');
  if (!windowsCover(worker.windows, shift)) reasons.push('Sin disponibilidad registrada para todo el horario del turno.');
  const clash = worker.busy.find((b) => overlaps(b, shift));
  if (clash) reasons.push(`Asignado en un horario que se cruza: «${clash.event_name}».`);
  const rate = resolveRate(db, ctx.company.id, {
    workerId: worker.id,
    roleId: shift.role_id,
    date: ctx.event.date,
    eventTypeId: ctx.event.event_type_id,
    categoryId: ctx.event.category_id,
  });
  if (!rate) reasons.push(`Sin tarifa vigente para ${roleName} en la fecha del evento.`);
  const cost = rate ? shiftCost(rate, shift.hours, ctx.refHours) : null;
  return { ok: reasons.length === 0, reasons, cost, rate };
}

export function eligibilityMatrix(db, ctx) {
  const perShift = new Map();
  for (const s of ctx.shifts) {
    const candidates = [];
    const excluded = [];
    for (const w of ctx.workers) {
      const r = checkEligibility(db, ctx, w, s);
      if (r.ok) candidates.push({ worker: w, cost: r.cost, rate: r.rate });
      else if (w.status !== 'inactivo') excluded.push({ worker: w, reasons: r.reasons });
    }
    perShift.set(s.id, { shift: s, candidates, excluded });
  }
  return perShift;
}

/** Requerimiento mínimo por función para el evento (funciones requeridas del evento). */
export function roleRequirements(ctx) {
  const map = new Map();
  for (const r of ctx.requirements) if (r.min_count > 0) map.set(r.role_id, r.min_count);
  return map;
}

/** Costo base de referencia: cantidad requerida por turno × tarifa general de la función. */
export function referenceCost(db, ctx) {
  let total = 0;
  const missing = [];
  for (const s of ctx.shifts) {
    const rate = resolveRate(db, ctx.company.id, { roleId: s.role_id, date: ctx.event.date, eventTypeId: ctx.event.event_type_id, categoryId: ctx.event.category_id });
    if (!rate) {
      missing.push(s.role_name);
      continue;
    }
    total += shiftCost(rate, s.hours, ctx.refHours).total * s.quantity;
  }
  return { total: round2(total), missing: [...new Set(missing)] };
}

/**
 * Evalúa un plan (lista de {shift_id, worker_id}) contra todas las restricciones.
 * Se usa tanto para la programación manual como para verificar la solución del modelo.
 */
export function evaluatePlan(db, ctx, plan) {
  const shiftById = new Map(ctx.shifts.map((s) => [s.id, s]));
  const workerById = new Map(ctx.workers.map((w) => [w.id, w]));
  const rows = [];
  const conflicts = [];
  const alerts = [];
  const perWorker = new Map();
  for (const a of plan) {
    const s = shiftById.get(a.shift_id);
    const w = workerById.get(a.worker_id);
    if (!s || !w) continue;
    const el = checkEligibility(db, ctx, w, s);
    const issues = el.reasons.filter((r) => !r.startsWith('Sin tarifa'));
    const row = {
      shift_id: s.id, worker_id: w.id, worker_name: w.full_name, role_id: s.role_id, role_name: s.role_name,
      start_at: s.start_at, end_at: s.end_at, hours: s.hours,
      cost: el.cost?.total ?? 0, cost_detail: el.cost, rate_source: el.rate?.source ?? null,
      issues,
    };
    if (!el.rate) row.issues.push('Sin tarifa vigente: costo no calculado.');
    rows.push(row);
    if (!perWorker.has(w.id)) perWorker.set(w.id, []);
    perWorker.get(w.id).push(row);
  }
  // Cruces dentro del mismo plan y límites por trabajador.
  for (const [wid, list] of perWorker) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (overlaps(list[i], list[j])) {
          const msg = `Cruce de horario con otro turno del mismo evento (${list[j].role_name}).`;
          list[i].issues.push(msg);
          list[j].issues.push(`Cruce de horario con otro turno del mismo evento (${list[i].role_name}).`);
        }
      }
    }
    const max = ctx.company.max_shifts_per_worker_event;
    if (max && list.length > max) for (const r of list) r.issues.push(`Supera el máximo de ${max} turno(s) por trabajador en un evento.`);
    const totalH = list.reduce((acc, r) => acc + r.hours, 0);
    if (ctx.company.enforce_max_hours && ctx.company.max_hours_per_worker_event && totalH > ctx.company.max_hours_per_worker_event) {
      for (const r of list) r.issues.push(`Supera el máximo de ${ctx.company.max_hours_per_worker_event} h por trabajador en el evento.`);
    }
    if (totalH > ctx.refHours) {
      alerts.push({ type: 'horas', worker_id: wid, message: `${workerById.get(wid).full_name}: ${round2(totalH)} h programadas, supera la referencia de ${ctx.refHours} h.` });
    }
  }
  for (const r of rows) {
    r.issues = [...new Set(r.issues)];
    if (r.issues.length) conflicts.push({ worker_id: r.worker_id, worker_name: r.worker_name, shift_id: r.shift_id, role_name: r.role_name, issues: r.issues });
    if (r.cost_detail?.note) alerts.push({ type: 'hora_extra', worker_id: r.worker_id, message: `${r.worker_name} (${r.role_name}): ${r.cost_detail.note}` });
  }
  for (const s of ctx.shifts) {
    if (s.hours > ctx.refHours) alerts.push({ type: 'turno_largo', shift_id: s.id, message: `Turno de ${s.role_name} (${s.hours} h) supera la duración de referencia de ${ctx.refHours} h.` });
  }

  // Cobertura (PC) en persona-hora: solo cuentan asignaciones válidas, sin exceder lo requerido por turno.
  let required = 0;
  let covered = 0;
  const shiftCoverage = ctx.shifts.map((s) => {
    const valid = rows.filter((r) => r.shift_id === s.id && r.issues.length === 0).length;
    const total = rows.filter((r) => r.shift_id === s.id).length;
    required += s.quantity * s.hours;
    covered += Math.min(valid, s.quantity) * s.hours;
    return { shift_id: s.id, role_name: s.role_name, start_at: s.start_at, end_at: s.end_at, required: s.quantity, assigned: total, valid };
  });
  const reqs = roleRequirements(ctx);
  const byRole = ctx.roles
    .map((role) => {
      const assigned = rows.filter((r) => r.role_id === role.id).length;
      const valid = rows.filter((r) => r.role_id === role.id && r.issues.length === 0).length;
      const shiftDemand = ctx.shifts.filter((s) => s.role_id === role.id).reduce((a, s) => a + s.quantity, 0);
      const minimum = Math.max(reqs.get(role.id) || 0);
      return {
        role_id: role.id, role_name: role.name, minimum, shift_demand: shiftDemand, assigned, valid,
        cost: round2(rows.filter((r) => r.role_id === role.id).reduce((a, r) => a + r.cost, 0)),
      };
    })
    .filter((r) => r.minimum || r.shift_demand || r.assigned);
  const totalCost = round2(rows.reduce((a, r) => a + r.cost, 0));
  const minTotal = byRole.reduce((a, r) => a + Math.max(r.minimum, r.shift_demand), 0);
  const extraHours = round2(rows.reduce((a, r) => a + (r.cost_detail?.extraHours || 0), 0));
  return {
    rows,
    total_cost: totalCost,
    by_role: byRole,
    shift_coverage: shiftCoverage,
    coverage_pct: required ? round2((covered / required) * 100) : 0,
    staff_assigned: rows.length,
    staff_minimum: minTotal,
    staff_difference: rows.length - minTotal,
    conflicts,
    alerts,
    extra_hours: extraHours,
    activities: activityPresence(db, ctx, rows),
  };
}

/** Personal presente durante cada actividad del evento (restricción G, informativa). */
function activityPresence(db, ctx, rows) {
  const acts = db.all('SELECT * FROM event_activities WHERE event_id = ? AND company_id = ? ORDER BY start_at', ctx.event.id, ctx.company.id);
  return acts.map((a) => {
    const present = rows.filter((r) => r.issues.length === 0 && overlaps(r, a));
    const byRole = {};
    for (const r of present) byRole[r.role_name] = (byRole[r.role_name] || 0) + 1;
    // ¿Hay algún momento de la actividad sin nadie presente?
    const points = [toMinutes(a.start_at), ...present.map((r) => toMinutes(r.end_at))].filter((p) => p >= toMinutes(a.start_at) && p < toMinutes(a.end_at));
    const uncovered = points.some((p) => !present.some((r) => toMinutes(r.start_at) <= p && toMinutes(r.end_at) > p));
    return { id: a.id, name: a.name, start_at: a.start_at, end_at: a.end_at, staff: present.length, by_role: byRole, gap: uncovered };
  });
}

/**
 * Programación convencional simulada: recorre los turnos en orden y toma, para cada uno,
 * los primeros trabajadores elegibles por orden de registro, sin considerar el costo.
 * Es una regla automática (no una optimización) y así se identifica en los resultados.
 */
export function conventionalRule(ctx, elig) {
  const plan = [];
  const taken = new Map();
  const maxShifts = ctx.company.max_shifts_per_worker_event || Infinity;
  const canTake = (w, s) => {
    const list = taken.get(w.id) || [];
    return list.length < maxShifts && !list.some((x) => overlaps(x, s));
  };
  const reqs = roleRequirements(ctx);
  const addTo = (s, n) => {
    let added = 0;
    for (const c of elig.get(s.id).candidates) {
      if (added >= n) break;
      if (plan.some((p) => p.shift_id === s.id && p.worker_id === c.worker.id)) continue;
      if (!canTake(c.worker, s)) continue;
      plan.push({ shift_id: s.id, worker_id: c.worker.id });
      taken.set(c.worker.id, [...(taken.get(c.worker.id) || []), s]);
      added++;
    }
    return added;
  };
  for (const s of ctx.shifts) addTo(s, s.quantity);
  // Si el mínimo por función supera la suma de los turnos, completa en los turnos de esa función.
  for (const [roleId, min] of reqs) {
    let have = plan.filter((p) => ctx.shifts.find((s) => s.id === p.shift_id)?.role_id === roleId).length;
    for (const s of ctx.shifts.filter((x) => x.role_id === roleId)) {
      if (have >= min) break;
      have += addTo(s, min - have);
    }
  }
  return plan;
}

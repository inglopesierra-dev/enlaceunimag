import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { h, validate, HttpError, audit, insertSql, updateSql, own, round2 } from '../util.js';
import { buildInterval, addDays, toMinutes, fromMinutes, durationHours } from '../../public/js/lib/time.js';
import { loadEventContext, eligibilityMatrix, evaluatePlan, checkEligibility, referenceCost } from '../planning.js';
import { optimize } from '../optimizer.js';
import { loadCaseShifts } from '../seed.js';

const eventSpec = {
  name: { type: 'string', required: true, label: 'El nombre del evento', maxLen: 160 },
  date: { type: 'date', required: true, label: 'La fecha' },
  location: { type: 'string', label: 'La ubicación', maxLen: 200 },
  event_type_id: { type: 'id', label: 'El tipo de evento' },
  category_id: { type: 'id', label: 'La categoría' },
  guests: { type: 'int', min: 0, max: 100000, label: 'El número de invitados' },
  start_time: { type: 'time', required: true, label: 'La hora de inicio' },
  end_time: { type: 'time', required: true, label: 'La hora de finalización' },
  notes: { type: 'text', label: 'Las observaciones', maxLen: 3000 },
  status: { type: 'enum', values: ['planificado', 'confirmado', 'realizado', 'cancelado'], label: 'El estado' },
  manual_planning_minutes: { type: 'number', min: 0, max: 100000, label: 'El tiempo de planificación' },
  reference_cost: { type: 'number', min: 0, label: 'El costo de referencia' },
};

const timeSpec = (extra) => ({
  ...extra,
  start_time: { type: 'time', required: true, label: 'La hora de inicio' },
  end_time: { type: 'time', required: true, label: 'La hora de fin' },
  start_day_offset: { type: 'int', min: 0, max: 1, label: 'El día de inicio' },
});

export default function eventRoutes({ db }) {
  const r = Router();
  r.use(['/events', '/shifts', '/activities', '/assignments', '/runs', '/schedule'], requireAuth);

  const loadEvent = (cid, id) => {
    const e = db.get('SELECT * FROM events WHERE id = ? AND company_id = ?', id, cid);
    if (!e) throw new HttpError(404, 'El evento no existe en tu empresa.');
    return e;
  };
  const refs = (cid, d) => {
    if (d.event_type_id) own(db, 'event_types', d.event_type_id, cid, 'El tipo de evento');
    if (d.category_id) own(db, 'event_categories', d.category_id, cid, 'La categoría');
  };
  const copyMatrix = (cid, eventId, categoryId) => {
    db.run('DELETE FROM event_roles WHERE event_id = ? AND company_id = ?', eventId, cid);
    if (!categoryId) return 0;
    const rows = db.all('SELECT role_id, min_count FROM requirements WHERE category_id = ? AND company_id = ? AND min_count > 0', categoryId, cid);
    for (const x of rows) db.run('INSERT INTO event_roles (event_id, role_id, company_id, min_count) VALUES (?,?,?,?)', eventId, x.role_id, cid, x.min_count);
    return rows.length;
  };

  r.get('/events', (req, res) => {
    const cid = req.companyId;
    const events = db.all(
      `SELECT e.*, t.name AS type_name, c.name AS category_name FROM events e
         LEFT JOIN event_types t ON t.id = e.event_type_id LEFT JOIN event_categories c ON c.id = e.category_id
        WHERE e.company_id = ? ORDER BY e.date DESC, e.start_time`, cid);
    const demand = new Map(db.all('SELECT event_id, SUM(quantity) AS n FROM shifts WHERE company_id = ? GROUP BY event_id', cid).map((x) => [x.event_id, x.n]));
    const minimum = new Map(db.all('SELECT event_id, SUM(min_count) AS n FROM event_roles WHERE company_id = ? GROUP BY event_id', cid).map((x) => [x.event_id, x.n]));
    const assigned = db.all(
      `SELECT a.event_id, COUNT(*) AS n, SUM(a.cost) AS cost FROM assignments a JOIN events e ON e.id = a.event_id
        WHERE a.company_id = ? AND a.plan = e.official_plan GROUP BY a.event_id`, cid);
    const am = new Map(assigned.map((x) => [x.event_id, x]));
    const lastRun = new Map(db.all(
      `SELECT event_id, status, optimized_cost, conventional_cost, applied FROM optimization_runs
        WHERE id IN (SELECT MAX(id) FROM optimization_runs WHERE company_id = ? GROUP BY event_id)`, cid).map((x) => [x.event_id, x]));
    res.json(events.map((e) => ({
      ...e,
      staff_demand: demand.get(e.id) || 0,
      staff_minimum: minimum.get(e.id) || 0,
      staff_assigned: am.get(e.id)?.n || 0,
      assigned_cost: round2(am.get(e.id)?.cost || 0),
      last_run: lastRun.get(e.id) || null,
    })));
  });

  r.get('/events/:id', (req, res) => {
    const cid = req.companyId;
    const e = db.get(
      `SELECT e.*, t.name AS type_name, c.name AS category_name FROM events e
         LEFT JOIN event_types t ON t.id = e.event_type_id LEFT JOIN event_categories c ON c.id = e.category_id
        WHERE e.id = ? AND e.company_id = ?`, Number(req.params.id), cid);
    if (!e) throw new HttpError(404, 'El evento no existe en tu empresa.');
    e.activities = db.all('SELECT * FROM event_activities WHERE event_id = ? AND company_id = ? ORDER BY start_at', e.id, cid);
    e.roles = db.all('SELECT er.*, ro.name AS role_name FROM event_roles er JOIN roles ro ON ro.id = er.role_id WHERE er.event_id = ? AND er.company_id = ? ORDER BY ro.sort_order, ro.name', e.id, cid);
    e.shifts = db.all('SELECT s.*, ro.name AS role_name, ro.color FROM shifts s JOIN roles ro ON ro.id = s.role_id WHERE s.event_id = ? AND s.company_id = ? ORDER BY ro.sort_order, s.start_at', e.id, cid)
      .map((s) => ({ ...s, hours: round2(durationHours(s.start_at, s.end_at)) }));
    e.assignments = db.all(
      `SELECT a.*, w.full_name AS worker_name FROM assignments a JOIN workers w ON w.id = a.worker_id
        WHERE a.event_id = ? AND a.company_id = ? ORDER BY w.full_name`, e.id, cid);
    e.runs = db.all('SELECT id, method, status, optimal, optimized_cost, conventional_cost, coverage, duration_ms, applied, created_at FROM optimization_runs WHERE event_id = ? AND company_id = ? ORDER BY id DESC LIMIT 20', e.id, cid);
    res.json(e);
  });

  r.post('/events', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const d = validate(req.body, eventSpec);
    refs(cid, d);
    const iv = buildInterval(d.date, d.start_time, d.end_time);
    d.status = d.status || 'planificado';
    const id = db.tx(() => {
      const q = insertSql('events', { company_id: cid, ...d, start_at: iv.start_at, end_at: iv.end_at });
      const id = Number(db.run(q.sql, ...q.params).lastInsertRowid);
      copyMatrix(cid, id, d.category_id);
      return id;
    });
    audit(db, req, 'evento', id, 'crear', d);
    res.status(201).json({ id });
  }));

  r.put('/events/:id', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const before = loadEvent(cid, Number(req.params.id));
    const d = validate(req.body, eventSpec, { partial: true });
    refs(cid, d);
    const merged = { ...before, ...d };
    const iv = buildInterval(merged.date, merged.start_time, merged.end_time);
    db.tx(() => {
      const q = updateSql('events', { ...d, start_at: iv.start_at, end_at: iv.end_at }, 'id = ? AND company_id = ?');
      db.run(q.sql, ...q.params, before.id, cid);
      // Si cambia la fecha, los turnos y actividades se desplazan con el evento.
      if (d.date && d.date !== before.date) {
        const delta = (toMinutes(`${d.date}T00:00`) - toMinutes(`${before.date}T00:00`));
        for (const t of ['shifts', 'event_activities']) {
          for (const s of db.all(`SELECT id, start_at, end_at FROM ${t} WHERE event_id = ? AND company_id = ?`, before.id, cid)) {
            db.run(`UPDATE ${t} SET start_at = ?, end_at = ? WHERE id = ?`, fromMinutes(toMinutes(s.start_at) + delta), fromMinutes(toMinutes(s.end_at) + delta), s.id);
          }
        }
      }
      if ('category_id' in d && d.category_id !== before.category_id && req.body.reset_roles) copyMatrix(cid, before.id, d.category_id);
    });
    audit(db, req, 'evento', before.id, 'actualizar', { antes: before, despues: d });
    res.json({ ok: true });
  }));

  r.delete('/events/:id', requireRole('planificador'), h((req, res) => {
    const e = loadEvent(req.companyId, Number(req.params.id));
    db.run('DELETE FROM events WHERE id = ? AND company_id = ?', e.id, req.companyId);
    audit(db, req, 'evento', e.id, 'eliminar', { nombre: e.name, fecha: e.date });
    res.json({ ok: true });
  }));

  // Funciones requeridas del evento (por defecto, copia de la matriz de su categoría).
  r.put('/events/:id/roles', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const e = loadEvent(cid, Number(req.params.id));
    const list = Array.isArray(req.body?.roles) ? req.body.roles : null;
    if (!list) throw new HttpError(422, 'Envía la lista de funciones requeridas.');
    db.tx(() => {
      db.run('DELETE FROM event_roles WHERE event_id = ? AND company_id = ?', e.id, cid);
      for (const x of list) {
        const n = Number(x.min_count);
        if (!Number.isInteger(n) || n < 0 || n > 999) throw new HttpError(422, 'Las cantidades deben ser enteros entre 0 y 999.');
        own(db, 'roles', Number(x.role_id), cid, 'La función');
        if (n > 0) db.run('INSERT INTO event_roles (event_id, role_id, company_id, min_count) VALUES (?,?,?,?)', e.id, Number(x.role_id), cid, n);
      }
    });
    audit(db, req, 'evento', e.id, 'funciones_requeridas', list);
    res.json({ ok: true });
  }));

  r.post('/events/:id/roles/from-matrix', requireRole('planificador'), h((req, res) => {
    const e = loadEvent(req.companyId, Number(req.params.id));
    if (!e.category_id) throw new HttpError(422, 'El evento no tiene categoría: asígnale una para usar la matriz.');
    const n = copyMatrix(req.companyId, e.id, e.category_id);
    audit(db, req, 'evento', e.id, 'funciones_desde_matriz');
    res.json({ roles: n });
  }));

  // Actividades del evento.
  r.post('/events/:id/activities', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const e = loadEvent(cid, Number(req.params.id));
    const d = validate(req.body, timeSpec({ name: { type: 'string', required: true, label: 'El nombre de la actividad' } }));
    const iv = buildInterval(e.date, d.start_time, d.end_time, d.start_day_offset);
    const id = Number(db.run('INSERT INTO event_activities (company_id, event_id, name, start_at, end_at) VALUES (?,?,?,?,?)', cid, e.id, d.name, iv.start_at, iv.end_at).lastInsertRowid);
    audit(db, req, 'actividad', id, 'crear', d);
    res.status(201).json({ id });
  }));
  r.delete('/activities/:id', requireRole('planificador'), h((req, res) => {
    const info = db.run('DELETE FROM event_activities WHERE id = ? AND company_id = ?', Number(req.params.id), req.companyId);
    if (!info.changes) throw new HttpError(404, 'La actividad no existe.');
    audit(db, req, 'actividad', Number(req.params.id), 'eliminar');
    res.json({ ok: true });
  }));

  // Turnos (franjas de trabajo por función).
  const shiftSpec = timeSpec({
    role_id: { type: 'id', required: true, label: 'La función' },
    quantity: { type: 'int', required: true, min: 1, max: 500, label: 'La cantidad' },
    label: { type: 'string', label: 'La etiqueta', maxLen: 80 },
  });
  r.post('/events/:id/shifts', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const e = loadEvent(cid, Number(req.params.id));
    const d = validate(req.body, shiftSpec);
    own(db, 'roles', d.role_id, cid, 'La función');
    const iv = buildInterval(e.date, d.start_time, d.end_time, d.start_day_offset);
    const id = Number(db.run('INSERT INTO shifts (company_id, event_id, role_id, quantity, start_at, end_at, label) VALUES (?,?,?,?,?,?,?)', cid, e.id, d.role_id, d.quantity, iv.start_at, iv.end_at, d.label).lastInsertRowid);
    audit(db, req, 'turno', id, 'crear', { ...d, ...iv });
    res.status(201).json({ id, ...iv, hours: durationHours(iv.start_at, iv.end_at) });
  }));
  r.put('/shifts/:id', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const s = own(db, 'shifts', Number(req.params.id), cid, 'El turno');
    const e = loadEvent(cid, s.event_id);
    const d = validate(req.body, shiftSpec);
    own(db, 'roles', d.role_id, cid, 'La función');
    const iv = buildInterval(e.date, d.start_time, d.end_time, d.start_day_offset);
    db.run('UPDATE shifts SET role_id = ?, quantity = ?, start_at = ?, end_at = ?, label = ? WHERE id = ?', d.role_id, d.quantity, iv.start_at, iv.end_at, d.label, s.id);
    audit(db, req, 'turno', s.id, 'actualizar', { antes: s, despues: { ...d, ...iv } });
    res.json({ ok: true });
  }));
  r.delete('/shifts/:id', requireRole('planificador'), h((req, res) => {
    const s = own(db, 'shifts', Number(req.params.id), req.companyId, 'El turno');
    db.run('DELETE FROM shifts WHERE id = ?', s.id);
    audit(db, req, 'turno', s.id, 'eliminar', s);
    res.json({ ok: true });
  }));

  // Genera un turno por función requerida, desde el inicio del evento y con la duración de referencia.
  r.post('/events/:id/shifts/generate', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const e = loadEvent(cid, Number(req.params.id));
    const roles = db.all('SELECT role_id, min_count FROM event_roles WHERE event_id = ? AND company_id = ? AND min_count > 0', e.id, cid);
    if (!roles.length) throw new HttpError(422, 'Define primero las funciones requeridas del evento (o asígnale una categoría con matriz).');
    const company = db.get('SELECT shift_reference_hours FROM companies WHERE id = ?', cid);
    const start = `${e.date}T${e.start_time}`;
    const end = fromMinutes(toMinutes(start) + Math.round(company.shift_reference_hours * 60));
    db.tx(() => {
      if (req.body?.replace) db.run('DELETE FROM shifts WHERE event_id = ? AND company_id = ?', e.id, cid);
      for (const x of roles) db.run('INSERT INTO shifts (company_id, event_id, role_id, quantity, start_at, end_at, label) VALUES (?,?,?,?,?,?,?)', cid, e.id, x.role_id, x.min_count, start, end, 'Generado desde la matriz');
    });
    audit(db, req, 'evento', e.id, 'generar_turnos', { turnos: roles.length });
    res.json({ created: roles.length });
  }));

  r.post('/events/:id/load-case-scenario', requireRole('planificador'), h((req, res) => {
    const e = loadEvent(req.companyId, Number(req.params.id));
    const n = loadCaseShifts(db, req.companyId, e.id);
    audit(db, req, 'evento', e.id, 'cargar_escenario_caso');
    res.json({ shifts: n });
  }));

  // Validación del evento: turnos vs. funciones requeridas y costo de referencia.
  r.get('/events/:id/validate', h((req, res) => {
    const ctx = loadEventContext(db, req.companyId, Number(req.params.id));
    const ref = referenceCost(db, ctx);
    const elig = eligibilityMatrix(db, ctx);
    const roles = ctx.roles.map((role) => {
      const req_ = ctx.requirements.find((x) => x.role_id === role.id)?.min_count || 0;
      const demand = ctx.shifts.filter((s) => s.role_id === role.id).reduce((a, s) => a + s.quantity, 0);
      return { role_id: role.id, role_name: role.name, minimum: req_, shift_demand: demand, status: demand === req_ ? 'ok' : demand < req_ ? 'deficit' : 'exceso' };
    }).filter((x) => x.minimum || x.shift_demand);
    const shifts = ctx.shifts.map((s) => ({
      id: s.id, role_name: s.role_name, quantity: s.quantity, start_at: s.start_at, end_at: s.end_at, hours: s.hours,
      overnight: s.start_at.slice(0, 10) !== s.end_at.slice(0, 10),
      exceeds_reference: s.hours > ctx.refHours,
      candidates: elig.get(s.id).candidates.length,
    }));
    const warnings = [];
    if (!ctx.shifts.length) warnings.push('El evento no tiene turnos.');
    for (const x of roles) if (x.status === 'deficit') warnings.push(`${x.role_name}: los turnos suman ${x.shift_demand} y el mínimo es ${x.minimum}.`);
    for (const s of shifts) if (s.candidates < s.quantity) warnings.push(`Turno de ${s.role_name} ${s.start_at.slice(11)}–${s.end_at.slice(11)}: ${s.candidates} candidato(s) para ${s.quantity} puesto(s).`);
    if (ref.missing.length) warnings.push(`Sin tarifa vigente para: ${ref.missing.join(', ')}.`);
    res.json({
      reference_cost: ref.total, stored_reference_cost: ctx.event.reference_cost, missing_rates: ref.missing,
      total_minimum: roles.reduce((a, x) => a + x.minimum, 0), total_demand: roles.reduce((a, x) => a + x.shift_demand, 0),
      roles, shifts, warnings, reference_hours: ctx.refHours,
    });
  }));

  // Candidatos de un turno, con los motivos de exclusión de los demás.
  r.get('/events/:id/candidates', h((req, res) => {
    const ctx = loadEventContext(db, req.companyId, Number(req.params.id));
    const shift = ctx.shifts.find((s) => s.id === Number(req.query.shift_id));
    if (!shift) throw new HttpError(404, 'El turno no existe en este evento.');
    const plan = req.query.plan === 'optimizado' ? 'optimizado' : 'manual';
    const inPlan = db.all('SELECT a.worker_id, s.start_at, s.end_at, s.id AS shift_id FROM assignments a JOIN shifts s ON s.id = a.shift_id WHERE a.event_id = ? AND a.plan = ?', ctx.event.id, plan);
    const out = ctx.workers.map((w) => {
      const el = checkEligibility(db, ctx, w, shift);
      const reasons = [...el.reasons];
      const same = inPlan.filter((a) => a.worker_id === w.id && a.shift_id !== shift.id && toMinutes(a.start_at) < toMinutes(shift.end_at) && toMinutes(shift.start_at) < toMinutes(a.end_at));
      if (same.length) reasons.push('Ya tiene un turno que se cruza en este evento.');
      return { worker_id: w.id, full_name: w.full_name, primary_role_id: w.primary_role_id, status: w.status, ok: reasons.length === 0, reasons, cost: el.cost?.total ?? null, assigned: inPlan.some((a) => a.worker_id === w.id && a.shift_id === shift.id) };
    });
    out.sort((a, b) => b.ok - a.ok || (a.cost ?? Infinity) - (b.cost ?? Infinity) || a.full_name.localeCompare(b.full_name));
    res.json(out);
  }));

  // Asignaciones manuales (programación convencional de la empresa).
  r.post('/events/:id/assignments', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const d = validate(req.body, {
      shift_id: { type: 'id', required: true, label: 'El turno' },
      worker_id: { type: 'id', required: true, label: 'El trabajador' },
      force: { type: 'bool' },
    });
    const ctx = loadEventContext(db, cid, Number(req.params.id));
    const shift = ctx.shifts.find((s) => s.id === d.shift_id);
    if (!shift) throw new HttpError(404, 'El turno no existe en este evento.');
    const worker = ctx.workers.find((w) => w.id === d.worker_id);
    if (!worker) throw new HttpError(404, 'El trabajador no existe en tu empresa.');
    const el = checkEligibility(db, ctx, worker, shift);
    const current = db.all("SELECT a.shift_id, s.start_at, s.end_at FROM assignments a JOIN shifts s ON s.id = a.shift_id WHERE a.event_id = ? AND a.plan = 'manual' AND a.worker_id = ?", ctx.event.id, worker.id);
    const reasons = [...el.reasons];
    if (current.some((a) => a.shift_id === shift.id)) throw new HttpError(409, 'El trabajador ya está asignado a este turno.');
    if (current.some((a) => toMinutes(a.start_at) < toMinutes(shift.end_at) && toMinutes(shift.start_at) < toMinutes(a.end_at))) reasons.push('Ya tiene un turno que se cruza en este evento.');
    const assignedHere = db.get("SELECT COUNT(*) AS n FROM assignments WHERE shift_id = ? AND plan = 'manual'", shift.id).n;
    if (assignedHere >= shift.quantity) reasons.push(`El turno ya tiene las ${shift.quantity} persona(s) requeridas (asignación adicional).`);
    if (reasons.length && !d.force) throw new HttpError(409, 'La asignación incumple restricciones.', { reasons });
    const id = Number(db.run("INSERT INTO assignments (company_id, event_id, shift_id, worker_id, plan, cost, created_by) VALUES (?,?,?,?, 'manual', ?, ?)", cid, ctx.event.id, shift.id, worker.id, el.cost?.total ?? null, req.user.id).lastInsertRowid);
    audit(db, req, 'asignacion', id, 'crear', { ...d, advertencias: reasons });
    res.status(201).json({ id, warnings: reasons });
  }));

  r.delete('/assignments/:id', requireRole('planificador'), h((req, res) => {
    const a = own(db, 'assignments', Number(req.params.id), req.companyId, 'La asignación');
    db.run('DELETE FROM assignments WHERE id = ?', a.id);
    audit(db, req, 'asignacion', a.id, 'eliminar', a);
    res.json({ ok: true });
  }));

  r.post('/events/:id/assignments/clear', requireRole('planificador'), h((req, res) => {
    const e = loadEvent(req.companyId, Number(req.params.id));
    const plan = req.body?.plan === 'optimizado' ? 'optimizado' : 'manual';
    const n = db.run('DELETE FROM assignments WHERE event_id = ? AND company_id = ? AND plan = ?', e.id, req.companyId, plan).changes;
    audit(db, req, 'evento', e.id, 'vaciar_plan', { plan, eliminadas: n });
    res.json({ removed: n });
  }));

  r.put('/events/:id/official-plan', requireRole('planificador'), h((req, res) => {
    const e = loadEvent(req.companyId, Number(req.params.id));
    const { plan } = validate(req.body, { plan: { type: 'enum', values: ['manual', 'optimizado'], required: true, label: 'El plan' } });
    db.run('UPDATE events SET official_plan = ? WHERE id = ?', plan, e.id);
    audit(db, req, 'evento', e.id, 'plan_oficial', { plan });
    res.json({ ok: true });
  }));

  r.get('/events/:id/evaluate', h((req, res) => {
    const ctx = loadEventContext(db, req.companyId, Number(req.params.id));
    const plan = req.query.plan === 'optimizado' ? 'optimizado' : 'manual';
    const rows = db.all('SELECT shift_id, worker_id FROM assignments WHERE event_id = ? AND plan = ?', ctx.event.id, plan);
    res.json({ plan, ...evaluatePlan(db, ctx, rows) });
  }));

  // Optimización.
  r.post('/events/:id/optimize', requireRole('planificador'), h(async (req, res) => {
    const cid = req.companyId;
    const ctx = loadEventContext(db, cid, Number(req.params.id));
    const result = await optimize(db, ctx);
    const info = db.run(
      `INSERT INTO optimization_runs (company_id, event_id, method, status, optimal, optimized_cost, conventional_cost, conventional_method, coverage, duration_ms, result_json, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      cid, ctx.event.id, result.method, result.status, result.optimal ? 1 : 0, result.comparison?.optimized_cost ?? null,
      result.conventional?.total_cost ?? null, result.conventional?.method ?? null, result.optimized?.coverage_pct ?? null,
      result.duration_ms ?? null, JSON.stringify(result), req.user.id,
    );
    const id = Number(info.lastInsertRowid);
    audit(db, req, 'optimizacion', id, 'ejecutar', { evento: ctx.event.id, estado: result.status });
    res.json({ run_id: id, ...result });
  }));

  r.get('/runs/:id', h((req, res) => {
    const run = own(db, 'optimization_runs', Number(req.params.id), req.companyId, 'La ejecución');
    res.json({ run_id: run.id, applied: run.applied, created_at: run.created_at, ...JSON.parse(run.result_json) });
  }));

  r.post('/runs/:id/apply', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const run = own(db, 'optimization_runs', Number(req.params.id), cid, 'La ejecución');
    const result = JSON.parse(run.result_json);
    if (!result.plan) throw new HttpError(422, 'Esta ejecución no tiene una asignación válida para aplicar.');
    const ctx = loadEventContext(db, cid, run.event_id);
    const check = evaluatePlan(db, ctx, result.plan);
    if (check.conflicts.length || check.rows.length !== result.plan.length) {
      throw new HttpError(409, 'Los datos cambiaron desde la optimización (turnos, disponibilidad o asignaciones). Vuelve a ejecutarla.', { conflicts: check.conflicts });
    }
    db.tx(() => {
      db.run("DELETE FROM assignments WHERE event_id = ? AND company_id = ? AND plan = 'optimizado'", run.event_id, cid);
      for (const row of check.rows) {
        db.run("INSERT INTO assignments (company_id, event_id, shift_id, worker_id, plan, cost, run_id, created_by) VALUES (?,?,?,?, 'optimizado', ?, ?, ?)", cid, run.event_id, row.shift_id, row.worker_id, row.cost, run.id, req.user.id);
      }
      db.run('UPDATE optimization_runs SET applied = 0 WHERE event_id = ? AND company_id = ?', run.event_id, cid);
      db.run('UPDATE optimization_runs SET applied = 1 WHERE id = ?', run.id);
      db.run("UPDATE events SET official_plan = 'optimizado' WHERE id = ?", run.event_id);
    });
    audit(db, req, 'optimizacion', run.id, 'aplicar', { evento: run.event_id });
    res.json({ ok: true, assignments: check.rows.length });
  }));

  // Calendario de turnos (plan oficial de cada evento).
  r.get('/schedule', h((req, res) => {
    const q = validate(req.query, { from: { type: 'date', required: true, label: 'Desde' }, to: { type: 'date', required: true, label: 'Hasta' } });
    const cid = req.companyId;
    const events = db.all(
      `SELECT e.id, e.name, e.date, e.start_at, e.end_at, e.status, e.official_plan, e.location, c.name AS category_name
         FROM events e LEFT JOIN event_categories c ON c.id = e.category_id
        WHERE e.company_id = ? AND e.date BETWEEN ? AND ? ORDER BY e.date, e.start_time`, cid, addDays(q.from, -1), q.to);
    const shifts = db.all(
      `SELECT s.*, ro.name AS role_name, ro.color FROM shifts s JOIN roles ro ON ro.id = s.role_id JOIN events e ON e.id = s.event_id
        WHERE s.company_id = ? AND e.date BETWEEN ? AND ? ORDER BY s.start_at`, cid, addDays(q.from, -1), q.to);
    const assignments = db.all(
      `SELECT a.id, a.shift_id, a.worker_id, a.event_id, a.cost, w.full_name AS worker_name, s.start_at, s.end_at, ro.name AS role_name
         FROM assignments a JOIN events e ON e.id = a.event_id JOIN shifts s ON s.id = a.shift_id JOIN workers w ON w.id = a.worker_id JOIN roles ro ON ro.id = s.role_id
        WHERE a.company_id = ? AND a.plan = e.official_plan AND e.status <> 'cancelado' AND e.date BETWEEN ? AND ?`, cid, addDays(q.from, -1), q.to);
    // Cruces de horario entre asignaciones oficiales de un mismo trabajador.
    const byWorker = new Map();
    for (const a of assignments) {
      if (!byWorker.has(a.worker_id)) byWorker.set(a.worker_id, []);
      byWorker.get(a.worker_id).push(a);
    }
    const conflicts = [];
    for (const list of byWorker.values()) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const A = list[i];
        const B = list[j];
        if (toMinutes(A.start_at) < toMinutes(B.end_at) && toMinutes(B.start_at) < toMinutes(A.end_at)) conflicts.push({ worker_id: A.worker_id, worker_name: A.worker_name, a: A.id, b: B.id, a_event: A.event_id, b_event: B.event_id });
      }
    }
    res.json({ events, shifts: shifts.map((s) => ({ ...s, hours: round2(durationHours(s.start_at, s.end_at)) })), assignments, conflicts });
  }));

  return r;
}


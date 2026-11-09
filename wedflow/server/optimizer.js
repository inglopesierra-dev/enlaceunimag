import { createRequire } from 'node:module';
import fs from 'node:fs';
import { toMinutes } from '../public/js/lib/time.js';
import { eligibilityMatrix, evaluatePlan, conventionalRule, roleRequirements, referenceCost } from './planning.js';
import { round2 } from './util.js';

const require = createRequire(import.meta.url);
const highsDir = require.resolve('highs').replace(/highs\.js$/, '');
const wasmBinary = fs.readFileSync(highsDir + 'highs.wasm');
const highsLoader = (await import(highsDir + 'highs.mjs')).default;

// Se crea una instancia nueva del solucionador por ejecución: highs-js no garantiza
// que una misma instancia quede en buen estado después de muchos modelos.
async function solveLP(lp, options) {
  const highs = await highsLoader({ wasmBinary });
  return highs.solve(lp, options);
}

const SOLVER_OPTIONS = { mip_rel_gap: 0, mip_abs_gap: 0, time_limit: 60, presolve: 'on' };
// Desempate mínimo: preferir la función principal del trabajador sin alterar el costo.
// Con costos expresados al centavo, la suma de desempates (< 0,01) no cambia el óptimo.
const TIE = 1e-6;

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(6));

/** Escribe una expresión lineal en formato LP partiendo líneas largas. */
function linear(terms) {
  const parts = terms.map(([coef, name], i) => {
    const sign = coef < 0 ? '-' : i === 0 ? '' : '+';
    const abs = Math.abs(coef);
    return `${sign} ${abs === 1 ? '' : fmt(abs) + ' '}${name}`.trim();
  });
  const lines = [];
  for (let i = 0; i < parts.length; i += 8) lines.push(parts.slice(i, i + 8).join(' '));
  return lines.join('\n   ');
}

/**
 * Construye el modelo de programación lineal entera:
 *   min Z = Σ_i Σ_j Σ_t C_ijt X_ijt
 *   (A) Σ_i Σ_t∈T(j) X_ijt ≥ R_j                       cobertura mínima por función
 *   (G) Σ_i X_ij(t)t ≥ d_t                             cada turno cubierto en su horario
 *   (D) Σ_{t ∋ p} X_ijt ≤ 1  ∀ i, p                    sin cruces (p = inicio de cada turno)
 *   (F) Σ_t X_ijt ≤ K_max ; Σ_t h_t X_ijt ≤ H_max     límites por trabajador (configurables)
 *   (B, C) X_ijt solo existe si i está disponible y tiene la competencia para j
 *   (E) X_ijt ∈ {0, 1}
 * Cada turno t pertenece a una única función j(t), por lo que X_ijt se indexa por (i, t).
 */
export function buildModel(ctx, elig, { slack = false } = {}) {
  const vars = [];
  for (const s of ctx.shifts) {
    for (const c of elig.get(s.id).candidates) {
      vars.push({
        name: `x_${c.worker.id}_${s.id}`,
        worker: c.worker, shift: s, cost: c.cost.total,
        tie: c.worker.primary_role_id === s.role_id ? 0 : TIE,
      });
    }
  }
  const BIG = 1e9;
  const obj = vars.map((v) => [round2(v.cost) + v.tie, v.name]);
  const cons = [];
  const slacks = [];
  // (G) Demanda por turno.
  for (const s of ctx.shifts) {
    const terms = vars.filter((v) => v.shift.id === s.id).map((v) => [1, v.name]);
    if (slack) {
      const u = `u_${s.id}`;
      slacks.push({ name: u, kind: 'turno', shift: s });
      terms.push([1, u]);
      obj.push([BIG, u]);
    }
    cons.push({ name: `turno_${s.id}`, terms, op: '>=', rhs: s.quantity, kind: 'G', ref: s });
  }
  // (A) Mínimo por función.
  for (const [roleId, min] of roleRequirements(ctx)) {
    const terms = vars.filter((v) => v.shift.role_id === roleId).map((v) => [1, v.name]);
    if (slack) {
      const u = `v_${roleId}`;
      slacks.push({ name: u, kind: 'funcion', role_id: roleId });
      terms.push([1, u]);
      obj.push([BIG, u]);
    }
    cons.push({ name: `minimo_${roleId}`, terms, op: '>=', rhs: min, kind: 'A', ref: roleId });
  }
  // (D) No superposición y (F) límites por trabajador.
  const byWorker = new Map();
  for (const v of vars) {
    if (!byWorker.has(v.worker.id)) byWorker.set(v.worker.id, []);
    byWorker.get(v.worker.id).push(v);
  }
  for (const [wid, list] of byWorker) {
    const seen = new Set();
    for (const v of list) {
      const p = toMinutes(v.shift.start_at);
      const active = list.filter((x) => toMinutes(x.shift.start_at) <= p && toMinutes(x.shift.end_at) > p);
      const key = active.map((x) => x.name).sort().join(',');
      if (active.length > 1 && !seen.has(key)) {
        seen.add(key);
        cons.push({ name: `cruce_${wid}_${v.shift.id}`, terms: active.map((x) => [1, x.name]), op: '<=', rhs: 1, kind: 'D' });
      }
    }
    const K = ctx.company.max_shifts_per_worker_event;
    if (K && list.length > K) cons.push({ name: `maxturnos_${wid}`, terms: list.map((x) => [1, x.name]), op: '<=', rhs: K, kind: 'F' });
    const H = ctx.company.enforce_max_hours ? ctx.company.max_hours_per_worker_event : null;
    if (H) cons.push({ name: `maxhoras_${wid}`, terms: list.map((x) => [x.shift.hours, x.name]), op: '<=', rhs: H, kind: 'F' });
  }

  const lines = ['Minimize', ` obj: ${obj.length ? linear(obj) : '0 dummy'}`, 'Subject To'];
  let hasDummy = !obj.length;
  for (const c of cons) {
    if (!c.terms.length) {
      // Restricción sin candidatos: se expresa con una variable fija en cero para que el
      // solucionador la reconozca como no factible si rhs > 0.
      hasDummy = true;
      lines.push(` ${c.name}: dummy ${c.op} ${c.rhs}`);
    } else lines.push(` ${c.name}: ${linear(c.terms)} ${c.op} ${c.rhs}`);
  }
  lines.push('Bounds');
  for (const v of vars) lines.push(` 0 <= ${v.name} <= 1`);
  for (const u of slacks) lines.push(` 0 <= ${u.name} <= 1000`);
  if (hasDummy) lines.push(' dummy = 0');
  if (vars.length || slacks.length) {
    lines.push('General');
    const ints = [...vars.map((v) => v.name), ...slacks.map((u) => u.name)];
    for (let i = 0; i < ints.length; i += 10) lines.push(' ' + ints.slice(i, i + 10).join(' '));
  }
  lines.push('End');
  return { lp: lines.join('\n'), vars, cons, slacks };
}

/** Explica por qué no hay solución factible, a partir de los datos y del modelo con holguras. */
function diagnose(ctx, elig, slackResult, slackModel) {
  const reasons = [];
  for (const s of ctx.shifts) {
    const e = elig.get(s.id);
    if (e.candidates.length < s.quantity) {
      const counts = {};
      for (const x of e.excluded) for (const r of x.reasons) counts[r] = (counts[r] || 0) + 1;
      reasons.push({
        type: 'candidatos_insuficientes',
        message: `Turno de ${s.role_name} (${s.start_at.slice(11)}–${s.end_at.slice(11)}): requiere ${s.quantity} y solo hay ${e.candidates.length} trabajador(es) elegible(s).`,
        detail: Object.entries(counts).map(([r, n]) => `${n} × ${r}`),
      });
    }
  }
  const reqs = roleRequirements(ctx);
  for (const [roleId, min] of reqs) {
    const shifts = ctx.shifts.filter((s) => s.role_id === roleId);
    const name = ctx.roleById.get(roleId)?.name;
    if (!shifts.length) {
      reasons.push({ type: 'sin_turnos', message: `${name}: el evento requiere ${min} trabajador(es) y no tiene turnos definidos para esa función.` });
      continue;
    }
    const distinct = new Set(shifts.flatMap((s) => elig.get(s.id).candidates.map((c) => c.worker.id)));
    const capacity = (ctx.company.max_shifts_per_worker_event || 1) * distinct.size;
    if (capacity < min) reasons.push({ type: 'minimo_funcion', message: `${name}: el mínimo es ${min} y solo ${distinct.size} trabajador(es) distinto(s) pueden cubrir sus turnos.` });
  }
  if (ctx.company.enforce_max_hours && ctx.company.max_hours_per_worker_event) {
    for (const s of ctx.shifts) {
      if (s.hours > ctx.company.max_hours_per_worker_event) {
        reasons.push({ type: 'horas_maximas', message: `Turno de ${s.role_name} dura ${s.hours} h y el máximo configurado es ${ctx.company.max_hours_per_worker_event} h.` });
      }
    }
  }
  if (slackResult && slackResult.Columns) {
    for (const u of slackModel.slacks) {
      const val = Math.round(slackResult.Columns[u.name]?.Primal || 0);
      if (val > 0) {
        if (u.kind === 'turno') {
          reasons.push({ type: 'deficit_turno', message: `Aun repartiendo al personal de la mejor forma, faltan ${val} trabajador(es) en el turno de ${u.shift.role_name} (${u.shift.start_at.slice(11)}–${u.shift.end_at.slice(11)}).` });
        } else {
          reasons.push({ type: 'deficit_funcion', message: `Faltan ${val} trabajador(es) para el mínimo de ${ctx.roleById.get(u.role_id)?.name}.` });
        }
      }
    }
    if (!reasons.length) reasons.push({ type: 'cruces', message: 'Los candidatos existen, pero los cruces de horario o el máximo de turnos por trabajador impiden cubrir todos los turnos a la vez.' });
  }
  return reasons;
}

function unassignedReport(ctx, elig, chosen, solutionCostByShift) {
  const chosenIds = new Set(chosen.map((c) => c.worker_id));
  const out = [];
  for (const w of ctx.workers) {
    if (chosenIds.has(w.id)) continue;
    const eligibleShifts = ctx.shifts.filter((s) => elig.get(s.id).candidates.some((c) => c.worker.id === w.id));
    if (eligibleShifts.length) {
      const cheaper = eligibleShifts.some((s) => {
        const mine = elig.get(s.id).candidates.find((c) => c.worker.id === w.id).cost.total;
        return mine > (solutionCostByShift.get(s.id) ?? Infinity);
      });
      out.push({
        worker_id: w.id, worker_name: w.full_name, eligible: true,
        reasons: [cheaper
          ? 'Elegible, pero los turnos que puede cubrir se completan a menor costo con otros trabajadores.'
          : 'Elegible, pero la cobertura requerida ya quedó completa con trabajadores de igual costo.'],
      });
    } else {
      const reasons = new Set();
      for (const s of ctx.shifts) {
        const ex = elig.get(s.id).excluded.find((x) => x.worker.id === w.id);
        if (ex) ex.reasons.forEach((r) => reasons.add(r));
      }
      if (w.status === 'inactivo') reasons.add('Trabajador inactivo.');
      out.push({ worker_id: w.id, worker_name: w.full_name, eligible: false, reasons: [...reasons] });
    }
  }
  return out;
}

function constraintChecks(ctx, evalRes, model) {
  const checks = [];
  const reqs = roleRequirements(ctx);
  const roleShort = evalRes.by_role.filter((r) => r.minimum && r.valid < r.minimum);
  checks.push({ key: 'A', name: 'Cobertura mínima de personal por función', ok: roleShort.length === 0, detail: roleShort.length ? roleShort.map((r) => `${r.role_name}: ${r.valid}/${r.minimum}`).join('; ') : `${reqs.size} función(es) con mínimo cumplido.` });
  const anyAvail = evalRes.rows.some((r) => r.issues.some((i) => i.startsWith('Sin disponibilidad')));
  checks.push({ key: 'B', name: 'Disponibilidad del personal', ok: !anyAvail, detail: anyAvail ? 'Hay asignaciones fuera de la disponibilidad registrada.' : 'Todas las asignaciones están dentro de la disponibilidad registrada.' });
  const anyComp = evalRes.rows.some((r) => r.issues.some((i) => i.startsWith('Sin competencia') || i.startsWith('La empresa no autoriza')));
  checks.push({ key: 'C', name: 'Competencias y autorizaciones', ok: !anyComp, detail: anyComp ? 'Hay asignaciones sin competencia autorizada.' : 'Cada trabajador cubre funciones para las que está autorizado.' });
  const anyCross = evalRes.rows.some((r) => r.issues.some((i) => i.startsWith('Cruce') || i.startsWith('Asignado en un horario')));
  checks.push({ key: 'D', name: 'No superposición de horarios', ok: !anyCross, detail: anyCross ? 'Hay cruces de horario.' : 'Ningún trabajador tiene turnos simultáneos (incluye otros eventos).' });
  checks.push({ key: 'E', name: 'Naturaleza binaria de X_ijt', ok: model ? true : null, detail: model ? `${model.vars.length} variables binarias (0/1) en el modelo.` : 'No aplica: programación sin modelo.' });
  const longShifts = evalRes.alerts.filter((a) => a.type === 'turno_largo' || a.type === 'horas');
  const limitBroken = evalRes.rows.some((r) => r.issues.some((i) => i.startsWith('Supera el máximo')));
  checks.push({ key: 'F', name: 'Duración de turnos', ok: !limitBroken, warn: longShifts.length > 0, detail: limitBroken ? 'Se superan los límites configurados por trabajador.' : longShifts.length ? `${longShifts.length} alerta(s) por superar la duración de referencia de ${ctx.refHours} h.` : `Ningún turno supera ${ctx.refHours} h.` });
  const shiftShort = evalRes.shift_coverage.filter((s) => s.valid < s.required);
  checks.push({ key: 'G', name: 'Cobertura operativa por franja horaria', ok: shiftShort.length === 0, detail: shiftShort.length ? `${shiftShort.length} turno(s) sin cubrir por completo.` : `${evalRes.shift_coverage.length} turno(s) cubiertos durante todo su horario.` });
  return checks;
}

/** Ejecuta la optimización de un evento y devuelve el resultado completo (sin guardarlo). */
export async function optimize(db, ctx) {
  const t0 = performance.now();
  const warnings = [];
  if (!ctx.shifts.length) {
    return { status: 'datos_insuficientes', optimal: false, method: 'Sin ejecutar', message: 'El evento no tiene turnos definidos. Crea los turnos (o genéralos desde la matriz de requerimientos) antes de optimizar.', reasons: [] };
  }
  if (!ctx.workers.some((w) => w.status !== 'inactivo')) {
    return { status: 'datos_insuficientes', optimal: false, method: 'Sin ejecutar', message: 'No hay trabajadores activos registrados.', reasons: [] };
  }
  const elig = eligibilityMatrix(db, ctx);
  const ref = referenceCost(db, ctx);
  if (ref.missing.length) warnings.push(`No hay tarifa general vigente para: ${ref.missing.join(', ')}. El costo de referencia está incompleto.`);
  for (const s of ctx.shifts) if (s.hours > ctx.refHours) warnings.push(`El turno de ${s.role_name} (${s.start_at.slice(11)}–${s.end_at.slice(11)}) dura ${s.hours} h y supera la referencia de ${ctx.refHours} h.`);

  // Programación convencional para comparar: la manual si existe; si no, la regla automática.
  const manual = db.all("SELECT shift_id, worker_id FROM assignments WHERE event_id = ? AND company_id = ? AND plan = 'manual'", ctx.event.id, ctx.company.id);
  const convMethod = manual.length ? 'Programación manual registrada por la empresa' : 'Regla convencional simulada: primer trabajador disponible por orden de registro, sin criterio de costo (no es una optimización)';
  const convPlan = manual.length ? manual : conventionalRule(ctx, elig);
  const conventional = evaluatePlan(db, ctx, convPlan);

  const model = buildModel(ctx, elig);
  const res = await solveLP(model.lp, SOLVER_OPTIONS);
  const duration = performance.now() - t0;
  const base = {
    method: 'Programación lineal entera (MILP) resuelta con HiGHS',
    model_size: { variables: model.vars.length, constraints: model.cons.length },
    solver_status: res.Status,
    reference_cost: ref.total,
    reference_hours: ctx.refHours,
    conventional: { method: convMethod, ...conventional },
    warnings,
    duration_ms: round2(duration),
  };

  if (res.Status === 'Infeasible' || !res.Columns || !['Optimal', 'Time limit reached', 'Solution limit reached'].includes(res.Status)) {
    const slackModel = buildModel(ctx, elig, { slack: true });
    let slackRes = null;
    try {
      slackRes = await solveLP(slackModel.lp, SOLVER_OPTIONS);
    } catch {
      slackRes = null;
    }
    return {
      ...base,
      status: 'no_factible',
      optimal: false,
      message: 'No existe una asignación que cumpla todas las restricciones con los datos actuales. Revisa las causas y ajusta trabajadores, disponibilidad, competencias, tarifas o turnos.',
      reasons: diagnose(ctx, elig, slackRes, slackModel),
      unassigned: unassignedReport(ctx, elig, [], new Map()),
    };
  }

  const chosen = model.vars.filter((v) => Math.round(res.Columns[v.name]?.Primal || 0) === 1).map((v) => ({ shift_id: v.shift.id, worker_id: v.worker.id }));
  const evalRes = evaluatePlan(db, ctx, chosen);
  const maxCostByShift = new Map();
  for (const r of evalRes.rows) maxCostByShift.set(r.shift_id, Math.max(maxCostByShift.get(r.shift_id) ?? 0, r.cost));
  const optimal = res.Status === 'Optimal';
  const convCost = conventional.total_cost;
  const diff = round2(convCost - evalRes.total_cost);
  return {
    ...base,
    status: optimal ? 'optimo' : 'factible',
    optimal,
    message: optimal
      ? 'Solución óptima: el solucionador demostró que no existe otra asignación factible de menor costo.'
      : `El solucionador encontró una asignación factible, pero no demostró optimalidad (estado: ${res.Status}).`,
    optimized: evalRes,
    plan: chosen,
    comparison: {
      conventional_cost: convCost,
      optimized_cost: evalRes.total_cost,
      difference: diff,
      savings_pct: convCost ? round2((diff / convCost) * 100) : 0,
      conventional_coverage: conventional.coverage_pct,
      optimized_coverage: evalRes.coverage_pct,
      conventional_conflicts: conventional.conflicts.length,
      optimized_conflicts: evalRes.conflicts.length,
      conventional_staff: conventional.staff_assigned,
      optimized_staff: evalRes.staff_assigned,
    },
    constraints: constraintChecks(ctx, evalRes, model),
    conventional_constraints: constraintChecks(ctx, conventional, null),
    unassigned: unassignedReport(ctx, elig, chosen, maxCostByShift),
  };
}

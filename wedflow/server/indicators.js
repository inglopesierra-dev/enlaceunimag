import { loadEventContext, evaluatePlan, referenceCost } from './planning.js';
import { round2 } from './util.js';
import { todayISO } from '../public/js/lib/time.js';

/**
 * Indicadores de desempeño de la planificación de un evento:
 *   CT = Σ C_ijt X_ijt (plan oficial)
 *   VP = (Costo convencional − Costo optimizado) / Costo convencional × 100
 *   DP = Personal asignado − Personal mínimo requerido
 *   PC = Persona-hora cubierta / Persona-hora requerida × 100
 *   Tiempo de planificación, conflictos de programación y horas adicionales.
 */
export function eventIndicators(db, cid, eventId) {
  const ctx = loadEventContext(db, cid, eventId);
  const e = ctx.event;
  const planRows = (plan) => db.all('SELECT shift_id, worker_id FROM assignments WHERE event_id = ? AND company_id = ? AND plan = ?', e.id, cid, plan);
  const manualRows = planRows('manual');
  const optRows = planRows('optimizado');
  const official = evaluatePlan(db, ctx, e.official_plan === 'optimizado' ? optRows : manualRows);
  const manual = manualRows.length ? evaluatePlan(db, ctx, manualRows) : null;
  const optimized = optRows.length ? evaluatePlan(db, ctx, optRows) : null;
  const run = db.get('SELECT * FROM optimization_runs WHERE event_id = ? AND company_id = ? AND applied = 1 ORDER BY id DESC LIMIT 1', e.id, cid)
    || db.get("SELECT * FROM optimization_runs WHERE event_id = ? AND company_id = ? AND status IN ('optimo','factible') ORDER BY id DESC LIMIT 1", e.id, cid);
  const conventionalCost = manual ? manual.total_cost : run?.conventional_cost ?? null;
  const conventionalSource = manual
    ? (manual.coverage_pct < 100 ? `Programación manual incompleta (cobertura ${manual.coverage_pct} %)` : 'Programación manual')
    : run ? 'Regla convencional simulada' : null;
  const optimizedCost = optimized ? optimized.total_cost : run?.optimized_cost ?? null;
  const vp = conventionalCost && optimizedCost != null ? round2(((conventionalCost - optimizedCost) / conventionalCost) * 100) : null;
  const ref = referenceCost(db, ctx);
  return {
    event_id: e.id,
    name: e.name,
    date: e.date,
    status: e.status,
    category_name: e.category_name,
    guests: e.guests,
    official_plan: e.official_plan,
    ct: official.total_cost,
    reference_cost: ref.total,
    conventional_cost: conventionalCost,
    conventional_source: conventionalSource,
    conventional_complete: manual ? manual.coverage_pct >= 100 && manual.conflicts.length === 0 : null,
    optimized_cost: optimizedCost,
    savings: conventionalCost != null && optimizedCost != null ? round2(conventionalCost - optimizedCost) : null,
    vp,
    staff_assigned: official.staff_assigned,
    staff_minimum: official.staff_minimum,
    dp: official.staff_difference,
    pc: official.coverage_pct,
    planning_minutes_manual: e.manual_planning_minutes,
    solver_ms: run?.duration_ms ?? null,
    conflicts: official.conflicts.length,
    extra_hours: official.extra_hours,
    alerts: official.alerts.length,
    has_assignments: official.staff_assigned > 0,
    optimized_applied: Boolean(run?.applied),
    upcoming: e.date >= todayISO(),
  };
}

export function companyIndicators(db, cid, { from, to } = {}) {
  const events = db.all(
    `SELECT id FROM events WHERE company_id = ? AND status <> 'cancelado' AND (? IS NULL OR date >= ?) AND (? IS NULL OR date <= ?) ORDER BY date`,
    cid, from ?? null, from ?? null, to ?? null, to ?? null,
  );
  const rows = events.map((x) => eventIndicators(db, cid, x.id));
  const withComp = rows.filter((r) => r.conventional_cost != null && r.optimized_cost != null);
  const sum = (list, k) => round2(list.reduce((a, r) => a + (r[k] || 0), 0));
  const convTotal = sum(withComp, 'conventional_cost');
  const optTotal = sum(withComp, 'optimized_cost');
  const assigned = rows.filter((r) => r.has_assignments);
  return {
    events: rows,
    totals: {
      events: rows.length,
      ct: sum(rows, 'ct'),
      conventional_cost: convTotal,
      optimized_cost: optTotal,
      savings: round2(convTotal - optTotal),
      vp: convTotal ? round2(((convTotal - optTotal) / convTotal) * 100) : null,
      dp: rows.reduce((a, r) => a + r.dp, 0),
      pc: assigned.length ? round2(assigned.reduce((a, r) => a + r.pc, 0) / assigned.length) : null,
      conflicts: rows.reduce((a, r) => a + r.conflicts, 0),
      extra_hours: sum(rows, 'extra_hours'),
      planning_minutes_manual: sum(rows, 'planning_minutes_manual'),
      solver_seconds: round2(rows.reduce((a, r) => a + (r.solver_ms || 0), 0) / 1000),
    },
  };
}

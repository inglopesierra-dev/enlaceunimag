import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { esc, money, num, pct, fmtDate, kpi, mountTable, handleError } from '../lib/ui.js';
import { barChart } from '../lib/charts.js';
import { setCrumbs } from '../app.js';

export default async function indicators({ root, query }) {
  setCrumbs([{ label: 'Indicadores y reportes' }]);
  const from = query.desde || '';
  const to = query.hasta || '';
  const qs = new URLSearchParams(Object.entries({ from, to }).filter(([, v]) => v)).toString();
  const data = await api.get(`/indicators${qs ? '?' + qs : ''}`);
  const t = data.totals;
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Desempeño de la planificación</div><h1>Indicadores y reportes</h1>
      <p>Indicadores calculados sobre el plan oficial de cada evento y sus programaciones manual y optimizada.</p></div>
    <div class="actions"><button class="btn" data-xlsx>${icon('table')}Descargar Excel</button><button class="btn primary" data-pdf>${icon('file')}Descargar PDF</button></div></div>
    <div class="row" style="margin-bottom:16px"><label class="field" style="flex-direction:row;align-items:center;gap:8px">Desde <input type="date" data-from value="${esc(from)}" style="width:auto"></label>
      <label class="field" style="flex-direction:row;align-items:center;gap:8px">Hasta <input type="date" data-to value="${esc(to)}" style="width:auto"></label>
      <button class="btn sm" data-apply>Aplicar</button>${from || to ? '<button class="btn sm ghost" data-clear>Quitar filtro</button>' : ''}<span class="small muted">${t.events} evento(s) no cancelado(s)</span></div>
    <div class="kpis">
      ${kpi({ label: 'Costo total de contratación (CT)', value: money(t.ct), small: true, ico: 'coins', foot: 'Σ C·X del plan oficial' })}
      ${kpi({ label: 'Variación porcentual del costo (VP)', value: pct(t.vp), ico: 'scale', foot: `${money(t.savings)} sobre ${money(t.conventional_cost)}`, accent: true })}
      ${kpi({ label: 'Diferencia de personal (DP)', value: num(t.dp), ico: 'users', foot: 'Asignado − mínimo requerido' })}
      ${kpi({ label: 'Porcentaje de cobertura (PC)', value: pct(t.pc), ico: 'target', bar: t.pc ?? 0, foot: 'Promedio de eventos con asignaciones' })}
      ${kpi({ label: 'Tiempo de planificación', value: `${num(t.planning_minutes_manual)} min`, small: true, ico: 'clock', foot: `Manual registrado · solucionador ${num(t.solver_seconds, 2)} s` })}
      ${kpi({ label: 'Conflictos de programación', value: num(t.conflicts), ico: 'alert', foot: 'Cruces o incumplimientos' })}
      ${kpi({ label: 'Horas adicionales', value: `${num(t.extra_hours, 1)} h`, small: true, ico: 'clock', foot: 'Sobre la duración de referencia' })}
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Fórmulas</h3></div>
      <div class="grid g2" style="gap:10px">
        <div class="formula">CT = Σ C<sub>ijt</sub> · X<sub>ijt</sub></div>
        <div class="formula">VP = (Costo convencional − Costo optimizado) / Costo convencional × 100</div>
        <div class="formula">DP = Personal asignado − Personal mínimo requerido</div>
        <div class="formula">PC = Persona-hora cubierta / Persona-hora requerida × 100</div>
      </div>
      <p class="small muted" style="margin-top:10px">El costo convencional es la programación manual registrada o, si no existe, la regla convencional simulada de la última optimización. VP total incluye solo los eventos con ambas programaciones. Conflictos: asignaciones con cruces de horario o incumplimientos de disponibilidad, competencia o límites.</p>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Costo convencional frente a optimizado por evento</h3></div>
      ${data.events.some((e) => e.conventional_cost != null) ? '<div style="height:300px"><canvas data-c aria-label="Costos por evento"></canvas></div>' : '<p class="muted small">Optimiza al menos un evento para ver la comparación.</p>'}</div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Indicadores por evento</h3></div><div data-t></div></div>`;
  const go = (f, tt) => (location.hash = `/indicadores?${new URLSearchParams(Object.entries({ desde: f, hasta: tt }).filter(([, v]) => v))}`);
  root.querySelector('[data-apply]').addEventListener('click', () => go(root.querySelector('[data-from]').value, root.querySelector('[data-to]').value));
  root.querySelector('[data-clear]')?.addEventListener('click', () => go('', ''));
  root.querySelector('[data-xlsx]').addEventListener('click', () => api.download(`/reports/indicators.xlsx${qs ? '?' + qs : ''}`).catch(handleError));
  root.querySelector('[data-pdf]').addEventListener('click', () => api.download(`/reports/indicators.pdf${qs ? '?' + qs : ''}`).catch(handleError));
  const comp = data.events.filter((e) => e.conventional_cost != null);
  const c = root.querySelector('[data-c]');
  if (c) barChart(c, { labels: comp.map((e) => (e.name.length > 28 ? e.name.slice(0, 27) + '…' : e.name)), series: [{ label: 'Convencional', data: comp.map((e) => e.conventional_cost), color: '#2E6DB4' }, { label: 'Optimizado', data: comp.map((e) => e.optimized_cost), color: '#B9862C' }], isMoney: true });
  mountTable(root.querySelector('[data-t]'), {
    rows: data.events, search: (e) => `${e.name} ${e.category_name || ''}`,
    empty: 'Sin eventos en el periodo.',
    onRowClick: (e) => (location.hash = `/eventos/${e.event_id}`),
    columns: [
      { key: 'date', label: 'Fecha', render: (e) => `<span class="nowrap">${fmtDate(e.date)}</span>` },
      { key: 'name', label: 'Evento', render: (e) => `<b>${esc(e.name)}</b><div class="tiny muted">${esc(e.category_name || '')} · plan ${e.official_plan}</div>` },
      { key: 'ct', label: 'CT', align: 'right', render: (e) => money(e.ct) },
      { key: 'conventional_cost', label: 'Convencional', align: 'right', render: (e) => `${money(e.conventional_cost)}${e.conventional_source ? `<div class="tiny muted">${esc(e.conventional_source)}</div>` : ''}` },
      { key: 'optimized_cost', label: 'Optimizado', align: 'right', render: (e) => money(e.optimized_cost) },
      { key: 'vp', label: 'VP', align: 'right', render: (e) => pct(e.vp) },
      { key: 'dp', label: 'DP', align: 'right' },
      { key: 'pc', label: 'PC', align: 'right', render: (e) => pct(e.pc) },
      { key: 'conflicts', label: 'Conflictos', align: 'right', render: (e) => (e.conflicts ? `<span class="badge bad">${e.conflicts}</span>` : '0') },
      { key: 'extra_hours', label: 'H. adic.', align: 'right', render: (e) => num(e.extra_hours, 1) },
      { key: 'planning_minutes_manual', label: 'Planif. (min)', align: 'right', render: (e) => num(e.planning_minutes_manual) },
    ],
  });
}

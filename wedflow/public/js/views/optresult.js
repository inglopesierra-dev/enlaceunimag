import { icon } from '../lib/icons.js';
import { esc, money, pct, num, fmtRange, badge, can } from '../lib/ui.js';
import { barChart } from '../lib/charts.js';
import { renderTimeline } from '../lib/timeline.js';

/** Presenta el resultado de una ejecución de optimización. */
export function renderResult(container, r, { onApply, onRetry, roleColors = {} } = {}) {
  if (r.status === 'datos_insuficientes' || r.status === 'no_factible') {
    container.innerHTML = `<div class="callout ${r.status === 'no_factible' ? 'bad' : 'warn'}">${icon('alert')}<div>
      <b>${r.status === 'no_factible' ? 'No existe una asignación factible' : 'Datos insuficientes para optimizar'}</b><br>${esc(r.message)}
      ${r.reasons?.length ? `<ul>${r.reasons.map((x) => `<li>${esc(x.message)}${x.detail?.length ? `<div class="tiny muted">${x.detail.map(esc).join(' · ')}</div>` : ''}</li>`).join('')}</ul>` : ''}
      <div class="row" style="margin-top:10px"><a class="btn sm" href="#/trabajadores">${icon('users')}Revisar trabajadores</a><a class="btn sm" href="#/tarifas">${icon('coins')}Revisar tarifas</a>${onRetry ? `<button class="btn sm primary" data-retry>${icon('spark')}Volver a optimizar</button>` : ''}</div>
    </div></div>
    ${r.model_size ? `<p class="tiny muted" style="margin-top:10px">${esc(r.method)} · ${r.model_size.variables} variables · ${r.model_size.constraints} restricciones · estado del solucionador: ${esc(r.solver_status)}</p>` : ''}
    ${r.unassigned?.length ? `<div class="card flat" style="margin-top:14px"><div class="card-head"><h3>Trabajadores y motivos</h3></div>${unassignedTable(r.unassigned)}</div>` : ''}`;
    container.querySelector('[data-retry]')?.addEventListener('click', onRetry);
    return;
  }
  const c = r.comparison;
  const o = r.optimized;
  const conv = r.conventional;
  const better = c.difference > 0;
  container.innerHTML = `
    <div class="callout ${r.optimal ? 'ok' : 'warn'}">${icon(r.optimal ? 'shield' : 'info')}<div><b>${r.optimal ? 'Solución óptima demostrada' : 'Solución factible (optimalidad no demostrada)'}</b> · ${esc(r.message)}
      <div class="tiny muted" style="margin-top:4px">${esc(r.method)} · ${r.model_size.variables} variables binarias · ${r.model_size.constraints} restricciones · ${num(r.duration_ms, 0)} ms</div></div></div>
    ${r.warnings?.length ? `<div class="callout warn" style="margin-top:10px">${icon('alert')}<div><b>Alertas</b><ul>${r.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div></div>` : ''}
    <div class="compare" style="margin-top:16px">
      <div class="card"><div class="eyebrow" style="color:var(--muted)">Programación convencional</div><div class="big-number" style="margin:8px 0">${money(c.conventional_cost)}</div>
        <div class="small muted">${esc(conv.method)}</div><div class="divider"></div>
        <div class="stat-line"><span>Personal</span><b>${c.conventional_staff}</b></div><div class="stat-line"><span>Cobertura</span><b>${pct(c.conventional_coverage)}</b></div><div class="stat-line"><span>Conflictos</span><b>${c.conventional_conflicts}</b></div></div>
      <div class="vs">vs</div>
      <div class="card tint" style="border-color:var(--gold-soft)"><div class="eyebrow">Alternativa optimizada</div><div class="big-number" style="margin:8px 0">${money(c.optimized_cost)}</div>
        <div class="small">${better ? `<span class="badge ok">Ahorro de ${money(c.difference)} · ${pct(c.savings_pct)}</span>` : c.difference === 0 ? '<span class="badge gold">Mismo costo que la convencional</span>' : `<span class="badge warn">Cuesta ${money(-c.difference)} más, pero cumple las restricciones que la convencional incumple</span>`}</div><div class="divider"></div>
        <div class="stat-line"><span>Personal</span><b>${c.optimized_staff}</b></div><div class="stat-line"><span>Cobertura</span><b>${pct(c.optimized_coverage)}</b></div><div class="stat-line"><span>Conflictos</span><b>${c.optimized_conflicts}</b></div></div>
    </div>
    ${c.conventional_coverage < 100 ? `<div class="callout warn" style="margin-top:10px">${icon('alert')}<div class="small">La programación convencional cubre solo el ${pct(c.conventional_coverage)} de los requerimientos (persona-hora). Su costo es menor porque está incompleta: compara costos solo cuando ambas programaciones cubren el evento.</div></div>` : ''}
    ${c.difference === 0 ? '<p class="small muted" style="margin-top:8px">Cuando todos los trabajadores de una función tienen la misma tarifa y la programación convencional no asigna personal de más, ambas alternativas cuestan lo mismo. El ahorro aparece con tarifas individuales distintas, trabajadores con varias funciones o sobreasignación en la programación convencional.</p>' : ''}
    ${onApply && can('planificador') ? `<div class="row" style="margin-top:14px">${r.applied ? '<span class="badge ok">Aplicada como plan oficial</span>' : `<button class="btn gold" data-apply>${icon('check')}Aplicar como plan oficial</button>`}<span class="small muted">Guarda esta asignación en la programación del evento.</span></div>` : ''}
    <div class="grid g2" style="margin-top:16px;align-items:start">
      <div class="card"><div class="card-head"><h3>Personal recomendado por función</h3></div>
        <div style="height:${Math.max(200, o.by_role.length * 34)}px"><canvas data-chart aria-label="Personal por función"></canvas></div>
        <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Función</th><th class="right">Mínimo</th><th class="right">Asignado</th><th class="right">Costo</th></tr></thead>
        <tbody>${o.by_role.map((x) => `<tr><td>${esc(x.role_name)}</td><td class="right num">${Math.max(x.minimum, x.shift_demand)}</td><td class="right num"><b>${x.valid}</b></td><td class="right num">${money(x.cost)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="right">${o.staff_minimum}</td><td class="right">${o.staff_assigned}</td><td class="right">${money(o.total_cost)}</td></tr></tfoot></table></div></div>
      <div class="card"><div class="card-head"><h3>Restricciones verificadas</h3></div>
        ${r.constraints.map((x) => `<div class="constraint"><span class="key">${x.key}</span><div><b class="small">${esc(x.name)}</b><div class="tiny muted">${esc(x.detail)}</div></div>
          ${x.ok === null ? '<span class="badge">N/A</span>' : x.ok ? (x.warn ? `<span class="badge warn">${icon('alert', 'inline')} Alerta</span>` : `<span class="badge ok">${icon('check', 'inline')} Cumple</span>`) : `<span class="badge bad">${icon('x', 'inline')} No cumple</span>`}</div>`).join('')}
        ${o.activities.length ? `<div class="divider"></div><b class="small">Personal presente por actividad</b>${o.activities.map((a) => `<div class="stat-line" style="margin-top:6px"><span>${esc(a.name)} <span class="tiny">(${fmtRange(a.start_at, a.end_at)})</span></span><b>${a.staff} persona(s)${a.gap ? ' <span class="badge warn">hay franjas sin personal</span>' : ''}</b></div>`).join('')}` : ''}
      </div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Turnos asignados</h3><span class="small muted">${o.rows.length} asignación(es)</span></div><div data-tl></div></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Trabajadores seleccionados</h3></div>
      <div class="table-wrap"><table><thead><tr><th>Trabajador</th><th>Función</th><th>Horario</th><th class="right">Horas</th><th class="right">Costo</th><th>Tarifa</th></tr></thead><tbody>
      ${o.rows.slice().sort((a, b) => a.role_name.localeCompare(b.role_name) || a.start_at.localeCompare(b.start_at)).map((x) => `<tr><td>${esc(x.worker_name)}</td><td>${esc(x.role_name)}</td><td class="nowrap">${fmtRange(x.start_at, x.end_at)}</td><td class="right num">${x.hours}</td><td class="right num">${money(x.cost)}</td><td><span class="badge ${x.rate_source === 'trabajador' ? 'gold' : ''}">${x.rate_source === 'trabajador' ? 'Propia' : 'Función'}</span></td></tr>`).join('')}
      </tbody></table></div></div>
    ${conv.conflicts.length ? `<div class="card" style="margin-top:16px"><div class="card-head"><h3>Conflictos detectados en la programación convencional</h3>${badge('no_factible')}</div>
      <div class="table-wrap"><table><thead><tr><th>Trabajador</th><th>Función</th><th>Motivo</th></tr></thead><tbody>${conv.conflicts.map((x) => `<tr><td>${esc(x.worker_name)}</td><td>${esc(x.role_name)}</td><td class="small">${x.issues.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Trabajadores no asignados y motivo</h3><span class="small muted">${r.unassigned.length}</span></div>${r.unassigned.length ? unassignedTable(r.unassigned) : '<p class="muted small">Todos los trabajadores activos quedaron asignados.</p>'}</div>`;
  container.querySelector('[data-apply]')?.addEventListener('click', onApply);
  barChart(container.querySelector('[data-chart]'), {
    labels: o.by_role.map((x) => x.role_name),
    series: [{ label: 'Mínimo requerido', data: o.by_role.map((x) => Math.max(x.minimum, x.shift_demand)), color: '#2E6DB4' }, { label: 'Asignado', data: o.by_role.map((x) => x.valid), color: '#B9862C' }],
    horizontal: true,
  });
  const byWorker = new Map();
  for (const x of o.rows) {
    if (!byWorker.has(x.worker_id)) byWorker.set(x.worker_id, { label: x.worker_name, sub: x.role_name, bars: [] });
    byWorker.get(x.worker_id).bars.push({ start_at: x.start_at, end_at: x.end_at, color: roleColors[x.role_id] || '#B08D57', text: x.role_name, conflict: x.issues.length > 0, long: x.hours > (r.reference_hours || 99) });
  }
  renderTimeline(container.querySelector('[data-tl]'), { rows: [...byWorker.values()].sort((a, b) => a.sub.localeCompare(b.sub) || a.bars[0].start_at.localeCompare(b.bars[0].start_at)), activities: o.activities });
}

function unassignedTable(list) {
  return `<div class="table-wrap"><table><thead><tr><th>Trabajador</th><th>Situación</th><th>Motivo</th></tr></thead><tbody>
    ${list.map((u) => `<tr><td>${esc(u.worker_name)}</td><td>${u.eligible ? '<span class="badge info">Elegible</span>' : '<span class="badge warn">No elegible</span>'}</td><td class="small">${u.reasons.map(esc).join('<br>') || '—'}</td></tr>`).join('')}
  </tbody></table></div>`;
}

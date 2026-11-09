import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { esc, money, pct, fmtDate, badge, emptyState, can } from '../lib/ui.js';
import { setCrumbs } from '../app.js';

export default async function optimize({ root }) {
  setCrumbs([{ label: 'Optimización' }]);
  const events = await api.get('/events');
  const active = events.filter((e) => e.status !== 'cancelado');
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Módulo principal</div><h1>Optimización de personal</h1>
      <p>Elige un evento para calcular la asignación de menor costo que cumple todas las restricciones operativas y compararla con la programación convencional.</p></div></div>
    <div class="grid g3" style="margin-bottom:18px">
      <div class="card span2"><div class="eyebrow">Modelo de programación lineal entera</div>
        <div class="formula" style="margin-top:10px">min Z = Σ<sub>i</sub> Σ<sub>j</sub> Σ<sub>t</sub> C<sub>ijt</sub> · X<sub>ijt</sub>, &nbsp; X<sub>ijt</sub> ∈ {0, 1}</div>
        <div class="grid g2" style="margin-top:12px;gap:8px 18px">
          ${[
            ['A', 'Cobertura mínima', 'Σ X por función ≥ mínimo requerido del evento.'],
            ['B', 'Disponibilidad', 'Solo existen variables para trabajadores disponibles en todo el turno.'],
            ['C', 'Competencias', 'Solo funciones autorizadas para cada trabajador.'],
            ['D', 'Sin superposición', 'En cada instante, un trabajador cubre a lo sumo un turno (incluye otros eventos).'],
            ['E', 'Binaria', 'Cada X vale 0 o 1.'],
            ['F', 'Duración de turnos', 'Máximo de turnos (y opcionalmente de horas) por trabajador; alertas sobre la referencia.'],
            ['G', 'Cobertura operativa', 'Cada turno tiene su cantidad requerida durante todo su horario.'],
          ].map(([k, t, d]) => `<div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="badge dark" style="font-family:var(--serif);font-size:14px">${k}</span><span class="small"><b>${t}.</b> <span class="muted">${d}</span></span></div>`).join('')}
        </div></div>
      <div class="card dark"><div class="eyebrow" style="color:var(--gold-soft)">Transparencia</div><h3 style="color:#fff;margin:6px 0">Solo es óptimo si se demuestra</h3>
        <p class="small muted">El modelo se resuelve con HiGHS (ramificación y acotamiento, brecha de optimalidad 0). Wedflow muestra «óptima» solo cuando el solucionador lo demuestra. La programación convencional de comparación es tu programación manual o, si no existe, una regla automática identificada como tal.</p></div>
    </div>
    <div class="card"><div class="card-head"><h3>Eventos</h3></div>
    ${active.length ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Evento</th><th class="right">Turnos / mínimo</th><th>Última optimización</th><th class="right">Convencional</th><th class="right">Optimizado</th><th class="right">Diferencia</th><th></th></tr></thead><tbody>
      ${active.map((e) => {
        const r = e.last_run;
        const diff = r && r.conventional_cost != null && r.optimized_cost != null ? r.conventional_cost - r.optimized_cost : null;
        return `<tr><td class="nowrap">${fmtDate(e.date)}</td><td><b>${esc(e.name)}</b><div class="tiny muted">${esc(e.category_name || '')}</div></td><td class="right">${e.staff_demand} / ${e.staff_minimum}</td>
          <td>${r ? `${badge(r.status)}${r.applied ? ' <span class="badge dark">Aplicada</span>' : ''}` : '<span class="muted small">Sin ejecutar</span>'}</td>
          <td class="right num">${r ? money(r.conventional_cost) : '—'}</td><td class="right num">${r ? money(r.optimized_cost) : '—'}</td>
          <td class="right num">${diff != null ? `${money(diff)}<div class="tiny muted">${r.conventional_cost ? pct((diff / r.conventional_cost) * 100) : ''}</div>` : '—'}</td>
          <td class="actions-cell"><a class="btn sm ${can('planificador') ? 'gold' : ''}" href="#/eventos/${e.id}?tab=optimizar">${icon('spark')}${r ? 'Ver' : 'Optimizar'}</a></td></tr>`;
      }).join('')}</tbody></table></div>` : emptyState('No hay eventos para optimizar', 'Crea un evento con sus turnos y registra trabajadores, tarifas y disponibilidad.', '<a class="btn primary" href="#/eventos?nuevo=1">Crear evento</a>')}
    </div>`;
}

import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { store, esc, money, num, pct, kpi, fmtDate, monthShort, badge, emptyState, can } from '../lib/ui.js';
import { barChart } from '../lib/charts.js';
import { setCrumbs } from '../app.js';
import { formatTime12 } from '../lib/time.js';

export default async function dashboard({ root }) {
  setCrumbs([{ label: 'Inicio' }]);
  const d = await api.get('/dashboard');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const hist = d.history.find((h) => h.source === 'caso_estudio');
  root.innerHTML = `
    <div class="page-head">
      <div class="titles"><div class="eyebrow">${esc(store.company.name)}</div><h1>${greet}, ${esc(store.user.name.split(' ')[0])}</h1>
        <p>Resumen de la operación: eventos, personal, costos y resultados de la optimización.</p></div>
      <div class="actions">${can('planificador') ? `<a class="btn" href="#/trabajadores">${icon('users')}Trabajadores</a><a class="btn primary" href="#/eventos?nuevo=1">${icon('plus')}Nuevo evento</a>` : ''}</div>
    </div>
    <div class="kpis">
      ${kpi({ label: 'Eventos registrados', value: num(d.total_events), ico: 'rings', foot: `${d.upcoming_count} próximo(s)` })}
      ${kpi({ label: 'Eventos próximos', value: num(d.upcoming_count), ico: 'calendar', foot: d.upcoming[0] ? `El siguiente: ${fmtDate(d.upcoming[0].date)}` : 'Sin eventos programados' })}
      ${kpi({ label: 'Trabajadores disponibles', value: num(d.workers.disponibles), ico: 'users', foot: `${d.workers.total} registrados · ${d.workers.inactivos} inactivos` })}
      ${kpi({ label: 'Trabajadores asignados', value: num(d.workers.asignados), ico: 'briefcase', foot: 'En eventos próximos (plan oficial)' })}
      ${kpi({ label: 'Costo estimado de contratación', value: money(d.estimated_cost), small: true, ico: 'coins', foot: 'Eventos próximos: plan asignado o, si no hay, costo de referencia' })}
      ${kpi({ label: 'Cobertura de personal', value: pct(d.coverage_pct), ico: 'target', bar: d.coverage_pct ?? 0, foot: 'Persona-hora cubierta / requerida' })}
      ${kpi({ label: 'Conflictos de programación', value: num(d.conflicts), ico: 'alert', foot: `${d.alerts} alerta(s) de duración` })}
      ${kpi({ label: 'Ahorro por optimización', value: money(d.savings), small: true, ico: 'spark', accent: true, foot: d.optimized_events ? `${d.optimized_events} evento(s) optimizado(s) · ${pct(d.savings_pct)}` : 'Aún no se ha aplicado ninguna optimización' })}
    </div>
    <div class="grid g3" style="margin-top:18px">
      <div class="card span2"><div class="card-head"><h3>Próximos eventos</h3><a class="btn sm ghost" href="#/eventos">Ver todos ${icon('arrowRight')}</a></div>
        <div class="event-list">${d.upcoming.length ? d.upcoming.map((e) => `
          <a class="event-item" href="#/eventos/${e.id}">
            <div class="datebox"><span class="d">${Number(e.date.slice(8))}</span><span class="m">${monthShort(e.date)}</span></div>
            <div style="min-width:0"><div class="title">${esc(e.name)}</div><div class="small muted">${icon('pin', 'inline')} ${esc(e.location || 'Sin ubicación')} · ${formatTime12(e.start_time)} · ${num(e.guests)} invitados</div>
              <div class="bar" style="max-width:280px"><span style="width:${e.pc || 0}%"></span></div></div>
            <div class="right"><div class="small"><b>${e.staff_assigned}</b> / ${e.staff_minimum} personas</div><div class="small muted">${money(e.estimate)}${e.has_assignments ? '' : ' (ref.)'}</div>
              <div style="margin-top:4px">${e.conflicts ? `<span class="badge bad">${e.conflicts} conflicto(s)</span>` : badge(e.status)}</div></div>
          </a>`).join('') : emptyState('Sin eventos próximos', 'Registra un evento para empezar a planificar su personal.', can('planificador') ? `<a class="btn primary" href="#/eventos?nuevo=1">${icon('plus')}Crear evento</a>` : '', 'calendar')}</div>
      </div>
      <div class="card"><div class="card-head"><h3>Eventos por categoría</h3></div>
        ${d.events_by_category.length ? '<div style="height:240px"><canvas id="c-cat" aria-label="Eventos por categoría"></canvas></div>' : '<p class="muted small">Sin eventos registrados.</p>'}
        <table style="margin-top:10px"><tbody>${d.events_by_category.map((c) => `<tr><td>${esc(c.name)}</td><td class="right num"><b>${c.n}</b></td></tr>`).join('')}</tbody></table>
      </div>
    </div>
    <div class="grid g3" style="margin-top:18px">
      <div class="card span2"><div class="card-head"><h3>Costo de personal por mes</h3><span class="small muted">Plan oficial de cada evento</span></div>
        ${d.cost_by_month.length ? '<div style="height:260px"><canvas id="c-month" aria-label="Costo por mes"></canvas></div>' : emptyState('Aún no hay asignaciones', 'Cuando programes u optimices un evento verás aquí la evolución del costo.', '', 'chart')}
      </div>
      ${hist ? `<div class="card dark">
        <div class="eyebrow" style="color:var(--gold-soft)">Información histórica · caso de estudio</div>
        <h3 style="color:#fff;margin:6px 0 12px">${esc(hist.title)} <span class="small muted" style="font-family:var(--sans)">${esc(hist.period || '')}</span></h3>
        <div class="grid g2" style="gap:12px">
          <div><div class="muted small">Bodas registradas</div><div class="big-number" style="color:#fff">${num(hist.data.total_bodas)}</div></div>
          <div><div class="muted small">Asignaciones adicionales</div><div class="big-number" style="color:#fff">${num(hist.data.asignaciones_adicionales)}</div></div>
          <div><div class="muted small">Costo convencional</div><div class="serif" style="font-size:22px">${money(hist.data.costo_convencional)}</div></div>
          <div><div class="muted small">Costo de referencia</div><div class="serif" style="font-size:22px">${money(hist.data.costo_referencia)}</div></div>
        </div>
        <div class="divider" style="background:#3a342e"></div>
        <div class="row"><span class="muted small" style="flex:1">Diferencia acumulada</span><span class="serif" style="font-size:26px;color:var(--gold-soft)">${money(hist.data.diferencia_acumulada)}</span></div>
        <p class="tiny muted" style="margin-top:8px">${esc(hist.data.nota || '')}</p>
        <a class="btn sm" href="#/historial" style="margin-top:6px">Ver análisis ${icon('arrowRight')}</a>
      </div>` : `<div class="card tint"><h3>Consejo</h3><p class="muted">Carga tus datos históricos (formulario o Excel) en <a href="#/historial">Historial y análisis</a> para comparar tu operación en el tiempo.</p></div>`}
    </div>`;
  const cat = root.querySelector('#c-cat');
  if (cat) barChart(cat, { labels: d.events_by_category.map((c) => c.name), series: [{ label: 'Eventos', data: d.events_by_category.map((c) => c.n) }], horizontal: true });
  const month = root.querySelector('#c-month');
  if (month) barChart(month, { labels: d.cost_by_month.map((m) => `${monthShort(m.month + '-01')} ${m.month.slice(2, 4)}`), series: [{ label: 'Costo', data: d.cost_by_month.map((m) => m.cost) }], isMoney: true });
}

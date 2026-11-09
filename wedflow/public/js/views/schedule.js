import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { esc, money, fmtDate, fmtRange, tabs, kpi, num, badge } from '../lib/ui.js';
import { setCrumbs, catalogs, navigate } from '../app.js';
import { addDays, todayISO, durationHours } from '../lib/time.js';
import { renderTimeline } from '../lib/timeline.js';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default async function schedule({ root, query }) {
  setCrumbs([{ label: 'Programación de turnos' }]);
  const { roles } = await catalogs();
  const roleColor = Object.fromEntries(roles.map((r) => [r.id, r.color || '#B08D57']));
  const roleByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));
  let month = (query.mes || todayISO().slice(0, 7));
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Turnos y calendario</div><h1>Programación de turnos</h1>
    <p>Calendario de eventos, turnos por trabajador, personal ocupado y cruces de horario según el plan oficial de cada evento.</p></div></div>
    <nav class="tabs" data-tabs></nav><div data-pane></div>`;
  const pane = root.querySelector('[data-pane]');

  const monthRange = (m) => {
    const first = `${m}-01`;
    const d = new Date(first + 'T12:00:00');
    const start = addDays(first, -((d.getDay() + 6) % 7));
    return { start, end: addDays(start, 41) };
  };

  const calendar = async () => {
    const { start, end } = monthRange(month);
    const data = await api.get(`/schedule?from=${start}&to=${end}`);
    const confEvents = new Set(data.conflicts.flatMap((c) => [c.a_event, c.b_event]));
    const today = todayISO();
    const [y, m] = month.split('-').map(Number);
    const busy = new Set(data.assignments.filter((a) => a.start_at.slice(0, 7) === month).map((a) => a.worker_id));
    pane.innerHTML = `<div class="kpis" style="margin-bottom:16px">
        ${kpi({ label: 'Eventos del mes', value: num(data.events.filter((e) => e.date.slice(0, 7) === month).length), ico: 'rings' })}
        ${kpi({ label: 'Turnos programados', value: num(data.shifts.filter((s) => s.start_at.slice(0, 7) === month).reduce((a, s) => a + s.quantity, 0)), ico: 'clock', foot: 'Puestos en turnos del mes' })}
        ${kpi({ label: 'Trabajadores ocupados', value: num(busy.size), ico: 'users', foot: 'Con al menos un turno este mes' })}
        ${kpi({ label: 'Cruces de horario', value: num(data.conflicts.length), ico: 'alert', foot: 'Entre eventos (plan oficial)' })}
      </div>
      <div class="row" style="margin-bottom:12px"><button class="btn icon" data-m="-1" aria-label="Mes anterior">${icon('chevronLeft')}</button>
        <h2 style="min-width:220px;text-align:center">${MONTHS[m - 1]} ${y}</h2><button class="btn icon" data-m="1" aria-label="Mes siguiente">${icon('chevronRight')}</button>
        <button class="btn sm" data-today>Hoy</button></div>
      <div class="cal">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="dow">${d}</div>`).join('')}
      ${Array.from({ length: 42 }, (_, i) => {
        const d = addDays(start, i);
        const evs = data.events.filter((e) => e.date === d);
        return `<div class="day ${d.slice(0, 7) !== month ? 'out' : ''} ${d === today ? 'today' : ''}"><span class="n">${Number(d.slice(8))}</span>
          ${evs.map((e) => `<a class="ev ${confEvents.has(e.id) ? 'conf' : ''}" href="#/eventos/${e.id}?tab=oficial" title="${esc(e.name)}">${e.status === 'cancelado' ? '<s>' : ''}${esc(e.start_at.slice(11))} ${esc(e.name)}${e.status === 'cancelado' ? '</s>' : ''}</a>`).join('')}</div>`;
      }).join('')}</div>
      ${data.conflicts.length ? `<div class="callout bad" style="margin-top:14px">${icon('alert')}<div><b>Cruces de horario entre eventos</b><ul>${data.conflicts.map((c) => `<li>${esc(c.worker_name)}: «${esc(data.events.find((e) => e.id === c.a_event)?.name)}» y «${esc(data.events.find((e) => e.id === c.b_event)?.name)}»</li>`).join('')}</ul></div></div>` : ''}`;
    pane.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
      const d = new Date(`${month}-15T12:00:00`);
      d.setMonth(d.getMonth() + Number(b.dataset.m));
      month = d.toISOString().slice(0, 7);
      calendar();
    }));
    pane.querySelector('[data-today]').addEventListener('click', () => {
      month = todayISO().slice(0, 7);
      calendar();
    });
  };

  const timeline = async () => {
    let from = query.desde || todayISO();
    let days = 7;
    const draw = async () => {
      const to = addDays(from, days - 1);
      const data = await api.get(`/schedule?from=${from}&to=${to}`);
      const inRange = data.assignments.filter((a) => a.start_at.slice(0, 10) >= from && a.start_at.slice(0, 10) <= to);
      const conflictIds = new Set(data.conflicts.flatMap((c) => [c.a, c.b]));
      const byWorker = new Map();
      for (const a of inRange) {
        if (!byWorker.has(a.worker_id)) byWorker.set(a.worker_id, { label: a.worker_name, bars: [], hours: 0 });
        const row = byWorker.get(a.worker_id);
        const ev = data.events.find((e) => e.id === a.event_id);
        row.hours += durationHours(a.start_at, a.end_at);
        row.bars.push({ start_at: a.start_at, end_at: a.end_at, color: roleColor[roleByName[a.role_name]], text: `${a.role_name} · ${ev?.name || ''}`, conflict: conflictIds.has(a.id), title: `${ev?.name}: ${a.role_name}` });
      }
      const rows = [...byWorker.values()].map((r) => ({ ...r, sub: `${num(r.hours, 1)} h · ${r.bars.length} turno(s)` })).sort((a, b) => a.label.localeCompare(b.label));
      pane.querySelector('[data-body]').innerHTML = `<div class="card"><div class="card-head"><h3>${fmtDate(from)} – ${fmtDate(to)}</h3><span class="small muted">${rows.length} trabajador(es) ocupados · ${inRange.length} turno(s)</span></div><div data-tl></div></div>
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>Eventos del periodo</h3></div>${data.events.filter((e) => e.date >= from && e.date <= to).map((e) => `<a class="event-item" href="#/eventos/${e.id}?tab=oficial" style="grid-template-columns:1fr auto;margin-bottom:8px"><span><b>${esc(e.name)}</b><div class="small muted">${fmtDate(e.date, { weekday: true })} · ${fmtRange(e.start_at, e.end_at)} · plan ${e.official_plan}</div></span>${badge(e.status)}</a>`).join('') || '<p class="muted small">Sin eventos en el periodo.</p>'}</div>`;
      renderTimeline(pane.querySelector('[data-tl]'), { rows, emptyText: 'No hay turnos asignados en este periodo (plan oficial).' });
    };
    pane.innerHTML = `<div class="row" style="margin-bottom:12px"><label class="field" style="flex-direction:row;align-items:center;gap:8px">Desde <input type="date" data-from value="${from}" style="width:auto"></label>
      <div class="seg">${[1, 3, 7, 14].map((d) => `<button data-days="${d}" class="${d === days ? 'active' : ''}">${d === 1 ? '1 día' : `${d} días`}</button>`).join('')}</div></div><div data-body></div>`;
    pane.querySelector('[data-from]').addEventListener('change', (e) => {
      from = e.target.value || todayISO();
      draw();
    });
    pane.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => {
      days = Number(b.dataset.days);
      pane.querySelectorAll('[data-days]').forEach((x) => x.classList.toggle('active', x === b));
      draw();
    }));
    await draw();
  };

  const byWorker = async () => {
    const workers = await api.get('/workers');
    pane.innerHTML = `<div class="row" style="margin-bottom:12px"><label class="field" style="min-width:280px">Trabajador<select data-w><option value="">Selecciona…</option>${workers.map((w) => `<option value="${w.id}">${esc(w.full_name)}</option>`).join('')}</select></label></div><div data-body><div class="empty">Elige un trabajador para consultar su programación.</div></div>`;
    pane.querySelector('[data-w]').addEventListener('change', async (e) => {
      if (!e.target.value) return;
      const w = await api.get(`/workers/${e.target.value}`);
      const off = w.history.filter((h) => h.official);
      const body = pane.querySelector('[data-body]');
      body.innerHTML = `<div class="card"><div class="card-head"><h3>${esc(w.full_name)}</h3>${badge(w.status)}<a class="btn sm" href="#/trabajadores/${w.id}">Ficha</a></div><div data-tl></div>
        <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Fecha</th><th>Evento</th><th>Función</th><th>Horario</th><th class="right">Costo</th></tr></thead><tbody>
        ${off.map((h) => `<tr><td>${fmtDate(h.date)}</td><td>${esc(h.event_name)}</td><td>${esc(h.role_name)}</td><td class="nowrap">${fmtRange(h.start_at, h.end_at)}</td><td class="right num">${money(h.cost)}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sin turnos en planes oficiales.</div></td></tr>'}</tbody></table></div></div>`;
      const upcoming = off.filter((h) => h.date >= addDays(todayISO(), -1)).slice(-30);
      renderTimeline(body.querySelector('[data-tl]'), { rows: upcoming.map((h) => ({ label: fmtDate(h.date, { weekday: true }), sub: esc(h.event_name), bars: [{ start_at: `2000-01-01T${h.start_at.slice(11)}`, end_at: h.end_at.slice(0, 10) > h.start_at.slice(0, 10) ? `2000-01-02T${h.end_at.slice(11)}` : `2000-01-01T${h.end_at.slice(11)}`, color: roleColor[roleByName[h.role_name]], text: h.role_name }] })), emptyText: 'Sin turnos próximos.' });
    });
    if (query.trabajador) {
      pane.querySelector('[data-w]').value = query.trabajador;
      pane.querySelector('[data-w]').dispatchEvent(new Event('change'));
    }
  };

  tabs(root.querySelector('[data-tabs]'), [
    { id: 'calendario', label: 'Calendario', icon: 'calendar' }, { id: 'linea', label: 'Turnos por trabajador', icon: 'clock' }, { id: 'trabajador', label: 'Consulta por trabajador', icon: 'user' },
  ], (t) => (t === 'calendario' ? calendar() : t === 'linea' ? timeline() : byWorker()), query.tab || 'calendario');
  void navigate;
}

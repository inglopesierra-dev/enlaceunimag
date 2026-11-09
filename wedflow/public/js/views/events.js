import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import {
  esc, money, num, pct, fmtDate, fmtRange, monthShort, badge, formModal, confirmDialog, toast, handleError, mountTable,
  emptyState, options, tabs, can, modal, loading, kpi, store,
} from '../lib/ui.js';
import { setCrumbs, catalogs, navigate } from '../app.js';
import { formatTime12, toMinutes } from '../lib/time.js';
import { renderTimeline } from '../lib/timeline.js';
import { renderResult } from './optresult.js';

const STATUS_OPTS = [['planificado', 'Planificado'], ['confirmado', 'Confirmado'], ['realizado', 'Realizado'], ['cancelado', 'Cancelado']].map(([value, label]) => ({ value, label }));

export default async function events(ctx) {
  if (ctx.params[0]) return detail(ctx, Number(ctx.params[0]));
  return list(ctx);
}

// Sugiere la categoría según invitados: por rango si está definido; si no, la de referencia más cercana.
function suggestCategory(cats, guests) {
  if (!guests) return null;
  const byRange = cats.find((c) => (c.min_guests == null || guests >= c.min_guests) && (c.max_guests == null || guests <= c.max_guests) && (c.min_guests != null || c.max_guests != null));
  if (byRange) return byRange.id;
  const ref = cats.filter((c) => c.reference_guests).sort((a, b) => Math.abs(a.reference_guests - guests) - Math.abs(b.reference_guests - guests));
  return ref[0]?.id ?? null;
}

export async function eventForm(ev = null, onDone) {
  const { categories, types } = await catalogs();
  const fields = [
    { name: 'name', label: 'Nombre o identificación del evento', required: true, full: true, placeholder: 'Ej.: Boda Ana & Luis' },
    { name: 'date', label: 'Fecha', type: 'date', required: true },
    { name: 'location', label: 'Ubicación', placeholder: 'Hotel, finca, playa…' },
    { name: 'event_type_id', label: 'Tipo de evento', type: 'select', options: options(types), numeric: true, help: types.length ? '' : 'Crea tipos en Funciones y requerimientos.' },
    { name: 'guests', label: 'Número de invitados', type: 'number', min: 0, step: 1 },
    { name: 'category_id', label: 'Categoría o tamaño', type: 'select', options: options(categories, (c) => `${c.name}${c.reference_guests ? ` (ref. ${c.reference_guests} invitados)` : ''}`), numeric: true, help: 'Define las funciones requeridas según la matriz.' },
    { name: 'status', label: 'Estado', type: 'select', options: STATUS_OPTS, empty: false },
    { name: 'start_time', label: 'Hora de inicio', type: 'time', required: true },
    { name: 'end_time', label: 'Hora de finalización', type: 'time', required: true, help: 'Si es menor que la de inicio, termina al día siguiente.' },
    { name: 'manual_planning_minutes', label: 'Tiempo de planificación manual (min)', type: 'number', min: 0, help: 'Opcional: para el indicador de tiempo de planificación.' },
    { name: 'notes', label: 'Observaciones adicionales', type: 'textarea', full: true },
  ];
  const m = formModal({
    title: ev ? 'Editar evento' : 'Nuevo evento', size: 'lg', fields,
    values: ev || { status: 'planificado', start_time: '16:00', end_time: '23:00' },
    submitText: ev ? 'Guardar cambios' : 'Crear evento',
    intro: ev ? '' : '<div class="callout info">' + icon('info') + '<span class="small">Al crear el evento se copian las funciones requeridas desde la matriz de su categoría. Luego podrás ajustarlas, agregar actividades y turnos.</span></div>',
    onSubmit: async (data) => {
      if (ev) {
        if (data.category_id !== ev.category_id && data.category_id) {
          data.reset_roles = await confirmDialog('Cambiaste la categoría. ¿Quieres reemplazar las funciones requeridas del evento por las de la matriz de la nueva categoría?', { title: 'Funciones requeridas', confirmText: 'Sí, reemplazar', danger: false });
        }
        await api.put(`/events/${ev.id}`, data);
        toast('Evento actualizado.');
        onDone?.(ev.id);
      } else {
        const r = await api.post('/events', data);
        toast('Evento creado.');
        onDone?.(r.id);
      }
    },
  });
  const guests = m.el.querySelector('[name=guests]');
  const cat = m.el.querySelector('[name=category_id]');
  guests.addEventListener('change', () => {
    if (cat.value) return;
    const s = suggestCategory(categories, Number(guests.value));
    if (s) cat.value = String(s);
  });
}

async function list({ root, query }) {
  setCrumbs([{ label: 'Eventos' }]);
  const [rows, { categories, types }] = await Promise.all([api.get('/events'), catalogs()]);
  let view = 'cards';
  try {
    view = localStorage.getItem('wf_events_view') || 'cards';
  } catch { /* sin almacenamiento local */ }
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Gestión de eventos</div><h1>Eventos</h1>
      <p>Registra cada boda con su fecha, horario, actividades, categoría y funciones requeridas.</p></div>
      <div class="actions"><div class="seg" role="tablist"><button data-v="cards">${icon('grid', 'inline')} Tarjetas</button><button data-v="table">${icon('list', 'inline')} Tabla</button></div>
      ${can('planificador') ? `<button class="btn primary" data-new>${icon('plus')}Nuevo evento</button>` : ''}</div></div><div data-body></div>`;
  const body = root.querySelector('[data-body]');
  const go = (id) => navigate(`/eventos/${id}`);
  root.querySelector('[data-new]')?.addEventListener('click', () => eventForm(null, go));
  if (query.nuevo) eventForm(null, go);
  const filters = [
    { label: 'Todos los estados', options: STATUS_OPTS, test: (r, v) => r.status === v },
    { label: 'Todas las categorías', options: options(categories), test: (r, v) => String(r.category_id) === v },
    { label: 'Todos los tipos', options: options(types), test: (r, v) => String(r.event_type_id) === v },
    { label: 'Cualquier fecha', options: [{ value: 'up', label: 'Próximos' }, { value: 'past', label: 'Anteriores' }], test: (r, v) => (v === 'up' ? r.date >= new Date().toISOString().slice(0, 10) : r.date < new Date().toISOString().slice(0, 10)) },
  ];
  const render = () => {
    root.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('active', b.dataset.v === view));
    if (!rows.length) {
      body.innerHTML = `<div class="card">${emptyState('Aún no hay eventos', 'Crea tu primer evento para programar y optimizar su personal.', can('planificador') ? `<button class="btn primary" data-new2>${icon('plus')}Crear evento</button>` : '')}</div>`;
      body.querySelector('[data-new2]')?.addEventListener('click', () => eventForm(null, go));
      return;
    }
    const columns = [
      { key: 'date', label: 'Fecha', render: (r) => `<span class="nowrap">${fmtDate(r.date, { weekday: true })}</span>` },
      { key: 'name', label: 'Evento', render: (r) => `<b>${esc(r.name)}</b><div class="tiny muted">${esc(r.location || '')}</div>` },
      { key: 'category_name', label: 'Categoría', render: (r) => esc(r.category_name || '—') },
      { key: 'guests', label: 'Invitados', align: 'right', render: (r) => num(r.guests) },
      { key: 'start_time', label: 'Horario', render: (r) => `<span class="nowrap">${formatTime12(r.start_time)} – ${formatTime12(r.end_time)}</span>` },
      { key: 'staff_assigned', label: 'Personal', align: 'right', render: (r) => `${r.staff_assigned} / ${r.staff_minimum}` },
      { key: 'assigned_cost', label: 'Costo', align: 'right', render: (r) => (r.staff_assigned ? money(r.assigned_cost) : '<span class="muted">—</span>') },
      { key: 'status', label: 'Estado', render: (r) => badge(r.status) },
    ];
    if (view === 'table') {
      mountTable(body, { columns, rows, search: (r) => `${r.name} ${r.location} ${r.category_name}`, filters, onRowClick: (r) => go(r.id) });
    } else {
      mountTable(body, { columns: columns.slice(0, 1), rows, search: (r) => `${r.name} ${r.location} ${r.category_name}`, filters, pageSize: 24 });
      body.querySelector('.table-wrap').style.display = 'none';
      const cards = document.createElement('div');
      cards.className = 'event-cards';
      body.querySelector('.table-wrap').after(cards);
      const draw = (list) => {
        cards.innerHTML = list.length ? list.map((r) => `<a class="card event-card" href="#/eventos/${r.id}">
          <div class="top"><div class="datebox"><span class="d">${Number(r.date.slice(8))}</span><span class="m">${monthShort(r.date)}</span></div>
            <div style="min-width:0"><div class="row" style="gap:6px">${badge(r.status)}${r.is_demo ? '<span class="badge gold">Prueba</span>' : ''}</div><h3 style="margin-top:4px">${esc(r.name)}</h3></div></div>
          <div class="small muted">${icon('pin', 'inline')} ${esc(r.location || 'Sin ubicación')} · ${icon('clock', 'inline')} ${formatTime12(r.start_time)} – ${formatTime12(r.end_time)}</div>
          <div class="stat-line"><span>${esc(r.category_name || 'Sin categoría')} · ${num(r.guests)} invitados</span><span><b>${r.staff_assigned}</b> / ${r.staff_minimum} personas</span></div>
          <div class="bar"><span style="width:${r.staff_minimum ? Math.min(100, (r.staff_assigned / r.staff_minimum) * 100) : 0}%"></span></div>
          <div class="stat-line"><span>${r.last_run ? `Optimización: ${badge(r.last_run.status)}` : 'Sin optimizar'}</span><b>${r.staff_assigned ? money(r.assigned_cost) : ''}</b></div>
        </a>`).join('') : '<div class="empty">No hay eventos con esos filtros.</div>';
      };
      body.addEventListener('rendered', (e) => draw(e.detail.rows));
      body.querySelector('input[type=search]').dispatchEvent(new Event('input'));
    }
  };
  root.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.v;
    try {
      localStorage.setItem('wf_events_view', view);
    } catch { /* sin almacenamiento local */ }
    render();
  }));
  render();
}

// ------------------------------------------------------------------ Detalle
async function detail({ root, query }, id) {
  const load = () => api.get(`/events/${id}`);
  let ev = await load();
  const { roles } = await catalogs();
  const roleColor = Object.fromEntries(roles.map((r) => [r.id, r.color || '#B08D57']));
  setCrumbs([{ label: 'Eventos', href: '/eventos' }, { label: ev.name }]);
  const ref = store.company.shift_reference_hours;
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="row" style="gap:8px">${badge(ev.status)}${ev.is_demo ? '<span class="badge gold">Escenario de prueba</span>' : ''}<span class="badge ${ev.official_plan === 'optimizado' ? 'dark' : ''}">Plan oficial: ${ev.official_plan}</span></div>
      <h1 style="margin-top:8px">${esc(ev.name)}</h1>
      <p>${icon('calendar', 'inline')} ${fmtDate(ev.date, { weekday: true })} · ${icon('clock', 'inline')} ${formatTime12(ev.start_time)} – ${formatTime12(ev.end_time)} · ${icon('pin', 'inline')} ${esc(ev.location || 'Sin ubicación')} · ${icon('guests', 'inline')} ${num(ev.guests)} invitados · ${esc(ev.category_name || 'Sin categoría')}${ev.type_name ? ` · ${esc(ev.type_name)}` : ''}</p></div>
    <div class="actions">${can('planificador') ? `<button class="btn" data-edit>${icon('edit')}Editar</button><button class="btn danger icon" data-del aria-label="Eliminar evento">${icon('trash')}</button>` : ''}
      <button class="btn" data-xlsx>${icon('table')}Excel</button><button class="btn" data-pdf>${icon('file')}PDF</button></div></div>
    <nav class="tabs" data-tabs></nav><div data-pane></div>`;
  root.querySelector('[data-edit]')?.addEventListener('click', () => eventForm(ev, () => navigate(`/eventos/${id}?tab=${current}`)));
  root.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDialog(`¿Eliminar el evento <b>${esc(ev.name)}</b> con sus turnos, asignaciones y optimizaciones? Esta acción no se puede deshacer.`))) return;
    try {
      await api.del(`/events/${id}`);
      toast('Evento eliminado.');
      navigate('/eventos');
    } catch (e) {
      handleError(e);
    }
  });
  root.querySelector('[data-xlsx]').addEventListener('click', () => api.download(`/reports/event/${id}.xlsx`).catch(handleError));
  root.querySelector('[data-pdf]').addEventListener('click', () => api.download(`/reports/event/${id}.pdf`).catch(handleError));
  const pane = root.querySelector('[data-pane]');
  let current = query.tab || 'resumen';
  const reload = async (tab = current) => {
    ev = await load();
    show(tab);
  };
  const show = async (tab) => {
    current = tab;
    pane.innerHTML = loading();
    try {
      if (tab === 'resumen') await summaryPane(pane, ev, reload);
      if (tab === 'turnos') await shiftsPane(pane, ev, reload, roleColor, ref);
      if (tab === 'manual') await manualPane(pane, ev, reload, roleColor);
      if (tab === 'optimizar') await optimizePane(pane, ev, reload, roleColor);
      if (tab === 'oficial') await officialPane(pane, ev, reload, roleColor);
    } catch (e) {
      pane.innerHTML = '';
      handleError(e);
    }
  };
  tabs(root.querySelector('[data-tabs]'), [
    { id: 'resumen', label: 'Resumen y requerimientos', icon: 'info' },
    { id: 'turnos', label: 'Actividades y turnos', icon: 'clock' },
    { id: 'manual', label: 'Programación manual', icon: 'edit' },
    { id: 'optimizar', label: 'Optimización', icon: 'spark' },
    { id: 'oficial', label: 'Plan oficial', icon: 'check' },
  ], show, current);
}

async function summaryPane(pane, ev, reload) {
  const [val, { roles }] = await Promise.all([api.get(`/events/${ev.id}/validate`), catalogs()]);
  const reqMap = new Map(ev.roles.map((r) => [r.role_id, r.min_count]));
  pane.innerHTML = `<div class="kpis">
      ${kpi({ label: 'Personal mínimo requerido', value: num(val.total_minimum), ico: 'users', foot: `${ev.roles.length} función(es) requerida(s)` })}
      ${kpi({ label: 'Puestos en turnos', value: num(val.total_demand), ico: 'clock', foot: `${ev.shifts.length} turno(s) definidos` })}
      ${kpi({ label: 'Costo base de referencia', value: money(val.reference_cost), small: true, ico: 'coins', foot: ev.reference_cost != null && ev.reference_cost !== val.reference_cost ? `Registrado en el caso: ${money(ev.reference_cost)}` : 'Turnos × tarifa vigente de la función' })}
      ${kpi({ label: 'Duración de referencia', value: `${val.reference_hours} h`, ico: 'clock', foot: 'Configurable por la empresa' })}
    </div>
    ${val.warnings.length ? `<div class="callout warn" style="margin-top:14px">${icon('alert')}<div><b>Revisa antes de optimizar</b><ul>${val.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div></div>` : `<div class="callout ok" style="margin-top:14px">${icon('check')}<div><b>Datos del evento consistentes.</b> Los turnos coinciden con el mínimo por función y cada turno tiene candidatos suficientes.</div></div>`}
    <div class="grid g2" style="margin-top:16px;align-items:start">
      <div class="card"><div class="card-head"><h3>Funciones requeridas</h3>${can('planificador') ? `<button class="btn sm" data-matrix>${icon('copy')}Desde la matriz</button><button class="btn sm primary" data-save-roles>Guardar</button>` : ''}</div>
        <p class="small muted">Mínimo de trabajadores por función para este evento. Se copia de la matriz de la categoría y puedes ajustarlo.</p>
        <div class="table-wrap"><table><thead><tr><th>Función</th><th class="right">Mínimo</th><th class="right">En turnos</th><th>Estado</th></tr></thead><tbody>
        ${roles.map((r) => {
          const v = val.roles.find((x) => x.role_id === r.id);
          return `<tr><td>${esc(r.name)}</td><td class="right"><input class="cell-input" type="number" min="0" max="999" data-role="${r.id}" value="${reqMap.get(r.id) ?? ''}" ${can('planificador') ? '' : 'disabled'} aria-label="Mínimo de ${esc(r.name)}"></td>
            <td class="right num">${v?.shift_demand ?? 0}</td><td>${!v ? '' : v.status === 'ok' ? '<span class="badge ok">Cubierto</span>' : v.status === 'deficit' ? '<span class="badge bad">Faltan turnos</span>' : '<span class="badge info">Más que el mínimo</span>'}</td></tr>`;
        }).join('')}</tbody><tfoot><tr><td>Total</td><td class="right" data-total>${val.total_minimum}</td><td class="right">${val.total_demand}</td><td></td></tr></tfoot></table></div></div>
      <div class="card"><div class="card-head"><h3>Detalles</h3></div>
        <div class="stat-line"><span>Fecha</span><b>${fmtDate(ev.date, { weekday: true })}</b></div>
        <div class="stat-line"><span>Horario</span><b>${fmtRange(ev.start_at, ev.end_at)}</b></div>
        <div class="stat-line"><span>Ubicación</span><b>${esc(ev.location || '—')}</b></div>
        <div class="stat-line"><span>Categoría · invitados</span><b>${esc(ev.category_name || '—')} · ${num(ev.guests)}</b></div>
        <div class="stat-line"><span>Tiempo de planificación manual</span><b>${ev.manual_planning_minutes != null ? `${num(ev.manual_planning_minutes)} min` : '—'}</b></div>
        ${ev.notes ? `<div class="divider"></div><p class="small" style="white-space:pre-line">${esc(ev.notes)}</p>` : ''}
        <div class="divider"></div>
        <div class="card-head" style="margin-bottom:8px"><h3 style="font-size:18px">Actividades</h3>${can('planificador') ? `<button class="btn sm" data-add-act>${icon('plus')}Actividad</button>` : ''}</div>
        ${ev.activities.length ? ev.activities.map((a) => `<div class="stat-line" style="padding:6px 0;border-bottom:1px solid var(--line-soft)"><span><b style="color:var(--ink)">${esc(a.name)}</b></span><span class="row" style="gap:6px">${fmtRange(a.start_at, a.end_at)}${can('planificador') ? `<button class="btn sm ghost icon" data-del-act="${a.id}" aria-label="Eliminar actividad">${icon('trash')}</button>` : ''}</span></div>`).join('') : '<p class="small muted">Sin actividades. Agrega ceremonia, cóctel, cena, celebración…</p>'}
      </div>
    </div>`;
  const totalEl = pane.querySelector('[data-total]');
  pane.querySelectorAll('[data-role]').forEach((i) => i.addEventListener('input', () => {
    totalEl.textContent = [...pane.querySelectorAll('[data-role]')].reduce((a, x) => a + (Number(x.value) || 0), 0);
  }));
  pane.querySelector('[data-save-roles]')?.addEventListener('click', async () => {
    try {
      await api.put(`/events/${ev.id}/roles`, { roles: [...pane.querySelectorAll('[data-role]')].map((i) => ({ role_id: Number(i.dataset.role), min_count: Number(i.value) || 0 })) });
      toast('Funciones requeridas actualizadas.');
      reload('resumen');
    } catch (e) {
      handleError(e);
    }
  });
  pane.querySelector('[data-matrix]')?.addEventListener('click', async () => {
    if (!(await confirmDialog('Se reemplazarán las funciones requeridas por las de la matriz de la categoría del evento.', { confirmText: 'Reemplazar', danger: false }))) return;
    try {
      await api.post(`/events/${ev.id}/roles/from-matrix`);
      toast('Funciones copiadas desde la matriz.');
      reload('resumen');
    } catch (e) {
      handleError(e);
    }
  });
  pane.querySelector('[data-add-act]')?.addEventListener('click', () => formModal({
    title: 'Nueva actividad',
    fields: [
      { name: 'name', label: 'Actividad', required: true, full: true, placeholder: 'Ceremonia, cóctel, cena…' },
      { name: 'start_time', label: 'Inicio', type: 'time', required: true },
      { name: 'end_time', label: 'Fin', type: 'time', required: true },
      { name: 'start_day_offset', label: 'Comienza', type: 'select', options: [{ value: 0, label: 'El día del evento' }, { value: 1, label: 'Después de la medianoche' }], empty: false, numeric: true },
    ],
    onSubmit: async (d) => {
      await api.post(`/events/${ev.id}/activities`, d);
      toast('Actividad agregada.');
      reload('resumen');
    },
  }));
  pane.querySelectorAll('[data-del-act]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmDialog('¿Eliminar esta actividad?'))) return;
    await api.del(`/activities/${b.dataset.delAct}`).catch(handleError);
    reload('resumen');
  }));
}

function shiftFields(roles, s) {
  return {
    fields: [
      { name: 'role_id', label: 'Función', type: 'select', options: options(roles), required: true, numeric: true },
      { name: 'quantity', label: 'Cantidad de trabajadores', type: 'number', min: 1, step: 1, required: true },
      { name: 'start_time', label: 'Hora de entrada', type: 'time', required: true },
      { name: 'end_time', label: 'Hora de salida', type: 'time', required: true, help: 'Si es menor que la de entrada, el turno termina al día siguiente.' },
      { name: 'start_day_offset', label: 'Día de entrada', type: 'select', options: [{ value: 0, label: 'El día del evento' }, { value: 1, label: 'Día siguiente (después de medianoche)' }], empty: false, numeric: true },
      { name: 'label', label: 'Etiqueta (opcional)', placeholder: 'Montaje, servicio, cierre…' },
    ],
    values: s ? { role_id: s.role_id, quantity: s.quantity, start_time: s.start_at.slice(11), end_time: s.end_at.slice(11), start_day_offset: s.start_at.slice(0, 10) > s.event_date ? 1 : 0, label: s.label } : { quantity: 1, start_day_offset: 0 },
  };
}

async function shiftsPane(pane, ev, reload, roleColor, ref) {
  const { roles } = await catalogs();
  const total = ev.shifts.reduce((a, s) => a + s.quantity, 0);
  const hours = ev.shifts.reduce((a, s) => a + s.quantity * s.hours, 0);
  pane.innerHTML = `<div class="row" style="margin-bottom:14px">
      <div style="flex:1" class="small muted">${ev.shifts.length} turno(s) · ${total} puesto(s) · ${num(hours, 1)} persona-hora. Duración de referencia: <b>${ref} h</b>.</div>
      ${can('planificador') ? `<button class="btn" data-case>${icon('rings')}Cargar escenario de referencia</button><button class="btn" data-gen>${icon('wand')}Generar desde funciones</button><button class="btn primary" data-add>${icon('plus')}Nuevo turno</button>` : ''}
    </div>
    <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Línea de tiempo</h3><span class="small muted">Franjas por función · la línea punteada marca la medianoche</span></div><div data-tl></div></div>
    <div data-table></div>`;
  const shiftRows = ev.shifts.map((s) => ({
    label: s.role_name,
    sub: `${s.quantity} persona(s) · ${num(s.hours, 1)} h`,
    bars: [{ start_at: s.start_at, end_at: s.end_at, color: roleColor[s.role_id], text: `${s.quantity} × ${formatTime12(s.start_at.slice(11))} – ${formatTime12(s.end_at.slice(11))}`, long: s.hours > ref }],
  }));
  renderTimeline(pane.querySelector('[data-tl]'), { rows: shiftRows, activities: ev.activities, emptyText: 'Aún no hay turnos. Créalos o genéralos desde las funciones requeridas.' });
  mountTable(pane.querySelector('[data-table]'), {
    rows: ev.shifts,
    search: (s) => `${s.role_name} ${s.label || ''}`,
    filters: [{ label: 'Todas las funciones', options: options(roles), test: (s, v) => String(s.role_id) === v }],
    empty: 'Sin turnos.',
    columns: [
      { key: 'role_name', label: 'Función', render: (s) => `<span class="chip" style="margin:0"><span class="swatch" style="background:${roleColor[s.role_id]}"></span>${esc(s.role_name)}</span>${s.label ? `<div class="tiny muted">${esc(s.label)}</div>` : ''}` },
      { key: 'quantity', label: 'Cantidad', align: 'right' },
      { key: 'start_at', label: 'Entrada – salida', render: (s) => `<span class="nowrap">${fmtRange(s.start_at, s.end_at)}</span>` },
      { key: 'hours', label: 'Horas', align: 'right', render: (s) => `${num(s.hours, 2)}${s.hours > ref ? ` <span class="badge warn" title="Supera la duración de referencia">+${num(s.hours - ref, 2)} h</span>` : ''}` },
      { key: 'x', label: '', sort: false, cls: 'actions-cell', render: (s) => (can('planificador') ? `<button class="btn sm ghost icon" data-edit="${s.id}" aria-label="Editar">${icon('edit')}</button><button class="btn sm ghost icon" data-del="${s.id}" aria-label="Eliminar">${icon('trash')}</button>` : '') },
    ],
  });
  const bindRow = () => {
    pane.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => {
      const s = ev.shifts.find((x) => x.id === Number(b.dataset.edit));
      const f = shiftFields(roles, { ...s, event_date: ev.date });
      formModal({ title: 'Editar turno', ...f, onSubmit: async (d) => {
        await api.put(`/shifts/${s.id}`, d);
        toast('Turno actualizado.');
        reload('turnos');
      } });
    }));
    pane.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!(await confirmDialog('¿Eliminar este turno y sus asignaciones?'))) return;
      await api.del(`/shifts/${b.dataset.del}`).catch(handleError);
      toast('Turno eliminado.');
      reload('turnos');
    }));
  };
  pane.querySelector('[data-table]').addEventListener('rendered', bindRow);
  bindRow();
  pane.querySelector('[data-add]')?.addEventListener('click', () => {
    const f = shiftFields(roles);
    formModal({ title: 'Nuevo turno', ...f, onSubmit: async (d) => {
      const r = await api.post(`/events/${ev.id}/shifts`, d);
      toast(r.hours > ref ? `Turno creado. Atención: dura ${num(r.hours, 2)} h y supera la referencia de ${ref} h.` : 'Turno creado.', r.hours > ref ? 'bad' : 'ok');
      reload('turnos');
    } });
  });
  pane.querySelector('[data-gen]')?.addEventListener('click', async () => {
    const replace = ev.shifts.length ? await confirmDialog('¿Reemplazar los turnos actuales? Si eliges «Cancelar» no se hará ningún cambio.', { title: 'Generar turnos', confirmText: 'Reemplazar y generar', danger: true }) : true;
    if (!replace) return;
    try {
      const r = await api.post(`/events/${ev.id}/shifts/generate`, { replace: true });
      toast(`${r.created} turno(s) generados desde el inicio del evento con la duración de referencia. Ajusta los horarios según las actividades.`);
      reload('turnos');
    } catch (e) {
      handleError(e);
    }
  });
  pane.querySelector('[data-case]')?.addEventListener('click', async () => {
    if (!(await confirmDialog('Se reemplazarán los turnos, actividades y funciones requeridas de este evento por el escenario de referencia del caso Karol Planner (boda mediana de 100 invitados: 17 turnos, 24 trabajadores, ceremonia a las 4:00 p. m. y celebración hasta las 11:00 p. m.).', { title: 'Escenario de referencia', confirmText: 'Cargar escenario', danger: false }))) return;
    try {
      await api.post(`/events/${ev.id}/load-case-scenario`);
      toast('Escenario de referencia cargado.');
      reload('turnos');
    } catch (e) {
      handleError(e);
    }
  });
}

async function manualPane(pane, ev, reload, roleColor) {
  const evaluation = await api.get(`/events/${ev.id}/evaluate?plan=manual`);
  const manual = ev.assignments.filter((a) => a.plan === 'manual');
  pane.innerHTML = `<div class="callout info">${icon('info')}<div class="small">Registra aquí la <b>programación convencional</b> (manual) de la empresa. Wedflow verifica cada asignación: disponibilidad, competencias, cruces de horario y cupos. Si insistes en una asignación que incumple una restricción, queda marcada como conflicto. La optimización compara su costo con esta programación.</div></div>
    <div class="kpis" style="margin-top:14px">
      ${kpi({ label: 'Costo de la programación manual', value: money(evaluation.total_cost), small: true, ico: 'coins' })}
      ${kpi({ label: 'Cobertura', value: pct(evaluation.coverage_pct), ico: 'target', bar: evaluation.coverage_pct })}
      ${kpi({ label: 'Personal asignado / mínimo', value: `${evaluation.staff_assigned} / ${evaluation.staff_minimum}`, ico: 'users', foot: `DP = ${evaluation.staff_difference}` })}
      ${kpi({ label: 'Conflictos', value: num(evaluation.conflicts.length), ico: 'alert', foot: `${num(evaluation.extra_hours, 2)} h adicionales` })}
    </div>
    <div class="row" style="margin:16px 0 10px"><h3 style="flex:1">Turnos y personal asignado</h3>${can('planificador') && manual.length ? `<button class="btn sm danger" data-clear>${icon('trash')}Vaciar programación manual</button>` : ''}</div>
    <div class="stack" style="gap:10px">${ev.shifts.length ? ev.shifts.map((s) => {
      const list = manual.filter((a) => a.shift_id === s.id);
      const rows = evaluation.rows.filter((r) => r.shift_id === s.id);
      const full = list.length >= s.quantity;
      return `<div class="card flat" style="padding:14px">
        <div class="row"><span class="chip" style="margin:0"><span class="swatch" style="background:${roleColor[s.role_id]}"></span><b>${esc(s.role_name)}</b></span>
          <span class="small">${fmtRange(s.start_at, s.end_at)}</span><span style="flex:1"></span>
          <span class="badge ${full ? 'ok' : 'warn'}">${list.length} / ${s.quantity}</span>
          ${can('planificador') ? `<button class="btn sm" data-assign="${s.id}">${icon('plus')}Asignar</button>` : ''}</div>
        <div style="margin-top:8px">${list.map((a) => {
          const r = rows.find((x) => x.worker_id === a.worker_id);
          const bad = r?.issues.length;
          return `<span class="chip" style="${bad ? 'border-color:var(--bad);background:var(--bad-tint)' : ''}" title="${esc(r?.issues.join(' ') || '')}">${bad ? icon('alert', 'inline') : ''}${esc(a.worker_name)} · ${money(a.cost)}${can('planificador') ? `<button class="btn sm ghost icon" style="height:20px;width:20px" data-unassign="${a.id}" aria-label="Quitar">${icon('x')}</button>` : ''}</span>`;
        }).join('') || '<span class="small muted">Sin personal asignado.</span>'}</div></div>`;
    }).join('') : emptyState('Sin turnos', 'Define primero los turnos del evento en la pestaña «Actividades y turnos».', '', 'clock')}</div>
    ${evaluation.conflicts.length ? `<div class="card" style="margin-top:16px"><div class="card-head"><h3>Conflictos detectados</h3></div>${evaluation.conflicts.map((c) => `<div class="stat-line" style="padding:6px 0;border-bottom:1px solid var(--line-soft)"><span><b style="color:var(--ink)">${esc(c.worker_name)}</b> · ${esc(c.role_name)}</span><span class="small" style="color:var(--bad)">${c.issues.map(esc).join(' ')}</span></div>`).join('')}</div>` : ''}
    ${evaluation.alerts.length ? `<div class="callout warn" style="margin-top:16px">${icon('clock')}<div><b>Alertas de duración</b><ul>${evaluation.alerts.map((a) => `<li>${esc(a.message)}</li>`).join('')}</ul></div></div>` : ''}`;
  pane.querySelectorAll('[data-unassign]').forEach((b) => b.addEventListener('click', async () => {
    await api.del(`/assignments/${b.dataset.unassign}`).catch(handleError);
    reload('manual');
  }));
  pane.querySelector('[data-clear]')?.addEventListener('click', async () => {
    if (!(await confirmDialog('¿Eliminar todas las asignaciones de la programación manual de este evento?'))) return;
    await api.post(`/events/${ev.id}/assignments/clear`, { plan: 'manual' }).catch(handleError);
    reload('manual');
  });
  pane.querySelectorAll('[data-assign]').forEach((b) => b.addEventListener('click', async () => {
    const shift = ev.shifts.find((s) => s.id === Number(b.dataset.assign));
    const cands = await api.get(`/events/${ev.id}/candidates?shift_id=${shift.id}&plan=manual`);
    const m = modal({
      title: `Asignar · ${shift.role_name}`, size: 'lg',
      body: `<p class="small muted">${fmtRange(shift.start_at, shift.end_at)} · ${shift.quantity} puesto(s). Los trabajadores elegibles aparecen primero, ordenados por costo.</p>
        <div class="table-wrap"><table><thead><tr><th>Trabajador</th><th class="right">Costo</th><th>Verificación</th><th></th></tr></thead><tbody>
        ${cands.map((c) => `<tr><td><b>${esc(c.full_name)}</b></td><td class="right num">${c.cost != null ? money(c.cost) : '—'}</td>
          <td class="small">${c.assigned ? '<span class="badge info">Ya asignado</span>' : c.ok ? '<span class="badge ok">Cumple</span>' : c.reasons.map((r) => `<div style="color:var(--bad)">${esc(r)}</div>`).join('')}</td>
          <td class="actions-cell">${c.assigned ? '' : `<button class="btn sm ${c.ok ? 'primary' : ''}" data-pick="${c.worker_id}" data-ok="${c.ok ? 1 : 0}">${c.ok ? 'Asignar' : 'Asignar de todos modos'}</button>`}</td></tr>`).join('')}
        </tbody></table></div>`,
    });
    m.el.querySelectorAll('[data-pick]').forEach((p) => p.addEventListener('click', async () => {
      const ok = p.dataset.ok === '1';
      if (!ok && !(await confirmDialog('Esta asignación incumple restricciones y quedará registrada como conflicto. ¿Continuar?', { confirmText: 'Asignar con conflicto' }))) return;
      try {
        const r = await api.post(`/events/${ev.id}/assignments`, { shift_id: shift.id, worker_id: Number(p.dataset.pick), force: !ok });
        toast(r.warnings.length ? 'Asignado con advertencias.' : 'Trabajador asignado.', r.warnings.length ? 'bad' : 'ok');
        m.close();
        reload('manual');
      } catch (e) {
        handleError(e);
      }
    }));
  }));
}

async function optimizePane(pane, ev, reload, roleColor) {
  const last = ev.runs[0];
  pane.innerHTML = `<div class="card dark"><div class="grid g2" style="align-items:center">
      <div><div class="eyebrow" style="color:var(--gold-soft)">Módulo de optimización</div><h2 style="color:#fff;margin:6px 0 8px">Asignación de menor costo</h2>
        <p class="muted small">Modelo de programación lineal entera con variables binarias X<sub>ijt</sub> (trabajador i, función j, turno t). Minimiza Σ C<sub>ijt</sub>·X<sub>ijt</sub> sujeto a cobertura mínima por función y por turno, disponibilidad, competencias, no superposición de horarios y límites de turnos por trabajador. Se resuelve con HiGHS y la solución se verifica de nuevo contra cada restricción.</p></div>
      <div class="right">${can('planificador') ? `<button class="btn gold lg" data-run>${icon('spark')}Optimizar personal</button>` : '<span class="muted small">Tu rol solo permite consultar resultados.</span>'}
        ${last ? `<p class="tiny muted" style="margin-top:10px">Última ejecución: ${esc(last.created_at)} UTC · ${badge(last.status)}</p>` : ''}</div></div></div>
    <div data-result style="margin-top:16px"></div>
    ${ev.runs.length ? `<div class="card" style="margin-top:16px"><div class="card-head"><h3>Historial de ejecuciones</h3></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Fecha (UTC)</th><th>Estado</th><th class="right">Convencional</th><th class="right">Optimizado</th><th class="right">Cobertura</th><th class="right">Tiempo</th><th></th></tr></thead><tbody>
      ${ev.runs.map((r) => `<tr><td>${r.id}</td><td>${esc(r.created_at)}</td><td>${badge(r.status)} ${r.applied ? '<span class="badge dark">Aplicada</span>' : ''}</td><td class="right num">${money(r.conventional_cost)}</td><td class="right num">${money(r.optimized_cost)}</td><td class="right num">${pct(r.coverage)}</td><td class="right num">${num(r.duration_ms)} ms</td><td class="actions-cell"><button class="btn sm" data-view="${r.id}">Ver</button></td></tr>`).join('')}
    </tbody></table></div></div>` : ''}`;
  const out = pane.querySelector('[data-result]');
  const showRun = (r) => renderResult(out, r, {
    roleColors: roleColor,
    onRetry: () => run(),
    onApply: async () => {
      try {
        const x = await api.post(`/runs/${r.run_id}/apply`);
        toast(`Plan optimizado aplicado: ${x.assignments} asignaciones.`);
        reload('oficial');
      } catch (e) {
        handleError(e);
      }
    },
  });
  const run = async () => {
    out.innerHTML = `<div class="card"><div class="loading"><span class="spinner"></span><span class="small">Construyendo y resolviendo el modelo…</span></div></div>`;
    try {
      const r = await api.post(`/events/${ev.id}/optimize`);
      ev.runs.unshift({ id: r.run_id });
      showRun(r);
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      out.innerHTML = '';
      handleError(e);
    }
  };
  pane.querySelector('[data-run]')?.addEventListener('click', run);
  pane.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', async () => showRun(await api.get(`/runs/${b.dataset.view}`))));
  if (last) showRun(await api.get(`/runs/${last.id}`));
}

async function officialPane(pane, ev, reload, roleColor) {
  const [manual, opt] = await Promise.all([api.get(`/events/${ev.id}/evaluate?plan=manual`), api.get(`/events/${ev.id}/evaluate?plan=optimizado`)]);
  const off = ev.official_plan === 'optimizado' ? opt : manual;
  const compare = (label, a, b, f = (x) => x) => `<tr><td>${label}</td><td class="right num">${f(a)}</td><td class="right num">${f(b)}</td></tr>`;
  pane.innerHTML = `<div class="grid g3" style="align-items:start">
    <div class="card"><div class="card-head"><h3>Plan oficial</h3></div>
      <p class="small muted">El plan oficial es el que cuenta para el calendario, los conflictos con otros eventos y los indicadores.</p>
      <div class="seg" style="margin-top:6px"><button data-plan="manual" class="${ev.official_plan === 'manual' ? 'active' : ''}">Manual</button><button data-plan="optimizado" class="${ev.official_plan === 'optimizado' ? 'active' : ''}">Optimizado</button></div></div>
    <div class="card span2"><div class="card-head"><h3>Comparación</h3></div><div class="table-wrap"><table><thead><tr><th>Indicador</th><th class="right">Manual</th><th class="right">Optimizado</th></tr></thead><tbody>
      ${compare('Costo total (CT)', manual.total_cost, opt.total_cost, money)}${compare('Personal asignado', manual.staff_assigned, opt.staff_assigned)}${compare('Diferencia de personal (DP)', manual.staff_difference, opt.staff_difference)}
      ${compare('Cobertura (PC)', manual.coverage_pct, opt.coverage_pct, pct)}${compare('Conflictos', manual.conflicts.length, opt.conflicts.length)}${compare('Horas adicionales', manual.extra_hours, opt.extra_hours)}
    </tbody></table></div></div></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Programación por trabajador</h3><span class="small muted">${off.rows.length} asignación(es) · ${money(off.total_cost)}</span></div><div data-tl></div></div>`;
  pane.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', async () => {
    if (!can('planificador')) return;
    try {
      await api.put(`/events/${ev.id}/official-plan`, { plan: b.dataset.plan });
      toast('Plan oficial actualizado.');
      reload('oficial');
    } catch (e) {
      handleError(e);
    }
  }));
  const byWorker = new Map();
  for (const x of off.rows) {
    if (!byWorker.has(x.worker_id)) byWorker.set(x.worker_id, { label: x.worker_name, sub: x.role_name, bars: [] });
    byWorker.get(x.worker_id).bars.push({ start_at: x.start_at, end_at: x.end_at, color: roleColor[x.role_id], text: x.role_name, conflict: x.issues.length > 0, long: x.hours > store.company.shift_reference_hours, title: `${x.role_name}: ${x.issues.join(' ') || 'sin conflictos'}` });
  }
  renderTimeline(pane.querySelector('[data-tl]'), {
    rows: [...byWorker.values()].sort((a, b) => a.sub.localeCompare(b.sub) || toMinutes(a.bars[0].start_at) - toMinutes(b.bars[0].start_at)),
    activities: ev.activities, emptyText: 'El plan oficial no tiene asignaciones.',
  });
}

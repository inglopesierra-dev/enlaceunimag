import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import {
  esc, money, num, fmtDate, fmtRange, badge, formModal, confirmDialog, toast, handleError, mountTable, emptyState, options, can, modal, kpi, initials, tabs,
} from '../lib/ui.js';
import { setCrumbs, catalogs, navigate } from '../app.js';

const STATUS = [['disponible', 'Disponible'], ['ocupado', 'Ocupado'], ['inactivo', 'Inactivo']].map(([value, label]) => ({ value, label }));

async function workerForm(w, onDone) {
  const { roles, competences } = await catalogs();
  const fields = [
    { name: 'full_name', label: 'Nombre completo', required: true, full: true },
    { name: 'document', label: 'Documento o identificación interna' },
    { name: 'phone', label: 'Número de contacto', type: 'tel' },
    { name: 'email', label: 'Correo', type: 'email' },
    { name: 'status', label: 'Estado', type: 'select', options: STATUS, empty: false },
    { name: 'primary_role_id', label: 'Función o cargo principal', type: 'select', options: options(roles), required: true, numeric: true },
    { name: 'experience_years', label: 'Experiencia (años)', type: 'number', min: 0, step: 0.5 },
    { name: 'role_ids', label: 'Otras funciones autorizadas por la empresa', type: 'multi', options: options(roles), full: true },
    { name: 'competence_ids', label: 'Competencias', type: 'multi', options: options(competences), full: true },
    { name: 'experience_notes', label: 'Experiencia (detalle)', type: 'textarea', full: true },
    ...(w ? [] : [
      { name: 'rate_amount', label: 'Tarifa propia por turno (opcional)', type: 'number', min: 0, help: 'Si la dejas vacía se usa la tarifa vigente de su función.' },
      { name: 'rate_valid_from', label: 'Vigente desde', type: 'date' },
    ]),
    { name: 'notes', label: 'Observaciones', type: 'textarea', full: true },
  ];
  formModal({
    title: w ? 'Editar trabajador' : 'Nuevo trabajador', size: 'lg', fields,
    values: w || { status: 'disponible' },
    submitText: w ? 'Guardar cambios' : 'Registrar trabajador',
    onSubmit: async (d) => {
      if (w) await api.put(`/workers/${w.id}`, d);
      else {
        const r = await api.post('/workers', d);
        w = { id: r.id };
      }
      toast('Trabajador guardado.');
      onDone?.(w.id);
    },
  });
}

async function availabilityForm(workers, preselected = [], onDone) {
  const fields = [
    { name: 'worker_ids', label: 'Trabajadores', type: 'multi', options: workers.filter((w) => w.status !== 'inactivo').map((w) => ({ value: w.id, label: w.full_name })), full: true, required: true },
    { name: 'date', label: 'Fecha', type: 'date', required: true },
    { name: 'days', label: 'Repetir durante (días)', type: 'number', min: 1, max: 62, step: 1, help: 'Crea la misma franja en días consecutivos.' },
    { name: 'start_time', label: 'Disponible desde', type: 'time', required: true },
    { name: 'end_time', label: 'Disponible hasta', type: 'time', required: true, help: 'Si es menor que la hora de inicio, termina al día siguiente.' },
    { name: 'notes', label: 'Nota', full: true },
  ];
  formModal({
    title: 'Registrar disponibilidad', size: 'lg', fields,
    values: { worker_ids: preselected, days: 1, start_time: '08:00', end_time: '02:00' },
    intro: `<p class="small muted">El modelo solo asigna trabajadores con disponibilidad registrada que cubra el turno completo.</p>`,
    submitText: 'Guardar disponibilidad',
    onSubmit: async (d) => {
      const r = await api.post('/availability', d);
      toast(`${r.created} franja(s) de disponibilidad registradas.`);
      onDone?.();
    },
  });
}

export default async function workers(ctx) {
  if (ctx.params[0]) return detail(ctx, Number(ctx.params[0]));
  setCrumbs([{ label: 'Trabajadores' }]);
  const root = ctx.root;
  const [rows, { roles, competences }] = await Promise.all([api.get('/workers'), catalogs()]);
  const roleName = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  const compName = Object.fromEntries(competences.map((r) => [r.id, r.name]));
  const count = (s) => rows.filter((w) => w.status === s).length;
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Gestión de personal</div><h1>Trabajadores</h1>
      <p>Personal contratado o disponible: funciones autorizadas, competencias, tarifas, disponibilidad e historial.</p></div>
      <div class="actions">${can('planificador') ? `<button class="btn" data-import>${icon('upload')}Importar Excel</button><button class="btn" data-avail>${icon('calendar')}Disponibilidad</button><button class="btn primary" data-new>${icon('plus')}Nuevo trabajador</button>` : ''}
      <button class="btn" data-export>${icon('download')}Exportar</button></div></div>
    <div class="kpis" style="margin-bottom:16px">
      ${kpi({ label: 'Registrados', value: num(rows.length), ico: 'users' })}${kpi({ label: 'Disponibles', value: num(count('disponible')), ico: 'check' })}
      ${kpi({ label: 'Ocupados', value: num(count('ocupado')), ico: 'clock' })}${kpi({ label: 'Inactivos', value: num(count('inactivo')), ico: 'x' })}
    </div>
    ${rows.some((w) => w.is_demo) ? `<div class="callout" style="margin-bottom:14px">${icon('info')}<div class="small">Los registros «Trabajador de prueba» son genéricos y sirven para probar el escenario de referencia. Reemplázalos por tu personal real o elimínalos desde Configuración → Datos de demostración.</div></div>` : ''}
    <div data-table></div>`;
  const reload = () => navigate('/trabajadores');
  root.querySelector('[data-new]')?.addEventListener('click', () => workerForm(null, (id) => navigate(`/trabajadores/${id}`)));
  root.querySelector('[data-avail]')?.addEventListener('click', () => availabilityForm(rows, [], reload));
  root.querySelector('[data-export]').addEventListener('click', () => api.download('/reports/workers.xlsx').catch(handleError));
  root.querySelector('[data-import]')?.addEventListener('click', () => importModal(reload));
  const table = root.querySelector('[data-table]');
  if (!rows.length) {
    table.innerHTML = `<div class="card">${emptyState('Aún no hay trabajadores', 'Registra tu personal uno a uno o impórtalo desde Excel.', can('planificador') ? `<button class="btn primary" data-new2>${icon('plus')}Registrar trabajador</button>` : '', 'users')}</div>`;
    table.querySelector('[data-new2]')?.addEventListener('click', () => workerForm(null, (id) => navigate(`/trabajadores/${id}`)));
    return;
  }
  mountTable(table, {
    rows,
    search: (w) => `${w.full_name} ${w.document || ''} ${w.phone || ''} ${roleName[w.primary_role_id] || ''}`,
    filters: [
      { label: 'Todas las funciones', options: options(roles), test: (w, v) => w.role_ids.includes(Number(v)) || w.primary_role_id === Number(v) },
      { label: 'Todos los estados', options: STATUS, test: (w, v) => w.status === v },
      { label: 'Todas las competencias', options: options(competences), test: (w, v) => w.competence_ids.includes(Number(v)) },
    ],
    onRowClick: (w) => navigate(`/trabajadores/${w.id}`),
    columns: [
      { key: 'full_name', label: 'Nombre', render: (w) => `<div class="row" style="gap:10px;flex-wrap:nowrap"><span class="initials" style="width:32px;height:32px;border-radius:50%;background:var(--sand);display:grid;place-items:center;font-weight:700;font-size:12px;flex:none">${esc(initials(w.full_name))}</span><span><b>${esc(w.full_name)}</b><div class="tiny muted">${esc(w.document || '')}${w.phone ? ' · ' + esc(w.phone) : ''}</div></span></div>` },
      { key: 'primary_role_id', label: 'Función principal', sortValue: (w) => roleName[w.primary_role_id], render: (w) => esc(roleName[w.primary_role_id] || '—') },
      { key: 'role_ids', label: 'Otras funciones', sort: false, render: (w) => w.role_ids.filter((r) => r !== w.primary_role_id).map((r) => `<span class="chip">${esc(roleName[r])}</span>`).join('') || '<span class="muted">—</span>' },
      { key: 'competence_ids', label: 'Competencias', sort: false, render: (w) => w.competence_ids.map((c) => `<span class="chip">${esc(compName[c])}</span>`).join('') || '<span class="muted">—</span>' },
      { key: 'experience_years', label: 'Experiencia', align: 'right', render: (w) => (w.experience_years != null ? `${num(w.experience_years, 1)} años` : '—') },
      { key: 'current_rate', label: 'Tarifa vigente', align: 'right', sortValue: (w) => w.current_rate?.amount, render: (w) => (w.current_rate ? `${money(w.current_rate.amount)}<div class="tiny muted">${w.current_rate.source === 'trabajador' ? 'propia' : 'de la función'} · por ${w.current_rate.unit}</div>` : '<span class="badge warn">Sin tarifa</span>') },
      { key: 'total_assignments', label: 'Asignaciones', align: 'right', render: (w) => `${w.total_assignments}${w.upcoming_assignments ? ` <span class="tiny muted">(${w.upcoming_assignments} próx.)</span>` : ''}` },
      { key: 'status', label: 'Estado', render: (w) => badge(w.status) },
    ],
  });
}

function importModal(onDone) {
  const m = modal({
    title: 'Importar trabajadores desde Excel', size: 'sm',
    body: `<p class="small">Descarga la plantilla, diligénciala (una fila por trabajador) y súbela. Las funciones deben existir en tu empresa con el mismo nombre.</p>
      <button class="btn sm" data-tpl>${icon('download')}Descargar plantilla</button>
      <label class="field" style="margin-top:14px">Archivo .xlsx<input type="file" accept=".xlsx" data-file></label><div data-out style="margin-top:10px"></div>`,
    foot: '<button class="btn" data-close>Cerrar</button><button class="btn primary" data-go>Importar</button>',
  });
  m.el.querySelector('[data-tpl]').addEventListener('click', () => api.download('/workers-template.xlsx').catch(handleError));
  m.el.querySelector('[data-go]').addEventListener('click', async () => {
    const f = m.el.querySelector('[data-file]').files[0];
    if (!f) return toast('Selecciona un archivo.', 'bad');
    try {
      const r = await api.upload('/workers/import', f);
      m.el.querySelector('[data-out]').innerHTML = `<div class="callout ${r.errors.length ? 'warn' : 'ok'}">${icon(r.errors.length ? 'alert' : 'check')}<div><b>${r.created} trabajador(es) importado(s).</b>${r.errors.length ? `<ul>${r.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</div></div>`;
      if (r.created) onDone?.();
    } catch (e) {
      handleError(e);
    }
  });
}

async function detail({ root }, id) {
  const [w, { roles, competences }, all] = await Promise.all([api.get(`/workers/${id}`), catalogs(), api.get('/workers')]);
  setCrumbs([{ label: 'Trabajadores', href: '/trabajadores' }, { label: w.full_name }]);
  const roleName = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  const reload = () => navigate(`/trabajadores/${id}`);
  const official = w.history.filter((h) => h.official);
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="row" style="gap:8px">${badge(w.status)}${w.is_demo ? '<span class="badge gold">Registro de prueba</span>' : ''}</div>
      <h1 style="margin-top:8px">${esc(w.full_name)}</h1><p>${esc(roleName[w.primary_role_id] || 'Sin función principal')}${w.document ? ` · ${esc(w.document)}` : ''}${w.phone ? ` · ${esc(w.phone)}` : ''}${w.email ? ` · ${esc(w.email)}` : ''}</p></div>
    <div class="actions">${can('planificador') ? `<button class="btn" data-edit>${icon('edit')}Editar</button><button class="btn danger icon" data-del aria-label="Eliminar">${icon('trash')}</button>` : ''}</div></div>
    <div class="kpis" style="margin-bottom:16px">
      ${kpi({ label: 'Asignaciones (plan oficial)', value: num(official.length), ico: 'briefcase' })}
      ${kpi({ label: 'Horas programadas', value: num(official.reduce((a, h) => a + (new Date(h.end_at + ':00Z') - new Date(h.start_at + ':00Z')) / 36e5, 0), 1), ico: 'clock' })}
      ${kpi({ label: 'Costo acumulado', value: money(official.reduce((a, h) => a + (h.cost || 0), 0)), small: true, ico: 'coins' })}
      ${kpi({ label: 'Experiencia', value: w.experience_years != null ? `${num(w.experience_years, 1)} años` : '—', small: true, ico: 'spark' })}
    </div>
    <nav class="tabs" data-tabs></nav><div data-pane></div>`;
  root.querySelector('[data-edit]')?.addEventListener('click', () => workerForm(w, reload));
  root.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDialog(`¿Eliminar a <b>${esc(w.full_name)}</b>? Se borrarán también su disponibilidad, tarifas propias y asignaciones.`))) return;
    try {
      await api.del(`/workers/${id}`);
      toast('Trabajador eliminado.');
      navigate('/trabajadores');
    } catch (e) {
      handleError(e);
    }
  });
  const pane = root.querySelector('[data-pane]');
  tabs(root.querySelector('[data-tabs]'), [
    { id: 'perfil', label: 'Perfil', icon: 'user' }, { id: 'disp', label: 'Disponibilidad', icon: 'calendar' },
    { id: 'tarifas', label: 'Tarifas', icon: 'coins' }, { id: 'historial', label: 'Historial de asignaciones', icon: 'history' },
  ], (tab) => {
    if (tab === 'perfil') {
      pane.innerHTML = `<div class="grid g2"><div class="card"><div class="card-head"><h3>Funciones autorizadas</h3></div>
        ${w.role_ids.map((r) => `<span class="chip">${r === w.primary_role_id ? icon('check', 'inline') : ''}${esc(roleName[r])}</span>`).join('') || '<span class="muted">—</span>'}
        <div class="divider"></div><div class="card-head"><h3>Competencias</h3></div>${w.competence_ids.map((c) => `<span class="chip">${esc(competences.find((x) => x.id === c)?.name)}</span>`).join('') || '<p class="muted small">Sin competencias registradas.</p>'}</div>
        <div class="card"><div class="card-head"><h3>Experiencia y observaciones</h3></div><p style="white-space:pre-line">${esc(w.experience_notes || '—')}</p><div class="divider"></div><p class="small muted" style="white-space:pre-line">${esc(w.notes || 'Sin observaciones.')}</p></div></div>`;
    }
    if (tab === 'disp') {
      pane.innerHTML = `<div class="row" style="margin-bottom:12px"><p class="small muted" style="flex:1">Franjas en las que el trabajador puede ser asignado. Un turno solo se le asigna si la disponibilidad lo cubre completo.</p>${can('planificador') ? `<button class="btn primary" data-add>${icon('plus')}Agregar disponibilidad</button>` : ''}</div>
        <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Franja</th><th>Nota</th><th></th></tr></thead><tbody>
        ${w.availability.map((a) => `<tr><td>${fmtDate(a.start_at, { weekday: true })}</td><td>${fmtRange(a.start_at, a.end_at)}</td><td class="small muted">${esc(a.notes || '')}</td><td class="actions-cell">${can('planificador') ? `<button class="btn sm ghost icon" data-del-av="${a.id}" aria-label="Eliminar">${icon('trash')}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty">Sin disponibilidad registrada.</div></td></tr>'}
        </tbody></table></div>`;
      pane.querySelector('[data-add]')?.addEventListener('click', () => availabilityForm(all, [w.id], reload));
      pane.querySelectorAll('[data-del-av]').forEach((b) => b.addEventListener('click', async () => {
        if (!(await confirmDialog('¿Eliminar esta franja de disponibilidad?'))) return;
        await api.del(`/availability/${b.dataset.delAv}`).catch(handleError);
        reload();
      }));
    }
    if (tab === 'tarifas') {
      pane.innerHTML = `<div class="row" style="margin-bottom:12px"><p class="small muted" style="flex:1">Las tarifas propias tienen prioridad sobre la tarifa de la función. Sin tarifa propia se usa la de la función vigente en la fecha del evento.</p>${can('admin') ? `<button class="btn primary" data-add>${icon('plus')}Nueva tarifa propia</button>` : ''}</div>
        <div class="table-wrap"><table><thead><tr><th>Función</th><th class="right">Tarifa</th><th>Unidad</th><th>Vigencia</th><th>Nota</th></tr></thead><tbody>
        ${w.rates.map((r) => `<tr><td>${esc(r.role_name || 'Todas sus funciones')}</td><td class="right num">${money(r.amount)}</td><td>${r.unit}</td><td>${fmtDate(r.valid_from)} → ${r.valid_to ? fmtDate(r.valid_to) : 'sin cierre'}</td><td class="small muted">${esc(r.notes || '')}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sin tarifas propias: se usa la tarifa de su función.</div></td></tr>'}
        </tbody></table></div>
        ${w.rate_history.length ? `<h3 style="margin:18px 0 8px">Historial de cambios</h3><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Acción</th><th class="right">Antes</th><th class="right">Después</th></tr></thead><tbody>${w.rate_history.map((h) => `<tr><td>${esc(h.changed_at)}</td><td>${esc(h.action)}</td><td class="right num">${money(h.old_amount)}</td><td class="right num">${money(h.new_amount)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
      pane.querySelector('[data-add]')?.addEventListener('click', () => formModal({
        title: 'Tarifa propia del trabajador',
        fields: [
          { name: 'role_id', label: 'Función', type: 'select', options: options(roles.filter((r) => w.role_ids.includes(r.id))), numeric: true, empty: 'Todas sus funciones' },
          { name: 'amount', label: 'Tarifa', type: 'number', min: 0, required: true },
          { name: 'unit', label: 'Unidad', type: 'select', options: [{ value: 'turno', label: 'Por turno' }, { value: 'hora', label: 'Por hora' }], empty: false },
          { name: 'overtime_hourly', label: 'Hora extra (opcional)', type: 'number', min: 0, help: 'Solo se suma si la configuras.' },
          { name: 'valid_from', label: 'Vigente desde', type: 'date', required: true },
          { name: 'valid_to', label: 'Vigente hasta', type: 'date' },
          { name: 'notes', label: 'Nota', full: true },
        ],
        values: { unit: 'turno', valid_from: new Date().toISOString().slice(0, 10) },
        onSubmit: async (d) => {
          await api.post('/rates', { ...d, worker_id: w.id });
          toast('Tarifa registrada.');
          reload();
        },
      }));
    }
    if (tab === 'historial') {
      pane.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Evento</th><th>Función</th><th>Horario</th><th>Plan</th><th class="right">Costo</th></tr></thead><tbody>
        ${w.history.map((h) => `<tr class="clickable" data-ev="${h.event_id}"><td>${fmtDate(h.date)}</td><td><b>${esc(h.event_name)}</b></td><td>${esc(h.role_name)}</td><td class="nowrap">${fmtRange(h.start_at, h.end_at)}</td><td>${h.plan}${h.official ? ' <span class="badge dark">oficial</span>' : ''}</td><td class="right num">${money(h.cost)}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">Sin asignaciones registradas.</div></td></tr>'}
        </tbody></table></div>`;
      pane.querySelectorAll('[data-ev]').forEach((tr) => tr.addEventListener('click', () => navigate(`/eventos/${tr.dataset.ev}`)));
    }
  });
}

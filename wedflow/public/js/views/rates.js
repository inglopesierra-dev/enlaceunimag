import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { esc, money, fmtDate, formModal, confirmDialog, toast, handleError, mountTable, can, tabs, options, store, num } from '../lib/ui.js';
import { lineChart, SERIES } from '../lib/charts.js';
import { setCrumbs, catalogs } from '../app.js';
import { todayISO } from '../lib/time.js';

export default async function rates({ root, query }) {
  setCrumbs([{ label: 'Tarifas y costos' }]);
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Costos de contratación</div><h1>Tarifas y costos</h1>
    <p>Tarifas por función, por trabajador, por turno u hora, diferenciadas por tipo o categoría de evento, con vigencia e historial de cambios. No se calculan horas extra salvo que configures su tarifa.</p></div>
    <div class="actions">${can('admin') ? `<button class="btn primary" data-new>${icon('plus')}Nueva tarifa</button>` : ''}</div></div>
    <nav class="tabs" data-tabs></nav><div data-pane></div>`;
  const pane = root.querySelector('[data-pane]');
  let current = query.tab || 'tarifas';
  const show = async (tab) => {
    current = tab;
    const [list, cat, workers] = await Promise.all([api.get('/rates'), catalogs(), api.get('/workers')]);
    if (tab === 'tarifas') ratesPane(pane, list, cat, workers, () => show(current));
    if (tab === 'historial') historyPane(pane, await api.get('/rates/history'));
    if (tab === 'evolucion') evolutionPane(pane, await api.get('/rates/evolution'), cat);
  };
  root.querySelector('[data-new]')?.addEventListener('click', async () => {
    const [cat, workers] = await Promise.all([catalogs(), api.get('/workers')]);
    rateForm(null, cat, workers, () => show(current));
  });
  tabs(root.querySelector('[data-tabs]'), [
    { id: 'tarifas', label: 'Tarifas', icon: 'coins' }, { id: 'historial', label: 'Historial de cambios', icon: 'history' }, { id: 'evolucion', label: 'Evolución por año', icon: 'chart' },
  ], show, current);
}

function rateForm(rate, { roles, types, categories }, workers, onDone) {
  formModal({
    title: rate ? 'Editar tarifa' : 'Nueva tarifa', size: 'lg',
    fields: [
      { name: 'role_id', label: 'Función', type: 'select', options: options(roles), numeric: true, help: 'Tarifa por función. Déjala vacía si es una tarifa general de un trabajador.' },
      { name: 'worker_id', label: 'Trabajador (tarifa propia)', type: 'select', options: workers.map((w) => ({ value: w.id, label: w.full_name })), numeric: true, empty: 'Ninguno: aplica a toda la función' },
      { name: 'amount', label: 'Valor', type: 'number', min: 0, required: true, help: `En ${store.company.currency}.` },
      { name: 'unit', label: 'Unidad', type: 'select', options: [{ value: 'turno', label: 'Por turno' }, { value: 'hora', label: 'Por hora' }], empty: false },
      { name: 'event_type_id', label: 'Solo para el tipo de evento', type: 'select', options: options(types), numeric: true, empty: 'Todos los tipos' },
      { name: 'category_id', label: 'Solo para la categoría', type: 'select', options: options(categories), numeric: true, empty: 'Todas las categorías' },
      { name: 'valid_from', label: 'Vigente desde', type: 'date', required: true },
      { name: 'valid_to', label: 'Vigente hasta', type: 'date', help: 'Vacío: vigente hasta que registres otra.' },
      { name: 'overtime_hourly', label: 'Tarifa por hora extra (opcional)', type: 'number', min: 0, help: 'Se suma solo por las horas que superen la duración de referencia.' },
      { name: 'notes', label: 'Nota', full: true },
    ],
    values: rate || { unit: 'turno', valid_from: todayISO() },
    onSubmit: async (d) => {
      if (rate) await api.put(`/rates/${rate.id}`, d);
      else await api.post('/rates', d);
      toast('Tarifa guardada. El cambio quedó en el historial.');
      onDone();
    },
  });
}

function ratesPane(pane, list, cat, workers, reload) {
  const today = todayISO();
  const isActive = (r) => r.valid_from <= today && (!r.valid_to || r.valid_to >= today);
  const kind = (r) => (r.worker_id ? 'trabajador' : r.event_type_id || r.category_id ? 'diferenciada' : 'funcion');
  pane.innerHTML = `${list.some((r) => r.is_reference) ? `<div class="callout" style="margin-bottom:14px">${icon('info')}<div class="small">Las tarifas marcadas como <b>Referencia</b> son los datos históricos 2021–2026 del caso de estudio Karol Planner. Son un punto de partida: puedes modificarlas, eliminarlas o registrar las tuyas.</div></div>` : ''}<div data-t></div>`;
  const t = pane.querySelector('[data-t]');
  mountTable(t, {
    rows: list,
    search: (r) => `${r.role_name || ''} ${r.worker_name || ''} ${r.notes || ''}`,
    filters: [
      { label: 'Cualquier vigencia', options: [{ value: 'on', label: 'Vigentes hoy' }, { value: 'off', label: 'Históricas o futuras' }], test: (r, v) => (v === 'on' ? isActive(r) : !isActive(r)) },
      { label: 'Todas las funciones', options: options(cat.roles), test: (r, v) => String(r.role_id) === v },
      { label: 'Todos los tipos de tarifa', options: [{ value: 'funcion', label: 'Por función' }, { value: 'trabajador', label: 'Por trabajador' }, { value: 'diferenciada', label: 'Diferenciada por evento' }], test: (r, v) => kind(r) === v },
    ],
    empty: 'Sin tarifas registradas. Sin tarifas, el modelo no puede calcular costos ni asignar personal.',
    columns: [
      { key: 'role_name', label: 'Función / trabajador', render: (r) => `<b>${esc(r.role_name || 'Todas sus funciones')}</b>${r.worker_name ? `<div class="tiny muted">${icon('user', 'inline')} ${esc(r.worker_name)}</div>` : ''}` },
      { key: 'amount', label: 'Valor', align: 'right', render: (r) => `<b class="num">${money(r.amount)}</b><div class="tiny muted">por ${r.unit}</div>` },
      { key: 'kind', label: 'Tipo', sortValue: kind, render: (r) => ({ funcion: '<span class="badge">Por función</span>', trabajador: '<span class="badge gold">Por trabajador</span>', diferenciada: `<span class="badge info">${esc([r.type_name, r.category_name].filter(Boolean).join(' · '))}</span>` })[kind(r)] },
      { key: 'valid_from', label: 'Vigencia', render: (r) => `<span class="nowrap">${fmtDate(r.valid_from)} → ${r.valid_to ? fmtDate(r.valid_to) : 'sin cierre'}</span> ${isActive(r) ? '<span class="badge ok">Vigente</span>' : ''}` },
      { key: 'overtime_hourly', label: 'Hora extra', align: 'right', render: (r) => (r.overtime_hourly != null ? money(r.overtime_hourly) : '<span class="muted">No configurada</span>') },
      { key: 'is_reference', label: 'Origen', render: (r) => (r.is_reference ? '<span class="badge gold">Referencia</span>' : '<span class="badge">Propia</span>') },
      { key: 'x', label: '', sort: false, cls: 'actions-cell', render: (r) => (can('admin') ? `<button class="btn sm ghost icon" data-e="${r.id}" aria-label="Editar">${icon('edit')}</button><button class="btn sm ghost icon" data-d="${r.id}" aria-label="Eliminar">${icon('trash')}</button>` : '') },
    ],
  });
  const bind = () => {
    t.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => rateForm(list.find((r) => r.id === Number(b.dataset.e)), cat, workers, reload)));
    t.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => {
      if (!(await confirmDialog('¿Eliminar esta tarifa? Quedará registrada en el historial de cambios.'))) return;
      try {
        await api.del(`/rates/${b.dataset.d}`);
        toast('Tarifa eliminada.');
        reload();
      } catch (e) {
        handleError(e);
      }
    }));
  };
  t.addEventListener('rendered', bind);
  bind();
}

function historyPane(pane, rows) {
  pane.innerHTML = '<div data-t></div>';
  mountTable(pane.querySelector('[data-t]'), {
    rows, search: (r) => `${r.role_name || ''} ${r.worker_name || ''} ${r.action}`,
    filters: [{ label: 'Todas las acciones', options: ['creada', 'modificada', 'eliminada'].map((v) => ({ value: v, label: v })), test: (r, v) => r.action === v }],
    empty: 'Sin cambios registrados.',
    columns: [
      { key: 'changed_at', label: 'Fecha (UTC)' },
      { key: 'action', label: 'Acción', render: (r) => `<span class="badge ${r.action === 'eliminada' ? 'bad' : r.action === 'creada' ? 'ok' : 'info'}">${esc(r.action)}</span>` },
      { key: 'role_name', label: 'Función / trabajador', render: (r) => `${esc(r.role_name || '—')}${r.worker_name ? `<div class="tiny muted">${esc(r.worker_name)}</div>` : ''}` },
      { key: 'old_amount', label: 'Antes', align: 'right', render: (r) => money(r.old_amount) },
      { key: 'new_amount', label: 'Después', align: 'right', render: (r) => money(r.new_amount) },
      { key: 'valid_from', label: 'Vigencia', render: (r) => `${r.valid_from ? fmtDate(r.valid_from) : '—'} → ${r.valid_to ? fmtDate(r.valid_to) : 'sin cierre'}` },
      { key: 'user_name', label: 'Usuario', render: (r) => esc(r.user_name || 'Sistema') },
    ],
  });
}

function evolutionPane(pane, rows, { roles }) {
  const years = [...new Set(rows.map((r) => r.year))].sort();
  const roleNames = [...new Set(rows.map((r) => r.role_name))];
  if (!rows.length) {
    pane.innerHTML = '<div class="empty">Sin tarifas generales por función para graficar.</div>';
    return;
  }
  const value = (role, y) => rows.filter((r) => r.role_name === role && r.year === y).at(-1)?.amount ?? null;
  let selected = roleNames.slice(0, 3);
  // Cada función conserva su color mientras siga seleccionada.
  const colorOf = new Map(selected.map((n, i) => [n, SERIES[i]]));
  pane.innerHTML = `<div class="card"><div class="card-head"><h3>Evolución de la tarifa por turno</h3><span class="small muted">Elige hasta 4 funciones</span></div>
    <div class="multi" style="max-height:none;margin-bottom:12px" data-pick>${roleNames.map((n) => `<label><input type="checkbox" value="${esc(n)}" ${selected.includes(n) ? 'checked' : ''}>${esc(n)}</label>`).join('')}</div>
    <div style="height:320px"><canvas data-c aria-label="Evolución de tarifas"></canvas></div></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Tabla por año</h3></div><div class="table-wrap"><table><thead><tr><th>Función</th>${years.map((y) => `<th class="right">${y}</th>`).join('')}<th class="right">Variación</th></tr></thead><tbody>
    ${roleNames.map((n) => {
      const first = value(n, years[0]);
      const last = value(n, years.at(-1));
      return `<tr><td>${esc(n)}</td>${years.map((y) => `<td class="right num">${money(value(n, y))}</td>`).join('')}<td class="right num">${first && last ? `${num(((last - first) / first) * 100, 1)} %` : '—'}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  const draw = () => lineChart(pane.querySelector('[data-c]'), { labels: years, series: selected.map((n) => ({ label: n, color: colorOf.get(n), data: years.map((y) => value(n, y)) })), isMoney: true });
  pane.querySelectorAll('[data-pick] input').forEach((i) => i.addEventListener('change', () => {
    const now = [...pane.querySelectorAll('[data-pick] input:checked')].map((x) => x.value);
    if (now.length > 4) {
      i.checked = false;
      toast('Máximo 4 funciones a la vez para que el gráfico sea legible.', 'bad');
      return;
    }
    // Las funciones que siguen seleccionadas conservan su color (orden de selección).
    selected = [...selected.filter((n) => now.includes(n)), ...now.filter((n) => !selected.includes(n))];
    for (const n of [...colorOf.keys()]) if (!selected.includes(n)) colorOf.delete(n);
    for (const n of selected) if (!colorOf.has(n)) colorOf.set(n, SERIES.find((c) => ![...colorOf.values()].includes(c)));
    draw();
  }));
  draw();
  void roles;
}

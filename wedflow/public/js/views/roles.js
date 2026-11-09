import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { esc, formModal, confirmDialog, toast, handleError, mountTable, can, tabs, num } from '../lib/ui.js';
import { setCrumbs, catalogs, invalidateCatalogs } from '../app.js';

const COLORS = ['#B08D57', '#8C7B6B', '#A0522D', '#C49A6C', '#5E6B5A', '#7A4E6E', '#6B8A99', '#9A8C4E', '#3F4A5C', '#B5656B', '#4F7A5A', '#2E6DB4'];

export default async function roles({ root, query }) {
  setCrumbs([{ label: 'Funciones y requerimientos' }]);
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Configuración operativa</div><h1>Funciones y requerimientos</h1>
    <p>Define los cargos de tu empresa, las categorías de evento y la matriz de personal mínimo. Nada es universal: ajústalo a tu operación.</p></div></div>
    <nav class="tabs" data-tabs></nav><div data-pane></div>`;
  const pane = root.querySelector('[data-pane]');
  const show = async (tab) => {
    invalidateCatalogs();
    const cat = await catalogs(true);
    if (tab === 'funciones') return rolesPane(pane, cat, () => show(tab));
    if (tab === 'matriz') return matrixPane(pane, cat, () => show(tab));
    if (tab === 'categorias') return simplePane(pane, {
      rows: cat.categories, path: '/categories', title: 'categoría', reload: () => show(tab),
      intro: 'Clasificación de eventos por tamaño. El rango de invitados (opcional) sugiere la categoría al crear un evento; si no hay rango, se usa la referencia más cercana.',
      fields: [
        { name: 'name', label: 'Nombre', required: true, full: true },
        { name: 'min_guests', label: 'Invitados desde', type: 'number', min: 0, step: 1 },
        { name: 'max_guests', label: 'Invitados hasta', type: 'number', min: 0, step: 1 },
        { name: 'reference_guests', label: 'Invitados de referencia', type: 'number', min: 0, step: 1 },
        { name: 'sort_order', label: 'Orden', type: 'number', min: 0, step: 1 },
      ],
      columns: [
        { key: 'name', label: 'Categoría', render: (r) => `<b>${esc(r.name)}</b>` },
        { key: 'min_guests', label: 'Rango de invitados', render: (r) => (r.min_guests != null || r.max_guests != null ? `${r.min_guests ?? 0} – ${r.max_guests ?? '∞'}` : '<span class="muted">Sin rango</span>') },
        { key: 'reference_guests', label: 'Referencia', align: 'right', render: (r) => num(r.reference_guests) },
      ],
    });
    if (tab === 'tipos') return simplePane(pane, {
      rows: cat.types, path: '/event-types', title: 'tipo de evento', reload: () => show(tab),
      intro: 'Tipos de evento que organiza tu empresa (boda civil, religiosa, destino, renovación de votos…). Las tarifas pueden diferenciarse por tipo.',
      fields: [{ name: 'name', label: 'Nombre', required: true, full: true }, { name: 'description', label: 'Descripción', full: true }],
      columns: [{ key: 'name', label: 'Tipo', render: (r) => `<b>${esc(r.name)}</b>` }, { key: 'description', label: 'Descripción' }],
    });
    if (tab === 'competencias') return simplePane(pane, {
      rows: cat.competences, path: '/competences', title: 'competencia', reload: () => show(tab), role: 'planificador',
      intro: 'Habilidades o certificaciones del personal (manipulación de alimentos, coctelería, sonido, primeros auxilios…).',
      fields: [{ name: 'name', label: 'Nombre', required: true, full: true }],
      columns: [{ key: 'name', label: 'Competencia', render: (r) => `<b>${esc(r.name)}</b>` }],
    });
  };
  tabs(root.querySelector('[data-tabs]'), [
    { id: 'funciones', label: 'Funciones o cargos', icon: 'briefcase' }, { id: 'matriz', label: 'Matriz de requerimientos', icon: 'grid' },
    { id: 'categorias', label: 'Categorías de evento', icon: 'layers' }, { id: 'tipos', label: 'Tipos de evento', icon: 'rings' }, { id: 'competencias', label: 'Competencias', icon: 'shield' },
  ], show, query.tab || 'funciones');
}

function rolesPane(pane, { roles }, reload) {
  const fields = [
    { name: 'name', label: 'Nombre de la función', required: true, full: true },
    { name: 'description', label: 'Descripción', type: 'textarea', full: true },
    { name: 'color', label: 'Color en calendarios', type: 'color' },
    { name: 'sort_order', label: 'Orden', type: 'number', min: 0, step: 1 },
  ];
  simplePane(pane, {
    rows: roles, path: '/roles', title: 'función', reload, fields,
    defaults: { color: COLORS[roles.length % COLORS.length], sort_order: roles.length },
    intro: 'Cargos que tu empresa contrata o administra directamente para sus eventos. Proveedores externos (fotografía, música, DJ) quedan fuera, salvo que sean parte de tu personal.',
    columns: [
      { key: 'name', label: 'Función', render: (r) => `<span class="chip" style="margin:0"><span class="swatch" style="background:${esc(r.color || '#B08D57')}"></span><b>${esc(r.name)}</b></span>` },
      { key: 'description', label: 'Descripción', render: (r) => `<span class="small muted">${esc(r.description || '')}</span>` },
      { key: 'workers', label: 'Trabajadores autorizados', align: 'right' },
    ],
    deleteWarning: 'Se eliminarán también sus tarifas, turnos, requerimientos y asignaciones asociadas.',
  });
}

function simplePane(pane, { rows, path, title, reload, fields, columns, intro, defaults = {}, role = 'admin', deleteWarning = '' }) {
  pane.innerHTML = `<div class="row" style="margin-bottom:12px"><p class="small muted" style="flex:1;margin:0">${intro}</p>${can(role) ? `<button class="btn primary" data-add>${icon('plus')}Agregar ${title}</button>` : ''}</div><div data-t></div>`;
  const form = (row) => formModal({
    title: row ? `Editar ${title}` : `Nueva ${title}`, fields, values: row || defaults,
    onSubmit: async (d) => {
      if (row) await api.put(`${path}/${row.id}`, d);
      else await api.post(path, d);
      toast('Guardado.');
      reload();
    },
  });
  pane.querySelector('[data-add]')?.addEventListener('click', () => form(null));
  const t = pane.querySelector('[data-t]');
  mountTable(t, {
    rows, search: (r) => r.name,
    empty: `Sin registros. Agrega la primera ${title}.`,
    columns: [...columns, { key: 'x', label: '', sort: false, cls: 'actions-cell', render: (r) => (can(role) ? `<button class="btn sm ghost icon" data-e="${r.id}" aria-label="Editar">${icon('edit')}</button><button class="btn sm ghost icon" data-d="${r.id}" aria-label="Eliminar">${icon('trash')}</button>` : '') }],
  });
  const bind = () => {
    t.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => form(rows.find((r) => r.id === Number(b.dataset.e)))));
    t.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => {
      const row = rows.find((r) => r.id === Number(b.dataset.d));
      if (!(await confirmDialog(`¿Eliminar <b>${esc(row.name)}</b>? ${deleteWarning}`))) return;
      try {
        await api.del(`${path}/${row.id}`);
        toast('Eliminado.');
        reload();
      } catch (e) {
        handleError(e);
      }
    }));
  };
  t.addEventListener('rendered', bind);
  bind();
}

async function matrixPane(pane, { roles, categories }, reload) {
  const cells = await api.get('/requirements');
  const val = (c, r) => cells.find((x) => x.category_id === c && x.role_id === r)?.min_count ?? '';
  if (!roles.length || !categories.length) {
    pane.innerHTML = `<div class="callout warn">${icon('alert')}<div>Para construir la matriz necesitas al menos una función y una categoría de evento.</div></div>`;
    return;
  }
  const editable = can('admin');
  pane.innerHTML = `<div class="row" style="margin-bottom:12px"><p class="small muted" style="flex:1;margin:0">Cantidad mínima de trabajadores por función según la categoría del evento. Al crear un evento se copia la columna de su categoría y puedes ajustarla para ese evento.</p>
    ${editable ? `<button class="btn primary" data-save>${icon('check')}Guardar matriz</button>` : ''}</div>
    <div class="table-wrap"><table class="matrix"><thead><tr><th>Función</th>${categories.map((c) => `<th>${esc(c.name)}${c.reference_guests ? `<div class="tiny" style="text-transform:none;font-weight:500">${c.reference_guests} invitados</div>` : ''}</th>`).join('')}</tr></thead>
    <tbody>${roles.map((r) => `<tr><td><span class="chip" style="margin:0"><span class="swatch" style="background:${esc(r.color || '#B08D57')}"></span>${esc(r.name)}</span></td>${categories.map((c) => `<td><input class="cell-input" type="number" min="0" max="999" step="1" data-c="${c.id}" data-r="${r.id}" value="${val(c.id, r.id)}" ${editable ? '' : 'disabled'} aria-label="${esc(r.name)} en ${esc(c.name)}"></td>`).join('')}</tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td>${categories.map((c) => `<td data-tot="${c.id}"></td>`).join('')}</tr></tfoot></table></div>`;
  const totals = () => categories.forEach((c) => {
    pane.querySelector(`[data-tot="${c.id}"]`).textContent = [...pane.querySelectorAll(`[data-c="${c.id}"]`)].reduce((a, i) => a + (Number(i.value) || 0), 0);
  });
  pane.querySelectorAll('.cell-input').forEach((i) => i.addEventListener('input', totals));
  totals();
  pane.querySelector('[data-save]')?.addEventListener('click', async () => {
    try {
      await api.put('/requirements', { cells: [...pane.querySelectorAll('.cell-input')].map((i) => ({ category_id: Number(i.dataset.c), role_id: Number(i.dataset.r), min_count: i.value === '' ? null : Number(i.value) })) });
      toast('Matriz guardada.');
      reload();
    } catch (e) {
      handleError(e);
    }
  });
}

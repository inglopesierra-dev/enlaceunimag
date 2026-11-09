import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { esc, money, num, pct, fmtDate, formModal, confirmDialog, toast, handleError, mountTable, can, tabs, kpi, modal } from '../lib/ui.js';
import { barChart } from '../lib/charts.js';
import { setCrumbs } from '../app.js';

const recordFields = [
  { name: 'event_date', label: 'Fecha', type: 'date' },
  { name: 'event_name', label: 'Evento' },
  { name: 'category_name', label: 'Categoría' },
  { name: 'guests', label: 'Invitados', type: 'number', min: 0, step: 1 },
  { name: 'assigned_staff', label: 'Personal asignado', type: 'number', min: 0, step: 1 },
  { name: 'min_staff', label: 'Personal mínimo', type: 'number', min: 0, step: 1 },
  { name: 'conventional_cost', label: 'Costo convencional', type: 'number', min: 0 },
  { name: 'reference_cost', label: 'Costo de referencia', type: 'number', min: 0 },
  { name: 'notes', label: 'Observaciones', full: true },
];

export default async function history({ root, query }) {
  setCrumbs([{ label: 'Historial y análisis' }]);
  const data = await api.get('/history');
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Eventos anteriores</div><h1>Historial y análisis</h1>
      <p>Comportamiento histórico de la contratación de personal: datos agregados, registros importados y eventos realizados en Wedflow.</p></div>
    <div class="actions">${can('planificador') ? `<button class="btn" data-import>${icon('upload')}Importar Excel</button><button class="btn primary" data-add>${icon('plus')}Agregar registro</button>` : ''}</div></div>
    <nav class="tabs" data-tabs></nav><div data-pane></div>`;
  const pane = root.querySelector('[data-pane]');
  const reload = () => history({ root, query: { tab: current } });
  let current = query.tab || 'caso';
  root.querySelector('[data-add]')?.addEventListener('click', () => formModal({ title: 'Registro histórico', fields: recordFields, onSubmit: async (d) => {
    await api.post('/history/records', d);
    toast('Registro agregado.');
    current = 'registros';
    reload();
  } }));
  root.querySelector('[data-import]')?.addEventListener('click', () => {
    const m = modal({
      title: 'Importar histórico desde Excel', size: 'sm',
      body: `<p class="small">Una fila por evento: fecha, nombre, categoría, invitados, personal asignado, personal mínimo, costo convencional y costo de referencia.</p>
        <button class="btn sm" data-tpl>${icon('download')}Descargar plantilla</button><label class="field" style="margin-top:14px">Archivo .xlsx<input type="file" accept=".xlsx" data-file></label><div data-out style="margin-top:10px"></div>`,
      foot: '<button class="btn" data-close>Cerrar</button><button class="btn primary" data-go>Importar</button>',
    });
    m.el.querySelector('[data-tpl]').addEventListener('click', () => api.download('/history/template.xlsx').catch(handleError));
    m.el.querySelector('[data-go]').addEventListener('click', async () => {
      const f = m.el.querySelector('[data-file]').files[0];
      if (!f) return toast('Selecciona un archivo.', 'bad');
      try {
        const r = await api.upload('/history/import', f);
        m.el.querySelector('[data-out]').innerHTML = `<div class="callout ${r.errors.length ? 'warn' : 'ok'}">${icon('check')}<div><b>${r.created} registro(s) importado(s).</b>${r.errors.length ? `<ul>${r.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</div></div>`;
        current = 'registros';
        setTimeout(() => { m.close(); reload(); }, 900);
      } catch (e) {
        handleError(e);
      }
    });
  });
  const show = (tab) => {
    current = tab;
    if (tab === 'caso') casePane(pane, data.summaries, reload);
    if (tab === 'registros') recordsPane(pane, data, reload);
    if (tab === 'eventos') pastPane(pane, data.past_events);
  };
  tabs(root.querySelector('[data-tabs]'), [
    { id: 'caso', label: 'Resumen histórico', icon: 'history' }, { id: 'registros', label: `Registros (${data.records.length})`, icon: 'table' }, { id: 'eventos', label: `Eventos en Wedflow (${data.past_events.length})`, icon: 'rings' },
  ], show, current);
}

function casePane(pane, summaries, reload) {
  if (!summaries.length) {
    pane.innerHTML = '<div class="empty"><h4>Sin resúmenes históricos</h4><p>Carga tus registros en la pestaña «Registros» o importa un Excel.</p></div>';
    return;
  }
  pane.innerHTML = summaries.map((s) => {
    const d = s.data;
    return `<div class="card" style="margin-bottom:16px"><div class="card-head"><div style="flex:1"><div class="eyebrow">${s.source === 'caso_estudio' ? 'Información histórica del caso de estudio' : 'Resumen'}</div><h3>${esc(s.title)} <span class="small muted" style="font-family:var(--sans)">${esc(s.period || '')}</span></h3></div>
      ${can('admin') ? `<button class="btn sm ghost danger" data-del="${s.id}">${icon('trash')}Eliminar</button>` : ''}</div>
      <div class="kpis">
        ${kpi({ label: 'Bodas registradas', value: num(d.total_bodas), ico: 'rings' })}
        ${kpi({ label: 'Asignaciones programadas', value: num(d.asignaciones_programadas), ico: 'users' })}
        ${kpi({ label: 'Asignaciones mínimas de referencia', value: num(d.asignaciones_minimas), ico: 'target' })}
        ${kpi({ label: 'Asignaciones adicionales', value: num(d.asignaciones_adicionales), ico: 'alert', foot: pct((d.asignaciones_adicionales / d.asignaciones_minimas) * 100) + ' sobre el mínimo' })}
        ${kpi({ label: 'Costo de programación convencional', value: money(d.costo_convencional), small: true, ico: 'coins' })}
        ${kpi({ label: 'Costo de referencia', value: money(d.costo_referencia), small: true, ico: 'coins' })}
        ${kpi({ label: 'Diferencia acumulada', value: money(d.diferencia_acumulada), small: true, ico: 'spark', accent: true, foot: pct((d.diferencia_acumulada / d.costo_convencional) * 100) + ' del costo convencional' })}
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div><h4 class="serif" style="font-size:19px;margin:0 0 8px">Bodas por categoría</h4><div style="height:220px"><canvas data-cat="${s.id}" aria-label="Bodas por categoría"></canvas></div>
          <table style="margin-top:8px"><tbody><tr><td>Pequeñas</td><td class="right">${num(d.bodas_pequenas)}</td></tr><tr><td>Medianas</td><td class="right">${num(d.bodas_medianas)}</td></tr><tr><td>Grandes</td><td class="right">${num(d.bodas_grandes)}</td></tr></tbody></table></div>
        <div><h4 class="serif" style="font-size:19px;margin:0 0 8px">Costo convencional frente a referencia</h4><div style="height:220px"><canvas data-cost="${s.id}" aria-label="Costos"></canvas></div>
          <p class="small muted" style="margin-top:8px">${esc(d.nota || '')}</p></div>
      </div></div>`;
  }).join('');
  for (const s of summaries) {
    const d = s.data;
    barChart(pane.querySelector(`[data-cat="${s.id}"]`), { labels: ['Pequeñas', 'Medianas', 'Grandes'], series: [{ label: 'Bodas', data: [d.bodas_pequenas, d.bodas_medianas, d.bodas_grandes] }] });
    barChart(pane.querySelector(`[data-cost="${s.id}"]`), { labels: ['Programación convencional', 'Referencia (mínimo requerido)'], series: [{ label: 'Costo', data: [d.costo_convencional, d.costo_referencia] }], isMoney: true, horizontal: true });
  }
  pane.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmDialog('¿Eliminar este resumen histórico? Podrás volver a cargarlo desde Configuración → Datos de demostración.'))) return;
    await api.del(`/history/summaries/${b.dataset.del}`).catch(handleError);
    reload();
  }));
}

function recordsPane(pane, data, reload) {
  const recs = data.records;
  pane.innerHTML = `${data.records_by_category.length ? `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Análisis por categoría</h3></div>
      <div class="grid g2"><div style="height:240px"><canvas data-c1 aria-label="Personal por categoría"></canvas></div><div style="height:240px"><canvas data-c2 aria-label="Costos por categoría"></canvas></div></div></div>` : ''}<div data-t></div>`;
  if (data.records_by_category.length) {
    const cats = data.records_by_category;
    barChart(pane.querySelector('[data-c1]'), { labels: cats.map((c) => c.category), series: [{ label: 'Personal mínimo', data: cats.map((c) => c.minimum) }, { label: 'Personal asignado', data: cats.map((c) => c.assigned) }] });
    barChart(pane.querySelector('[data-c2]'), { labels: cats.map((c) => c.category), series: [{ label: 'Costo de referencia', data: cats.map((c) => c.reference) }, { label: 'Costo convencional', data: cats.map((c) => c.conventional) }], isMoney: true });
  }
  const t = pane.querySelector('[data-t]');
  mountTable(t, {
    rows: recs, search: (r) => `${r.event_name || ''} ${r.category_name || ''} ${r.notes || ''}`,
    filters: [{ label: 'Todas las categorías', options: [...new Set(recs.map((r) => r.category_name).filter(Boolean))].map((v) => ({ value: v, label: v })), test: (r, v) => r.category_name === v }],
    empty: 'Sin registros históricos. Agrégalos con el formulario o importa un Excel.',
    columns: [
      { key: 'event_date', label: 'Fecha', render: (r) => fmtDate(r.event_date) },
      { key: 'event_name', label: 'Evento', render: (r) => `${esc(r.event_name || '—')}<div class="tiny muted">${r.source}</div>` },
      { key: 'category_name', label: 'Categoría' },
      { key: 'guests', label: 'Invitados', align: 'right', render: (r) => num(r.guests) },
      { key: 'assigned_staff', label: 'Asignado / mínimo', align: 'right', render: (r) => `${num(r.assigned_staff)} / ${num(r.min_staff)}` },
      { key: 'conventional_cost', label: 'Convencional', align: 'right', render: (r) => money(r.conventional_cost) },
      { key: 'reference_cost', label: 'Referencia', align: 'right', render: (r) => money(r.reference_cost) },
      { key: 'x', label: '', sort: false, cls: 'actions-cell', render: (r) => (can('planificador') ? `<button class="btn sm ghost icon" data-e="${r.id}" aria-label="Editar">${icon('edit')}</button><button class="btn sm ghost icon" data-d="${r.id}" aria-label="Eliminar">${icon('trash')}</button>` : '') },
    ],
    footer: (list) => `<tr><td colspan="4">Total (${list.length})</td><td class="right">${num(list.reduce((a, r) => a + (r.assigned_staff || 0), 0))} / ${num(list.reduce((a, r) => a + (r.min_staff || 0), 0))}</td><td class="right">${money(list.reduce((a, r) => a + (r.conventional_cost || 0), 0))}</td><td class="right">${money(list.reduce((a, r) => a + (r.reference_cost || 0), 0))}</td><td></td></tr>`,
  });
  const bind = () => {
    t.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => {
      const rec = recs.find((r) => r.id === Number(b.dataset.e));
      formModal({ title: 'Editar registro', fields: recordFields, values: rec, onSubmit: async (d) => {
        await api.put(`/history/records/${rec.id}`, d);
        toast('Registro actualizado.');
        reload();
      } });
    }));
    t.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => {
      if (!(await confirmDialog('¿Eliminar este registro histórico?'))) return;
      await api.del(`/history/records/${b.dataset.d}`).catch(handleError);
      reload();
    }));
  };
  t.addEventListener('rendered', bind);
  bind();
}

function pastPane(pane, events) {
  pane.innerHTML = '<div data-t></div>';
  mountTable(pane.querySelector('[data-t]'), {
    rows: events, search: (r) => `${r.name} ${r.category_name || ''}`,
    empty: 'Aún no hay eventos realizados o con fecha pasada.',
    onRowClick: (r) => (location.hash = `/eventos/${r.event_id}`),
    columns: [
      { key: 'date', label: 'Fecha', render: (r) => fmtDate(r.date) },
      { key: 'name', label: 'Evento', render: (r) => `<b>${esc(r.name)}</b>` },
      { key: 'category_name', label: 'Categoría' },
      { key: 'ct', label: 'CT', align: 'right', render: (r) => money(r.ct) },
      { key: 'staff_assigned', label: 'Asignado / mínimo', align: 'right', render: (r) => `${r.staff_assigned} / ${r.staff_minimum}` },
      { key: 'pc', label: 'PC', align: 'right', render: (r) => pct(r.pc) },
      { key: 'conflicts', label: 'Conflictos', align: 'right' },
    ],
  });
}

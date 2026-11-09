import { icon } from './icons.js';
import { ApiError } from './api.js';
import { formatTime12 } from './time.js';

// ---------- Estado global ----------
export const store = { user: null, company: null, cache: {} };

// ---------- Escapado y formato ----------
export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function money(n, { compact = false } = {}) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const c = store.company || {};
  try {
    return new Intl.NumberFormat(c.locale || 'es-CO', {
      style: 'currency', currency: c.currency || 'COP', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard',
    }).format(n);
  } catch {
    return Number(n).toLocaleString();
  }
}
export const num = (n, d = 0) => (n === null || n === undefined ? '—' : Number(n).toLocaleString(store.company?.locale || 'es-CO', { maximumFractionDigits: d }));
export const pct = (n, d = 1) => (n === null || n === undefined ? '—' : `${num(n, d)} %`);
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export function fmtDate(d, { weekday = false } = {}) {
  if (!d) return '—';
  const dt = new Date(d.slice(0, 10) + 'T12:00:00');
  return `${weekday ? DAYS[dt.getDay()] + ' ' : ''}${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}
export const monthShort = (d) => MONTHS[Number(d.slice(5, 7)) - 1];
export const fmtDT = (dt) => (dt ? `${formatTime12(dt.slice(11, 16))}` : '');
export const fmtRange = (a, b) => `${fmtDT(a)} – ${fmtDT(b)}${a && b && a.slice(0, 10) !== b.slice(0, 10) ? ' <span class="badge info" title="Termina al día siguiente">+1 día</span>' : ''}`;
export const initials = (s) => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
export const can = (level) => ({ consulta: 1, planificador: 2, admin: 3 })[store.user?.role] >= ({ consulta: 1, planificador: 2, admin: 3 })[level];

export const STATUS = {
  planificado: ['Planificado', 'info'], confirmado: ['Confirmado', 'gold'], realizado: ['Realizado', 'ok'], cancelado: ['Cancelado', 'bad'],
  disponible: ['Disponible', 'ok'], ocupado: ['Ocupado', 'warn'], inactivo: ['Inactivo', 'bad'],
  optimo: ['Óptimo', 'ok'], factible: ['Factible', 'warn'], no_factible: ['No factible', 'bad'], datos_insuficientes: ['Datos insuficientes', 'warn'],
};
export const badge = (key) => {
  const [label, cls] = STATUS[key] || [key, ''];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
};

// ---------- Avisos ----------
export function toast(message, type = 'ok') {
  let box = document.querySelector('.toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toasts';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'bad' ? 'alert' : 'check')}<span>${esc(message)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), type === 'bad' ? 6000 : 3200);
}

export function handleError(e) {
  if (e instanceof ApiError) {
    const reasons = e.details?.reasons;
    toast(reasons?.length ? `${e.message} ${reasons.join(' ')}` : e.message, 'bad');
  } else {
    console.error(e);
    toast('Ocurrió un error inesperado.', 'bad');
  }
}

// ---------- Modales ----------
export function modal({ title, body = '', foot = '', size = '', onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="btn ghost icon" data-close aria-label="Cerrar">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (ev) => ev.key === 'Escape' && close();
  overlay.addEventListener('mousedown', (ev) => ev.target === overlay && close());
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  const first = overlay.querySelector('input:not([type=hidden]), select, textarea');
  setTimeout(() => first?.focus(), 30);
  return { el: overlay, close, body: overlay.querySelector('.modal-body') };
}

export function confirmDialog(message, { title = 'Confirmar', confirmText = 'Eliminar', danger = true } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title, size: 'sm',
      body: `<p>${message}</p>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(confirmText)}</button>`,
      onClose: () => !done && resolve(false),
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      done = true;
      m.close();
      resolve(true);
    });
  });
}

// ---------- Formularios ----------
function fieldHtml(f, v) {
  const id = `f_${f.name}_${Math.random().toString(36).slice(2, 7)}`;
  const req = f.required ? 'required' : '';
  const common = `id="${id}" name="${f.name}" ${req} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${f.disabled ? 'disabled' : ''}`;
  let input;
  switch (f.type) {
    case 'select':
      input = `<select ${common}>${f.empty !== false ? `<option value="">${esc(f.empty || 'Selecciona…')}</option>` : ''}${(f.options || [])
        .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
      break;
    case 'multi': {
      const set = new Set((v || []).map(String));
      input = `<div class="multi" data-multi="${f.name}">${(f.options || []).length ? f.options
        .map((o) => `<label><input type="checkbox" value="${esc(o.value)}" ${set.has(String(o.value)) ? 'checked' : ''}>${esc(o.label)}</label>`).join('') : '<span class="muted small">Sin opciones registradas.</span>'}</div>`;
      break;
    }
    case 'textarea':
      input = `<textarea ${common}>${esc(v ?? '')}</textarea>`;
      break;
    case 'checkbox':
      return `<label class="check ${f.full ? 'full' : ''}"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}><span>${esc(f.label)}${f.help ? `<br><span class="muted small">${esc(f.help)}</span>` : ''}</span></label>`;
    case 'logo':
      return `<div class="field full"><div class="logo-drop"><div class="prev">${v ? `<img src="${esc(v)}" alt="">` : icon('rings')}</div>
        <div style="flex:1"><b>${esc(f.label)}</b><div class="muted small">PNG, JPG o WEBP de hasta 1 MB.</div></div>
        <label class="btn sm">${icon('upload')}Elegir<input type="file" accept="image/png,image/jpeg,image/webp" data-logo="${f.name}" hidden></label>
        <button type="button" class="btn sm ghost" data-logo-clear="${f.name}">Quitar</button>
        <input type="hidden" name="${f.name}" value="${esc(v || '')}"></div><span class="err" data-err="${f.name}"></span></div>`;
    default:
      input = `<input type="${f.type || 'text'}" ${common} value="${esc(v ?? '')}" ${f.type === 'number' && !f.step ? 'step="any"' : ''}>`;
  }
  return `<label class="field ${f.full ? 'full' : ''}" for="${id}"><span>${esc(f.label)}${f.required ? ' <span class="gold">*</span>' : ''}</span>${input}${f.help ? `<span class="help">${esc(f.help)}</span>` : ''}<span class="err" data-err="${f.name}"></span></label>`;
}

export const fieldsHtml = (fields, values = {}) => `<div class="form-grid">${fields.map((f) => (f.html ? `<div class="full">${f.html}</div>` : fieldHtml(f, values[f.name]))).join('')}</div>`;

export function bindFormExtras(root) {
  root.querySelectorAll('[data-logo]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const file = inp.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) return toast('El logotipo supera 1 MB.', 'bad');
      const reader = new FileReader();
      reader.onload = () => {
        const wrap = inp.closest('.logo-drop');
        wrap.querySelector(`input[name="${inp.dataset.logo}"]`).value = reader.result;
        wrap.querySelector('.prev').innerHTML = `<img src="${reader.result}" alt="">`;
      };
      reader.readAsDataURL(file);
    });
  });
  root.querySelectorAll('[data-logo-clear]').forEach((b) => b.addEventListener('click', () => {
    const wrap = b.closest('.logo-drop');
    wrap.querySelector(`input[name="${b.dataset.logoClear}"]`).value = '';
    wrap.querySelector('.prev').innerHTML = icon('rings');
  }));
}

export function readFields(root, fields) {
  const out = {};
  for (const f of fields) {
    if (!f.name) continue;
    if (f.type === 'multi') {
      out[f.name] = [...root.querySelectorAll(`[data-multi="${f.name}"] input:checked`)].map((i) => (f.numeric === false ? i.value : Number(i.value)));
      continue;
    }
    const el = root.querySelector(`[name="${f.name}"]`);
    if (!el) continue;
    if (f.type === 'checkbox') out[f.name] = el.checked;
    else if (el.value === '') out[f.name] = null;
    else if (f.type === 'number' || (f.type === 'select' && f.numeric)) out[f.name] = Number(el.value);
    else out[f.name] = el.value;
  }
  return out;
}

export function showErrors(root, e) {
  root.querySelectorAll('[data-err]').forEach((x) => (x.textContent = ''));
  root.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
  const details = e?.details || null;
  let mapped = false;
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    for (const [k, msg] of Object.entries(details)) {
      const slot = root.querySelector(`[data-err="${k}"]`);
      if (slot && typeof msg === 'string') {
        slot.textContent = msg;
        root.querySelector(`[name="${k}"]`)?.classList.add('invalid');
        mapped = true;
      }
    }
  }
  if (!mapped) handleError(e);
}

/** Modal con formulario. onSubmit(data) puede lanzar ApiError con errores por campo. */
export function formModal({ title, fields, values = {}, submitText = 'Guardar', size = '', intro = '', onSubmit }) {
  const m = modal({
    title, size,
    body: `<form novalidate>${intro ? `<div style="margin-bottom:14px">${intro}</div>` : ''}${fieldsHtml(fields, values)}<button type="submit" hidden></button></form>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" data-submit>${esc(submitText)}</button>`,
  });
  const form = m.el.querySelector('form');
  bindFormExtras(form);
  const btn = m.el.querySelector('[data-submit]');
  const submit = async (ev) => {
    ev?.preventDefault();
    const data = readFields(form, fields);
    for (const f of fields) {
      if (f.required && (data[f.name] === null || data[f.name] === '' || (Array.isArray(data[f.name]) && !data[f.name].length))) {
        showErrors(form, new ApiError(422, 'Revisa los datos.', { [f.name]: `${f.label} es obligatorio.` }));
        return;
      }
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await onSubmit(data, m);
      m.close();
    } catch (e) {
      showErrors(form, e);
    } finally {
      btn.disabled = false;
      btn.textContent = submitText;
    }
  };
  form.addEventListener('submit', submit);
  btn.addEventListener('click', submit);
  return m;
}

// ---------- Tablas con búsqueda, filtros y orden ----------
export function mountTable(container, { columns, rows, search, filters = [], empty = 'Sin registros.', onRowClick, tools = '', footer, pageSize = 50 }) {
  const state = { q: '', f: {}, sort: null, dir: 1, page: 1 };
  container.innerHTML = `<div class="table-tools">
      ${search ? `<div class="search">${icon('search')}<input type="search" placeholder="Buscar…" aria-label="Buscar"></div>` : ''}
      ${filters.map((f, i) => `<select data-filter="${i}" aria-label="${esc(f.label)}"><option value="">${esc(f.label)}</option>${f.options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`).join('')}
      <span class="muted small" data-count></span><span style="flex:1"></span>${tools}
    </div><div class="table-wrap"><table><thead><tr>${columns.map((c, i) => `<th class="${c.sort !== false ? 'sortable' : ''} ${c.align || ''}" data-col="${i}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody></tbody>${footer ? '<tfoot></tfoot>' : ''}</table></div><div class="row" data-pager style="justify-content:flex-end;margin-top:8px"></div>`;
  const tbody = container.querySelector('tbody');
  const render = () => {
    let list = rows.filter((r) => {
      if (state.q && !search(r).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(state.q)) return false;
      return filters.every((f, i) => !state.f[i] || f.test(r, state.f[i]));
    });
    if (state.sort !== null) {
      const c = columns[state.sort];
      const key = c.sortValue || ((r) => r[c.key]);
      list = [...list].sort((a, b) => {
        const x = key(a);
        const y = key(b);
        return (x === y ? 0 : x === null || x === undefined ? 1 : y === null || y === undefined ? -1 : x > y ? 1 : -1) * state.dir;
      });
    }
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * pageSize, state.page * pageSize);
    container.querySelector('[data-count]').textContent = `${list.length} de ${rows.length}`;
    tbody.innerHTML = slice.length
      ? slice.map((r, i) => `<tr data-i="${i}" class="${onRowClick ? 'clickable' : ''}">${columns.map((c) => `<td class="${c.align || ''} ${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}"><div class="empty">${empty}</div></td></tr>`;
    if (footer) container.querySelector('tfoot').innerHTML = footer(list);
    if (onRowClick) tbody.querySelectorAll('tr[data-i]').forEach((tr) => tr.addEventListener('click', (ev) => {
      if (ev.target.closest('button, a, input, select, label')) return;
      onRowClick(slice[Number(tr.dataset.i)]);
    }));
    const pager = container.querySelector('[data-pager]');
    pager.innerHTML = pages > 1 ? `<button class="btn sm" data-p="-1" ${state.page === 1 ? 'disabled' : ''}>${icon('chevronLeft')}</button><span class="small muted">Página ${state.page} de ${pages}</span><button class="btn sm" data-p="1" ${state.page === pages ? 'disabled' : ''}>${icon('chevronRight')}</button>` : '';
    pager.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
      state.page += Number(b.dataset.p);
      render();
    }));
    container.dispatchEvent(new CustomEvent('rendered', { detail: { rows: slice } }));
  };
  container.querySelector('input[type=search]')?.addEventListener('input', (ev) => {
    state.q = ev.target.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    state.page = 1;
    render();
  });
  container.querySelectorAll('[data-filter]').forEach((s) => s.addEventListener('change', () => {
    state.f[s.dataset.filter] = s.value;
    state.page = 1;
    render();
  }));
  container.querySelectorAll('th.sortable').forEach((th) => th.addEventListener('click', () => {
    const i = Number(th.dataset.col);
    state.dir = state.sort === i ? -state.dir : 1;
    state.sort = i;
    render();
  }));
  render();
  return { render, setRows: (r) => { rows = r; render(); } };
}

// ---------- Piezas de interfaz ----------
export const kpi = ({ label, value, foot = '', ico = 'spark', accent = false, small = false, bar = null }) => `
  <div class="kpi ${accent ? 'accent' : ''}"><div class="ico">${icon(ico)}</div><div class="label">${esc(label)}</div>
  <div class="value ${small ? 'sm' : ''}">${value}</div>${bar !== null ? `<div class="bar"><span style="width:${Math.max(0, Math.min(100, bar))}%"></span></div>` : ''}${foot ? `<div class="foot">${foot}</div>` : ''}</div>`;

export const emptyState = (title, text, action = '', ico = 'rings') => `<div class="empty">${icon(ico, 'big')}<h4>${esc(title)}</h4><p>${text}</p>${action}</div>`;

export const loading = () => '<div class="loading"><span class="spinner"></span><span class="small">Cargando…</span></div>';

export function tabs(container, items, onChange, initial) {
  container.innerHTML = items.map((t) => `<button type="button" data-tab="${t.id}">${t.icon ? icon(t.icon) : ''}${esc(t.label)}</button>`).join('');
  const set = (id) => {
    container.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
    onChange(id);
  };
  container.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => set(b.dataset.tab)));
  set(initial || items[0].id);
  return set;
}

export const options = (list, label = 'name') => list.map((x) => ({ value: x.id, label: typeof label === 'function' ? label(x) : x[label] }));

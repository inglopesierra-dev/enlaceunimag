import { api, setUnauthorizedHandler } from './lib/api.js';
import { icon } from './lib/icons.js';
import { store, esc, initials, loading, handleError } from './lib/ui.js';

const NAV = [
  { section: 'General' },
  { path: '/inicio', label: 'Inicio', icon: 'home', view: 'dashboard' },
  { path: '/eventos', label: 'Eventos', icon: 'rings', view: 'events' },
  { path: '/programacion', label: 'Programación de turnos', icon: 'calendar', view: 'schedule' },
  { path: '/optimizacion', label: 'Optimización', icon: 'spark', view: 'optimize' },
  { section: 'Personal' },
  { path: '/trabajadores', label: 'Trabajadores', icon: 'users', view: 'workers' },
  { path: '/funciones', label: 'Funciones y requerimientos', icon: 'layers', view: 'roles' },
  { path: '/tarifas', label: 'Tarifas y costos', icon: 'coins', view: 'rates' },
  { section: 'Análisis' },
  { path: '/historial', label: 'Historial y análisis', icon: 'history', view: 'history' },
  { path: '/indicadores', label: 'Indicadores y reportes', icon: 'chart', view: 'indicators' },
  { section: 'Empresa' },
  { path: '/configuracion', label: 'Configuración', icon: 'settings', view: 'settings' },
];
const PUBLIC = { '/': 'landing', '/login': 'auth', '/registro': 'auth', '/recuperar': 'auth', '/restablecer': 'auth' };

export function navigate(path) {
  if (location.hash === '#' + path) route();
  else location.hash = path;
}

export async function refreshSession() {
  try {
    const me = await api.get('/auth/me');
    if (!me.user) throw new Error('sin sesión');
    store.user = me.user;
    store.company = me.company;
  } catch {
    store.user = null;
    store.company = null;
  }
}

/** Catálogos de la empresa con caché (se invalida tras modificarlos). */
export async function catalogs(force = false) {
  if (!force && store.cache.catalogs) return store.cache.catalogs;
  const [roles, categories, types, competences] = await Promise.all([api.get('/roles'), api.get('/categories'), api.get('/event-types'), api.get('/competences')]);
  store.cache.catalogs = { roles, categories, types, competences };
  return store.cache.catalogs;
}
export const invalidateCatalogs = () => delete store.cache.catalogs;

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function renderShell() {
  const app = document.getElementById('app');
  const c = store.company;
  app.innerHTML = `<div class="shell">
    <aside class="sidebar" aria-label="Menú principal">
      <a class="brand" href="#/inicio" aria-label="Wedflow, inicio"><img src="/img/logo-light.svg" alt="Wedflow"></a>
      <nav class="nav">${NAV.map((n) => (n.section ? `<div class="nav-label">${n.section}</div>` : `<a href="#${n.path}" data-path="${n.path}">${icon(n.icon)}<span>${n.label}</span></a>`)).join('')}</nav>
      <div class="company" style="margin-top:24px">
        <div class="avatar">${c.logo_data ? `<img src="${esc(c.logo_data)}" alt="">` : esc(initials(c.name))}</div>
        <div style="min-width:0"><div class="name">${esc(c.name)}</div><div class="meta">${esc([c.city, c.country].filter(Boolean).join(', ') || 'Configura tu ubicación')} · ${esc(c.currency)}</div></div>
      </div>
    </aside>
    <div class="drawer-backdrop" data-close-nav></div>
    <div class="main">
      <header class="topbar">
        <button class="btn icon ghost menu-btn" data-toggle-nav aria-label="Abrir menú">${icon('menu')}</button>
        <div class="crumbs" id="crumbs"></div>
        <div class="spacer"></div>
        <button class="user-chip" id="user-chip" aria-haspopup="true">
          <span class="who" style="text-align:right;line-height:1.2"><b style="font-size:13px">${esc(store.user.name)}</b><br><span class="role">${esc(store.user.role)}</span></span>
          <span class="initials">${esc(initials(store.user.name))}</span>
        </button>
      </header>
      <main class="content" id="content" tabindex="-1"></main>
    </div>
  </div>`;
  app.querySelector('[data-toggle-nav]').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  app.querySelector('[data-close-nav]').addEventListener('click', () => document.body.classList.remove('nav-open'));
  app.querySelector('#user-chip').addEventListener('click', async () => {
    const { modal } = await import('./lib/ui.js');
    const m = modal({
      title: store.user.name, size: 'sm',
      body: `<p class="muted">${esc(store.user.email)} · rol <b>${esc(store.user.role)}</b><br>${esc(store.company.name)}</p>
        <div class="stack" style="gap:8px;margin-top:12px">
          <a class="btn" href="#/configuracion?tab=seguridad" data-close>${icon('key')}Cambiar contraseña</a>
          <button class="btn danger" data-logout>${icon('logout')}Cerrar sesión</button></div>`,
    });
    m.el.querySelector('[data-logout]').addEventListener('click', async () => {
      await api.post('/auth/logout');
      m.close();
      store.user = null;
      store.company = null;
      store.cache = {};
      navigate('/login');
    });
  });
}

export function setCrumbs(parts) {
  const el = document.getElementById('crumbs');
  if (el) el.innerHTML = parts.map((p, i) => (i < parts.length - 1 && p.href ? `<a href="#${p.href}">${esc(p.label)}</a>` : `<span>${esc(p.label)}</span>`)).join(' <span class="muted">/</span> ');
  document.title = `${parts[parts.length - 1]?.label || 'Wedflow'} · Wedflow`;
}

let routeToken = 0;
async function route() {
  const token = ++routeToken;
  const { path, query } = parseHash();
  document.body.classList.remove('nav-open');
  if (PUBLIC[path]) {
    if (store.user && path !== '/restablecer') return navigate('/inicio');
    const mod = await import(`./views/${PUBLIC[path]}.js`);
    document.body.dataset.shell = '';
    return mod.default({ root: document.getElementById('app'), path, query });
  }
  if (!store.user) return navigate('/login');
  if (path === '/bienvenida' || (!store.company.onboarding_done && store.user.role === 'admin' && path === '/inicio' && !sessionStorageSafe('wf_skip_onboarding'))) {
    const mod = await import('./views/onboarding.js');
    document.body.dataset.shell = '';
    return mod.default({ root: document.getElementById('app'), query });
  }
  if (document.body.dataset.shell !== String(store.company.id) || !document.getElementById('content')) {
    renderShell();
    document.body.dataset.shell = String(store.company.id);
  }
  const segs = path.split('/').filter(Boolean);
  const item = NAV.find((n) => n.path === '/' + segs[0]);
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.path === '/' + segs[0]));
  const content = document.getElementById('content');
  if (!item) {
    content.innerHTML = '<div class="empty"><h4>Página no encontrada</h4><a class="btn" href="#/inicio">Volver al inicio</a></div>';
    return;
  }
  content.innerHTML = loading();
  try {
    const mod = await import(`./views/${item.view}.js`);
    if (token !== routeToken) return;
    content.innerHTML = '';
    await mod.default({ root: content, params: segs.slice(1), query, path });
    content.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (e) {
    if (token !== routeToken) return;
    content.innerHTML = '<div class="empty"><h4>No se pudo cargar esta sección</h4><p>Revisa tu conexión e inténtalo de nuevo.</p></div>';
    handleError(e);
  }
}

function sessionStorageSafe(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

setUnauthorizedHandler(() => {
  store.user = null;
  store.company = null;
  navigate('/login');
});

window.addEventListener('hashchange', route);
(async () => {
  await refreshSession();
  route();
})();

import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { store, esc, fieldsHtml, readFields, showErrors, toast } from '../lib/ui.js';
import { navigate, refreshSession } from '../app.js';

export default async function onboarding({ root }) {
  const [roles, cats, workers, rates, events, reqs] = await Promise.all([
    api.get('/roles'), api.get('/categories'), api.get('/workers'), api.get('/rates'), api.get('/events'), api.get('/requirements'),
  ]);
  const c = store.company;
  const steps = [
    ['layers', 'Funciones o cargos', roles.length, '#/funciones', `${roles.length} registrada(s)`],
    ['grid', 'Categorías y matriz de personal mínimo', cats.length && reqs.length, '#/funciones?tab=matriz', `${cats.length} categoría(s), ${reqs.length} celda(s)`],
    ['coins', 'Tarifas de contratación', rates.length, '#/tarifas', `${rates.length} tarifa(s)`],
    ['users', 'Trabajadores y disponibilidad', workers.length, '#/trabajadores', `${workers.length} trabajador(es)`],
    ['rings', 'Primer evento con turnos', events.length, '#/eventos', `${events.length} evento(s)`],
  ];
  const fields = [
    { name: 'shift_reference_hours', label: 'Duración de referencia del turno (h)', type: 'number', min: 1, max: 24, step: 0.5, help: 'Los turnos más largos generan una alerta.' },
    { name: 'max_shifts_per_worker_event', label: 'Máximo de turnos por trabajador en un evento', type: 'number', min: 1, max: 6, step: 1 },
    { name: 'allow_multi_role', label: 'Permitir que un trabajador cubra funciones distintas a su función principal (si está autorizado)', type: 'checkbox', full: true },
  ];
  root.innerHTML = `<div class="public"><nav class="public-nav"><img src="/img/logo.svg" alt="Wedflow"><span class="spacer"></span><button class="btn ghost" data-skip>Omitir por ahora</button></nav>
    <div class="section" style="padding-top:10px;max-width:980px">
      <div class="eyebrow">Bienvenida</div><h1 style="font-size:46px;font-weight:500;margin:8px 0">Hola, ${esc(store.user.name.split(' ')[0])}. Preparemos ${esc(c.name)}.</h1>
      <p class="muted" style="font-size:16px">Estos son los pasos para obtener tu primera programación optimizada. Todo queda guardado solo para tu empresa.</p>
      <div class="grid g2" style="margin-top:22px;align-items:start">
        <div class="card"><div class="card-head"><h3>Reglas de operación</h3></div><form novalidate>${fieldsHtml(fields, c)}</form>
          <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn primary" data-save>Guardar y continuar ${icon('arrowRight')}</button></div></div>
        <div class="card tint"><div class="card-head"><h3>Lista de configuración</h3></div>
          <div class="stack" style="gap:8px">${steps.map(([ic, t, ok, href, meta]) => `<a class="event-item" href="${href}" data-go style="grid-template-columns:40px 1fr auto">
            <span class="datebox" style="width:40px;height:40px;background:${ok ? 'var(--ink)' : 'var(--sand)'};color:${ok ? 'var(--gold-soft)' : 'var(--muted)'}">${icon(ok ? 'check' : ic)}</span>
            <span><span class="title">${t}</span><br><span class="small muted">${meta}</span></span>${icon('chevronRight')}</a>`).join('')}</div>
        </div>
      </div>
    </div></div>`;
  const finish = async (go) => {
    try {
      const data = readFields(root.querySelector('form'), fields);
      await api.put('/company', { ...data, onboarding_done: true });
      await refreshSession();
      navigate(go || '/inicio');
    } catch (e) {
      showErrors(root.querySelector('form'), e);
    }
  };
  root.querySelector('[data-save]').addEventListener('click', () => finish().then(() => toast('Configuración guardada.')));
  root.querySelector('[data-skip]').addEventListener('click', () => finish());
  root.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault();
    finish(a.getAttribute('href').slice(1));
  }));
}

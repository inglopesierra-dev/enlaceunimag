import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { esc, fieldsHtml, readFields, showErrors, bindFormExtras, toast } from '../lib/ui.js';
import { navigate, refreshSession } from '../app.js';

export const CURRENCIES = [
  ['COP', 'Peso colombiano (COP)'], ['USD', 'Dólar estadounidense (USD)'], ['EUR', 'Euro (EUR)'], ['MXN', 'Peso mexicano (MXN)'], ['PEN', 'Sol peruano (PEN)'],
  ['CLP', 'Peso chileno (CLP)'], ['ARS', 'Peso argentino (ARS)'], ['BRL', 'Real brasileño (BRL)'], ['GTQ', 'Quetzal (GTQ)'], ['CRC', 'Colón costarricense (CRC)'],
  ['DOP', 'Peso dominicano (DOP)'], ['UYU', 'Peso uruguayo (UYU)'], ['BOB', 'Boliviano (BOB)'], ['PYG', 'Guaraní (PYG)'], ['PAB', 'Balboa (PAB)'], ['GBP', 'Libra esterlina (GBP)'], ['CAD', 'Dólar canadiense (CAD)'],
].map(([value, label]) => ({ value, label }));
export const LOCALES = [['es-CO', 'Español (Colombia)'], ['es-MX', 'Español (México)'], ['es-ES', 'Español (España)'], ['es-AR', 'Español (Argentina)'], ['es-CL', 'Español (Chile)'], ['es-PE', 'Español (Perú)'], ['en-US', 'Inglés (EE. UU.)'], ['pt-BR', 'Portugués (Brasil)']].map(([value, label]) => ({ value, label }));

export const companyFields = () => [
  { name: 'name', label: 'Nombre de la empresa', required: true, full: true, placeholder: 'Ej.: Bodas del Mar' },
  { name: 'logo_data', label: 'Logotipo', type: 'logo' },
  { name: 'country', label: 'País', placeholder: 'Colombia' },
  { name: 'city', label: 'Ciudad de operación', placeholder: 'Santa Marta' },
  { name: 'email', label: 'Correo de contacto', type: 'email' },
  { name: 'phone', label: 'Teléfono de contacto', type: 'tel' },
  { name: 'currency', label: 'Moneda', type: 'select', options: CURRENCIES, empty: false },
  { name: 'locale', label: 'Formato regional', type: 'select', options: LOCALES, empty: false },
  { name: 'shift_reference_hours', label: 'Duración habitual del turno (horas)', type: 'number', min: 1, max: 24, step: 0.5, help: 'Se usa para alertar turnos largos. Puedes cambiarla luego.' },
];

const ART = `<aside class="auth-art">
  <a href="#/"><img src="/img/logo.svg" alt="Wedflow" style="height:46px"></a>
  <img class="arch" src="/img/arch.svg" alt="">
  <blockquote>“El día es único. La planificación del equipo también debería serlo.”<div class="small muted" style="font-family:var(--sans);margin-top:10px">Planifica turnos, controla costos y optimiza tu personal.</div></blockquote>
</aside>`;

function layout(root, inner) {
  root.innerHTML = `<div class="auth">${ART}<section class="auth-form"><div class="box">${inner}</div></section></div>`;
}

export default function auth({ root, path, query }) {
  if (path === '/login') return login(root, query);
  if (path === '/registro') return register(root);
  if (path === '/recuperar') return forgot(root);
  return reset(root, query);
}

function login(root, query) {
  const fields = [
    { name: 'email', label: 'Correo', type: 'email', required: true, full: true },
    { name: 'password', label: 'Contraseña', type: 'password', required: true, full: true },
  ];
  layout(root, `<div class="eyebrow">Bienvenida de nuevo</div><h1>Inicia sesión</h1><p class="muted">Accede a la planificación de tu empresa.</p>
    <form class="stack" novalidate style="margin-top:18px">${fieldsHtml(fields, query.demo ? { email: 'demo@wedflow.app', password: 'Wedflow2026' } : {})}
      <button class="btn primary lg" type="submit">Entrar ${icon('arrowRight')}</button>
      <div class="row" style="justify-content:space-between"><a href="#/recuperar" class="small">¿Olvidaste tu contraseña?</a><a href="#/registro" class="small">Crear una cuenta</a></div>
    </form>
    <div class="callout" style="margin-top:22px">${icon('info')}<div><b>Cuenta de demostración</b><br><span class="small">demo@wedflow.app · Wedflow2026 — caso de estudio Karol Planner.</span>
      <div><button class="btn sm" style="margin-top:8px" data-demo>Usar la demostración</button></div></div></div>`);
  const form = root.querySelector('form');
  root.querySelector('[data-demo]').addEventListener('click', () => {
    form.email.value = 'demo@wedflow.app';
    form.password.value = 'Wedflow2026';
    form.requestSubmit();
  });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api.post('/auth/login', readFields(form, fields));
      await refreshSession();
      navigate('/inicio');
    } catch (e) {
      showErrors(form, e);
    } finally {
      btn.disabled = false;
    }
  });
}

function register(root) {
  const accountFields = [
    { name: 'name', label: 'Tu nombre', required: true, full: true },
    { name: 'email', label: 'Correo', type: 'email', required: true, full: true },
    { name: 'password', label: 'Contraseña', type: 'password', required: true, full: true, help: 'Mínimo 8 caracteres, con letras y números.' },
  ];
  const cFields = companyFields();
  const data = { account: {}, company: { currency: 'COP', locale: 'es-CO', shift_reference_hours: 8 }, demo: 'config' };
  let step = 0;
  const render = () => {
    const titles = ['Crea tu cuenta', 'Tu empresa', 'Datos iniciales'];
    let body;
    if (step === 0) body = fieldsHtml(accountFields, data.account);
    else if (step === 1) body = fieldsHtml(cFields, data.company);
    else {
      body = `<div class="stack" style="gap:10px">
        ${[['config', 'Configuración de referencia del caso Karol Planner', 'Carga 9 funciones, categorías pequeña/mediana/grande, la matriz de requerimientos y las tarifas 2021–2026 como punto de partida editable. Sin trabajadores ni eventos.'],
          ['full', 'Configuración + escenario de prueba', 'Además crea una boda mediana de prueba (100 invitados, 17 turnos) y 24 trabajadores de prueba genéricos para probar la optimización.'],
          ['none', 'Empezar en blanco', 'Configura tus propias funciones, categorías, tarifas y personal desde cero.']]
          .map(([v, t, d]) => `<label class="choice"><input type="radio" name="demo" value="${v}" ${data.demo === v ? 'checked' : ''}><span><b>${t}</b><span class="small muted">${d}</span></span></label>`).join('')}
        <p class="tiny muted">Los datos de referencia se pueden modificar, eliminar o reemplazar en cualquier momento. No son valores obligatorios.</p></div>`;
    }
    layout(root, `<div class="eyebrow">Paso ${step + 1} de 3</div><h1>${titles[step]}</h1>
      <div class="wizard-steps">${[0, 1, 2].map((i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>
      <form novalidate>${body}<div class="row" style="margin-top:20px;justify-content:space-between">
        ${step ? `<button type="button" class="btn" data-back>${icon('arrowLeft')}Atrás</button>` : '<a href="#/login" class="small">Ya tengo cuenta</a>'}
        <button class="btn primary" type="submit">${step === 2 ? 'Crear mi espacio' : 'Continuar'} ${icon('arrowRight')}</button></div></form>`);
    const form = root.querySelector('form');
    bindFormExtras(form);
    root.querySelector('[data-back]')?.addEventListener('click', () => {
      save(form);
      step--;
      render();
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      save(form);
      const need = step === 0 ? accountFields : step === 1 ? cFields : [];
      const src = step === 0 ? data.account : data.company;
      for (const f of need) {
        if (f.required && !src[f.name]) return showErrors(form, { details: { [f.name]: `${f.label} es obligatorio.` } });
      }
      if (step === 0 && (String(data.account.password).length < 8 || !/\d/.test(data.account.password) || !/[a-zA-Z]/.test(data.account.password))) {
        return showErrors(form, { details: { password: 'Mínimo 8 caracteres, con letras y números.' } });
      }
      if (step < 2) {
        step++;
        return render();
      }
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        await api.post('/auth/register', { user: data.account, company: data.company, demo: data.demo });
        await refreshSession();
        toast('¡Tu espacio en Wedflow está listo!');
        navigate('/bienvenida');
      } catch (e) {
        const d = e.details || {};
        if (Object.keys(d).some((k) => accountFields.some((f) => f.name === k))) step = 0;
        else if (Object.keys(d).some((k) => cFields.some((f) => f.name === k))) step = 1;
        render();
        showErrors(root.querySelector('form'), e);
      }
    });
  };
  const save = (form) => {
    if (step === 0) Object.assign(data.account, readFields(form, accountFields));
    else if (step === 1) Object.assign(data.company, readFields(form, cFields));
    else data.demo = form.querySelector('input[name=demo]:checked')?.value || 'none';
  };
  render();
}

function forgot(root) {
  layout(root, `<div class="eyebrow">Recuperar acceso</div><h1>¿Olvidaste tu contraseña?</h1><p class="muted">Escribe tu correo y te generaremos un enlace de recuperación válido por 30 minutos.</p>
    <form class="stack" novalidate style="margin-top:18px">${fieldsHtml([{ name: 'email', label: 'Correo', type: 'email', required: true, full: true }])}
    <button class="btn primary lg" type="submit">Generar enlace</button><a href="#/login" class="small">Volver a iniciar sesión</a></form><div data-out style="margin-top:16px"></div>`);
  const form = root.querySelector('form');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      const r = await api.post('/auth/forgot', { email: form.email.value });
      root.querySelector('[data-out]').innerHTML = `<div class="callout ok">${icon('check')}<div>${esc(r.message)}
        ${r.dev_reset_token ? `<div class="small" style="margin-top:6px">Modo de desarrollo: no hay servidor de correo configurado. <a href="#/restablecer?token=${encodeURIComponent(r.dev_reset_token)}">Abrir el enlace de recuperación</a></div>` : ''}</div></div>`;
    } catch (e) {
      showErrors(form, e);
    }
  });
}

function reset(root, query) {
  const fields = [{ name: 'password', label: 'Nueva contraseña', type: 'password', required: true, full: true, help: 'Mínimo 8 caracteres, con letras y números.' }];
  layout(root, `<div class="eyebrow">Recuperar acceso</div><h1>Nueva contraseña</h1>
    <form class="stack" novalidate style="margin-top:18px">${fieldsHtml(fields)}<button class="btn primary lg" type="submit">Guardar contraseña</button></form>`);
  const form = root.querySelector('form');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      await api.post('/auth/reset', { token: query.token, password: form.password.value });
      toast('Contraseña actualizada. Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (e) {
      showErrors(form, e);
    }
  });
}

import { icon } from '../lib/icons.js';

const FEATURES = [
  ['spark', 'Optimización real', 'Un modelo de programación lineal entera (MILP) resuelto con HiGHS asigna al personal de menor costo sin incumplir la cobertura mínima.'],
  ['calendar', 'Turnos sin cruces', 'Detecta cruces de horario, turnos después de la medianoche y jornadas que superan la duración de referencia.'],
  ['users', 'Tu equipo, tus reglas', 'Registra trabajadores con varias funciones autorizadas, competencias, disponibilidad e historial de asignaciones.'],
  ['layers', 'Requerimientos a tu medida', 'Crea tus propias funciones, categorías de evento y matriz de personal mínimo. Nada viene impuesto.'],
  ['coins', 'Tarifas con historia', 'Tarifas por función, por trabajador y por tipo de evento, con vigencias e historial de cambios.'],
  ['chart', 'Indicadores y reportes', 'Costo total, variación porcentual, cobertura, conflictos y horas adicionales, descargables en Excel y PDF.'],
];

export default function landing({ root }) {
  root.innerHTML = `<div class="public">
    <nav class="public-nav">
      <img src="/img/logo.svg" alt="Wedflow">
      <span class="spacer"></span>
      <a class="btn ghost hide-sm" href="#modelo">Cómo optimiza</a>
      <a class="btn" href="#/login">Iniciar sesión</a>
      <a class="btn primary" href="#/registro">Crear cuenta</a>
    </nav>
    <header class="hero">
      <div>
        <div class="eyebrow">Planificación de personal para Wedding Planners</div>
        <h1 style="margin-top:14px">Cada boda, con el equipo <em>justo</em> y al menor costo.</h1>
        <p class="lead">Wedflow organiza tus eventos, turnos y trabajadores, y calcula la asignación de personal que cumple todos los requerimientos con el menor costo de contratación.</p>
        <div class="row">
          <a class="btn gold lg" href="#/registro">${icon('spark')}Empieza gratis</a>
          <a class="btn lg" href="#/login?demo=1">${icon('play')}Ver la demostración</a>
        </div>
        <p class="small muted" style="margin-top:14px">Incluye un escenario de prueba basado en el caso de estudio Karol Planner (Santa Marta, Colombia), editable por completo.</p>
      </div>
      <div class="hero-art">
        <img src="/img/arch.svg" alt="" style="width:100%">
        <div class="floating" style="left:-4%;top:22%"><div class="eyebrow" style="font-size:9.5px">Cobertura</div><div class="serif" style="font-size:28px">100 %</div><div class="muted tiny">24 de 24 puestos</div></div>
        <div class="floating" style="right:-2%;top:56%"><div class="eyebrow" style="font-size:9.5px">Solución</div><div class="row" style="gap:6px"><span class="badge ok">Óptima</span><span class="small">MILP · HiGHS</span></div><div class="muted tiny" style="margin-top:4px">Sin cruces de horario</div></div>
      </div>
    </header>

    <section class="section">
      <div class="section-head"><div class="eyebrow">Todo en un solo lugar</div><h2>De la configuración de tu empresa a una programación optimizada</h2></div>
      <div class="grid g3">${FEATURES.map(([ic, t, d]) => `<div class="card feature"><div class="ico">${icon(ic)}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join('')}</div>
    </section>

    <section class="section" id="modelo">
      <div class="band">
        <div class="grid g2" style="align-items:center;gap:36px">
          <div>
            <div class="eyebrow" style="color:var(--gold-soft)">El modelo</div>
            <h2 style="font-size:clamp(28px,3vw,40px);font-weight:500;margin:10px 0 14px">Minimizar el costo sin dejar ningún puesto sin cubrir</h2>
            <p style="color:#d8cfc2">Para cada evento, Wedflow decide qué trabajador <i>i</i> cubre la función <i>j</i> en el turno <i>t</i>. Solo usa a quien tiene la competencia, está disponible en ese horario y no tiene otro turno simultáneo.</p>
            <p style="color:#d8cfc2">Si no existe una asignación factible, te explica qué restricción lo impide. Y si una regla automática es la única opción, lo dice: nunca presenta como óptimo algo que no lo es.</p>
          </div>
          <div class="stack" style="gap:10px">
            <div class="formula" style="background:#221f1c;border-color:#3a342e;color:#fff">min Z = Σ<sub>i</sub> Σ<sub>j</sub> Σ<sub>t</sub> C<sub>ijt</sub> · X<sub>ijt</sub></div>
            <div class="formula" style="background:#221f1c;border-color:#3a342e;color:#efe8dd;font-size:16px">Σ<sub>i</sub> X<sub>ijt</sub> ≥ d<sub>jt</sub> &nbsp;·&nbsp; Σ<sub>t∋p</sub> X<sub>ijt</sub> ≤ 1 &nbsp;·&nbsp; X<sub>ijt</sub> ∈ {0, 1}</div>
            <div class="row small" style="color:#b9ae9f;gap:14px"><span>${icon('check')} Cobertura mínima</span><span>${icon('check')} Disponibilidad</span><span>${icon('check')} Competencias</span><span>${icon('check')} Sin cruces</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="grid g4 steps">
        <div class="step"><h3>Configura</h3><p class="muted">Logotipo, moneda, funciones, categorías y duración de los turnos.</p></div>
        <div class="step"><h3>Registra</h3><p class="muted">Trabajadores, tarifas, disponibilidad y la matriz de personal mínimo.</p></div>
        <div class="step"><h3>Programa</h3><p class="muted">Crea el evento, sus actividades y los turnos por función.</p></div>
        <div class="step"><h3>Optimiza</h3><p class="muted">Compara la programación convencional con la optimizada y aplícala.</p></div>
      </div>
      <div class="row" style="justify-content:center;margin-top:36px"><a class="btn primary lg" href="#/registro">Registrar mi empresa ${icon('arrowRight')}</a></div>
    </section>
    <footer class="public-foot"><img src="/img/logo-mark.svg" alt="" style="height:34px;opacity:.8"><br>Wedflow · Planificación, programación y optimización de personal para Wedding Planners</footer>
  </div>`;
}

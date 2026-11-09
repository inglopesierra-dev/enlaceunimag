import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { store, esc, fieldsHtml, readFields, showErrors, bindFormExtras, toast, handleError, confirmDialog, formModal, mountTable, can, tabs } from '../lib/ui.js';
import { setCrumbs, refreshSession, invalidateCatalogs } from '../app.js';
import { companyFields } from './auth.js';

export default async function settings({ root, query }) {
  setCrumbs([{ label: 'Configuración' }]);
  root.innerHTML = `<div class="page-head"><div class="titles"><div class="eyebrow">Tu empresa</div><h1>Configuración</h1>
    <p>Perfil de la empresa, reglas de operación, usuarios y roles, datos de demostración, copias de seguridad e historial de cambios.</p></div></div>
    <nav class="tabs" data-tabs></nav><div data-pane></div>`;
  const pane = root.querySelector('[data-pane]');
  const items = [
    { id: 'empresa', label: 'Empresa', icon: 'briefcase' }, { id: 'operacion', label: 'Reglas de operación', icon: 'clock' },
    ...(can('admin') ? [{ id: 'usuarios', label: 'Usuarios y roles', icon: 'users' }, { id: 'datos', label: 'Datos y respaldo', icon: 'database' }, { id: 'auditoria', label: 'Historial de cambios', icon: 'history' }] : []),
    { id: 'seguridad', label: 'Seguridad', icon: 'key' },
  ];
  const show = async (tab) => {
    const c = store.company;
    const admin = can('admin');
    if (tab === 'empresa' || tab === 'operacion') {
      const fields = tab === 'empresa' ? companyFields() : [
        { name: 'shift_reference_hours', label: 'Duración de referencia del turno (horas)', type: 'number', min: 1, max: 24, step: 0.5, help: 'Referencia del caso de estudio: 8 h. Los turnos más largos generan alerta.' },
        { name: 'max_shifts_per_worker_event', label: 'Máximo de turnos por trabajador en un mismo evento', type: 'number', min: 1, max: 6, step: 1, help: 'Restricción del modelo. Con 1, cada trabajador cubre un solo turno por evento.' },
        { name: 'enforce_max_hours', label: 'Limitar las horas totales por trabajador en un evento', type: 'checkbox', full: true, help: 'Si lo activas, el modelo no asigna más horas que el máximo indicado (restricción F estricta).' },
        { name: 'max_hours_per_worker_event', label: 'Horas máximas por trabajador en un evento', type: 'number', min: 1, max: 24, step: 0.5 },
        { name: 'allow_multi_role', label: 'Permitir que un trabajador cubra funciones distintas a la principal, cuando esté autorizado para ellas', type: 'checkbox', full: true },
      ];
      pane.innerHTML = `<div class="card" style="max-width:860px"><form novalidate>${fieldsHtml(fields, c)}</form>
        ${tab === 'operacion' ? `<div class="callout info" style="margin-top:14px">${icon('info')}<div class="small">Wedflow no inventa tarifas de horas extra: si un turno supera la duración de referencia solo genera una alerta. Para incluir horas extra en el costo, configura su tarifa en cada tarifa de función o de trabajador.</div></div>` : ''}
        ${admin ? `<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" data-save>${icon('check')}Guardar</button></div>` : '<p class="small muted" style="margin-top:12px">Solo un administrador puede modificar estos datos.</p>'}</div>`;
      const form = pane.querySelector('form');
      bindFormExtras(form);
      if (!admin) form.querySelectorAll('input,select,textarea,button').forEach((x) => (x.disabled = true));
      pane.querySelector('[data-save]')?.addEventListener('click', async () => {
        try {
          await api.put('/company', readFields(form, fields));
          await refreshSession();
          document.body.dataset.shell = '';
          toast('Configuración guardada.');
          location.hash = `/configuracion?tab=${tab}&t=${Date.now()}`;
        } catch (e) {
          showErrors(form, e);
        }
      });
    }
    if (tab === 'usuarios') {
      const users = await api.get('/users');
      const roleOpts = [{ value: 'admin', label: 'Administrador: todo, incluidas tarifas, matriz y usuarios' }, { value: 'planificador', label: 'Planificador: eventos, turnos, trabajadores y optimización' }, { value: 'consulta', label: 'Consulta: solo lectura y reportes' }];
      pane.innerHTML = `<div class="row" style="margin-bottom:12px"><p class="small muted" style="flex:1;margin:0">Cada usuario accede solo a la información de ${esc(c.name)}, según su rol.</p><button class="btn primary" data-add>${icon('plus')}Nuevo usuario</button></div><div data-t></div>`;
      const reload = () => show('usuarios');
      pane.querySelector('[data-add]').addEventListener('click', () => formModal({
        title: 'Nuevo usuario',
        fields: [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'role', label: 'Rol', type: 'select', options: roleOpts, required: true, full: true }, { name: 'password', label: 'Contraseña temporal', type: 'password', required: true, help: 'Compártela de forma segura; el usuario puede cambiarla después.' }],
        values: { role: 'planificador' },
        onSubmit: async (d) => {
          await api.post('/users', d);
          toast('Usuario creado.');
          reload();
        },
      }));
      const t = pane.querySelector('[data-t]');
      mountTable(t, {
        rows: users, search: (u) => `${u.name} ${u.email}`,
        columns: [
          { key: 'name', label: 'Nombre', render: (u) => `<b>${esc(u.name)}</b>${u.id === store.user.id ? ' <span class="badge gold">Tú</span>' : ''}` },
          { key: 'email', label: 'Correo' },
          { key: 'role', label: 'Rol', render: (u) => `<span class="badge ${u.role === 'admin' ? 'dark' : u.role === 'planificador' ? 'gold' : ''}">${u.role}</span>` },
          { key: 'active', label: 'Estado', render: (u) => (u.active ? '<span class="badge ok">Activo</span>' : '<span class="badge bad">Inactivo</span>') },
          { key: 'last_login', label: 'Último acceso (UTC)', render: (u) => esc(u.last_login || '—') },
          { key: 'x', label: '', sort: false, cls: 'actions-cell', render: (u) => (u.id === store.user.id ? '' : `<button class="btn sm ghost icon" data-e="${u.id}" aria-label="Editar">${icon('edit')}</button><button class="btn sm ghost icon" data-d="${u.id}" aria-label="Eliminar">${icon('trash')}</button>`) },
        ],
      });
      const bind = () => {
        t.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => {
          const u = users.find((x) => x.id === Number(b.dataset.e));
          formModal({ title: 'Editar usuario', fields: [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'role', label: 'Rol', type: 'select', options: roleOpts, required: true, full: true }, { name: 'active', label: 'Usuario activo', type: 'checkbox', full: true }, { name: 'password', label: 'Nueva contraseña temporal (opcional)', type: 'password', full: true, help: 'Úsala si el usuario olvidó su contraseña. Se cerrarán sus sesiones abiertas.' }], values: u,
            onSubmit: async (d) => {
              await api.put(`/users/${u.id}`, d);
              toast('Usuario actualizado.');
              reload();
            } });
        }));
        t.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => {
          if (!(await confirmDialog('¿Eliminar este usuario? Perderá el acceso de inmediato.'))) return;
          await api.del(`/users/${b.dataset.d}`).catch(handleError);
          reload();
        }));
      };
      t.addEventListener('rendered', bind);
      bind();
    }
    if (tab === 'datos') {
      pane.innerHTML = `<div class="grid g2" style="align-items:start">
        <div class="card"><div class="card-head"><h3>Datos de demostración</h3></div>
          <p class="small muted">Configuración de referencia del caso de estudio Karol Planner (Santa Marta, Colombia): 9 funciones, categorías pequeña/mediana/grande, matriz de requerimientos, tarifas 2021–2026 e histórico agregado. El escenario de prueba agrega una boda mediana de 100 invitados con 17 turnos y 24 trabajadores de prueba genéricos.</p>
          <div class="stack" style="gap:8px;margin-top:12px">
            <button class="btn" data-demo="config">${icon('layers')}Cargar configuración de referencia</button>
            <div class="row"><input type="date" data-date style="width:auto" aria-label="Fecha del escenario"><button class="btn" data-demo="scenario">${icon('rings')}Cargar escenario de prueba</button></div>
            <button class="btn danger" data-demo="clear">${icon('trash')}Eliminar datos de demostración</button>
            <p class="tiny muted">«Eliminar» borra los eventos y trabajadores de prueba, las tarifas de referencia y el resumen histórico del caso. Las funciones, categorías y la matriz se conservan porque pueden estar en uso; edítalas en Funciones y requerimientos.</p>
          </div></div>
        <div class="card"><div class="card-head"><h3>Copia de seguridad</h3></div>
          <p class="small muted">Descarga todos los datos de tu empresa en un archivo JSON (eventos, trabajadores, tarifas, turnos, asignaciones, optimizaciones, histórico e historial de cambios). Guárdalo en un lugar seguro: contiene datos personales de tu equipo.</p>
          <button class="btn primary" data-backup>${icon('download')}Descargar copia de seguridad</button>
          <div class="callout info" style="margin-top:14px">${icon('shield')}<div class="small">El administrador del servidor también puede programar copias de la base completa con <code>npm run backup</code>.</div></div></div></div>`;
      pane.querySelector('[data-backup]').addEventListener('click', () => api.download('/backup', 'wedflow-respaldo.json').catch(handleError));
      pane.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', async () => {
        const kind = b.dataset.demo;
        try {
          if (kind === 'clear') {
            if (!(await confirmDialog('¿Eliminar todos los datos de demostración del caso de estudio? Tus propios registros no se tocan.'))) return;
            const r = await api.post('/demo/clear');
            toast(`Eliminados: ${r.events} evento(s), ${r.workers} trabajador(es), ${r.rates} tarifa(s) de referencia.`);
          } else if (kind === 'config') {
            await api.post('/demo/config');
            toast('Configuración de referencia cargada (sin duplicar lo existente).');
          } else {
            const date = pane.querySelector('[data-date]').value;
            const r = await api.post('/demo/scenario', date ? { date } : {});
            toast(`Escenario creado con ${r.workers} trabajadores de prueba.`);
          }
          invalidateCatalogs();
        } catch (e) {
          handleError(e);
        }
      }));
    }
    if (tab === 'auditoria') {
      const rows = await api.get('/audit');
      pane.innerHTML = '<div data-t></div>';
      mountTable(pane.querySelector('[data-t]'), {
        rows, search: (r) => `${r.entity} ${r.action} ${r.user_name || ''} ${r.detail_json || ''}`,
        filters: [{ label: 'Todas las entidades', options: [...new Set(rows.map((r) => r.entity))].map((v) => ({ value: v, label: v })), test: (r, v) => r.entity === v }],
        columns: [
          { key: 'created_at', label: 'Fecha (UTC)', render: (r) => `<span class="nowrap">${esc(r.created_at)}</span>` },
          { key: 'user_name', label: 'Usuario', render: (r) => esc(r.user_name || 'Sistema') },
          { key: 'entity', label: 'Entidad', render: (r) => `<span class="badge">${esc(r.entity)}</span>${r.entity_id ? ` <span class="tiny muted">#${r.entity_id}</span>` : ''}` },
          { key: 'action', label: 'Acción' },
          { key: 'detail_json', label: 'Detalle', sort: false, render: (r) => `<span class="tiny muted" style="display:block;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.detail_json || '')}">${esc(r.detail_json || '')}</span>` },
        ],
      });
    }
    if (tab === 'seguridad') {
      const fields = [
        { name: 'current', label: 'Contraseña actual', type: 'password', required: true, full: true },
        { name: 'password', label: 'Nueva contraseña', type: 'password', required: true, full: true, help: 'Mínimo 8 caracteres, con letras y números. Se cerrarán tus otras sesiones.' },
      ];
      pane.innerHTML = `<div class="card" style="max-width:520px"><div class="card-head"><h3>Cambiar contraseña</h3></div><form novalidate>${fieldsHtml(fields)}</form>
        <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" data-save>Actualizar contraseña</button></div></div>
        <div class="callout info" style="margin-top:16px;max-width:520px">${icon('shield')}<div class="small">Las contraseñas se guardan cifradas con scrypt. Las sesiones usan cookies HttpOnly y vencen a los 7 días. Toda la información está separada por empresa.</div></div>`;
      const form = pane.querySelector('form');
      pane.querySelector('[data-save]').addEventListener('click', async () => {
        try {
          await api.post('/auth/change-password', readFields(form, fields));
          toast('Contraseña actualizada.');
          form.reset();
        } catch (e) {
          showErrors(form, e);
        }
      });
    }
  };
  tabs(root.querySelector('[data-tabs]'), items, show, items.some((i) => i.id === query.tab) ? query.tab : 'empresa');
}

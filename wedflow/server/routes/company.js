import { Router } from 'express';
import { requireAuth, requireRole, hashPassword, passwordProblems } from '../auth.js';
import { h, validate, HttpError, audit, updateSql } from '../util.js';
import { seedCaseConfig, seedCaseScenario, clearDemo } from '../seed.js';

const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL', 'GTQ', 'CRC', 'DOP', 'UYU', 'BOB', 'PYG', 'PAB', 'GBP', 'CAD'];

export function companySpec(required) {
  return {
    name: { type: 'string', required, label: 'El nombre de la empresa', maxLen: 120 },
    country: { type: 'string', label: 'El país', maxLen: 80 },
    city: { type: 'string', label: 'La ciudad', maxLen: 80 },
    email: { type: 'email', label: 'El correo de contacto' },
    phone: { type: 'string', label: 'El teléfono', maxLen: 40 },
    address: { type: 'string', label: 'La dirección', maxLen: 200 },
    website: { type: 'string', label: 'El sitio web', maxLen: 200 },
    currency: { type: 'enum', values: CURRENCIES, label: 'La moneda' },
    locale: { type: 'enum', values: ['es-CO', 'es-MX', 'es-ES', 'es-AR', 'es-CL', 'es-PE', 'en-US', 'pt-BR'], label: 'El formato regional' },
    shift_reference_hours: { type: 'number', min: 1, max: 24, label: 'La duración de referencia del turno' },
  };
}

/** Acepta solo imágenes PNG, JPEG o WEBP en base64 (no SVG, que puede contener scripts). */
export function cleanLogo(data) {
  if (data === undefined) return undefined;
  if (data === null || data === '') return null;
  if (typeof data !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data)) {
    throw new HttpError(422, 'El logotipo debe ser una imagen PNG, JPG o WEBP.', { logo_data: 'Formato no admitido.' });
  }
  if (data.length > 1_400_000) throw new HttpError(422, 'El logotipo supera 1 MB.', { logo_data: 'Imagen demasiado grande.' });
  return data;
}

export default function companyRoutes({ db }) {
  const r = Router();
  r.use(['/company', '/users', '/audit', '/backup', '/demo'], requireAuth);

  r.get('/company', (req, res) => res.json(db.get('SELECT * FROM companies WHERE id = ?', req.companyId)));

  r.put('/company', requireRole('admin'), h((req, res) => {
    const data = validate(req.body, {
      ...companySpec(false),
      max_shifts_per_worker_event: { type: 'int', min: 1, max: 6, label: 'El máximo de turnos por trabajador' },
      enforce_max_hours: { type: 'bool' },
      max_hours_per_worker_event: { type: 'number', min: 1, max: 24, label: 'El máximo de horas' },
      allow_multi_role: { type: 'bool' },
      onboarding_done: { type: 'bool' },
    }, { partial: true });
    if ('name' in data && !data.name) throw new HttpError(422, 'Revisa los datos.', { name: 'El nombre es obligatorio.' });
    const logo = cleanLogo(req.body?.logo_data);
    if (logo !== undefined) data.logo_data = logo;
    if (!Object.keys(data).length) return res.json(db.get('SELECT * FROM companies WHERE id = ?', req.companyId));
    const q = updateSql('companies', data, 'id = ?');
    db.run(q.sql, ...q.params, req.companyId);
    audit(db, req, 'empresa', req.companyId, 'actualizar', { campos: Object.keys(data) });
    res.json(db.get('SELECT * FROM companies WHERE id = ?', req.companyId));
  }));

  // Usuarios de la empresa y roles.
  r.get('/users', requireRole('admin'), (req, res) => {
    res.json(db.all('SELECT id, name, email, role, active, last_login, created_at FROM users WHERE company_id = ? ORDER BY name', req.companyId));
  });

  const userSpec = (required) => ({
    name: { type: 'string', required, label: 'El nombre' },
    email: { type: 'email', required, label: 'El correo' },
    role: { type: 'enum', values: ['admin', 'planificador', 'consulta'], required, label: 'El rol' },
    active: { type: 'bool' },
  });

  r.post('/users', requireRole('admin'), h((req, res) => {
    const data = validate(req.body, { ...userSpec(true), password: { type: 'string', required: true, label: 'La contraseña temporal', maxLen: 200 } });
    const problems = passwordProblems(data.password);
    if (problems.length) throw new HttpError(422, 'Revisa los datos.', { password: `La contraseña necesita ${problems.join(', ')}.` });
    if (db.get('SELECT id FROM users WHERE email = ?', data.email)) throw new HttpError(409, 'Ya existe una cuenta con ese correo.', { email: 'Correo ya registrado.' });
    const id = Number(db.run('INSERT INTO users (company_id, name, email, password_hash, role, active) VALUES (?,?,?,?,?,1)', req.companyId, data.name, data.email, hashPassword(data.password), data.role).lastInsertRowid);
    audit(db, req, 'usuario', id, 'crear', { email: data.email, role: data.role });
    res.status(201).json({ id });
  }));

  r.put('/users/:id', requireRole('admin'), h((req, res) => {
    const target = db.get('SELECT * FROM users WHERE id = ? AND company_id = ?', Number(req.params.id), req.companyId);
    if (!target) throw new HttpError(404, 'El usuario no existe en tu empresa.');
    const data = validate(req.body, userSpec(false), { partial: true });
    // El administrador puede asignar una contraseña temporal a un usuario de su empresa.
    if (req.body?.password) {
      const problems = passwordProblems(String(req.body.password));
      if (problems.length) throw new HttpError(422, 'Revisa los datos.', { password: `La contraseña necesita ${problems.join(', ')}.` });
      data.password_hash = hashPassword(String(req.body.password));
    }
    if (target.id === req.user.id && (data.role && data.role !== 'admin' || data.active === 0)) throw new HttpError(422, 'No puedes quitarte el rol de administrador ni desactivarte.');
    if (data.email && db.get('SELECT id FROM users WHERE email = ? AND id <> ?', data.email, target.id)) throw new HttpError(409, 'Ya existe una cuenta con ese correo.');
    if (Object.keys(data).length) {
      const q = updateSql('users', data, 'id = ?');
      db.run(q.sql, ...q.params, target.id);
      if (data.active === 0 || data.password_hash) db.run('DELETE FROM sessions WHERE user_id = ?', target.id);
    }
    const { password_hash, ...logged } = data;
    audit(db, req, 'usuario', target.id, 'actualizar', { ...logged, contrasena_temporal: Boolean(password_hash) });
    res.json({ ok: true });
  }));

  r.delete('/users/:id', requireRole('admin'), h((req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) throw new HttpError(422, 'No puedes eliminar tu propio usuario.');
    const info = db.run('DELETE FROM users WHERE id = ? AND company_id = ?', id, req.companyId);
    if (!info.changes) throw new HttpError(404, 'El usuario no existe en tu empresa.');
    audit(db, req, 'usuario', id, 'eliminar');
    res.json({ ok: true });
  }));

  // Historial de cambios.
  r.get('/audit', requireRole('admin'), (req, res) => {
    res.json(db.all(
      `SELECT a.*, u.name AS user_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
        WHERE a.company_id = ? ORDER BY a.id DESC LIMIT 300`, req.companyId,
    ));
  });

  // Copia de seguridad de todos los datos de la empresa (JSON).
  r.get('/backup', requireRole('admin'), (req, res) => {
    const cid = req.companyId;
    const tables = ['event_types', 'event_categories', 'roles', 'requirements', 'competences', 'workers', 'worker_roles', 'worker_competences',
      'rates', 'rate_history', 'availability', 'events', 'event_activities', 'event_roles', 'shifts', 'assignments', 'optimization_runs',
      'historical_summaries', 'historical_records', 'audit_log'];
    const out = { generated_at: new Date().toISOString(), company: db.get('SELECT * FROM companies WHERE id = ?', cid) };
    for (const t of tables) out[t] = db.all(`SELECT * FROM ${t} WHERE company_id = ?`, cid);
    out.users = db.all('SELECT id, name, email, role, active, created_at FROM users WHERE company_id = ?', cid);
    audit(db, req, 'empresa', cid, 'copia_de_seguridad');
    res.set('Content-Disposition', `attachment; filename="wedflow-respaldo-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(out);
  });

  // Datos de demostración del caso Karol Planner.
  r.post('/demo/config', requireRole('admin'), h((req, res) => {
    seedCaseConfig(db, req.companyId);
    audit(db, req, 'demo', null, 'cargar_configuracion');
    res.json({ ok: true });
  }));
  r.post('/demo/scenario', requireRole('admin'), h((req, res) => {
    const { date } = validate(req.body, { date: { type: 'date', label: 'La fecha' } });
    const out = seedCaseScenario(db, req.companyId, date ? { date } : {});
    audit(db, req, 'demo', out.eventId, 'cargar_escenario');
    res.json(out);
  }));
  r.post('/demo/clear', requireRole('admin'), h((req, res) => {
    const out = clearDemo(db, req.companyId);
    audit(db, req, 'demo', null, 'eliminar_demostracion', out);
    res.json(out);
  }));

  return r;
}

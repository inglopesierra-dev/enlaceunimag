import { Router } from 'express';
import {
  hashPassword, verifyPassword, createSession, setSessionCookie, clearSessionCookie,
  passwordProblems, sha256, randomToken, loginThrottle, requireAuth,
} from '../auth.js';
import { h, validate, HttpError, audit } from '../util.js';
import { createCompany, seedCaseConfig, seedCaseScenario } from '../seed.js';
import { companySpec, cleanLogo } from './company.js';

export default function authRoutes({ db, options }) {
  const r = Router();

  r.post('/register', h((req, res) => {
    const company = validate(req.body?.company, companySpec(true));
    const user = validate(req.body?.user, {
      name: { type: 'string', required: true, label: 'Tu nombre' },
      email: { type: 'email', required: true, label: 'El correo' },
      password: { type: 'string', required: true, label: 'La contraseña', maxLen: 200 },
    });
    const problems = passwordProblems(user.password);
    if (problems.length) throw new HttpError(422, 'Revisa los datos del formulario.', { password: `La contraseña necesita ${problems.join(', ')}.` });
    if (db.get('SELECT id FROM users WHERE email = ?', user.email)) throw new HttpError(409, 'Ya existe una cuenta con ese correo.', { email: 'Ya existe una cuenta con ese correo.' });
    const demo = ['none', 'config', 'full'].includes(req.body?.demo) ? req.body.demo : 'none';
    company.logo_data = cleanLogo(req.body?.company?.logo_data);
    const { cid, uid } = db.tx(() => {
      const cid = createCompany(db, company);
      const uid = Number(db.run('INSERT INTO users (company_id, name, email, password_hash, role) VALUES (?,?,?,?,?)', cid, user.name, user.email, hashPassword(user.password), 'admin').lastInsertRowid);
      if (demo === 'config') seedCaseConfig(db, cid);
      if (demo === 'full') seedCaseScenario(db, cid);
      return { cid, uid };
    });
    req.companyId = cid;
    req.user = { id: uid };
    audit(db, req, 'empresa', cid, 'registro', { demo });
    setSessionCookie(res, createSession(db, uid), options.secureCookies);
    res.status(201).json({ ok: true });
  }));

  r.post('/login', h((req, res) => {
    const body = validate(req.body, {
      email: { type: 'email', required: true, label: 'El correo' },
      password: { type: 'string', required: true, label: 'La contraseña', maxLen: 200 },
    });
    const throttle = loginThrottle(`${body.email}|${req.ip}`);
    const user = db.get('SELECT * FROM users WHERE email = ?', body.email);
    if (!user || !user.active || !verifyPassword(body.password, user.password_hash)) {
      throttle.fail();
      throw new HttpError(401, 'Correo o contraseña incorrectos.');
    }
    throttle.ok();
    setSessionCookie(res, createSession(db, user.id), options.secureCookies);
    res.json({ ok: true });
  }));

  r.post('/logout', (req, res) => {
    if (req.sessionTokenHash) db.run('DELETE FROM sessions WHERE token_hash = ?', req.sessionTokenHash);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  r.get('/me', (req, res) => {
    if (!req.user) return res.json({ user: null, company: null });
    const company = db.get('SELECT * FROM companies WHERE id = ?', req.companyId);
    res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role }, company });
  });

  // Recuperación de contraseña: se genera un enlace de un solo uso válido por 30 minutos.
  // En producción debe enviarse por correo (configurar un servicio SMTP); en desarrollo
  // el token se devuelve en la respuesta y se escribe en la consola del servidor.
  r.post('/forgot', h((req, res) => {
    const { email } = validate(req.body, { email: { type: 'email', required: true, label: 'El correo' } });
    const user = db.get('SELECT id FROM users WHERE email = ? AND active = 1', email);
    const out = { ok: true, message: 'Si el correo está registrado, se generó un enlace de recuperación válido por 30 minutos.' };
    if (user) {
      const token = randomToken();
      db.run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?,?,?)', sha256(token), user.id, Date.now() + 30 * 60e3);
      if (options.showResetToken) {
        out.dev_reset_token = token;
        if (!options.quiet) console.log(`[recuperación] ${email}: /#/restablecer?token=${token}`);
      }
    }
    res.json(out);
  }));

  r.post('/reset', h((req, res) => {
    const body = validate(req.body, {
      token: { type: 'string', required: true, label: 'El enlace' },
      password: { type: 'string', required: true, label: 'La contraseña', maxLen: 200 },
    });
    const problems = passwordProblems(body.password);
    if (problems.length) throw new HttpError(422, 'Revisa los datos del formulario.', { password: `La contraseña necesita ${problems.join(', ')}.` });
    const row = db.get('SELECT * FROM password_resets WHERE token_hash = ?', sha256(body.token));
    if (!row || row.used || row.expires_at < Date.now()) throw new HttpError(400, 'El enlace de recuperación no es válido o ya venció.');
    db.tx(() => {
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(body.password), row.user_id);
      db.run('UPDATE password_resets SET used = 1 WHERE token_hash = ?', row.token_hash);
      db.run('DELETE FROM sessions WHERE user_id = ?', row.user_id);
    });
    res.json({ ok: true });
  }));

  r.post('/change-password', requireAuth, h((req, res) => {
    const body = validate(req.body, {
      current: { type: 'string', required: true, label: 'La contraseña actual', maxLen: 200 },
      password: { type: 'string', required: true, label: 'La nueva contraseña', maxLen: 200 },
    });
    const user = db.get('SELECT * FROM users WHERE id = ?', req.user.id);
    if (!verifyPassword(body.current, user.password_hash)) throw new HttpError(422, 'Revisa los datos.', { current: 'La contraseña actual no es correcta.' });
    const problems = passwordProblems(body.password);
    if (problems.length) throw new HttpError(422, 'Revisa los datos.', { password: `La contraseña necesita ${problems.join(', ')}.` });
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(body.password), user.id);
    db.run('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', user.id, req.sessionTokenHash);
    res.json({ ok: true });
  }));

  return r;
}

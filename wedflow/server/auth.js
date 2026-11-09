import crypto from 'node:crypto';
import { HttpError } from './util.js';

const SESSION_DAYS = 7;
const COOKIE = 'wf_session';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('base64url');

export function passwordProblems(pw) {
  const issues = [];
  if (typeof pw !== 'string' || pw.length < 8) issues.push('al menos 8 caracteres');
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(pw || '')) issues.push('al menos una letra');
  if (!/\d/.test(pw || '')) issues.push('al menos un número');
  return issues;
}

export function createSession(db, userId) {
  const token = randomToken();
  db.run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)', sha256(token), userId, Date.now() + SESSION_DAYS * 864e5);
  db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", userId);
  return token;
}

export function setSessionCookie(res, token, secure) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: SESSION_DAYS * 864e5,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** Carga el usuario de la sesión (si existe) en req.user y req.companyId. */
export function sessionMiddleware(db) {
  return (req, _res, next) => {
    const token = readCookie(req, COOKIE);
    if (token) {
      const row = db.get(
        `SELECT u.id, u.company_id, u.name, u.email, u.role, u.active, s.expires_at
           FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
        sha256(token),
      );
      if (row && row.expires_at > Date.now() && row.active) {
        req.user = row;
        req.companyId = row.company_id;
        req.sessionTokenHash = sha256(token);
      }
    }
    next();
  };
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Debes iniciar sesión.'));
  next();
}

const LEVEL = { consulta: 1, planificador: 2, admin: 3 };

/** Permisos por rol: consulta (solo lectura) < planificador < admin. */
export const requireRole = (min) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Debes iniciar sesión.'));
  if (LEVEL[req.user.role] < LEVEL[min]) return next(new HttpError(403, 'Tu rol no tiene permiso para esta acción.'));
  next();
};

/** Las peticiones que modifican datos deben venir del propio cliente (defensa CSRF). */
export function csrfGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'wedflow') return next(new HttpError(403, 'Solicitud rechazada.'));
  next();
}

// Límite simple de intentos de inicio de sesión por correo e IP.
const attempts = new Map();
export function loginThrottle(key) {
  const now = Date.now();
  const rec = attempts.get(key) || { n: 0, until: 0, first: now };
  if (rec.until > now) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
  return {
    fail() {
      if (now - rec.first > 15 * 60e3) Object.assign(rec, { n: 0, first: now });
      rec.n++;
      if (rec.n >= 8) rec.until = now + 10 * 60e3;
      attempts.set(key, rec);
    },
    ok() {
      attempts.delete(key);
    },
  };
}

import { isDate, isHM, isDateTime } from '../public/js/lib/time.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Envuelve controladores (síncronos o asíncronos) para enviar errores al manejador central. */
export const h = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res, next);
    if (out && typeof out.then === 'function') out.catch(next);
  } catch (e) {
    next(e);
  }
};

/**
 * Validación declarativa de formularios. Cada campo:
 * { type: 'string'|'int'|'number'|'bool'|'date'|'time'|'datetime'|'enum'|'email'|'id',
 *   required, min, max, maxLen, values, label }
 * Devuelve un objeto limpio o lanza HttpError 422 con los errores por campo.
 */
export function validate(body, spec, { partial = false } = {}) {
  const out = {};
  const errors = {};
  const src = body || {};
  for (const [key, rule] of Object.entries(spec)) {
    const label = rule.label || key;
    let v = src[key];
    if (typeof v === 'string') v = v.trim();
    const empty = v === undefined || v === null || v === '';
    if (empty) {
      if (partial && !(key in src)) continue;
      if (rule.required) errors[key] = `${label} es obligatorio.`;
      else out[key] = rule.type === 'bool' ? 0 : null;
      continue;
    }
    switch (rule.type) {
      case 'string':
      case 'text': {
        v = String(v);
        const max = rule.maxLen || (rule.type === 'text' ? 4000 : 200);
        if (v.length > max) errors[key] = `${label} admite máximo ${max} caracteres.`;
        break;
      }
      case 'email':
        v = String(v).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 200) errors[key] = `${label} no es un correo válido.`;
        break;
      case 'int':
      case 'id':
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n) || ((rule.type === 'int' || rule.type === 'id') && !Number.isInteger(n))) {
          errors[key] = `${label} debe ser un número${rule.type === 'number' ? '' : ' entero'}.`;
          break;
        }
        if (rule.type === 'id' && n <= 0) errors[key] = `${label} no es válido.`;
        if (rule.min !== undefined && n < rule.min) errors[key] = `${label} debe ser mayor o igual a ${rule.min}.`;
        if (rule.max !== undefined && n > rule.max) errors[key] = `${label} debe ser menor o igual a ${rule.max}.`;
        v = n;
        break;
      }
      case 'bool':
        v = v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0;
        break;
      case 'date':
        if (!isDate(v)) errors[key] = `${label} debe ser una fecha (AAAA-MM-DD).`;
        break;
      case 'time':
        if (!isHM(v)) errors[key] = `${label} debe ser una hora (HH:MM).`;
        break;
      case 'datetime':
        if (!isDateTime(v)) errors[key] = `${label} debe ser fecha y hora (AAAA-MM-DDTHH:MM).`;
        break;
      case 'enum':
        if (!rule.values.includes(v)) errors[key] = `${label} no es una opción válida.`;
        break;
      default:
        break;
    }
    out[key] = v;
  }
  if (Object.keys(errors).length) throw new HttpError(422, 'Revisa los datos del formulario.', errors);
  return out;
}

/** Verifica que el registro pertenezca a la empresa de la sesión. */
export function own(db, table, id, companyId, label = 'El registro') {
  if (id === null || id === undefined) return null;
  const row = db.get(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, id, companyId);
  if (!row) throw new HttpError(404, `${label} no existe en tu empresa.`);
  return row;
}

export function audit(db, req, entity, entityId, action, detail) {
  db.run(
    'INSERT INTO audit_log (company_id, user_id, entity, entity_id, action, detail_json) VALUES (?,?,?,?,?,?)',
    req.companyId,
    req.user?.id ?? null,
    entity,
    entityId ?? null,
    action,
    detail ? JSON.stringify(detail) : null,
  );
}

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function updateSql(table, data, where) {
  const keys = Object.keys(data);
  return { sql: `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE ${where}`, params: keys.map((k) => data[k]) };
}

export function insertSql(table, data) {
  // Los campos vacíos se omiten para que apliquen los valores por defecto de la tabla.
  const keys = Object.keys(data).filter((k) => data[k] !== null && data[k] !== undefined);
  return { sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, params: keys.map((k) => data[k]) };
}

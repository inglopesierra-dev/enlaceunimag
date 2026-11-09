import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { h, validate, HttpError, audit, insertSql, updateSql, own } from '../util.js';
import { resolveRate } from '../planning.js';
import { todayISO } from '../../public/js/lib/time.js';

const rateSpec = {
  role_id: { type: 'id', label: 'La función' },
  worker_id: { type: 'id', label: 'El trabajador' },
  amount: { type: 'number', required: true, min: 0, label: 'La tarifa' },
  unit: { type: 'enum', values: ['turno', 'hora'], label: 'La unidad' },
  event_type_id: { type: 'id', label: 'El tipo de evento' },
  category_id: { type: 'id', label: 'La categoría' },
  valid_from: { type: 'date', required: true, label: 'La vigencia desde' },
  valid_to: { type: 'date', label: 'La vigencia hasta' },
  overtime_hourly: { type: 'number', min: 0, label: 'La tarifa de hora extra' },
  notes: { type: 'string', label: 'La nota', maxLen: 300 },
};

export default function rateRoutes({ db }) {
  const r = Router();
  r.use('/rates', requireAuth);

  const checkRefs = (cid, d) => {
    if (d.role_id) own(db, 'roles', d.role_id, cid, 'La función');
    if (d.worker_id) own(db, 'workers', d.worker_id, cid, 'El trabajador');
    if (d.event_type_id) own(db, 'event_types', d.event_type_id, cid, 'El tipo de evento');
    if (d.category_id) own(db, 'event_categories', d.category_id, cid, 'La categoría');
    if (d.valid_to && d.valid_from && d.valid_to < d.valid_from) throw new HttpError(422, 'Revisa los datos.', { valid_to: 'La vigencia final no puede ser anterior a la inicial.' });
  };

  r.get('/rates', (req, res) => {
    res.json(db.all(
      `SELECT r.*, ro.name AS role_name, w.full_name AS worker_name, t.name AS type_name, c.name AS category_name
         FROM rates r LEFT JOIN roles ro ON ro.id = r.role_id LEFT JOIN workers w ON w.id = r.worker_id
         LEFT JOIN event_types t ON t.id = r.event_type_id LEFT JOIN event_categories c ON c.id = r.category_id
        WHERE r.company_id = ? ORDER BY ro.sort_order, ro.name, r.worker_id IS NOT NULL, r.valid_from DESC`, req.companyId));
  });

  r.get('/rates/history', (req, res) => {
    res.json(db.all(
      `SELECT h.*, ro.name AS role_name, w.full_name AS worker_name, u.name AS user_name
         FROM rate_history h LEFT JOIN roles ro ON ro.id = h.role_id LEFT JOIN workers w ON w.id = h.worker_id LEFT JOIN users u ON u.id = h.user_id
        WHERE h.company_id = ? ORDER BY h.id DESC LIMIT 500`, req.companyId));
  });

  // Tabla de evolución por función y año (para gráficos históricos).
  r.get('/rates/evolution', (req, res) => {
    const rows = db.all(
      `SELECT ro.name AS role_name, ro.color, substr(r.valid_from, 1, 4) AS year, r.amount
         FROM rates r JOIN roles ro ON ro.id = r.role_id
        WHERE r.company_id = ? AND r.worker_id IS NULL AND r.event_type_id IS NULL AND r.category_id IS NULL
        ORDER BY ro.sort_order, year`, req.companyId);
    res.json(rows);
  });

  r.get('/rates/resolve', h((req, res) => {
    const q = validate(req.query, {
      role_id: { type: 'id', required: true, label: 'La función' },
      worker_id: { type: 'id', label: 'El trabajador' },
      date: { type: 'date', label: 'La fecha' },
      event_type_id: { type: 'id' }, category_id: { type: 'id' },
    });
    res.json(resolveRate(db, req.companyId, { workerId: q.worker_id, roleId: q.role_id, date: q.date || todayISO(), eventTypeId: q.event_type_id, categoryId: q.category_id }));
  }));

  r.post('/rates', requireRole('admin'), h((req, res) => {
    const cid = req.companyId;
    const d = validate(req.body, rateSpec);
    if (!d.role_id && !d.worker_id) throw new HttpError(422, 'Indica la función o el trabajador al que aplica la tarifa.', { role_id: 'Selecciona una función o un trabajador.' });
    checkRefs(cid, d);
    d.unit = d.unit || 'turno';
    const id = db.tx(() => {
      const q = insertSql('rates', { company_id: cid, ...d });
      const id = Number(db.run(q.sql, ...q.params).lastInsertRowid);
      db.run('INSERT INTO rate_history (company_id, rate_id, role_id, worker_id, action, new_amount, valid_from, valid_to, user_id, note) VALUES (?,?,?,?,?,?,?,?,?,?)',
        cid, id, d.role_id, d.worker_id, 'creada', d.amount, d.valid_from, d.valid_to, req.user.id, d.notes);
      return id;
    });
    audit(db, req, 'tarifa', id, 'crear', d);
    res.status(201).json({ id });
  }));

  r.put('/rates/:id', requireRole('admin'), h((req, res) => {
    const cid = req.companyId;
    const before = own(db, 'rates', Number(req.params.id), cid, 'La tarifa');
    const d = validate(req.body, rateSpec, { partial: true });
    checkRefs(cid, { ...before, ...d });
    db.tx(() => {
      if (Object.keys(d).length) {
        const q = updateSql('rates', d, 'id = ? AND company_id = ?');
        db.run(q.sql, ...q.params, before.id, cid);
      }
      db.run('INSERT INTO rate_history (company_id, rate_id, role_id, worker_id, action, old_amount, new_amount, valid_from, valid_to, user_id, note) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        cid, before.id, d.role_id ?? before.role_id, d.worker_id ?? before.worker_id, 'modificada', before.amount, d.amount ?? before.amount,
        d.valid_from ?? before.valid_from, 'valid_to' in d ? d.valid_to : before.valid_to, req.user.id, d.notes ?? null);
    });
    audit(db, req, 'tarifa', before.id, 'actualizar', { antes: before, despues: d });
    res.json({ ok: true });
  }));

  r.delete('/rates/:id', requireRole('admin'), h((req, res) => {
    const cid = req.companyId;
    const before = own(db, 'rates', Number(req.params.id), cid, 'La tarifa');
    db.tx(() => {
      db.run('DELETE FROM rates WHERE id = ? AND company_id = ?', before.id, cid);
      db.run('INSERT INTO rate_history (company_id, rate_id, role_id, worker_id, action, old_amount, valid_from, valid_to, user_id) VALUES (?,?,?,?,?,?,?,?,?)',
        cid, before.id, before.role_id, before.worker_id, 'eliminada', before.amount, before.valid_from, before.valid_to, req.user.id);
    });
    audit(db, req, 'tarifa', before.id, 'eliminar', before);
    res.json({ ok: true });
  }));

  return r;
}

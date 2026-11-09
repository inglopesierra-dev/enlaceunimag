import { requireAuth, requireRole } from './auth.js';
import { h, validate, HttpError, audit, insertSql, updateSql } from './util.js';

/** CRUD genérico con aislamiento por empresa para catálogos sencillos. */
export function crud(r, db, { path, table, spec, entity, order = 'name', writeRole = 'admin', refs = {}, extraList }) {
  const checkRefs = (req, data) => {
    for (const [field, refTable] of Object.entries(refs)) {
      if (data[field] != null && !db.get(`SELECT id FROM ${refTable} WHERE id = ? AND company_id = ?`, data[field], req.companyId)) {
        throw new HttpError(422, 'Revisa los datos.', { [field]: 'La referencia no pertenece a tu empresa.' });
      }
    }
  };
  r.get(path, requireAuth, (req, res) => {
    const rows = db.all(`SELECT * FROM ${table} WHERE company_id = ? ORDER BY ${order}`, req.companyId);
    res.json(extraList ? extraList(req, rows) : rows);
  });
  r.post(path, requireRole(writeRole), h((req, res) => {
    const data = validate(req.body, spec);
    checkRefs(req, data);
    const q = insertSql(table, { company_id: req.companyId, ...data });
    const id = Number(db.run(q.sql, ...q.params).lastInsertRowid);
    audit(db, req, entity, id, 'crear', data);
    res.status(201).json(db.get(`SELECT * FROM ${table} WHERE id = ?`, id));
  }));
  r.put(`${path}/:id`, requireRole(writeRole), h((req, res) => {
    const id = Number(req.params.id);
    const before = db.get(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, id, req.companyId);
    if (!before) throw new HttpError(404, 'El registro no existe en tu empresa.');
    const data = validate(req.body, spec, { partial: true });
    checkRefs(req, data);
    if (Object.keys(data).length) {
      const q = updateSql(table, data, 'id = ? AND company_id = ?');
      db.run(q.sql, ...q.params, id, req.companyId);
    }
    audit(db, req, entity, id, 'actualizar', { antes: before, despues: data });
    res.json(db.get(`SELECT * FROM ${table} WHERE id = ?`, id));
  }));
  r.delete(`${path}/:id`, requireRole(writeRole), h((req, res) => {
    const id = Number(req.params.id);
    const before = db.get(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, id, req.companyId);
    if (!before) throw new HttpError(404, 'El registro no existe en tu empresa.');
    db.run(`DELETE FROM ${table} WHERE id = ? AND company_id = ?`, id, req.companyId);
    audit(db, req, entity, id, 'eliminar', before);
    res.json({ ok: true });
  }));
}

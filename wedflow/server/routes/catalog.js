import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { h, HttpError, audit } from '../util.js';
import { crud } from '../crud.js';

export default function catalogRoutes({ db }) {
  const r = Router();

  crud(r, db, {
    path: '/event-types', table: 'event_types', entity: 'tipo_evento',
    spec: { name: { type: 'string', required: true, label: 'El nombre', maxLen: 80 }, description: { type: 'string', label: 'La descripción' } },
  });

  crud(r, db, {
    path: '/categories', table: 'event_categories', entity: 'categoria', order: 'sort_order, name',
    spec: {
      name: { type: 'string', required: true, label: 'El nombre', maxLen: 80 },
      min_guests: { type: 'int', min: 0, label: 'Invitados desde' },
      max_guests: { type: 'int', min: 0, label: 'Invitados hasta' },
      reference_guests: { type: 'int', min: 0, label: 'Invitados de referencia' },
      sort_order: { type: 'int', min: 0, label: 'El orden' },
    },
  });

  crud(r, db, {
    path: '/roles', table: 'roles', entity: 'funcion', order: 'sort_order, name',
    spec: {
      name: { type: 'string', required: true, label: 'El nombre', maxLen: 80 },
      description: { type: 'string', label: 'La descripción', maxLen: 400 },
      color: { type: 'string', label: 'El color', maxLen: 9 },
      sort_order: { type: 'int', min: 0, label: 'El orden' },
    },
    extraList: (req, rows) => {
      const counts = db.all(
        `SELECT wr.role_id, COUNT(*) AS n FROM worker_roles wr JOIN workers w ON w.id = wr.worker_id
          WHERE wr.company_id = ? AND wr.authorized = 1 AND w.status <> 'inactivo' GROUP BY wr.role_id`, req.companyId);
      const map = new Map(counts.map((c) => [c.role_id, c.n]));
      return rows.map((x) => ({ ...x, workers: map.get(x.id) || 0 }));
    },
  });

  crud(r, db, {
    path: '/competences', table: 'competences', entity: 'competencia',
    spec: { name: { type: 'string', required: true, label: 'El nombre', maxLen: 80 } },
    writeRole: 'planificador',
  });

  // Matriz de requerimientos mínimos (categoría × función).
  r.get('/requirements', requireAuth, (req, res) => {
    res.json(db.all('SELECT category_id, role_id, min_count FROM requirements WHERE company_id = ?', req.companyId));
  });

  r.put('/requirements', requireRole('admin'), h((req, res) => {
    const cells = Array.isArray(req.body?.cells) ? req.body.cells : null;
    if (!cells) throw new HttpError(422, 'Envía la lista de celdas de la matriz.');
    const cats = new Set(db.all('SELECT id FROM event_categories WHERE company_id = ?', req.companyId).map((x) => x.id));
    const roles = new Set(db.all('SELECT id FROM roles WHERE company_id = ?', req.companyId).map((x) => x.id));
    db.tx(() => {
      for (const c of cells) {
        const cat = Number(c.category_id);
        const role = Number(c.role_id);
        if (!cats.has(cat) || !roles.has(role)) throw new HttpError(422, 'La matriz contiene categorías o funciones que no son de tu empresa.');
        if (c.min_count === '' || c.min_count === null || c.min_count === undefined) {
          db.run('DELETE FROM requirements WHERE category_id = ? AND role_id = ? AND company_id = ?', cat, role, req.companyId);
          continue;
        }
        const n = Number(c.min_count);
        if (!Number.isInteger(n) || n < 0 || n > 999) throw new HttpError(422, 'Las cantidades deben ser enteros entre 0 y 999.');
        db.run('INSERT OR REPLACE INTO requirements (company_id, category_id, role_id, min_count) VALUES (?,?,?,?)', req.companyId, cat, role, n);
      }
    });
    audit(db, req, 'matriz_requerimientos', null, 'actualizar', { celdas: cells.length });
    res.json(db.all('SELECT category_id, role_id, min_count FROM requirements WHERE company_id = ?', req.companyId));
  }));

  return r;
}

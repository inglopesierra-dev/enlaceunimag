import { Router } from 'express';
import express from 'express';
import ExcelJS from 'exceljs';
import { requireAuth, requireRole } from '../auth.js';
import { h, validate, HttpError, audit, insertSql, updateSql, own } from '../util.js';
import { buildInterval, todayISO } from '../../public/js/lib/time.js';
import { resolveRate } from '../planning.js';

const workerSpec = {
  full_name: { type: 'string', required: true, label: 'El nombre completo', maxLen: 160 },
  document: { type: 'string', label: 'El documento', maxLen: 40 },
  phone: { type: 'string', label: 'El teléfono', maxLen: 40 },
  email: { type: 'email', label: 'El correo' },
  primary_role_id: { type: 'id', required: true, label: 'La función principal' },
  experience_years: { type: 'number', min: 0, max: 80, label: 'La experiencia' },
  experience_notes: { type: 'text', label: 'La experiencia', maxLen: 1000 },
  status: { type: 'enum', values: ['disponible', 'ocupado', 'inactivo'], label: 'El estado' },
  notes: { type: 'text', label: 'Las observaciones', maxLen: 1000 },
};

export default function workerRoutes({ db }) {
  const r = Router();
  r.use(['/workers', '/availability'], requireAuth);

  const loadWorker = (cid, id) => {
    const w = db.get('SELECT * FROM workers WHERE id = ? AND company_id = ?', id, cid);
    if (!w) throw new HttpError(404, 'El trabajador no existe en tu empresa.');
    return w;
  };

  const setRelations = (cid, wid, body, primaryRoleId) => {
    if (Array.isArray(body.role_ids)) {
      const roleIds = [...new Set([primaryRoleId, ...body.role_ids.map(Number)].filter(Boolean))];
      for (const rid of roleIds) own(db, 'roles', rid, cid, 'La función');
      db.run('DELETE FROM worker_roles WHERE worker_id = ? AND company_id = ?', wid, cid);
      for (const rid of roleIds) db.run('INSERT INTO worker_roles (worker_id, role_id, company_id, authorized) VALUES (?,?,?,1)', wid, rid, cid);
    } else if (primaryRoleId) {
      db.run('INSERT OR IGNORE INTO worker_roles (worker_id, role_id, company_id, authorized) VALUES (?,?,?,1)', wid, primaryRoleId, cid);
    }
    if (Array.isArray(body.competence_ids)) {
      const ids = [...new Set(body.competence_ids.map(Number))];
      for (const id of ids) own(db, 'competences', id, cid, 'La competencia');
      db.run('DELETE FROM worker_competences WHERE worker_id = ? AND company_id = ?', wid, cid);
      for (const id of ids) db.run('INSERT INTO worker_competences (worker_id, competence_id, company_id) VALUES (?,?,?)', wid, id, cid);
    }
  };

  r.get('/workers', (req, res) => {
    const cid = req.companyId;
    const today = todayISO();
    const workers = db.all('SELECT * FROM workers WHERE company_id = ? ORDER BY full_name', cid);
    const roles = db.all('SELECT wr.worker_id, wr.role_id, wr.authorized FROM worker_roles wr WHERE wr.company_id = ?', cid);
    const comps = db.all('SELECT worker_id, competence_id FROM worker_competences WHERE company_id = ?', cid);
    const upcoming = db.all(
      `SELECT a.worker_id, COUNT(*) AS n FROM assignments a JOIN events e ON e.id = a.event_id
        WHERE a.company_id = ? AND a.plan = e.official_plan AND e.date >= ? AND e.status <> 'cancelado' GROUP BY a.worker_id`, cid, today);
    const total = db.all(
      `SELECT a.worker_id, COUNT(*) AS n FROM assignments a JOIN events e ON e.id = a.event_id
        WHERE a.company_id = ? AND a.plan = e.official_plan GROUP BY a.worker_id`, cid);
    const up = new Map(upcoming.map((x) => [x.worker_id, x.n]));
    const tot = new Map(total.map((x) => [x.worker_id, x.n]));
    res.json(workers.map((w) => {
      const rate = w.primary_role_id ? resolveRate(db, cid, { workerId: w.id, roleId: w.primary_role_id, date: today }) : null;
      return {
        ...w,
        role_ids: roles.filter((x) => x.worker_id === w.id && x.authorized).map((x) => x.role_id),
        competence_ids: comps.filter((x) => x.worker_id === w.id).map((x) => x.competence_id),
        current_rate: rate ? { amount: rate.amount, unit: rate.unit, source: rate.source } : null,
        upcoming_assignments: up.get(w.id) || 0,
        total_assignments: tot.get(w.id) || 0,
      };
    }));
  });

  r.get('/workers/:id', (req, res) => {
    const cid = req.companyId;
    const w = loadWorker(cid, Number(req.params.id));
    w.role_ids = db.all('SELECT role_id FROM worker_roles WHERE worker_id = ? AND authorized = 1', w.id).map((x) => x.role_id);
    w.competence_ids = db.all('SELECT competence_id FROM worker_competences WHERE worker_id = ?', w.id).map((x) => x.competence_id);
    w.availability = db.all('SELECT * FROM availability WHERE worker_id = ? AND company_id = ? ORDER BY start_at DESC', w.id, cid);
    w.rates = db.all('SELECT r.*, ro.name AS role_name FROM rates r LEFT JOIN roles ro ON ro.id = r.role_id WHERE r.worker_id = ? AND r.company_id = ? ORDER BY valid_from DESC', w.id, cid);
    w.rate_history = db.all('SELECT * FROM rate_history WHERE worker_id = ? AND company_id = ? ORDER BY id DESC', w.id, cid);
    w.history = db.all(
      `SELECT a.id, a.plan, a.cost, e.official_plan = a.plan AS official, e.id AS event_id, e.name AS event_name, e.date, e.status,
              s.start_at, s.end_at, ro.name AS role_name
         FROM assignments a JOIN events e ON e.id = a.event_id JOIN shifts s ON s.id = a.shift_id JOIN roles ro ON ro.id = s.role_id
        WHERE a.worker_id = ? AND a.company_id = ? ORDER BY s.start_at DESC`, w.id, cid);
    res.json(w);
  });

  r.post('/workers', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const data = validate(req.body, workerSpec);
    own(db, 'roles', data.primary_role_id, cid, 'La función principal');
    data.status = data.status || 'disponible';
    const id = db.tx(() => {
      const q = insertSql('workers', { company_id: cid, ...data });
      const id = Number(db.run(q.sql, ...q.params).lastInsertRowid);
      setRelations(cid, id, req.body, data.primary_role_id);
      if (req.body.rate_amount !== undefined && req.body.rate_amount !== '' && req.body.rate_amount !== null) {
        const amount = Number(req.body.rate_amount);
        if (!Number.isFinite(amount) || amount < 0) throw new HttpError(422, 'Revisa los datos.', { rate_amount: 'La tarifa debe ser un número positivo.' });
        const from = req.body.rate_valid_from || todayISO();
        const rid = Number(db.run('INSERT INTO rates (company_id, worker_id, role_id, amount, unit, valid_from, notes) VALUES (?,?,?,?,?,?,?)', cid, id, data.primary_role_id, amount, 'turno', from, 'Tarifa propia del trabajador').lastInsertRowid);
        db.run('INSERT INTO rate_history (company_id, rate_id, worker_id, role_id, action, new_amount, valid_from, user_id) VALUES (?,?,?,?,?,?,?,?)', cid, rid, id, data.primary_role_id, 'creada', amount, from, req.user.id);
      }
      return id;
    });
    audit(db, req, 'trabajador', id, 'crear', data);
    res.status(201).json({ id });
  }));

  r.put('/workers/:id', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const before = loadWorker(cid, Number(req.params.id));
    const data = validate(req.body, workerSpec, { partial: true });
    if (data.primary_role_id) own(db, 'roles', data.primary_role_id, cid, 'La función principal');
    db.tx(() => {
      if (Object.keys(data).length) {
        const q = updateSql('workers', data, 'id = ? AND company_id = ?');
        db.run(q.sql, ...q.params, before.id, cid);
      }
      setRelations(cid, before.id, req.body, data.primary_role_id || before.primary_role_id);
    });
    audit(db, req, 'trabajador', before.id, 'actualizar', { antes: before, despues: data });
    res.json({ ok: true });
  }));

  r.delete('/workers/:id', requireRole('planificador'), h((req, res) => {
    const w = loadWorker(req.companyId, Number(req.params.id));
    db.run('DELETE FROM workers WHERE id = ? AND company_id = ?', w.id, req.companyId);
    audit(db, req, 'trabajador', w.id, 'eliminar', { nombre: w.full_name });
    res.json({ ok: true });
  }));

  // Disponibilidad (admite registrar la misma franja para varios trabajadores).
  r.post('/availability', requireRole('planificador'), h((req, res) => {
    const cid = req.companyId;
    const data = validate(req.body, {
      date: { type: 'date', required: true, label: 'La fecha' },
      start_time: { type: 'time', required: true, label: 'La hora de inicio' },
      end_time: { type: 'time', required: true, label: 'La hora de fin' },
      days: { type: 'int', min: 1, max: 62, label: 'El número de días' },
      notes: { type: 'string', label: 'La nota' },
    });
    const ids = Array.isArray(req.body.worker_ids) ? [...new Set(req.body.worker_ids.map(Number))] : [];
    if (!ids.length) throw new HttpError(422, 'Selecciona al menos un trabajador.');
    for (const id of ids) loadWorker(cid, id);
    const days = data.days || 1;
    let n = 0;
    db.tx(() => {
      for (let d = 0; d < days; d++) {
        const iv = buildInterval(data.date, data.start_time, data.end_time, d);
        for (const id of ids) {
          db.run('INSERT INTO availability (company_id, worker_id, start_at, end_at, notes) VALUES (?,?,?,?,?)', cid, id, iv.start_at, iv.end_at, data.notes);
          n++;
        }
      }
    });
    audit(db, req, 'disponibilidad', null, 'crear', { trabajadores: ids.length, registros: n });
    res.status(201).json({ created: n });
  }));

  r.get('/availability', (req, res) => {
    const { from, to } = req.query;
    res.json(db.all(
      `SELECT a.*, w.full_name FROM availability a JOIN workers w ON w.id = a.worker_id
        WHERE a.company_id = ? AND (? IS NULL OR a.end_at >= ?) AND (? IS NULL OR a.start_at <= ?) ORDER BY a.start_at`,
      req.companyId, from || null, from || null, to || null, to || null,
    ));
  });

  r.delete('/availability/:id', requireRole('planificador'), h((req, res) => {
    const info = db.run('DELETE FROM availability WHERE id = ? AND company_id = ?', Number(req.params.id), req.companyId);
    if (!info.changes) throw new HttpError(404, 'El registro de disponibilidad no existe.');
    audit(db, req, 'disponibilidad', Number(req.params.id), 'eliminar');
    res.json({ ok: true });
  }));

  // Plantilla e importación de trabajadores desde Excel.
  r.get('/workers-template.xlsx', h(async (req, res) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Trabajadores');
    ws.columns = ['Nombre completo', 'Documento', 'Teléfono', 'Correo', 'Función principal', 'Otras funciones (separadas por ;)', 'Experiencia (años)', 'Estado', 'Tarifa propia por turno', 'Observaciones']
      .map((header) => ({ header, width: 24 }));
    ws.getRow(1).font = { bold: true };
    const roles = db.all('SELECT name FROM roles WHERE company_id = ? ORDER BY sort_order, name', req.companyId);
    const ref = wb.addWorksheet('Funciones disponibles');
    ref.addRow(['Funciones de tu empresa']);
    roles.forEach((x) => ref.addRow([x.name]));
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename="plantilla-trabajadores.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  }));

  r.post('/workers/import', requireRole('planificador'), express.raw({ type: '*/*', limit: '5mb' }), h(async (req, res) => {
    const cid = req.companyId;
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(req.body);
    } catch {
      throw new HttpError(422, 'El archivo no es un Excel (.xlsx) válido.');
    }
    const ws = wb.worksheets[0];
    const roles = new Map(db.all('SELECT id, name FROM roles WHERE company_id = ?', cid).map((x) => [x.name.trim().toLowerCase(), x.id]));
    const cellText = (row, i) => {
      const v = row.getCell(i).value;
      if (v && typeof v === 'object') return String(v.text ?? v.result ?? '').trim();
      return v === null || v === undefined ? '' : String(v).trim();
    };
    const errors = [];
    let created = 0;
    db.tx(() => {
      ws.eachRow((row, n) => {
        if (n === 1) return;
        const name = cellText(row, 1);
        if (!name) return;
        const role = roles.get(cellText(row, 5).toLowerCase());
        if (!role) {
          errors.push(`Fila ${n}: la función «${cellText(row, 5)}» no existe en tu empresa.`);
          return;
        }
        const others = cellText(row, 6).split(';').map((s) => s.trim().toLowerCase()).filter(Boolean);
        const unknown = others.filter((o) => !roles.has(o));
        if (unknown.length) errors.push(`Fila ${n}: funciones no encontradas (${unknown.join(', ')}); se omitieron.`);
        const status = ['disponible', 'ocupado', 'inactivo'].includes(cellText(row, 8).toLowerCase()) ? cellText(row, 8).toLowerCase() : 'disponible';
        const exp = cellText(row, 7) ? Number(cellText(row, 7).replace(',', '.')) : null;
        const doc = cellText(row, 2) || null;
        if (doc && db.get('SELECT id FROM workers WHERE company_id = ? AND document = ?', cid, doc)) {
          errors.push(`Fila ${n}: ya existe un trabajador con el documento ${doc}.`);
          return;
        }
        const id = Number(db.run(
          'INSERT INTO workers (company_id, full_name, document, phone, email, primary_role_id, experience_years, status, notes) VALUES (?,?,?,?,?,?,?,?,?)',
          cid, name, doc, cellText(row, 3) || null, cellText(row, 4) || null, role, Number.isFinite(exp) ? exp : null, status, cellText(row, 10) || null,
        ).lastInsertRowid);
        for (const rid of new Set([role, ...others.filter((o) => roles.has(o)).map((o) => roles.get(o))])) {
          db.run('INSERT INTO worker_roles (worker_id, role_id, company_id, authorized) VALUES (?,?,?,1)', id, rid, cid);
        }
        const rate = cellText(row, 9) ? Number(cellText(row, 9).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) : null;
        if (rate && rate > 0) db.run('INSERT INTO rates (company_id, worker_id, role_id, amount, unit, valid_from, notes) VALUES (?,?,?,?,?,?,?)', cid, id, role, rate, 'turno', todayISO(), 'Importada desde Excel');
        created++;
      });
    });
    audit(db, req, 'trabajador', null, 'importar_excel', { creados: created, observaciones: errors.length });
    res.json({ created, errors });
  }));

  return r;
}

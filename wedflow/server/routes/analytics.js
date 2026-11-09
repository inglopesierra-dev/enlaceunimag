import { Router } from 'express';
import express from 'express';
import ExcelJS from 'exceljs';
import { requireAuth, requireRole } from '../auth.js';
import { h, validate, HttpError, audit, insertSql, updateSql, own, round2 } from '../util.js';
import { todayISO, durationHours } from '../../public/js/lib/time.js';
import { eventIndicators, companyIndicators } from '../indicators.js';
import { loadEventContext, referenceCost } from '../planning.js';

const recordSpec = {
  event_date: { type: 'date', label: 'La fecha' },
  event_name: { type: 'string', label: 'El evento', maxLen: 160 },
  category_name: { type: 'string', label: 'La categoría', maxLen: 80 },
  guests: { type: 'int', min: 0, label: 'Los invitados' },
  assigned_staff: { type: 'int', min: 0, label: 'El personal asignado' },
  min_staff: { type: 'int', min: 0, label: 'El personal mínimo' },
  conventional_cost: { type: 'number', min: 0, label: 'El costo convencional' },
  reference_cost: { type: 'number', min: 0, label: 'El costo de referencia' },
  notes: { type: 'string', label: 'La nota', maxLen: 400 },
};

export default function analyticsRoutes({ db }) {
  const r = Router();
  r.use(['/dashboard', '/indicators', '/history'], requireAuth);

  r.get('/dashboard', (req, res) => {
    const cid = req.companyId;
    const today = todayISO();
    const totalEvents = db.get("SELECT COUNT(*) AS n FROM events WHERE company_id = ? AND status <> 'cancelado'", cid).n;
    const upcoming = db.all(
      `SELECT e.id, e.name, e.date, e.start_time, e.location, e.guests, e.status, c.name AS category_name FROM events e
         LEFT JOIN event_categories c ON c.id = e.category_id
        WHERE e.company_id = ? AND e.date >= ? AND e.status NOT IN ('cancelado','realizado') ORDER BY e.date, e.start_time`, cid, today);
    const byCategory = db.all(
      `SELECT COALESCE(c.name, 'Sin categoría') AS name, COUNT(e.id) AS n FROM events e LEFT JOIN event_categories c ON c.id = e.category_id
        WHERE e.company_id = ? AND e.status <> 'cancelado' GROUP BY c.id ORDER BY c.sort_order`, cid);
    const workers = db.get(
      `SELECT SUM(status = 'disponible') AS disponibles, SUM(status = 'ocupado') AS ocupados, SUM(status = 'inactivo') AS inactivos, COUNT(*) AS total
         FROM workers WHERE company_id = ?`, cid);
    const assignedWorkers = db.get(
      `SELECT COUNT(DISTINCT a.worker_id) AS n FROM assignments a JOIN events e ON e.id = a.event_id
        WHERE a.company_id = ? AND a.plan = e.official_plan AND e.date >= ? AND e.status <> 'cancelado'`, cid, today).n;
    // Indicadores calculados sobre los eventos próximos.
    const ind = upcoming.map((e) => {
      const x = eventIndicators(db, cid, e.id);
      const ctx = loadEventContext(db, cid, e.id);
      const requiredHours = ctx.shifts.reduce((a, s) => a + s.quantity * durationHours(s.start_at, s.end_at), 0);
      return { ...x, required_hours: requiredHours, estimate: x.has_assignments ? x.ct : referenceCost(db, ctx).total };
    });
    const reqHours = ind.reduce((a, x) => a + x.required_hours, 0);
    const coveredHours = ind.reduce((a, x) => a + (x.pc / 100) * x.required_hours, 0);
    const runs = db.all(
      `SELECT r.conventional_cost, r.optimized_cost FROM optimization_runs r
        WHERE r.company_id = ? AND r.applied = 1 AND r.conventional_cost IS NOT NULL AND r.optimized_cost IS NOT NULL`, cid);
    const savings = round2(runs.reduce((a, x) => a + (x.conventional_cost - x.optimized_cost), 0));
    const convApplied = runs.reduce((a, x) => a + x.conventional_cost, 0);
    const history = db.all('SELECT * FROM historical_summaries WHERE company_id = ? ORDER BY id', cid).map((x) => ({ ...x, data: JSON.parse(x.data_json) }));
    const costByMonth = db.all(
      `SELECT substr(e.date, 1, 7) AS month, SUM(a.cost) AS cost FROM assignments a JOIN events e ON e.id = a.event_id
        WHERE a.company_id = ? AND a.plan = e.official_plan AND e.status <> 'cancelado' GROUP BY month ORDER BY month DESC LIMIT 12`, cid).reverse();
    res.json({
      total_events: totalEvents,
      upcoming_count: upcoming.length,
      upcoming: ind.slice(0, 6).map((x) => ({ ...upcoming.find((u) => u.id === x.event_id), staff_assigned: x.staff_assigned, staff_minimum: x.staff_minimum, pc: x.pc, conflicts: x.conflicts, estimate: x.estimate, has_assignments: x.has_assignments })),
      workers: { total: workers.total || 0, disponibles: workers.disponibles || 0, ocupados: workers.ocupados || 0, inactivos: workers.inactivos || 0, asignados: assignedWorkers },
      estimated_cost: round2(ind.reduce((a, x) => a + x.estimate, 0)),
      estimated_cost_assigned: round2(ind.filter((x) => x.has_assignments).reduce((a, x) => a + x.ct, 0)),
      events_by_category: byCategory,
      coverage_pct: reqHours ? round2((coveredHours / reqHours) * 100) : null,
      conflicts: ind.reduce((a, x) => a + x.conflicts, 0),
      alerts: ind.reduce((a, x) => a + x.alerts, 0),
      savings,
      savings_pct: convApplied ? round2((savings / convApplied) * 100) : null,
      optimized_events: runs.length,
      cost_by_month: costByMonth,
      history,
    });
  });

  r.get('/indicators', h((req, res) => {
    const q = validate(req.query, { from: { type: 'date' }, to: { type: 'date' } });
    res.json(companyIndicators(db, req.companyId, q));
  }));

  r.get('/indicators/event/:id', h((req, res) => res.json(eventIndicators(db, req.companyId, Number(req.params.id)))));

  // Historial y análisis.
  r.get('/history', (req, res) => {
    const cid = req.companyId;
    const summaries = db.all('SELECT * FROM historical_summaries WHERE company_id = ? ORDER BY id', cid).map((x) => ({ ...x, data: JSON.parse(x.data_json) }));
    const records = db.all('SELECT * FROM historical_records WHERE company_id = ? ORDER BY event_date DESC, id DESC', cid);
    const past = db.all(
      `SELECT e.id FROM events e WHERE e.company_id = ? AND (e.date < ? OR e.status = 'realizado') AND e.status <> 'cancelado' ORDER BY e.date DESC LIMIT 200`, cid, todayISO(),
    ).map((x) => eventIndicators(db, cid, x.id));
    const byCat = {};
    for (const rec of records) {
      const k = rec.category_name || 'Sin categoría';
      byCat[k] ||= { category: k, events: 0, assigned: 0, minimum: 0, conventional: 0, reference: 0 };
      Object.assign(byCat[k], {
        events: byCat[k].events + 1,
        assigned: byCat[k].assigned + (rec.assigned_staff || 0),
        minimum: byCat[k].minimum + (rec.min_staff || 0),
        conventional: byCat[k].conventional + (rec.conventional_cost || 0),
        reference: byCat[k].reference + (rec.reference_cost || 0),
      });
    }
    res.json({ summaries, records, past_events: past, records_by_category: Object.values(byCat) });
  });

  r.post('/history/records', requireRole('planificador'), h((req, res) => {
    const d = validate(req.body, recordSpec);
    const q = insertSql('historical_records', { company_id: req.companyId, source: 'formulario', ...d });
    const id = Number(db.run(q.sql, ...q.params).lastInsertRowid);
    audit(db, req, 'historico', id, 'crear', d);
    res.status(201).json({ id });
  }));
  r.put('/history/records/:id', requireRole('planificador'), h((req, res) => {
    const rec = own(db, 'historical_records', Number(req.params.id), req.companyId, 'El registro');
    const d = validate(req.body, recordSpec, { partial: true });
    if (Object.keys(d).length) {
      const q = updateSql('historical_records', d, 'id = ?');
      db.run(q.sql, ...q.params, rec.id);
    }
    audit(db, req, 'historico', rec.id, 'actualizar', d);
    res.json({ ok: true });
  }));
  r.delete('/history/records/:id', requireRole('planificador'), h((req, res) => {
    const rec = own(db, 'historical_records', Number(req.params.id), req.companyId, 'El registro');
    db.run('DELETE FROM historical_records WHERE id = ?', rec.id);
    audit(db, req, 'historico', rec.id, 'eliminar', rec);
    res.json({ ok: true });
  }));
  r.delete('/history/summaries/:id', requireRole('admin'), h((req, res) => {
    const s = own(db, 'historical_summaries', Number(req.params.id), req.companyId, 'El resumen');
    db.run('DELETE FROM historical_summaries WHERE id = ?', s.id);
    audit(db, req, 'historico_resumen', s.id, 'eliminar', { titulo: s.title });
    res.json({ ok: true });
  }));

  const HEADERS = ['Fecha (AAAA-MM-DD)', 'Evento', 'Categoría', 'Invitados', 'Personal asignado', 'Personal mínimo', 'Costo convencional', 'Costo de referencia', 'Observaciones'];

  r.get('/history/template.xlsx', h(async (_req, res) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Histórico');
    ws.columns = HEADERS.map((header) => ({ header, width: 22 }));
    ws.getRow(1).font = { bold: true };
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename="plantilla-historico.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  }));

  r.post('/history/import', requireRole('planificador'), express.raw({ type: '*/*', limit: '8mb' }), h(async (req, res) => {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(req.body);
    } catch {
      throw new HttpError(422, 'El archivo no es un Excel (.xlsx) válido.');
    }
    const ws = wb.worksheets[0];
    const val = (row, i) => {
      const v = row.getCell(i).value;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (v && typeof v === 'object') return v.result ?? v.text ?? null;
      return v ?? null;
    };
    const num = (v) => {
      if (v === null || v === '') return null;
      if (typeof v === 'number') return v;
      const n = Number(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const errors = [];
    let created = 0;
    db.tx(() => {
      ws.eachRow((row, n) => {
        if (n === 1) return;
        const date = val(row, 1) ? String(val(row, 1)).slice(0, 10) : null;
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errors.push(`Fila ${n}: fecha no válida (${date}).`);
          return;
        }
        const name = val(row, 2);
        if (!date && !name) return;
        db.run(
          `INSERT INTO historical_records (company_id, source, event_date, event_name, category_name, guests, assigned_staff, min_staff, conventional_cost, reference_cost, notes)
           VALUES (?, 'importado', ?,?,?,?,?,?,?,?,?)`,
          req.companyId, date, name ? String(name) : null, val(row, 3) ? String(val(row, 3)) : null, num(val(row, 4)), num(val(row, 5)), num(val(row, 6)),
          num(val(row, 7)), num(val(row, 8)), val(row, 9) ? String(val(row, 9)) : null,
        );
        created++;
      });
    });
    audit(db, req, 'historico', null, 'importar_excel', { creados: created });
    res.json({ created, errors });
  }));

  return r;
}

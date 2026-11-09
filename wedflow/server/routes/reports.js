import { Router } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { requireAuth } from '../auth.js';
import { h, HttpError } from '../util.js';
import { eventIndicators, companyIndicators } from '../indicators.js';
import { loadEventContext, evaluatePlan } from '../planning.js';
import { formatTime12 } from '../../public/js/lib/time.js';

const GOLD = '#B08D57';
const INK = '#1E1B18';
const MUTED = '#7A7068';
const SAND = '#F4EDE3';

function money(company) {
  const f = new Intl.NumberFormat(company.locale || 'es-CO', { style: 'currency', currency: company.currency || 'COP', maximumFractionDigits: 0 });
  return (n) => (n === null || n === undefined ? '—' : f.format(n));
}
const pct = (n) => (n === null || n === undefined ? '—' : `${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`);
const hm = (dt) => (dt ? formatTime12(dt.slice(11)) : '');
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60);

function eventData(db, cid, eventId) {
  const ctx = loadEventContext(db, cid, eventId);
  const ind = eventIndicators(db, cid, eventId);
  const rows = db.all('SELECT shift_id, worker_id FROM assignments WHERE event_id = ? AND plan = ?', eventId, ctx.event.official_plan);
  const plan = evaluatePlan(db, ctx, rows);
  const run = db.get("SELECT * FROM optimization_runs WHERE event_id = ? AND company_id = ? AND status IN ('optimo','factible') ORDER BY applied DESC, id DESC LIMIT 1", eventId, cid);
  return { ctx, ind, plan, run: run ? JSON.parse(run.result_json) : null };
}

// ---------- PDF ----------
function pdfStart(res, company, title, filename) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 48, bufferPages: true, info: { Title: title, Author: company.name, Creator: 'Wedflow' } });
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  // Encabezado
  if (company.logo_data && /^data:image\/(png|jpeg);base64,/.test(company.logo_data)) {
    try {
      doc.image(Buffer.from(company.logo_data.split(',')[1], 'base64'), 48, 40, { fit: [60, 40] });
    } catch { /* logotipo no legible: se omite */ }
  }
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9).text('WEDFLOW', 48, 44, { align: 'right', characterSpacing: 3 });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(company.name, { align: 'right' });
  doc.moveDown(2.2);
  doc.fillColor(INK).font('Times-Roman').fontSize(22).text(title, 48);
  doc.moveTo(48, doc.y + 4).lineTo(564, doc.y + 4).lineWidth(0.8).strokeColor(GOLD).stroke();
  doc.moveDown(1);
  return doc;
}

function pdfSection(doc, text) {
  if (doc.y > 680) doc.addPage();
  doc.moveDown(0.6).fillColor(GOLD).font('Helvetica-Bold').fontSize(10).text(text.toUpperCase(), 48, doc.y, { characterSpacing: 1.5 });
  doc.moveDown(0.4).fillColor(INK).font('Helvetica').fontSize(9);
}

function pdfKV(doc, pairs) {
  const colW = 258;
  let y = doc.y;
  for (let i = 0; i < pairs.length; i += 2) {
    const row = pairs.slice(i, i + 2);
    doc.font('Helvetica').fontSize(7.5);
    const kh = Math.max(...row.map(([k]) => doc.heightOfString(k.toUpperCase(), { width: colW - 12, characterSpacing: 0.6 })));
    doc.font('Helvetica-Bold').fontSize(10);
    const h = kh + 2 + Math.max(...row.map(([, v]) => doc.heightOfString(String(v ?? '—'), { width: colW - 12 }))) + 6;
    if (y + h > 730) {
      doc.addPage();
      y = 60;
    }
    row.forEach(([k, v], j) => {
      const x = 48 + j * colW;
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(k.toUpperCase(), x, y, { width: colW - 12, characterSpacing: 0.6 });
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(String(v ?? '—'), x, y + kh + 2, { width: colW - 12 });
    });
    y += h + 4;
  }
  doc.y = y;
  doc.x = 48;
}

function pdfTable(doc, headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = 516 / total;
  const w = widths.map((x) => x * scale);
  const drawHeader = () => {
    doc.rect(48, doc.y, 516, 16).fill(SAND);
    let x = 48;
    const y = doc.y + 4;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(7.5);
    headers.forEach((hd, i) => {
      doc.text(hd, x + 4, y, { width: w[i] - 8, lineBreak: false, ellipsis: true });
      x += w[i];
    });
    doc.y = y + 14;
  };
  drawHeader();
  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    const heights = row.map((c, i) => doc.heightOfString(String(c ?? ''), { width: w[i] - 8 }));
    const rh = Math.max(...heights) + 6;
    if (doc.y + rh > 740) {
      doc.addPage();
      doc.y = 60;
      drawHeader();
      doc.font('Helvetica').fontSize(8);
    }
    let x = 48;
    const y = doc.y;
    row.forEach((c, i) => {
      doc.fillColor(INK).text(String(c ?? ''), x + 4, y + 3, { width: w[i] - 8 });
      x += w[i];
    });
    doc.moveTo(48, y + rh).lineTo(564, y + rh).lineWidth(0.3).strokeColor('#E2D8CA').stroke();
    doc.y = y + rh;
  }
  doc.x = 48;
  doc.moveDown(0.5);
}

function pdfFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.fillColor(MUTED).font('Helvetica').fontSize(7).text(`Generado con Wedflow el ${new Date().toLocaleString('es-CO')} · Página ${i + 1} de ${range.count}`, 48, 750, { align: 'center', width: 516, lineBreak: false });
  }
}

// ---------- Excel ----------
function xlsxBook(company) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Wedflow';
  wb.company = company.name;
  return wb;
}
function sheet(wb, name, columns, rows) {
  const ws = wb.addWorksheet(name);
  ws.columns = columns.map(([header, key, width = 18, numFmt]) => ({ header, key, width, style: numFmt ? { numFmt } : {} }));
  const hr = ws.getRow(1);
  hr.font = { bold: true, color: { argb: 'FF1E1B18' } };
  hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4EDE3' } };
  rows.forEach((r) => ws.addRow(r));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return ws;
}
async function sendXlsx(res, wb, filename) {
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}
const MONEY_FMT = '#,##0';

export default function reportRoutes({ db }) {
  const r = Router();
  r.use('/reports', requireAuth);
  const company = (cid) => db.get('SELECT * FROM companies WHERE id = ?', cid);

  r.get('/reports/event/:id.xlsx', h(async (req, res) => {
    const c = company(req.companyId);
    const { ctx, ind, plan, run } = eventData(db, req.companyId, Number(req.params.id));
    const e = ctx.event;
    const wb = xlsxBook(c);
    sheet(wb, 'Resumen', [['Indicador', 'k', 38], ['Valor', 'v', 40]], [
      { k: 'Evento', v: e.name }, { k: 'Fecha', v: e.date }, { k: 'Ubicación', v: e.location }, { k: 'Tipo', v: e.type_name },
      { k: 'Categoría', v: e.category_name }, { k: 'Invitados', v: e.guests }, { k: 'Horario', v: `${formatTime12(e.start_time)} – ${formatTime12(e.end_time)}` },
      { k: 'Plan oficial', v: e.official_plan }, { k: `Costo total de contratación CT (${c.currency})`, v: ind.ct }, { k: 'Costo base de referencia', v: ind.reference_cost },
      { k: `Costo convencional (${ind.conventional_source || 'sin dato'})`, v: ind.conventional_cost }, { k: 'Costo optimizado', v: ind.optimized_cost },
      { k: 'Diferencia', v: ind.savings }, { k: 'Variación porcentual VP (%)', v: ind.vp }, { k: 'Personal asignado', v: ind.staff_assigned },
      { k: 'Personal mínimo requerido', v: ind.staff_minimum }, { k: 'Diferencia de personal DP', v: ind.dp }, { k: 'Porcentaje de cobertura PC (%)', v: ind.pc },
      { k: 'Conflictos de programación', v: ind.conflicts }, { k: 'Horas adicionales', v: ind.extra_hours },
      { k: 'Tiempo de planificación manual (min)', v: ind.planning_minutes_manual }, { k: 'Tiempo del solucionador (ms)', v: ind.solver_ms },
      { k: 'Método', v: run?.method || 'Sin optimización' }, { k: 'Estado del modelo', v: run ? run.message : '' },
    ]);
    sheet(wb, 'Turnos', [['Función', 'role', 24], ['Cantidad', 'q', 10], ['Entrada', 's', 18], ['Salida', 'e', 18], ['Horas', 'h', 10]],
      ctx.shifts.map((s) => ({ role: s.role_name, q: s.quantity, s: s.start_at.replace('T', ' '), e: s.end_at.replace('T', ' '), h: s.hours })));
    sheet(wb, 'Asignación oficial', [['Trabajador', 'w', 30], ['Función', 'role', 22], ['Entrada', 's', 18], ['Salida', 'e', 18], ['Horas', 'h', 8], ['Costo', 'c', 14, MONEY_FMT], ['Observaciones', 'i', 50]],
      plan.rows.map((x) => ({ w: x.worker_name, role: x.role_name, s: x.start_at.replace('T', ' '), e: x.end_at.replace('T', ' '), h: x.hours, c: x.cost, i: x.issues.join(' ') })));
    if (run?.optimized) {
      sheet(wb, 'Comparación', [['Concepto', 'k', 36], ['Convencional', 'a', 18, MONEY_FMT], ['Optimizada', 'b', 18, MONEY_FMT]], [
        { k: 'Costo total', a: run.comparison.conventional_cost, b: run.comparison.optimized_cost },
        { k: 'Personal asignado', a: run.comparison.conventional_staff, b: run.comparison.optimized_staff },
        { k: 'Cobertura (%)', a: run.comparison.conventional_coverage, b: run.comparison.optimized_coverage },
        { k: 'Conflictos', a: run.comparison.conventional_conflicts, b: run.comparison.optimized_conflicts },
        { k: 'Diferencia', a: null, b: run.comparison.difference }, { k: 'Ahorro (%)', a: null, b: run.comparison.savings_pct },
      ]);
      sheet(wb, 'Restricciones', [['Restricción', 'k', 8], ['Nombre', 'n', 40], ['Cumple', 'ok', 10], ['Detalle', 'd', 60]],
        run.constraints.map((x) => ({ k: x.key, n: x.name, ok: x.ok === null ? 'N/A' : x.ok ? 'Sí' : 'No', d: x.detail })));
      sheet(wb, 'No asignados', [['Trabajador', 'w', 30], ['Motivo', 'm', 80]], run.unassigned.map((u) => ({ w: u.worker_name, m: u.reasons.join(' ') })));
    }
    await sendXlsx(res, wb, `wedflow-evento-${slug(e.name)}.xlsx`);
  }));

  r.get('/reports/event/:id.pdf', h((req, res) => {
    const c = company(req.companyId);
    const fmt = money(c);
    const { ctx, ind, plan, run } = eventData(db, req.companyId, Number(req.params.id));
    const e = ctx.event;
    const doc = pdfStart(res, c, 'Programación de personal', `wedflow-evento-${slug(e.name)}.pdf`);
    pdfSection(doc, 'Evento');
    pdfKV(doc, [['Evento', e.name], ['Fecha', e.date], ['Ubicación', e.location], ['Categoría', `${e.category_name || '—'} · ${e.guests ?? '—'} invitados`],
      ['Horario', `${formatTime12(e.start_time)} – ${formatTime12(e.end_time)}`], ['Plan oficial', e.official_plan === 'optimizado' ? 'Optimizado' : 'Manual']]);
    pdfSection(doc, 'Indicadores');
    pdfKV(doc, [['Costo total CT', fmt(ind.ct)], ['Costo base de referencia', fmt(ind.reference_cost)],
      [`Costo convencional${ind.conventional_source ? ' (' + ind.conventional_source + ')' : ''}`, fmt(ind.conventional_cost)], ['Costo optimizado', fmt(ind.optimized_cost)],
      ['Variación porcentual VP', pct(ind.vp)], ['Cobertura PC', pct(ind.pc)], ['Personal asignado / mínimo', `${ind.staff_assigned} / ${ind.staff_minimum} (DP ${ind.dp})`],
      ['Conflictos · horas adicionales', `${ind.conflicts} · ${ind.extra_hours} h`]]);
    if (run) {
      pdfSection(doc, 'Método');
      doc.text(`${run.method}. ${run.message}`, { width: 516 });
      if (run.constraints) {
        pdfSection(doc, 'Restricciones verificadas');
        pdfTable(doc, ['', 'Restricción', 'Cumple', 'Detalle'], run.constraints.map((x) => [x.key, x.name, x.ok === null ? 'N/A' : x.ok ? 'Sí' : 'No', x.detail]), [4, 30, 8, 50]);
      }
    }
    pdfSection(doc, 'Asignación oficial');
    if (plan.rows.length) {
      pdfTable(doc, ['Trabajador', 'Función', 'Horario', 'Horas', 'Costo', 'Observaciones'],
        plan.rows.sort((a, b) => a.role_name.localeCompare(b.role_name) || a.start_at.localeCompare(b.start_at))
          .map((x) => [x.worker_name, x.role_name, `${hm(x.start_at)} – ${hm(x.end_at)}`, x.hours, fmt(x.cost), x.issues.join(' ')]), [22, 18, 18, 6, 12, 24]);
    } else doc.text('El evento todavía no tiene asignaciones en su plan oficial.');
    pdfSection(doc, 'Turnos del evento');
    pdfTable(doc, ['Función', 'Cantidad', 'Entrada', 'Salida', 'Horas'], ctx.shifts.map((s) => [s.role_name, s.quantity, `${s.start_at.slice(0, 10)} ${hm(s.start_at)}`, `${s.end_at.slice(0, 10)} ${hm(s.end_at)}`, s.hours]), [28, 10, 22, 22, 8]);
    if (plan.alerts.length) {
      pdfSection(doc, 'Alertas');
      plan.alerts.forEach((a) => doc.text(`• ${a.message}`, { width: 516 }));
    }
    pdfFooter(doc);
    doc.end();
  }));

  r.get('/reports/indicators.xlsx', h(async (req, res) => {
    const c = company(req.companyId);
    const data = companyIndicators(db, req.companyId, { from: req.query.from || null, to: req.query.to || null });
    const wb = xlsxBook(c);
    sheet(wb, 'Indicadores por evento', [
      ['Evento', 'name', 34], ['Fecha', 'date', 12], ['Categoría', 'category_name', 12], ['CT', 'ct', 14, MONEY_FMT], ['Referencia', 'reference_cost', 14, MONEY_FMT],
      ['Convencional', 'conventional_cost', 14, MONEY_FMT], ['Optimizado', 'optimized_cost', 14, MONEY_FMT], ['Diferencia', 'savings', 14, MONEY_FMT], ['VP %', 'vp', 8],
      ['Asignado', 'staff_assigned', 9], ['Mínimo', 'staff_minimum', 9], ['DP', 'dp', 6], ['PC %', 'pc', 8], ['Conflictos', 'conflicts', 10], ['Horas adicionales', 'extra_hours', 10],
      ['Planificación manual (min)', 'planning_minutes_manual', 14], ['Solucionador (ms)', 'solver_ms', 12],
    ], data.events);
    const t = data.totals;
    sheet(wb, 'Totales', [['Indicador', 'k', 40], ['Valor', 'v', 22]], [
      { k: 'Eventos', v: t.events }, { k: 'Costo total de contratación CT', v: t.ct }, { k: 'Costo convencional (eventos comparables)', v: t.conventional_cost },
      { k: 'Costo optimizado (eventos comparables)', v: t.optimized_cost }, { k: 'Diferencia', v: t.savings }, { k: 'VP (%)', v: t.vp }, { k: 'DP total', v: t.dp },
      { k: 'PC promedio (%)', v: t.pc }, { k: 'Conflictos', v: t.conflicts }, { k: 'Horas adicionales', v: t.extra_hours },
      { k: 'Tiempo de planificación manual (min)', v: t.planning_minutes_manual }, { k: 'Tiempo del solucionador (s)', v: t.solver_seconds },
    ]);
    const hist = db.all('SELECT * FROM historical_summaries WHERE company_id = ?', req.companyId);
    for (const hs of hist) {
      const d = JSON.parse(hs.data_json);
      sheet(wb, 'Histórico caso'.slice(0, 31), [['Dato', 'k', 40], ['Valor', 'v', 22]], Object.entries(d).map(([k, v]) => ({ k, v })));
      break;
    }
    await sendXlsx(res, wb, 'wedflow-indicadores.xlsx');
  }));

  r.get('/reports/indicators.pdf', h((req, res) => {
    const c = company(req.companyId);
    const fmt = money(c);
    const data = companyIndicators(db, req.companyId, { from: req.query.from || null, to: req.query.to || null });
    const t = data.totals;
    const doc = pdfStart(res, c, 'Indicadores de planificación', 'wedflow-indicadores.pdf');
    pdfSection(doc, 'Resumen');
    pdfKV(doc, [['Eventos', t.events], ['Costo total CT', fmt(t.ct)], ['Costo convencional', fmt(t.conventional_cost)], ['Costo optimizado', fmt(t.optimized_cost)],
      ['Diferencia', fmt(t.savings)], ['Variación porcentual VP', pct(t.vp)], ['Cobertura promedio PC', pct(t.pc)], ['Conflictos · horas adicionales', `${t.conflicts} · ${t.extra_hours} h`]]);
    doc.fillColor(MUTED).fontSize(7.5).text('VP = (Costo convencional - Costo optimizado) / Costo convencional x 100. DP = Personal asignado - Personal mínimo. PC = persona-hora cubierta / persona-hora requerida x 100. Los totales de costo convencional y optimizado incluyen solo eventos con ambas programaciones.', { width: 516 });
    pdfSection(doc, 'Indicadores por evento');
    pdfTable(doc, ['Evento', 'Fecha', 'CT', 'Convencional', 'Optimizado', 'VP', 'DP', 'PC', 'Confl.'],
      data.events.map((x) => [x.name, x.date, fmt(x.ct), fmt(x.conventional_cost), fmt(x.optimized_cost), pct(x.vp), x.dp, pct(x.pc), x.conflicts]), [26, 11, 12, 12, 12, 7, 5, 8, 6]);
    const hist = db.all('SELECT * FROM historical_summaries WHERE company_id = ?', req.companyId);
    for (const hs of hist) {
      const d = JSON.parse(hs.data_json);
      pdfSection(doc, `${hs.title} (${hs.period || ''})`);
      pdfKV(doc, [['Bodas registradas', d.total_bodas], ['Pequeñas · medianas · grandes', `${d.bodas_pequenas} · ${d.bodas_medianas} · ${d.bodas_grandes}`],
        ['Asignaciones programadas', d.asignaciones_programadas], ['Asignaciones mínimas de referencia', d.asignaciones_minimas], ['Asignaciones adicionales', d.asignaciones_adicionales],
        ['Costo de referencia', fmt(d.costo_referencia)], ['Costo convencional', fmt(d.costo_convencional)], ['Diferencia acumulada', fmt(d.diferencia_acumulada)]]);
      if (d.nota) doc.fillColor(MUTED).fontSize(7.5).text(d.nota, { width: 516 });
    }
    pdfFooter(doc);
    doc.end();
  }));

  r.get('/reports/workers.xlsx', h(async (req, res) => {
    const c = company(req.companyId);
    const rows = db.all(
      `SELECT w.*, ro.name AS role_name,
              (SELECT GROUP_CONCAT(r2.name, '; ') FROM worker_roles wr JOIN roles r2 ON r2.id = wr.role_id WHERE wr.worker_id = w.id AND wr.authorized = 1) AS roles,
              (SELECT GROUP_CONCAT(c2.name, '; ') FROM worker_competences wc JOIN competences c2 ON c2.id = wc.competence_id WHERE wc.worker_id = w.id) AS comps,
              (SELECT COUNT(*) FROM assignments a JOIN events e ON e.id = a.event_id WHERE a.worker_id = w.id AND a.plan = e.official_plan) AS n
         FROM workers w LEFT JOIN roles ro ON ro.id = w.primary_role_id WHERE w.company_id = ? ORDER BY w.full_name`, req.companyId);
    const wb = xlsxBook(c);
    sheet(wb, 'Trabajadores', [['Nombre', 'full_name', 30], ['Documento', 'document', 16], ['Teléfono', 'phone', 16], ['Función principal', 'role_name', 22],
      ['Funciones autorizadas', 'roles', 40], ['Competencias', 'comps', 30], ['Experiencia (años)', 'experience_years', 12], ['Estado', 'status', 12], ['Asignaciones', 'n', 12]], rows);
    await sendXlsx(res, wb, 'wedflow-trabajadores.xlsx');
  }));

  r.use('/reports', (_req, _res, next) => next(new HttpError(404, 'Reporte no encontrado.')));
  return r;
}

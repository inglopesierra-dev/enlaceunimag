import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { startServer, register } from './helpers.js';
import { buildInterval, durationHours, windowsCover } from '../public/js/lib/time.js';

let srv;
let A; // Wedding Planner con el escenario del caso Karol Planner
let B; // Wedding Planner con datos propios, distintos
const DATE = '2030-06-15';

before(async () => {
  srv = await startServer();
  A = srv.client();
  B = srv.client();
  await register(A, { email: 'a@planner.test', company: 'Planner A', demo: 'full' });
  await register(B, { email: 'b@planner.test', company: 'Planner B', demo: 'none', currency: 'USD' });
});
after(() => srv.close());

// Utilidades para armar los datos propios de B.
async function role(c, name) {
  return (await c.post('/roles', { name })).data.id;
}
async function worker(c, name, primary, extra = {}) {
  const r = await c.post('/workers', { full_name: name, primary_role_id: primary, ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.id;
}
async function avail(c, ids, date = DATE, start = '08:00', end = '04:00') {
  return c.post('/availability', { worker_ids: ids, date, start_time: start, end_time: end });
}

test('1. Registro de diferentes Wedding Planners con su propia configuración', async () => {
  const meA = await A.get('/auth/me');
  const meB = await B.get('/auth/me');
  assert.equal(meA.data.company.name, 'Planner A');
  assert.equal(meB.data.company.name, 'Planner B');
  assert.equal(meB.data.company.currency, 'USD');
  assert.equal(meA.data.user.role, 'admin');
  // Correo duplicado y contraseña débil se rechazan.
  const dup = await srv.client().post('/auth/register', { user: { name: 'x', email: 'a@planner.test', password: 'Prueba2026' }, company: { name: 'X' } });
  assert.equal(dup.status, 409);
  const weak = await srv.client().post('/auth/register', { user: { name: 'x', email: 'w@planner.test', password: 'corta' }, company: { name: 'X' } });
  assert.equal(weak.status, 422);
  // A tiene la configuración de referencia; B empieza en blanco.
  assert.equal((await A.get('/roles')).data.length, 9);
  assert.equal((await B.get('/roles')).data.length, 0);
});

test('2. Separación de información entre empresas', async () => {
  const evA = (await A.get('/events')).data[0];
  const roleA = (await A.get('/roles')).data[0];
  assert.equal((await B.get(`/events/${evA.id}`)).status, 404);
  assert.equal((await B.get('/events')).data.length, 0);
  assert.equal((await B.get('/workers')).data.length, 0);
  assert.equal((await B.put(`/roles/${roleA.id}`, { name: 'hackeado' })).status, 404);
  assert.equal((await B.del(`/events/${evA.id}`)).status, 404);
  assert.equal((await B.post('/events/' + evA.id + '/optimize')).status, 404);
  // B no puede usar una función de A al registrar un trabajador.
  assert.equal((await B.post('/workers', { full_name: 'X', primary_role_id: roleA.id })).status, 404);
  // Ni editar la matriz con categorías de A.
  const catA = (await A.get('/categories')).data[0];
  assert.equal((await B.put('/requirements', { cells: [{ category_id: catA.id, role_id: roleA.id, min_count: 3 }] })).status, 422);
  // Sin sesión no hay acceso.
  assert.equal((await srv.client().get('/events')).status, 401);
  // Las peticiones que modifican datos sin la cabecera del cliente se rechazan (CSRF).
  const res = await fetch(srv.base + '/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
});

test('3. Registro y edición de eventos (incluido el cambio de fecha)', async () => {
  const cat = (await B.post('/categories', { name: 'Íntima', reference_guests: 40 })).data.id;
  const r = await B.post('/events', { name: 'Boda de prueba', date: DATE, start_time: '17:00', end_time: '01:00', category_id: cat, guests: 40, location: 'Finca' });
  assert.equal(r.status, 201);
  const ev = (await B.get(`/events/${r.data.id}`)).data;
  assert.equal(ev.end_at, '2030-06-16T01:00', 'el evento termina después de la medianoche');
  const bad = await B.post('/events', { name: '', date: 'mañana', start_time: '25:00', end_time: '10:00' });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.details.name && bad.data.details.date && bad.data.details.start_time);
  const rid = await role(B, 'Anfitrión');
  await B.post(`/events/${ev.id}/shifts`, { role_id: rid, quantity: 1, start_time: '18:00', end_time: '02:00' });
  await B.put(`/events/${ev.id}`, { date: '2030-06-22', guests: 45 });
  const moved = (await B.get(`/events/${ev.id}`)).data;
  assert.equal(moved.guests, 45);
  assert.equal(moved.shifts[0].start_at, '2030-06-22T18:00', 'los turnos se desplazan con el evento');
  assert.equal(moved.shifts[0].end_at, '2030-06-23T02:00');
  assert.equal((await B.del(`/events/${ev.id}`)).status, 200);
  assert.equal((await B.get(`/events/${ev.id}`)).status, 404);
});

test('4. Creación de cargos y funciones personalizados y matriz propia', async () => {
  const id = await role(B, 'Sommelier');
  const cat = (await B.get('/categories')).data[0];
  const put = await B.put('/requirements', { cells: [{ category_id: cat.id, role_id: id, min_count: 2 }] });
  assert.equal(put.status, 200);
  assert.deepEqual(put.data.find((c) => c.role_id === id).min_count, 2);
  assert.equal((await B.put(`/roles/${id}`, { name: 'Sommelier principal' })).data.name, 'Sommelier principal');
  assert.equal((await B.post('/roles', { name: 'Sommelier principal' })).status, 409);
});

test('5. Registro de trabajadores, varias funciones y disponibilidad', async () => {
  const r1 = await role(B, 'Mesero B');
  const r2 = await role(B, 'Barista');
  const w = await worker(B, 'Ana Gómez', r1, { role_ids: [r2], experience_years: 3, document: 'B-001' });
  const detail = (await B.get(`/workers/${w}`)).data;
  assert.deepEqual(detail.role_ids.sort(), [r1, r2].sort());
  assert.equal((await B.post('/workers', { full_name: 'Duplicado', primary_role_id: r1, document: 'B-001' })).status, 409);
  const av = await avail(B, [w], DATE, '20:00', '03:00');
  assert.equal(av.data.created, 1);
  const after = (await B.get(`/workers/${w}`)).data;
  assert.equal(after.availability[0].end_at, '2030-06-16T03:00');
});

test('6. Configuración de tarifas propias, vigencias e historial', async () => {
  const r = await role(B, 'Chef B');
  const w = await worker(B, 'Luis Ríos', r);
  await B.post('/rates', { role_id: r, amount: 120, valid_from: '2030-01-01', valid_to: '2030-12-31' });
  await B.post('/rates', { role_id: r, amount: 150, valid_from: '2031-01-01' });
  await B.post('/rates', { role_id: r, worker_id: w, amount: 90, valid_from: '2030-01-01' });
  const res2030 = (await B.get(`/rates/resolve?role_id=${r}&date=2030-05-01`)).data;
  assert.equal(res2030.amount, 120);
  assert.equal((await B.get(`/rates/resolve?role_id=${r}&date=2031-05-01`)).data.amount, 150);
  assert.equal((await B.get(`/rates/resolve?role_id=${r}&worker_id=${w}&date=2030-05-01`)).data.amount, 90, 'la tarifa propia tiene prioridad');
  assert.equal((await B.get(`/rates/resolve?role_id=${r}&date=2029-05-01`)).data, null, 'sin tarifa vigente no se inventa ninguna');
  const rate = (await B.get('/rates')).data.find((x) => x.amount === 120);
  await B.put(`/rates/${rate.id}`, { amount: 125 });
  const hist = (await B.get('/rates/history')).data.find((h) => h.rate_id === rate.id && h.action === 'modificada');
  assert.equal(hist.old_amount, 120);
  assert.equal(hist.new_amount, 125);
  // Las tarifas de referencia del caso no aparecen para B.
  assert.ok((await B.get('/rates')).data.every((x) => !x.is_reference));
});

test('7. Cálculo correcto de costos en el escenario del caso (24 trabajadores, $2.900.000)', async () => {
  const ev = (await A.get('/events')).data[0];
  const val = (await A.get(`/events/${ev.id}/validate`)).data;
  assert.equal(val.total_minimum, 24);
  assert.equal(val.total_demand, 24);
  assert.equal(val.reference_cost, 2900000);
  assert.equal(val.shifts.length, 17);
  const overnight = val.shifts.filter((s) => s.overnight);
  assert.equal(overnight.length, 6, 'turnos que terminan a las 12:00 a. m. o 1:00 a. m.');
  assert.ok(val.shifts.every((s) => s.hours === 8));
  // Matriz de referencia del caso.
  const reqs = (await A.get('/requirements')).data;
  const cats = (await A.get('/categories')).data;
  const totals = cats.map((c) => reqs.filter((x) => x.category_id === c.id).reduce((a, x) => a + x.min_count, 0));
  assert.deepEqual(totals, [16, 24, 38]);
});

test('8. Verificación de requerimientos mínimos', async () => {
  const r = await role(B, 'Coordinación B');
  const cat = (await B.post('/categories', { name: 'Mediana B' })).data.id;
  await B.put('/requirements', { cells: [{ category_id: cat, role_id: r, min_count: 3 }] });
  const ev = (await B.post('/events', { name: 'Evento mínimo', date: DATE, start_time: '15:00', end_time: '23:00', category_id: cat })).data.id;
  const e = (await B.get(`/events/${ev}`)).data;
  assert.equal(e.roles.find((x) => x.role_id === r).min_count, 3, 'el evento copia la matriz de su categoría');
  await B.post(`/events/${ev}/shifts`, { role_id: r, quantity: 1, start_time: '15:00', end_time: '23:00' });
  const val = (await B.get(`/events/${ev}/validate`)).data;
  assert.equal(val.roles.find((x) => x.role_id === r).status, 'deficit');
  assert.ok(val.warnings.some((w) => w.includes('mínimo es 3')));
});

test('9. Detección de cruces de horario (mismo evento y entre eventos)', async () => {
  const r = await role(B, 'Logística B');
  await B.post('/rates', { role_id: r, amount: 50, valid_from: '2030-01-01' });
  const w = await worker(B, 'Pedro Díaz', r);
  await avail(B, [w], DATE, '06:00', '06:00');
  const ev1 = (await B.post('/events', { name: 'Cruce 1', date: DATE, start_time: '10:00', end_time: '22:00' })).data.id;
  const s1 = (await B.post(`/events/${ev1}/shifts`, { role_id: r, quantity: 1, start_time: '10:00', end_time: '18:00' })).data.id;
  const s2 = (await B.post(`/events/${ev1}/shifts`, { role_id: r, quantity: 1, start_time: '16:00', end_time: '23:00' })).data.id;
  assert.equal((await B.post(`/events/${ev1}/assignments`, { shift_id: s1, worker_id: w })).status, 201);
  const clash = await B.post(`/events/${ev1}/assignments`, { shift_id: s2, worker_id: w });
  assert.equal(clash.status, 409, 'se evita la asignación simultánea');
  assert.ok(clash.data.details.reasons.some((x) => x.includes('se cruza')));
  // Forzada, queda registrada como conflicto.
  assert.equal((await B.post(`/events/${ev1}/assignments`, { shift_id: s2, worker_id: w, force: true })).status, 201);
  const evals = (await B.get(`/events/${ev1}/evaluate?plan=manual`)).data;
  assert.equal(evals.conflicts.length, 2);
  // Entre eventos: otro evento el mismo día no puede usar al trabajador en ese horario.
  const ev2 = (await B.post('/events', { name: 'Cruce 2', date: DATE, start_time: '12:00', end_time: '20:00' })).data.id;
  const s3 = (await B.post(`/events/${ev2}/shifts`, { role_id: r, quantity: 1, start_time: '12:00', end_time: '20:00' })).data.id;
  const cands = (await B.get(`/events/${ev2}/candidates?shift_id=${s3}`)).data;
  assert.ok(cands.find((c) => c.worker_id === w).reasons.some((x) => x.includes('Cruce 1')));
  const sched = (await B.get(`/schedule?from=${DATE}&to=${DATE}`)).data;
  assert.ok(sched.conflicts.length >= 1);
  // Turno después de medianoche: 17:00–01:00 dura 8 h y se cruza con 23:00–03:00.
  const a = buildInterval(DATE, '17:00', '01:00');
  const b = buildInterval(DATE, '23:00', '03:00');
  assert.equal(durationHours(a.start_at, a.end_at), 8);
  assert.ok(a.end_at > b.start_at && b.end_at > a.start_at);
});

test('10. Identificación de trabajadores no disponibles o sin competencia', async () => {
  const r = await role(B, 'Aseo B');
  const other = await role(B, 'Montaje B');
  await B.post('/rates', { role_id: r, amount: 30, valid_from: '2030-01-01' });
  const noAvail = await worker(B, 'Sin Disponibilidad', r);
  const partial = await worker(B, 'Disponibilidad Parcial', r);
  const noSkill = await worker(B, 'Sin Competencia', other);
  const inactive = await worker(B, 'Inactiva', r, { status: 'inactivo' });
  await avail(B, [partial], DATE, '18:00', '21:00');
  await avail(B, [noSkill, inactive], DATE, '08:00', '23:00');
  const ev = (await B.post('/events', { name: 'Disponibilidad', date: DATE, start_time: '17:00', end_time: '23:00' })).data.id;
  const s = (await B.post(`/events/${ev}/shifts`, { role_id: r, quantity: 1, start_time: '17:00', end_time: '23:00' })).data.id;
  const c = (await B.get(`/events/${ev}/candidates?shift_id=${s}`)).data;
  const why = (id) => c.find((x) => x.worker_id === id).reasons.join(' ');
  assert.match(why(noAvail), /Sin disponibilidad/);
  assert.match(why(partial), /Sin disponibilidad/, 'la disponibilidad debe cubrir el turno completo');
  assert.match(why(noSkill), /Sin competencia/);
  assert.match(why(inactive), /inactivo/);
  assert.ok(windowsCover([{ start_at: `${DATE}T08:00`, end_at: `${DATE}T12:00` }, { start_at: `${DATE}T12:00`, end_at: `${DATE}T23:00` }], { start_at: `${DATE}T10:00`, end_at: `${DATE}T20:00` }), 'ventanas contiguas se unen');
});

test('11. Optimización: elige el costo mínimo (verificado por enumeración) y explica la no factibilidad', async () => {
  const C = srv.client();
  await register(C, { email: 'c@planner.test', company: 'Planner C' });
  const mesero = await role(C, 'Mesero');
  const bar = await role(C, 'Bartender');
  await C.post('/rates', { role_id: mesero, amount: 100, valid_from: '2030-01-01' });
  await C.post('/rates', { role_id: bar, amount: 130, valid_from: '2030-01-01' });
  // Tarifas individuales distintas y un trabajador con dos funciones.
  const w = {
    m1: await worker(C, 'M1', mesero, { rate_amount: 120, rate_valid_from: '2030-01-01' }),
    m2: await worker(C, 'M2', mesero),
    m3: await worker(C, 'M3', mesero, { rate_amount: 80, rate_valid_from: '2030-01-01' }),
    b1: await worker(C, 'B1', bar, { rate_amount: 140, rate_valid_from: '2030-01-01' }),
    x1: await worker(C, 'X1', mesero, { role_ids: [bar] }),
  };
  await C.post('/rates', { worker_id: w.x1, amount: 90, valid_from: '2030-01-01' });
  await avail(C, Object.values(w));
  const ev = (await C.post('/events', { name: 'Optimizable', date: DATE, start_time: '16:00', end_time: '00:00' })).data.id;
  await C.put(`/events/${ev}/roles`, { roles: [{ role_id: mesero, min_count: 2 }, { role_id: bar, min_count: 1 }] });
  await C.post(`/events/${ev}/shifts`, { role_id: mesero, quantity: 2, start_time: '16:00', end_time: '00:00' });
  await C.post(`/events/${ev}/shifts`, { role_id: bar, quantity: 1, start_time: '17:00', end_time: '01:00' });
  const r = (await C.post(`/events/${ev}/optimize`)).data;
  assert.equal(r.status, 'optimo');
  assert.equal(r.optimal, true);
  assert.equal(r.solver_status, 'Optimal');
  // Enumeración exhaustiva: 2 meseros de {m1:120, m2:100, m3:80, x1:90} y 1 bartender de {b1:140, x1:90}, sin repetir a X1.
  const meseros = { [w.m1]: 120, [w.m2]: 100, [w.m3]: 80, [w.x1]: 90 };
  const bartenders = { [w.b1]: 140, [w.x1]: 90 };
  let best = Infinity;
  const ids = Object.keys(meseros);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (const b of Object.keys(bartenders)) {
    if (b === ids[i] || b === ids[j]) continue;
    best = Math.min(best, meseros[ids[i]] + meseros[ids[j]] + bartenders[b]);
  }
  assert.equal(r.comparison.optimized_cost, best);
  assert.equal(best, 80 + 100 + 90, 'M3 + M2 como meseros y X1 como bartender');
  assert.ok(r.constraints.every((c) => c.ok !== false), 'todas las restricciones se cumplen');
  assert.equal(r.optimized.coverage_pct, 100);
  // Los no asignados traen su motivo.
  assert.ok(r.unassigned.find((u) => u.worker_id === w.b1).reasons[0].includes('menor costo'));
  // Aplicar el plan lo vuelve oficial.
  assert.equal((await C.post(`/runs/${r.run_id}/apply`)).status, 200);
  assert.equal((await C.get(`/events/${ev}`)).data.official_plan, 'optimizado');

  // Caso no factible: 3 bartenders requeridos y solo 2 trabajadores pueden serlo.
  const ev2 = (await C.post('/events', { name: 'Imposible', date: '2030-07-01', start_time: '16:00', end_time: '23:00' })).data.id;
  await C.post(`/events/${ev2}/shifts`, { role_id: bar, quantity: 3, start_time: '16:00', end_time: '23:00' });
  const bad = (await C.post(`/events/${ev2}/optimize`)).data;
  assert.equal(bad.status, 'no_factible');
  assert.equal(bad.optimal, false);
  assert.ok(bad.reasons.some((x) => x.type === 'candidatos_insuficientes'));
  assert.ok(bad.reasons.some((x) => x.message.includes('Bartender')));
  assert.equal((await C.post(`/runs/${(await C.get(`/events/${ev2}`)).data.runs[0].id}/apply`)).status, 422);

  // Datos insuficientes: evento sin turnos.
  const ev3 = (await C.post('/events', { name: 'Vacío', date: DATE, start_time: '10:00', end_time: '12:00' })).data.id;
  assert.equal((await C.post(`/events/${ev3}/optimize`)).data.status, 'datos_insuficientes');
});

test('12. Comparación entre la asignación convencional y la optimizada', async () => {
  const C = srv.client();
  await register(C, { email: 'd@planner.test', company: 'Planner D' });
  const r = await role(C, 'Mesero');
  await C.post('/rates', { role_id: r, amount: 100, valid_from: '2030-01-01' });
  const caro = await worker(C, 'Caro', r, { rate_amount: 150, rate_valid_from: '2030-01-01' });
  const barato = await worker(C, 'Barato', r, { rate_amount: 70, rate_valid_from: '2030-01-01' });
  await avail(C, [caro, barato]);
  const ev = (await C.post('/events', { name: 'Comparación', date: DATE, start_time: '16:00', end_time: '22:00' })).data.id;
  await C.put(`/events/${ev}/roles`, { roles: [{ role_id: r, min_count: 1 }] });
  const s = (await C.post(`/events/${ev}/shifts`, { role_id: r, quantity: 1, start_time: '16:00', end_time: '22:00' })).data.id;
  // Programación manual: la empresa asignó al trabajador caro.
  await C.post(`/events/${ev}/assignments`, { shift_id: s, worker_id: caro });
  const res = (await C.post(`/events/${ev}/optimize`)).data;
  assert.equal(res.conventional.method, 'Programación manual registrada por la empresa');
  assert.equal(res.comparison.conventional_cost, 150);
  assert.equal(res.comparison.optimized_cost, 70);
  assert.equal(res.comparison.difference, 80);
  assert.equal(res.comparison.savings_pct, 53.33);
  await C.post(`/runs/${res.run_id}/apply`);
  const ind = (await C.get(`/indicators/event/${ev}`)).data;
  assert.equal(ind.vp, 53.33);
  assert.equal(ind.ct, 70);
  assert.equal(ind.dp, 0);
  assert.equal(ind.pc, 100);
  const dash = (await C.get('/dashboard')).data;
  assert.equal(dash.savings, 80);
  // Sin programación manual, la comparación usa la regla convencional y lo indica.
  const C2 = (await A.post(`/events/${(await A.get('/events')).data[0].id}/optimize`)).data;
  assert.match(C2.conventional.method, /Regla convencional simulada/);
  assert.equal(C2.comparison.optimized_cost, 2900000);
});

test('13. Reportes e indicadores descargables (Excel y PDF) e histórico del caso', async () => {
  const ev = (await A.get('/events')).data[0];
  for (const [url, type] of [
    [`/reports/event/${ev.id}.xlsx`, 'spreadsheetml'], [`/reports/event/${ev.id}.pdf`, 'pdf'],
    ['/reports/indicators.xlsx', 'spreadsheetml'], ['/reports/indicators.pdf', 'pdf'], ['/reports/workers.xlsx', 'spreadsheetml'],
  ]) {
    const res = await A.raw(url);
    assert.equal(res.status, 200, url);
    assert.ok(res.headers.get('content-type').includes(type), url);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.ok(buf.length > 1000, url);
    if (type === 'pdf') assert.equal(buf.subarray(0, 4).toString(), '%PDF');
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await (await A.raw(`/reports/event/${ev.id}.xlsx`)).arrayBuffer()));
  assert.ok(wb.getWorksheet('Turnos').rowCount === 18);
  const hist = (await A.get('/history')).data.summaries[0].data;
  assert.equal(hist.total_bodas, 116);
  assert.equal(hist.bodas_pequenas + hist.bodas_medianas + hist.bodas_grandes, 116);
  assert.equal(hist.asignaciones_programadas - hist.asignaciones_minimas, hist.asignaciones_adicionales);
  assert.equal(hist.costo_convencional - hist.costo_referencia, hist.diferencia_acumulada);
  // Importación de histórico desde Excel en otra empresa.
  const book = new ExcelJS.Workbook();
  const ws = book.addWorksheet('Histórico');
  ws.addRow(['Fecha', 'Evento', 'Categoría', 'Invitados', 'Asignado', 'Mínimo', 'Convencional', 'Referencia']);
  ws.addRow(['2025-03-01', 'Boda 1', 'Pequeña', 50, 17, 16, 1500000, 1400000]);
  ws.addRow(['2025-04-01', 'Boda 2', 'Mediana', 100, 25, 24, 2600000, 2500000]);
  const imp = await B.upload('/history/import', new Uint8Array(await book.xlsx.writeBuffer()));
  assert.equal(imp.data.created, 2);
  const hB = (await B.get('/history')).data;
  assert.equal(hB.records.length, 2);
  assert.equal(hB.summaries.length, 0, 'B no ve el histórico del caso de A');
});

test('Duración de referencia: alerta sin inventar costo de horas extra', async () => {
  const C = srv.client();
  await register(C, { email: 'e@planner.test', company: 'Planner E' });
  const r = await role(C, 'Técnico');
  await C.post('/rates', { role_id: r, amount: 100, valid_from: '2030-01-01' });
  const w = await worker(C, 'T1', r);
  await avail(C, [w]);
  const ev = (await C.post('/events', { name: 'Largo', date: DATE, start_time: '12:00', end_time: '23:00' })).data.id;
  await C.post(`/events/${ev}/shifts`, { role_id: r, quantity: 1, start_time: '12:00', end_time: '23:00' });
  const res = (await C.post(`/events/${ev}/optimize`)).data;
  assert.equal(res.comparison.optimized_cost, 100, 'sin tarifa de hora extra no se suma costo');
  assert.ok(res.warnings.some((x) => x.includes('supera la referencia')));
  assert.equal(res.optimized.extra_hours, 3);
  // Con tarifa de hora extra configurada sí se suma.
  const rate = (await C.get('/rates')).data[0];
  await C.put(`/rates/${rate.id}`, { overtime_hourly: 20 });
  assert.equal((await C.post(`/events/${ev}/optimize`)).data.comparison.optimized_cost, 160);
  // Límite estricto de horas: el turno de 11 h ya no se puede asignar.
  await C.put('/company', { enforce_max_hours: true, max_hours_per_worker_event: 10 });
  const strict = (await C.post(`/events/${ev}/optimize`)).data;
  assert.equal(strict.status, 'no_factible');
  assert.ok(strict.reasons.some((x) => x.type === 'horas_maximas'));
});

test('Roles y permisos: el usuario de consulta solo lee', async () => {
  const pw = 'Consulta2026';
  assert.equal((await A.post('/users', { name: 'Lectora', email: 'lee@planner.test', role: 'consulta', password: pw })).status, 201);
  const L = srv.client();
  assert.equal((await L.post('/auth/login', { email: 'lee@planner.test', password: pw })).status, 200);
  assert.equal((await L.get('/events')).status, 200);
  assert.equal((await L.post('/events', { name: 'x', date: DATE, start_time: '10:00', end_time: '11:00' })).status, 403);
  assert.equal((await L.post('/rates', { role_id: 1, amount: 1, valid_from: DATE })).status, 403);
  assert.equal((await L.get('/users')).status, 403);
  // Recuperación de contraseña de un solo uso.
  const f = await srv.client().post('/auth/forgot', { email: 'lee@planner.test' });
  const token = f.data.dev_reset_token;
  assert.ok(token);
  assert.equal((await srv.client().post('/auth/reset', { token, password: 'Nueva2026x' })).status, 200);
  assert.equal((await srv.client().post('/auth/reset', { token, password: 'Otra2026x' })).status, 400);
  assert.equal((await srv.client().post('/auth/login', { email: 'lee@planner.test', password: 'Nueva2026x' })).status, 200);
});

test('Datos de demostración: se pueden eliminar sin tocar los datos propios', async () => {
  const r = (await A.post('/demo/clear')).data;
  assert.ok(r.events >= 1 && r.workers === 24);
  assert.equal((await A.get('/workers')).data.length, 0);
  assert.equal((await A.get('/roles')).data.length, 9, 'las funciones se conservan para editarlas');
  assert.equal((await A.get('/history')).data.summaries.length, 0);
});

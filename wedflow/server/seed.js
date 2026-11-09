// Datos de demostración del caso de estudio Karol Planner (Santa Marta, Colombia).
// Son una referencia editable: cada empresa puede modificarlos, eliminarlos o reemplazarlos.
import { buildInterval, addDays, hmToMinutes } from '../public/js/lib/time.js';
import { HttpError } from './util.js';

export const CASE_NOTE = 'Dato del caso de estudio Karol Planner (referencia editable).';

export const CASE_ROLES = [
  { name: 'Coordinador general', color: '#B08D57' },
  { name: 'Auxiliar logístico', color: '#8C7B6B' },
  { name: 'Chef', color: '#A0522D' },
  { name: 'Auxiliar de cocina', color: '#C49A6C' },
  { name: 'Mesero', color: '#5E6B5A' },
  { name: 'Bartender', color: '#7A4E6E' },
  { name: 'Personal de aseo', color: '#6B8A99' },
  { name: 'Personal de montaje', color: '#9A8C4E' },
  { name: 'Técnico audiovisual', color: '#3F4A5C' },
];

export const CASE_CATEGORIES = [
  { name: 'Pequeña', reference_guests: 50 },
  { name: 'Mediana', reference_guests: 100 },
  { name: 'Grande', reference_guests: 180 },
];

// Matriz de requerimientos mínimos: [pequeña, mediana, grande]
export const CASE_MATRIX = {
  'Coordinador general': [1, 1, 2],
  'Auxiliar logístico': [2, 3, 4],
  Chef: [1, 1, 2],
  'Auxiliar de cocina': [4, 6, 8],
  Mesero: [3, 5, 9],
  Bartender: [1, 2, 3],
  'Personal de aseo': [1, 2, 3],
  'Personal de montaje': [2, 3, 5],
  'Técnico audiovisual': [1, 1, 2],
};

// Tarifas históricas por función y turno (COP), 2021–2026.
export const CASE_RATES = {
  'Coordinador general': [180000, 200000, 210000, 225000, 240000, 250000],
  'Auxiliar logístico': [95000, 105000, 110000, 115000, 125000, 130000],
  Chef: [130000, 140000, 155000, 160000, 170000, 180000],
  'Auxiliar de cocina': [80000, 85000, 95000, 100000, 105000, 110000],
  Mesero: [75000, 80000, 85000, 90000, 95000, 100000],
  Bartender: [95000, 105000, 110000, 115000, 125000, 130000],
  'Personal de aseo': [65000, 70000, 75000, 80000, 85000, 90000],
  'Personal de montaje': [75000, 80000, 85000, 90000, 95000, 100000],
  'Técnico audiovisual': [130000, 140000, 155000, 160000, 170000, 180000],
};
export const RATE_YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

// Distribución de turnos de referencia: boda mediana de 100 invitados.
export const CASE_SHIFTS = [
  ['Coordinador general', 1, '15:00', '23:00'],
  ['Auxiliar logístico', 1, '11:00', '19:00'],
  ['Auxiliar logístico', 1, '15:00', '23:00'],
  ['Auxiliar logístico', 1, '17:00', '01:00'],
  ['Chef', 1, '13:00', '21:00'],
  ['Auxiliar de cocina', 2, '11:00', '19:00'],
  ['Auxiliar de cocina', 2, '14:00', '22:00'],
  ['Auxiliar de cocina', 2, '16:00', '00:00'],
  ['Mesero', 2, '15:00', '23:00'],
  ['Mesero', 3, '17:00', '01:00'],
  ['Bartender', 1, '15:00', '23:00'],
  ['Bartender', 1, '16:00', '00:00'],
  ['Personal de aseo', 1, '15:00', '23:00'],
  ['Personal de aseo', 1, '17:00', '01:00'],
  ['Personal de montaje', 2, '10:00', '18:00'],
  ['Personal de montaje', 1, '17:00', '01:00'],
  ['Técnico audiovisual', 1, '15:00', '23:00'],
];

export const CASE_ACTIVITIES = [
  ['Ceremonia', '16:00', '17:00'],
  ['Cóctel de bienvenida', '17:00', '19:00'],
  ['Cena tipo buffet', '19:00', '21:00'],
  ['Celebración', '21:00', '23:00'],
];

export const CASE_HISTORY = {
  title: 'Histórico del caso de estudio Karol Planner',
  source: 'caso_estudio',
  period: '2021–2026',
  data: {
    total_bodas: 116,
    bodas_pequenas: 26,
    bodas_medianas: 57,
    bodas_grandes: 33,
    asignaciones_programadas: 3214,
    asignaciones_minimas: 3038,
    asignaciones_adicionales: 176,
    costo_referencia: 334970000,
    costo_convencional: 352180000,
    diferencia_acumulada: 17210000,
    moneda: 'COP',
    nota: 'Información histórica agregada del caso de estudio. No incluye registros individuales de bodas ni de trabajadores.',
  },
};

export function nextSaturday(from = new Date()) {
  const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  const add = (6 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

export function createCompany(db, data) {
  const info = db.run(
    `INSERT INTO companies (name, logo_data, country, city, email, phone, address, website, currency, locale, shift_reference_hours, is_demo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    data.name, data.logo_data ?? null, data.country ?? null, data.city ?? null, data.email ?? null, data.phone ?? null,
    data.address ?? null, data.website ?? null, data.currency || 'COP', data.locale || 'es-CO', data.shift_reference_hours ?? 8, data.is_demo ? 1 : 0,
  );
  return Number(info.lastInsertRowid);
}

const idByName = (db, table, cid, name) => db.get(`SELECT id FROM ${table} WHERE company_id = ? AND name = ?`, cid, name)?.id;

function ensure(db, table, cid, name, extra = {}) {
  const existing = idByName(db, table, cid, name);
  if (existing) return existing;
  const cols = ['company_id', 'name', ...Object.keys(extra)];
  const info = db.run(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cid, name, ...Object.values(extra));
  return Number(info.lastInsertRowid);
}

/** Carga la configuración de demostración (catálogos, matriz, tarifas e histórico). */
export function seedCaseConfig(db, cid) {
  return db.tx(() => {
    ensure(db, 'event_types', cid, 'Boda', { description: 'Ceremonia y recepción' });
    const cats = CASE_CATEGORIES.map((c, i) => ensure(db, 'event_categories', cid, c.name, { reference_guests: c.reference_guests, sort_order: i }));
    const roles = {};
    CASE_ROLES.forEach((r, i) => (roles[r.name] = ensure(db, 'roles', cid, r.name, { color: r.color, sort_order: i })));
    for (const [role, counts] of Object.entries(CASE_MATRIX)) {
      counts.forEach((n, i) => db.run('INSERT OR REPLACE INTO requirements (company_id, category_id, role_id, min_count) VALUES (?,?,?,?)', cid, cats[i], roles[role], n));
    }
    for (const [role, amounts] of Object.entries(CASE_RATES)) {
      amounts.forEach((amount, i) => {
        const y = RATE_YEARS[i];
        const exists = db.get('SELECT id FROM rates WHERE company_id = ? AND role_id = ? AND worker_id IS NULL AND valid_from = ? AND is_reference = 1', cid, roles[role], `${y}-01-01`);
        if (exists) return;
        // La tarifa 2026 queda sin fecha de cierre para que siga vigente hasta que la empresa registre una nueva.
        const info = db.run(
          `INSERT INTO rates (company_id, role_id, amount, unit, valid_from, valid_to, is_reference, notes) VALUES (?,?,?,?,?,?,1,?)`,
          cid, roles[role], amount, 'turno', `${y}-01-01`, y === 2026 ? null : `${y}-12-31`,
          y === 2026 ? `${CASE_NOTE} Tarifa ${y}, sin fecha de cierre hasta que se registre una nueva.` : `${CASE_NOTE} Tarifa histórica ${y}.`,
        );
        db.run('INSERT INTO rate_history (company_id, rate_id, role_id, action, new_amount, valid_from, valid_to, note) VALUES (?,?,?,?,?,?,?,?)',
          cid, Number(info.lastInsertRowid), roles[role], 'creada', amount, `${y}-01-01`, y === 2026 ? null : `${y}-12-31`, 'Carga inicial del caso de estudio');
      });
    }
    if (!db.get("SELECT id FROM historical_summaries WHERE company_id = ? AND source = 'caso_estudio'", cid)) {
      db.run('INSERT INTO historical_summaries (company_id, title, source, period, data_json) VALUES (?,?,?,?,?)', cid, CASE_HISTORY.title, CASE_HISTORY.source, CASE_HISTORY.period, JSON.stringify(CASE_HISTORY.data));
    }
    db.run('UPDATE companies SET shift_reference_hours = COALESCE(shift_reference_hours, 8) WHERE id = ?', cid);
    return { roles, cats };
  });
}

/** Reemplaza los turnos de un evento por la distribución de referencia del caso. */
export function loadCaseShifts(db, cid, eventId) {
  const event = db.get('SELECT * FROM events WHERE id = ? AND company_id = ?', eventId, cid);
  if (!event) throw new HttpError(404, 'El evento no existe en tu empresa.');
  const missing = CASE_ROLES.map((r) => r.name).filter((n) => !idByName(db, 'roles', cid, n));
  if (missing.length) throw new HttpError(422, `Para cargar el escenario faltan estas funciones en tu empresa: ${missing.join(', ')}.`);
  return db.tx(() => {
    db.run('DELETE FROM shifts WHERE event_id = ? AND company_id = ?', eventId, cid);
    for (const [role, qty, start, end] of CASE_SHIFTS) {
      const iv = buildInterval(event.date, start, end, hmToMinutes(start) < 6 * 60 ? 1 : 0);
      db.run('INSERT INTO shifts (company_id, event_id, role_id, quantity, start_at, end_at, label) VALUES (?,?,?,?,?,?,?)', cid, eventId, idByName(db, 'roles', cid, role), qty, iv.start_at, iv.end_at, 'Escenario de referencia');
    }
    db.run('DELETE FROM event_activities WHERE event_id = ? AND company_id = ?', eventId, cid);
    for (const [name, start, end] of CASE_ACTIVITIES) {
      const iv = buildInterval(event.date, start, end);
      db.run('INSERT INTO event_activities (company_id, event_id, name, start_at, end_at) VALUES (?,?,?,?,?)', cid, eventId, name, iv.start_at, iv.end_at);
    }
    const mediana = idByName(db, 'event_categories', cid, 'Mediana');
    db.run('DELETE FROM event_roles WHERE event_id = ? AND company_id = ?', eventId, cid);
    for (const [role, counts] of Object.entries(CASE_MATRIX)) {
      db.run('INSERT INTO event_roles (event_id, role_id, company_id, min_count) VALUES (?,?,?,?)', eventId, idByName(db, 'roles', cid, role), cid, counts[1]);
    }
    db.run('UPDATE events SET reference_cost = 2900000, category_id = COALESCE(category_id, ?) WHERE id = ?', mediana ?? null, eventId);
    return CASE_SHIFTS.length;
  });
}

/**
 * Escenario completo de prueba: evento de boda mediana y 24 trabajadores de prueba.
 * Los trabajadores se identifican de forma genérica («Trabajador de prueba 01») y no
 * representan personas reales; su tarifa es la tarifa vigente de su función.
 * La fecha es una fecha de prueba asignada por el sistema (el caso no fija una fecha).
 */
export function seedCaseScenario(db, cid, { date = nextSaturday() } = {}) {
  const { roles, cats } = seedCaseConfig(db, cid);
  return db.tx(() => {
    const typeId = idByName(db, 'event_types', cid, 'Boda');
    const iv = buildInterval(date, '16:00', '23:00');
    const info = db.run(
      `INSERT INTO events (company_id, name, date, location, event_type_id, category_id, guests, start_time, end_time, start_at, end_at, notes, status, is_demo, reference_cost)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
      cid, 'Escenario de prueba · Boda mediana (100 invitados)', date, 'Hotel en Santa Marta', typeId, cats[1], 100, '16:00', '23:00', iv.start_at, iv.end_at,
      'Escenario de referencia del caso de estudio Karol Planner: ceremonia y recepción en espacios distintos del mismo hotel. La fecha es de prueba, asignada por el sistema.',
      'planificado', 2900000,
    );
    const eventId = Number(info.lastInsertRowid);
    loadCaseShifts(db, cid, eventId);
    let n = 0;
    for (const [role, counts] of Object.entries(CASE_MATRIX)) {
      for (let k = 0; k < counts[1]; k++) {
        n++;
        const w = db.run(
          `INSERT INTO workers (company_id, full_name, document, primary_role_id, status, notes, is_demo) VALUES (?,?,?,?,?,?,1)`,
          cid, `Trabajador de prueba ${String(n).padStart(2, '0')}`, `PRUEBA-${String(n).padStart(3, '0')}`, roles[role], 'disponible',
          'Registro genérico de prueba del escenario de referencia. Reemplázalo por tu personal real.',
        );
        const wid = Number(w.lastInsertRowid);
        db.run('INSERT INTO worker_roles (worker_id, role_id, company_id, authorized) VALUES (?,?,?,1)', wid, roles[role], cid);
        db.run('INSERT INTO availability (company_id, worker_id, start_at, end_at, notes) VALUES (?,?,?,?,?)', cid, wid, `${date}T09:00`, `${addDays(date, 1)}T03:00`, 'Disponibilidad de prueba para el escenario de referencia');
      }
    }
    return { eventId, workers: n };
  });
}

/** Borra todos los registros marcados como demostración (no toca los datos propios). */
export function clearDemo(db, cid) {
  return db.tx(() => {
    const ev = db.run('DELETE FROM events WHERE company_id = ? AND is_demo = 1', cid).changes;
    const wk = db.run('DELETE FROM workers WHERE company_id = ? AND is_demo = 1', cid).changes;
    const rt = db.run('DELETE FROM rates WHERE company_id = ? AND is_reference = 1', cid).changes;
    const hs = db.run("DELETE FROM historical_summaries WHERE company_id = ? AND source = 'caso_estudio'", cid).changes;
    return { events: ev, workers: wk, rates: rt, summaries: hs };
  });
}

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Esquema multiempresa: toda tabla de negocio lleva company_id y todas las
// consultas de la API filtran por la empresa de la sesión.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  logo_data TEXT,
  country TEXT, city TEXT, email TEXT, phone TEXT, address TEXT, website TEXT,
  currency TEXT NOT NULL DEFAULT 'COP',
  locale TEXT NOT NULL DEFAULT 'es-CO',
  shift_reference_hours REAL NOT NULL DEFAULT 8,
  max_shifts_per_worker_event INTEGER NOT NULL DEFAULT 1,
  enforce_max_hours INTEGER NOT NULL DEFAULT 0,
  max_hours_per_worker_event REAL,
  allow_multi_role INTEGER NOT NULL DEFAULT 1,
  onboarding_done INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','planificador','consulta')),
  active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS event_types (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE (company_id, name)
);
CREATE TABLE IF NOT EXISTS event_categories (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_guests INTEGER, max_guests INTEGER, reference_guests INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (company_id, name)
);
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (company_id, name)
);
CREATE TABLE IF NOT EXISTS requirements (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  min_count INTEGER NOT NULL CHECK (min_count >= 0),
  PRIMARY KEY (category_id, role_id)
);
CREATE TABLE IF NOT EXISTS competences (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (company_id, name)
);
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  document TEXT,
  phone TEXT, email TEXT,
  primary_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  experience_years REAL,
  experience_notes TEXT,
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible','ocupado','inactivo')),
  notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_workers_doc ON workers(company_id, document) WHERE document IS NOT NULL AND document <> '';
CREATE TABLE IF NOT EXISTS worker_roles (
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  authorized INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (worker_id, role_id)
);
CREATE TABLE IF NOT EXISTS worker_competences (
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  competence_id INTEGER NOT NULL REFERENCES competences(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_id, competence_id)
);
CREATE TABLE IF NOT EXISTS rates (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK (amount >= 0),
  unit TEXT NOT NULL DEFAULT 'turno' CHECK (unit IN ('turno','hora')),
  event_type_id INTEGER REFERENCES event_types(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES event_categories(id) ON DELETE CASCADE,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  overtime_hourly REAL,
  is_reference INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (role_id IS NOT NULL OR worker_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS rate_history (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rate_id INTEGER,
  role_id INTEGER, worker_id INTEGER,
  action TEXT NOT NULL,
  old_amount REAL, new_amount REAL,
  valid_from TEXT, valid_to TEXT,
  user_id INTEGER,
  note TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS ix_avail_worker ON availability(worker_id, start_at);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  event_type_id INTEGER REFERENCES event_types(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES event_categories(id) ON DELETE SET NULL,
  guests INTEGER,
  start_time TEXT, end_time TEXT,
  start_at TEXT, end_at TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planificado' CHECK (status IN ('planificado','confirmado','realizado','cancelado')),
  official_plan TEXT NOT NULL DEFAULT 'manual' CHECK (official_plan IN ('manual','optimizado')),
  reference_cost REAL,
  manual_planning_minutes REAL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS event_activities (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event_roles (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  min_count INTEGER NOT NULL CHECK (min_count >= 0),
  PRIMARY KEY (event_id, role_id)
);
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  label TEXT
);
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('manual','optimizado')),
  cost REAL,
  run_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (shift_id, worker_id, plan)
);
CREATE INDEX IF NOT EXISTS ix_assign_worker ON assignments(worker_id);
CREATE TABLE IF NOT EXISTS optimization_runs (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  optimal INTEGER NOT NULL DEFAULT 0,
  optimized_cost REAL,
  conventional_cost REAL,
  conventional_method TEXT,
  coverage REAL,
  duration_ms REAL,
  result_json TEXT NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS historical_summaries (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  period TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS historical_records (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'formulario',
  event_date TEXT,
  event_name TEXT,
  category_name TEXT,
  guests INTEGER,
  assigned_staff INTEGER,
  min_staff INTEGER,
  conventional_cost REAL,
  reference_cost REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_audit_company ON audit_log(company_id, created_at);
`;

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return wrap(db);
}

// Pequeña capa sobre node:sqlite con caché de sentencias y transacciones.
function wrap(db) {
  const cache = new Map();
  const prep = (sql) => {
    let st = cache.get(sql);
    if (!st) {
      st = db.prepare(sql);
      cache.set(sql, st);
    }
    return st;
  };
  const norm = (params) => params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? Number(p) : p));
  let depth = 0;
  return {
    raw: db,
    all: (sql, ...p) => prep(sql).all(...norm(p)),
    get: (sql, ...p) => prep(sql).get(...norm(p)),
    run: (sql, ...p) => prep(sql).run(...norm(p)),
    exec: (sql) => db.exec(sql),
    tx(fn) {
      if (depth > 0) return fn();
      depth++;
      db.exec('BEGIN');
      try {
        const out = fn();
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
    close: () => db.close(),
  };
}

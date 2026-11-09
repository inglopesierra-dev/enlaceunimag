import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { hashPassword } from './auth.js';
import { createCompany, seedCaseScenario } from './seed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = process.env.WEDFLOW_DB || path.join(root, 'data', 'wedflow.db');
const port = Number(process.env.PORT || 3000);
const db = openDatabase(dbFile);

// Cuenta de demostración opcional con el caso Karol Planner (desactivar con WEDFLOW_DEMO=0).
if (process.env.WEDFLOW_DEMO !== '0' && !db.get('SELECT id FROM users WHERE email = ?', 'demo@wedflow.app')) {
  db.tx(() => {
    const cid = createCompany(db, {
      name: 'Karol Planner · Caso de estudio',
      country: 'Colombia', city: 'Santa Marta', currency: 'COP', locale: 'es-CO', is_demo: true,
    });
    db.run('UPDATE companies SET onboarding_done = 1 WHERE id = ?', cid);
    db.run('INSERT INTO users (company_id, name, email, password_hash, role) VALUES (?,?,?,?,?)', cid, 'Usuario de demostración', 'demo@wedflow.app', hashPassword('Wedflow2026'), 'admin');
    seedCaseScenario(db, cid);
  });
  console.log('Cuenta de demostración creada: demo@wedflow.app / Wedflow2026');
}

const app = createApp(db, {
  dev: process.env.NODE_ENV !== 'production',
  secureCookies: process.env.NODE_ENV === 'production',
  showResetToken: process.env.NODE_ENV !== 'production',
  trustProxy: process.env.TRUST_PROXY === '1',
});

app.listen(port, () => console.log(`Wedflow escuchando en http://localhost:${port}`));

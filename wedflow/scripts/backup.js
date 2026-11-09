// Copia de seguridad completa de la base de datos (todas las empresas).
// Uso: npm run backup  → backups/wedflow-AAAA-MM-DDTHH-MM-SS.db
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.env.WEDFLOW_DB || path.join(root, 'data', 'wedflow.db');
if (!fs.existsSync(src)) {
  console.error(`No existe la base de datos: ${src}`);
  process.exit(1);
}
const dir = process.env.WEDFLOW_BACKUP_DIR || path.join(root, 'backups');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, `wedflow-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db`);
const db = new DatabaseSync(src);
db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
db.close();
console.log(`Copia creada: ${out}`);

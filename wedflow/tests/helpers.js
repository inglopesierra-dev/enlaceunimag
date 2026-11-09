import { openDatabase } from '../server/db.js';
import { createApp } from '../server/app.js';

/** Levanta la aplicación con una base en memoria y devuelve clientes HTTP con cookies. */
export async function startServer() {
  const db = openDatabase(':memory:');
  const app = createApp(db, { quiet: true, showResetToken: true });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const client = () => {
    let cookie = '';
    const call = async (method, url, body, raw = false) => {
      const headers = { 'X-Requested-With': 'wedflow' };
      if (cookie) headers.Cookie = cookie;
      let payload;
      if (body instanceof Uint8Array) {
        payload = body;
        headers['Content-Type'] = 'application/octet-stream';
      } else if (body !== undefined) {
        payload = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
      }
      const res = await fetch(base + '/api' + url, { method, headers, body: payload });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      if (raw) return res;
      const type = res.headers.get('content-type') || '';
      const data = type.includes('json') ? await res.json() : null;
      return { status: res.status, data };
    };
    return {
      get: (u) => call('GET', u),
      post: (u, b = {}) => call('POST', u, b),
      put: (u, b = {}) => call('PUT', u, b),
      del: (u) => call('DELETE', u),
      raw: (u) => call('GET', u, undefined, true),
      upload: (u, bytes) => call('POST', u, bytes),
    };
  };
  return { db, base, client, close: () => new Promise((r) => server.close(r)) };
}

export async function register(c, { email, company, demo = 'none', currency = 'COP' }) {
  const r = await c.post('/auth/register', {
    user: { name: 'Planner de prueba', email, password: 'Prueba2026' },
    company: { name: company, currency, city: 'Ciudad', country: 'País' },
    demo,
  });
  if (r.status !== 201) throw new Error(`registro falló: ${JSON.stringify(r.data)}`);
  return r;
}

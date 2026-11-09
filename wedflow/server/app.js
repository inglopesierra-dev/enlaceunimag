import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionMiddleware, csrfGuard } from './auth.js';
import { HttpError } from './util.js';
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/company.js';
import catalogRoutes from './routes/catalog.js';
import workerRoutes from './routes/workers.js';
import rateRoutes from './routes/rates.js';
import eventRoutes from './routes/events.js';
import analyticsRoutes from './routes/analytics.js';
import reportRoutes from './routes/reports.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createApp(db, options = {}) {
  const app = express();
  const ctx = { db, options };
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ?? false);

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':
        "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    next();
  });
  app.use(express.json({ limit: '2mb' }));
  app.use(sessionMiddleware(db));
  app.use('/api', csrfGuard);
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/auth', authRoutes(ctx));
  app.use('/api', companyRoutes(ctx));
  app.use('/api', catalogRoutes(ctx));
  app.use('/api', workerRoutes(ctx));
  app.use('/api', rateRoutes(ctx));
  app.use('/api', eventRoutes(ctx));
  app.use('/api', analyticsRoutes(ctx));
  app.use('/api', reportRoutes(ctx));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada.')));

  // Archivos del cliente y dependencias servidas localmente (sin CDN).
  const nm = path.join(root, 'node_modules');
  app.use('/vendor/chart.js', express.static(path.join(nm, 'chart.js/dist'), { maxAge: '7d' }));
  app.use('/vendor/fonts/cormorant', express.static(path.join(nm, '@fontsource/cormorant-garamond'), { maxAge: '30d' }));
  app.use('/vendor/fonts/manrope', express.static(path.join(nm, '@fontsource/manrope'), { maxAge: '30d' }));
  app.use(express.static(path.join(root, 'public'), { maxAge: options.dev ? 0 : '1h', index: 'index.html' }));
  app.get(/^\/(?!api|vendor).*/, (_req, res) => res.sendFile(path.join(root, 'public/index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.too.large') err = new HttpError(413, 'El archivo o los datos enviados son demasiado grandes.');
    if (err instanceof SyntaxError && 'body' in err) err = new HttpError(400, 'Los datos enviados no son JSON válido.');
    if (err.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(err.message)) err = new HttpError(409, 'Ya existe un registro con esos datos.');
    if (err.code === 'ERR_SQLITE_ERROR' && /FOREIGN KEY/.test(err.message)) err = new HttpError(409, 'El registro está relacionado con otros datos.');
    const status = err.status || 500;
    if (status >= 500 && !options.quiet) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Error interno del servidor.' : err.message, details: err.details });
  });
  return app;
}

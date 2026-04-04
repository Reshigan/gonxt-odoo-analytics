// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — API Worker (Hono)
// Main entry: routes, CORS, auth middleware
// ═══════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../../shared/src/types';
import { salesRoutes } from './routes/sales';
import { stockRoutes } from './routes/stock';
import { exceptionsRoutes } from './routes/exceptions';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { executiveRoutes } from './routes/executive';

type HonoEnv = { Bindings: Env };
const app = new Hono<HonoEnv>();

// ── CORS ──
app.use('/*', cors({
  origin: ['https://analytics.gonxt.tech', 'https://nxt.vantax.co.za', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Global error handler ──
app.onError((err, c) => {
  console.error('[API] Error:', err.message);
  return c.json({ success: false, data: null, error: err.message, meta: {} }, 500);
});

// ── Mount routes ──
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/sales', salesRoutes);
app.route('/api/v1/stock', stockRoutes);
app.route('/api/v1/exceptions', exceptionsRoutes);
app.route('/api/v1/health', healthRoutes);
app.route('/api/v1/executive', executiveRoutes);

// ── Root ──
app.get('/', (c) => c.json({
  name: 'GONXT Odoo 18 Analytics API',
  version: '2.0.0',
  docs: 'https://analytics.gonxt.tech/docs',
}));

export default app;

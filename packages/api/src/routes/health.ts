// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Health Routes
// ═══════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import type { Env } from '../../../shared/src/types';

type HonoEnv = { Bindings: Env };
export const healthRoutes = new Hono<HonoEnv>();

healthRoutes.get('/', async (c) => {
  const checks: Record<string, string> = {};

  try {
    await c.env.DB.prepare('SELECT 1').first();
    checks.d1 = 'ok';
  } catch { checks.d1 = 'error'; }

  try {
    await c.env.CACHE.get('health_check');
    checks.kv = 'ok';
  } catch { checks.kv = 'error'; }

  const allOk = Object.values(checks).every(v => v === 'ok');
  return c.json({ success: allOk, data: checks }, allOk ? 200 : 503);
});

healthRoutes.get('/sync', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT model_name, last_sync_at, last_sync_count, last_error, updated_at FROM sync_metadata ORDER BY model_name'
  ).all();

  const now = Date.now();
  const statuses = (result.results || []).map((r: any) => {
    const lastSync = new Date(r.last_sync_at).getTime();
    const ageSec = Math.floor((now - lastSync) / 1000);
    return { ...r, age_seconds: ageSec, stale: ageSec > 3600 };
  });

  return c.json({ success: true, data: statuses });
});

// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Exceptions Routes
// ═══════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import type { Env } from '../../../shared/src/types';

type HonoEnv = { Bindings: Env };
export const exceptionsRoutes = new Hono<HonoEnv>();

exceptionsRoutes.get('/active', async (c) => {
  const companyId = parseInt(c.req.query('company_id') || '1');
  const severity = c.req.query('severity') || null;
  const type = c.req.query('type') || null;

  let where = `company_id = ? AND is_active = 1`;
  const params: any[] = [companyId];
  if (severity) { where += ` AND severity = ?`; params.push(severity); }
  if (type) { where += ` AND exception_type = ?`; params.push(type); }

  const result = await c.env.DB.prepare(`
    SELECT * FROM fact_exceptions WHERE ${where}
    ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, detected_at DESC
  `).bind(...params).all();

  return c.json({ success: true, data: result.results, meta: { company_id: companyId } });
});

exceptionsRoutes.get('/summary', async (c) => {
  const companyId = parseInt(c.req.query('company_id') || '1');

  const active = await c.env.DB.prepare(`
    SELECT severity, COUNT(*) as count FROM fact_exceptions WHERE company_id = ? AND is_active = 1 GROUP BY severity
  `).bind(companyId).all();

  const byType = await c.env.DB.prepare(`
    SELECT exception_type, exception_name, severity, COUNT(*) as count FROM fact_exceptions WHERE company_id = ? AND is_active = 1 GROUP BY exception_type, exception_name, severity
  `).bind(companyId).all();

  const resolved30d = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM fact_exceptions WHERE company_id = ? AND resolved_at IS NOT NULL AND resolved_at >= date('now', '-30 days')
  `).bind(companyId).first<{count:number}>();

  return c.json({
    success: true,
    data: { by_severity: active.results, by_type: byType.results, resolved_30d: resolved30d?.count || 0 },
    meta: { company_id: companyId },
  });
});

exceptionsRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const result = await c.env.DB.prepare(`SELECT * FROM fact_exceptions WHERE id = ?`).bind(id).first();
  if (!result) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: result });
});

exceptionsRoutes.patch('/:id/resolve', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ resolution_notes?: string; resolved_by?: string }>();

  await c.env.DB.prepare(`
    UPDATE fact_exceptions SET is_active = 0, resolved_at = datetime('now'), resolved_by = ?, resolution_notes = ? WHERE id = ?
  `).bind(body.resolved_by || 'admin', body.resolution_notes || '', id).run();

  return c.json({ success: true, data: { id, resolved: true } });
});

// GET /transactions/completeness
exceptionsRoutes.get('/transactions/completeness', async (c) => {
  const companyId = parseInt(c.req.query('company_id') || '1');

  const result = await c.env.DB.prepare(`
    SELECT
      lifecycle_stage,
      COUNT(DISTINCT order_odoo_id) as count,
      COALESCE(SUM(line_total), 0) as value
    FROM fact_sales_orders
    WHERE company_id = ? AND order_state != 'cancel'
    GROUP BY lifecycle_stage
  `).bind(companyId).all();

  return c.json({ success: true, data: result.results, meta: { company_id: companyId } });
});

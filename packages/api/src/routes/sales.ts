// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Sales Routes
// ═══════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import type { Env } from '../../../shared/src/types';

type HonoEnv = { Bindings: Env };
export const salesRoutes = new Hono<HonoEnv>();

// Helper: parse common query params
function parseFilters(c: any) {
  const company_id = parseInt(c.req.query('company_id') || '1');
  const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());
  const month = c.req.query('month') ? parseInt(c.req.query('month')) : null;
  const day = c.req.query('day') ? parseInt(c.req.query('day')) : null;
  const compare_year = c.req.query('compare_year') ? parseInt(c.req.query('compare_year')) : null;
  const page = parseInt(c.req.query('page') || '1');
  const per_page = Math.min(parseInt(c.req.query('per_page') || '50'), 200);
  const state = c.req.query('state') || null;
  const search = c.req.query('search') || null;
  const partner_id = c.req.query('partner_id') ? parseInt(c.req.query('partner_id')) : null;
  const team_id = c.req.query('team_id') ? parseInt(c.req.query('team_id')) : null;

  // Build date range
  let date_from: string, date_to: string;
  if (day && month) {
    date_from = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    date_to = date_from;
  } else if (month) {
    const lastDay = new Date(year, month, 0).getDate();
    date_from = `${year}-${String(month).padStart(2,'0')}-01`;
    date_to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  } else {
    date_from = `${year}-01-01`;
    date_to = `${year}-12-31`;
  }

  return { company_id, year, month, day, compare_year, date_from, date_to, page, per_page, state, search, partner_id, team_id };
}

// GET /sales/overview
salesRoutes.get('/overview', async (c) => {
  const f = parseFilters(c);
  const db = c.env.DB;
  const cache = c.env.CACHE;

  // Try KV cache first
  const cacheKey = `agg:sales:overview:${f.company_id}`;
  const cached = await cache.get(cacheKey);

  // Query current period
  const current = await db.prepare(`
    SELECT
      COUNT(DISTINCT order_odoo_id) as orders_count,
      COALESCE(SUM(line_total), 0) as revenue,
      COALESCE(SUM(line_cost), 0) as cost,
      COALESCE(SUM(gross_margin), 0) as margin,
      COALESCE(AVG(line_total), 0) as avg_line_value
    FROM fact_sales_orders
    WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel'
  `).bind(f.company_id, f.date_from, f.date_to).first();

  // Query compare period
  let prior: any = null;
  if (f.compare_year) {
    const priorFrom = f.date_from.replace(String(f.year), String(f.compare_year));
    const priorTo = f.date_to.replace(String(f.year), String(f.compare_year));
    prior = await db.prepare(`
      SELECT
        COUNT(DISTINCT order_odoo_id) as orders_count,
        COALESCE(SUM(line_total), 0) as revenue,
        COALESCE(SUM(line_cost), 0) as cost
      FROM fact_sales_orders
      WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel'
    `).bind(f.company_id, priorFrom, priorTo).first();
  }

  const rev = (current as any)?.revenue || 0;
  const prevRev = prior?.revenue || 0;
  const marginPct = rev > 0 ? (((current as any)?.margin || 0) / rev * 100) : 0;

  return c.json({
    success: true,
    data: {
      revenue: rev,
      revenue_prior: prevRev,
      revenue_delta_pct: prevRev > 0 ? ((rev - prevRev) / prevRev * 100) : 0,
      orders_count: (current as any)?.orders_count || 0,
      orders_prior: prior?.orders_count || 0,
      avg_order_value: (current as any)?.avg_line_value || 0,
      gross_margin_pct: marginPct,
      cost: (current as any)?.cost || 0,
    },
    meta: { company_id: f.company_id, date_from: f.date_from, date_to: f.date_to, cached: !!cached },
  });
});

// GET /sales/revenue-trend
salesRoutes.get('/revenue-trend', async (c) => {
  const f = parseFilters(c);
  const granularity = c.req.query('granularity') || 'month'; // day, month
  const db = c.env.DB;

  const groupExpr = granularity === 'day' ? 'date_key' : "substr(date_key, 1, 7)";

  const current = await db.prepare(`
    SELECT ${groupExpr} as period, SUM(line_total) as revenue, SUM(line_cost) as cost, COUNT(DISTINCT order_odoo_id) as orders
    FROM fact_sales_orders
    WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel'
    GROUP BY ${groupExpr} ORDER BY period
  `).bind(f.company_id, f.date_from, f.date_to).all();

  let compare: any = { results: [] };
  if (f.compare_year) {
    const cFrom = f.date_from.replace(String(f.year), String(f.compare_year));
    const cTo = f.date_to.replace(String(f.year), String(f.compare_year));
    compare = await db.prepare(`
      SELECT ${groupExpr} as period, SUM(line_total) as revenue, SUM(line_cost) as cost
      FROM fact_sales_orders
      WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel'
      GROUP BY ${groupExpr} ORDER BY period
    `).bind(f.company_id, cFrom, cTo).all();
  }

  return c.json({
    success: true,
    data: { current: current.results, compare: compare.results, granularity },
    meta: { company_id: f.company_id, date_from: f.date_from, date_to: f.date_to },
  });
});

// GET /sales/pipeline
salesRoutes.get('/pipeline', async (c) => {
  const f = parseFilters(c);
  const db = c.env.DB;

  const result = await db.prepare(`
    SELECT lifecycle_stage as stage, COUNT(DISTINCT order_odoo_id) as count, COALESCE(SUM(line_total), 0) as value
    FROM fact_sales_orders
    WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel'
    GROUP BY lifecycle_stage
  `).bind(f.company_id, f.date_from, f.date_to).all();

  return c.json({ success: true, data: result.results, meta: { company_id: f.company_id } });
});

// GET /sales/by-product
salesRoutes.get('/by-product', async (c) => {
  const f = parseFilters(c);
  const topN = parseInt(c.req.query('top_n') || '20');

  const result = await c.env.DB.prepare(`
    SELECT product_name, product_sku, SUM(line_total) as revenue, SUM(line_cost) as cost, SUM(gross_margin) as margin, SUM(qty_ordered) as qty
    FROM fact_sales_orders
    WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel' AND product_name IS NOT NULL
    GROUP BY product_name, product_sku
    ORDER BY revenue DESC LIMIT ?
  `).bind(f.company_id, f.date_from, f.date_to, topN).all();

  return c.json({ success: true, data: result.results, meta: { company_id: f.company_id } });
});

// GET /sales/by-partner
salesRoutes.get('/by-partner', async (c) => {
  const f = parseFilters(c);

  const result = await c.env.DB.prepare(`
    SELECT partner_name, partner_id, SUM(line_total) as revenue, COUNT(DISTINCT order_odoo_id) as orders, SUM(gross_margin) as margin
    FROM fact_sales_orders
    WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel' AND partner_name IS NOT NULL
    GROUP BY partner_id, partner_name
    ORDER BY revenue DESC LIMIT 20
  `).bind(f.company_id, f.date_from, f.date_to).all();

  return c.json({ success: true, data: result.results, meta: { company_id: f.company_id } });
});

// GET /sales/by-team
salesRoutes.get('/by-team', async (c) => {
  const f = parseFilters(c);

  const result = await c.env.DB.prepare(`
    SELECT team_name, team_id, SUM(line_total) as revenue, COUNT(DISTINCT order_odoo_id) as orders, COUNT(DISTINCT user_id) as reps
    FROM fact_sales_orders
    WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel' AND team_name IS NOT NULL
    GROUP BY team_id, team_name
    ORDER BY revenue DESC
  `).bind(f.company_id, f.date_from, f.date_to).all();

  return c.json({ success: true, data: result.results, meta: { company_id: f.company_id } });
});

// GET /sales/orders — paginated list with full traceability
salesRoutes.get('/orders', async (c) => {
  const f = parseFilters(c);
  const offset = (f.page - 1) * f.per_page;

  let where = `company_id = ? AND date_key >= ? AND date_key <= ?`;
  const params: any[] = [f.company_id, f.date_from, f.date_to];

  if (f.state) { where += ` AND order_state = ?`; params.push(f.state); }
  if (f.search) { where += ` AND (order_name LIKE ? OR partner_name LIKE ?)`; params.push(`%${f.search}%`, `%${f.search}%`); }
  if (f.partner_id) { where += ` AND partner_id = ?`; params.push(f.partner_id); }
  if (f.team_id) { where += ` AND team_id = ?`; params.push(f.team_id); }

  // Get distinct orders with aggregated line data
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT order_odoo_id) as total FROM fact_sales_orders WHERE ${where}`
  ).bind(...params).first<{ total: number }>();

  const result = await c.env.DB.prepare(`
    SELECT
      order_odoo_id, order_name, partner_name, partner_id,
      MIN(date_key) as date_order, order_state,
      SUM(line_total) as amount_total,
      user_name, team_name, company_id,
      MAX(has_delivery) as has_delivery,
      MAX(CASE WHEN delivery_state = 'complete' THEN 'complete' WHEN delivery_state = 'partial' THEN 'partial' ELSE 'none' END) as delivery_state,
      MAX(has_invoice) as has_invoice,
      MAX(CASE WHEN invoice_state = 'complete' THEN 'complete' WHEN invoice_state = 'partial' THEN 'partial' ELSE 'none' END) as invoice_state,
      MAX(is_paid) as is_paid, MAX(payment_state) as payment_state,
      MAX(lifecycle_stage) as lifecycle_stage, MAX(days_open) as days_open
    FROM fact_sales_orders WHERE ${where}
    GROUP BY order_odoo_id
    ORDER BY date_key DESC
    LIMIT ? OFFSET ?
  `).bind(...params, f.per_page, offset).all();

  return c.json({
    success: true,
    data: result.results,
    meta: { page: f.page, per_page: f.per_page, total: countResult?.total || 0, company_id: f.company_id },
  });
});

// GET /sales/orders/:id — single order with all lines + traceability
salesRoutes.get('/orders/:id', async (c) => {
  const orderId = parseInt(c.req.param('id'));

  const lines = await c.env.DB.prepare(`
    SELECT * FROM fact_sales_orders WHERE order_odoo_id = ?
  `).bind(orderId).all();

  if (!lines.results?.length) {
    return c.json({ success: false, data: null, error: 'Order not found', meta: {} }, 404);
  }

  // Get related invoices
  const orderName = (lines.results[0] as any).order_name;
  const invoices = await c.env.DB.prepare(`
    SELECT * FROM fact_invoices WHERE origin = ?
  `).bind(orderName).all();

  return c.json({
    success: true,
    data: { order: lines.results[0], lines: lines.results, invoices: invoices.results },
    meta: {},
  });
});

// GET /sales/completion-rate
salesRoutes.get('/completion-rate', async (c) => {
  const f = parseFilters(c);

  const result = await c.env.DB.prepare(`
    SELECT
      lifecycle_stage,
      COUNT(DISTINCT order_odoo_id) as count
    FROM fact_sales_orders
    WHERE company_id = ? AND date_key >= ? AND date_key <= ? AND order_state != 'cancel'
    GROUP BY lifecycle_stage
  `).bind(f.company_id, f.date_from, f.date_to).all();

  const total = (result.results || []).reduce((s: number, r: any) => s + r.count, 0);
  const paid = (result.results || []).find((r: any) => r.lifecycle_stage === 'paid');
  const completionRate = total > 0 ? ((paid as any)?.count || 0) / total * 100 : 0;

  return c.json({
    success: true,
    data: { stages: result.results, total, completion_rate: completionRate },
    meta: { company_id: f.company_id },
  });
});

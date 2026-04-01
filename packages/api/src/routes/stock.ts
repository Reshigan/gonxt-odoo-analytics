// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Stock Routes
// ═══════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import type { Env } from '../../../shared/src/types';

type HonoEnv = { Bindings: Env };
export const stockRoutes = new Hono<HonoEnv>();

function parseFilters(c: any) {
  return {
    company_id: parseInt(c.req.query('company_id') || '1'),
    year: parseInt(c.req.query('year') || new Date().getFullYear().toString()),
    month: c.req.query('month') ? parseInt(c.req.query('month')) : null,
    day: c.req.query('day') ? parseInt(c.req.query('day')) : null,
    warehouse: c.req.query('warehouse') || null,
    status: c.req.query('status') || null,
    search: c.req.query('search') || null,
    category: c.req.query('category') || null,
    page: parseInt(c.req.query('page') || '1'),
    per_page: Math.min(parseInt(c.req.query('per_page') || '50'), 200),
  };
}

// GET /stock/overview
stockRoutes.get('/overview', async (c) => {
  const f = parseFilters(c);
  const db = c.env.DB;

  // Try cache
  const cached = await c.env.CACHE.get(`agg:stock:overview:${f.company_id}`);
  if (cached) {
    return c.json({ success: true, data: JSON.parse(cached), meta: { cached: true, company_id: f.company_id } });
  }

  const result = await db.prepare(`
    SELECT
      COUNT(*) as total_items,
      COALESCE(SUM(qty_on_hand), 0) as total_on_hand,
      COALESCE(SUM(qty_reserved), 0) as total_reserved,
      COALESCE(SUM(qty_on_hand - qty_reserved), 0) as total_available,
      COALESCE(SUM(valuation_cost), 0) as valuation_cost,
      COALESCE(SUM(valuation_list), 0) as valuation_list,
      SUM(CASE WHEN status = 'stockout' THEN 1 ELSE 0 END) as stockout_count,
      SUM(CASE WHEN status = 'low' THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN status = 'overstock' THEN 1 ELSE 0 END) as overstock_count
    FROM fact_stock_on_hand
    WHERE company_id = ? AND date_key = date('now')
  `).bind(f.company_id).first();

  return c.json({ success: true, data: result, meta: { company_id: f.company_id, cached: false } });
});

// GET /stock/on-hand — full stock position
stockRoutes.get('/on-hand', async (c) => {
  const f = parseFilters(c);
  const offset = (f.page - 1) * f.per_page;
  const db = c.env.DB;

  let where = `company_id = ? AND date_key = date('now')`;
  const params: any[] = [f.company_id];

  if (f.warehouse) { where += ` AND warehouse_name = ?`; params.push(f.warehouse); }
  if (f.status) { where += ` AND status = ?`; params.push(f.status); }
  if (f.category) { where += ` AND category_name = ?`; params.push(f.category); }
  if (f.search) { where += ` AND (product_name LIKE ? OR product_sku LIKE ?)`; params.push(`%${f.search}%`, `%${f.search}%`); }

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM fact_stock_on_hand WHERE ${where}`).bind(...params).first<{cnt:number}>();

  const result = await db.prepare(`
    SELECT * FROM fact_stock_on_hand WHERE ${where}
    ORDER BY CASE status WHEN 'stockout' THEN 0 WHEN 'low' THEN 1 WHEN 'healthy' THEN 2 ELSE 3 END, product_name
    LIMIT ? OFFSET ?
  `).bind(...params, f.per_page, offset).all();

  return c.json({
    success: true,
    data: result.results,
    meta: { page: f.page, per_page: f.per_page, total: total?.cnt || 0, company_id: f.company_id },
  });
});

// GET /stock/movements
stockRoutes.get('/movements', async (c) => {
  const f = parseFilters(c);
  const offset = (f.page - 1) * f.per_page;
  const moveType = c.req.query('move_type') || null;

  let dateFrom = `${f.year}-01-01`, dateTo = `${f.year}-12-31`;
  if (f.month) {
    const lastDay = new Date(f.year, f.month, 0).getDate();
    dateFrom = `${f.year}-${String(f.month).padStart(2,'0')}-01`;
    dateTo = `${f.year}-${String(f.month).padStart(2,'0')}-${lastDay}`;
  }
  if (f.day && f.month) {
    dateFrom = `${f.year}-${String(f.month).padStart(2,'0')}-${String(f.day).padStart(2,'0')}`;
    dateTo = dateFrom;
  }

  let where = `company_id = ? AND date_key >= ? AND date_key <= ?`;
  const params: any[] = [f.company_id, dateFrom, dateTo];
  if (moveType) { where += ` AND move_type = ?`; params.push(moveType); }
  if (f.warehouse) { where += ` AND warehouse_name = ?`; params.push(f.warehouse); }
  if (f.search) { where += ` AND (product_name LIKE ? OR reference LIKE ?)`; params.push(`%${f.search}%`, `%${f.search}%`); }

  const result = await c.env.DB.prepare(`
    SELECT * FROM fact_stock_movements WHERE ${where}
    ORDER BY date_key DESC LIMIT ? OFFSET ?
  `).bind(...params, f.per_page, offset).all();

  return c.json({ success: true, data: result.results, meta: { company_id: f.company_id } });
});

// GET /stock/ageing
stockRoutes.get('/ageing', async (c) => {
  const f = parseFilters(c);

  const result = await c.env.DB.prepare(`
    SELECT
      CASE
        WHEN last_move_days <= 30 THEN '0-30 days'
        WHEN last_move_days <= 60 THEN '31-60 days'
        WHEN last_move_days <= 90 THEN '61-90 days'
        ELSE '90+ days'
      END as range,
      COUNT(*) as count,
      COALESCE(SUM(valuation_cost), 0) as value
    FROM fact_stock_on_hand
    WHERE company_id = ? AND date_key = date('now') AND qty_on_hand > 0
    GROUP BY range
    ORDER BY MIN(last_move_days)
  `).bind(f.company_id).all();

  return c.json({ success: true, data: result.results, meta: { company_id: f.company_id } });
});

// GET /stock/warehouses — distinct warehouses for filter
stockRoutes.get('/warehouses', async (c) => {
  const f = parseFilters(c);
  const result = await c.env.DB.prepare(`
    SELECT DISTINCT warehouse_name FROM fact_stock_on_hand WHERE company_id = ? AND date_key = date('now') ORDER BY warehouse_name
  `).bind(f.company_id).all();

  return c.json({ success: true, data: result.results?.map((r: any) => r.warehouse_name) || [] });
});

// GET /stock/categories
stockRoutes.get('/categories', async (c) => {
  const f = parseFilters(c);
  const result = await c.env.DB.prepare(`
    SELECT DISTINCT category_name FROM fact_stock_on_hand WHERE company_id = ? AND date_key = date('now') AND category_name IS NOT NULL ORDER BY category_name
  `).bind(f.company_id).all();

  return c.json({ success: true, data: result.results?.map((r: any) => r.category_name) || [] });
});

// GET /stock/valuation-trend — historical valuation
stockRoutes.get('/valuation-trend', async (c) => {
  const f = parseFilters(c);

  const result = await c.env.DB.prepare(`
    SELECT date_key, SUM(valuation_cost) as cost, SUM(valuation_list) as list_val, COUNT(*) as items
    FROM fact_stock_on_hand
    WHERE company_id = ?
    GROUP BY date_key ORDER BY date_key DESC LIMIT 90
  `).bind(f.company_id).all();

  return c.json({ success: true, data: result.results, meta: { company_id: f.company_id } });
});

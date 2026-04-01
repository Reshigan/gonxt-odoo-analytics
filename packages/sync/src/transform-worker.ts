// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Transform Worker
// Queue consumer: staging → analytics facts/dims → KV aggregation
// ═══════════════════════════════════════════════════════════════

import type { Env, TransformMessage } from '../../shared/src/types';
import { EXCEPTION_DEFINITIONS } from '../../shared/src/constants';

export default {
  async queue(batch: MessageBatch<TransformMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      const { trigger, models_synced, batch_id } = msg.body;
      console.log(`[TRANSFORM] Processing batch ${batch_id} (${trigger}): ${models_synced.join(', ')}`);

      try {
        // 1. Transform staging → analytics
        await transformSalesOrders(env.DB);
        await transformStockOnHand(env.DB);
        await transformStockMovements(env.DB);
        await transformInvoices(env.DB);

        // 2. Run Transaction Completeness Engine
        await detectExceptions(env.DB);

        // 3. Write KV aggregations
        await writeKVAggregations(env.DB, env.CACHE);

        console.log(`[TRANSFORM] Batch ${batch_id} complete`);
        msg.ack();
      } catch (err: any) {
        console.error(`[TRANSFORM] Error:`, err.message);
        msg.retry();
      }
    }
  },
};

// ── Sales Orders Transform ──
async function transformSalesOrders(db: D1Database): Promise<void> {
  // Delete and rebuild fact table from staging
  // (for small dataset this is efficient; for larger, use merge/upsert)
  await db.exec(`DELETE FROM fact_sales_orders`);

  await db.exec(`
    INSERT INTO fact_sales_orders (
      order_odoo_id, order_name, line_odoo_id,
      partner_id, partner_name, product_id, product_name, product_sku,
      user_id, user_name, team_id, team_name, company_id,
      date_key, order_state,
      qty_ordered, qty_delivered, qty_invoiced,
      unit_price, discount_pct, line_total, line_cost, gross_margin,
      has_delivery, delivery_state, has_invoice, invoice_state,
      is_paid, payment_state, lifecycle_stage, days_open
    )
    SELECT
      so.odoo_id, so.name, sol.odoo_id,
      so.partner_id, so.partner_name,
      sol.product_id, sol.product_name, sol.product_sku,
      so.user_id, so.user_name, so.team_id, so.team_name, so.company_id,
      COALESCE(substr(so.date_order, 1, 10), '1970-01-01') as date_key,
      so.state,
      COALESCE(sol.product_uom_qty, 0),
      COALESCE(sol.qty_delivered, 0),
      COALESCE(sol.qty_invoiced, 0),
      COALESCE(sol.price_unit, 0),
      COALESCE(sol.discount, 0),
      COALESCE(sol.price_subtotal, 0),
      COALESCE(sol.price_subtotal * 0.6, 0), -- estimated cost at 60%
      COALESCE(sol.price_subtotal * 0.4, 0), -- estimated margin at 40%
      -- Traceability: check if any pickings/invoices exist
      CASE WHEN so.picking_ids IS NOT NULL AND so.picking_ids != '[]' THEN 1 ELSE 0 END,
      CASE
        WHEN so.state = 'cancel' THEN 'none'
        WHEN sol.qty_delivered >= sol.product_uom_qty AND sol.product_uom_qty > 0 THEN 'complete'
        WHEN sol.qty_delivered > 0 THEN 'partial'
        ELSE 'none'
      END,
      CASE WHEN so.invoice_ids IS NOT NULL AND so.invoice_ids != '[]' THEN 1 ELSE 0 END,
      CASE
        WHEN sol.qty_invoiced >= sol.product_uom_qty AND sol.product_uom_qty > 0 THEN 'complete'
        WHEN sol.qty_invoiced > 0 THEN 'partial'
        ELSE 'none'
      END,
      0, 'not_paid', -- updated below from account.move join
      CASE
        WHEN so.state = 'cancel' THEN 'cancelled'
        WHEN so.state = 'draft' THEN 'quotation'
        WHEN so.state IN ('sale','done') AND (sol.qty_delivered >= sol.product_uom_qty AND sol.product_uom_qty > 0 AND sol.qty_invoiced >= sol.product_uom_qty) THEN 'invoiced'
        WHEN so.state IN ('sale','done') AND sol.qty_delivered >= sol.product_uom_qty AND sol.product_uom_qty > 0 THEN 'delivered'
        WHEN so.state IN ('sale','done') AND sol.qty_delivered > 0 THEN 'delivering'
        WHEN so.state IN ('sale','done') THEN 'confirmed'
        ELSE 'quotation'
      END,
      CAST(julianday('now') - julianday(COALESCE(so.date_order, 'now')) AS INTEGER)
    FROM stg_sale_orders so
    LEFT JOIN stg_sale_order_lines sol ON sol.order_id = so.odoo_id
    WHERE so.state != 'cancel'
  `);

  // Update payment status from invoices
  await db.exec(`
    UPDATE fact_sales_orders SET
      is_paid = 1,
      payment_state = 'paid',
      lifecycle_stage = 'paid'
    WHERE order_name IN (
      SELECT DISTINCT am.origin FROM stg_account_moves am
      WHERE am.payment_state = 'paid' AND am.move_type = 'out_invoice'
    )
    AND lifecycle_stage IN ('invoiced', 'delivered')
  `);

  console.log('[TRANSFORM] Sales orders transformed');
}

// ── Stock On Hand Transform ──
async function transformStockOnHand(db: D1Database): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Upsert today's snapshot
  await db.prepare(`DELETE FROM fact_stock_on_hand WHERE date_key = ?`).bind(today).run();

  await db.exec(`
    INSERT INTO fact_stock_on_hand (
      date_key, product_id, product_name, product_sku, category_name,
      location_id, location_name, warehouse_name, company_id,
      qty_on_hand, qty_reserved, qty_available, valuation_cost, valuation_list,
      reorder_point, last_move_days, status
    )
    SELECT
      '${today}',
      sq.product_id, sq.product_name, p.default_code, p.categ_name,
      sq.location_id, sq.location_name, COALESCE(sq.warehouse_name, 'Default'),
      sq.company_id,
      COALESCE(sq.quantity, 0),
      COALESCE(sq.reserved_quantity, 0),
      COALESCE(sq.quantity, 0) - COALESCE(sq.reserved_quantity, 0),
      COALESCE(sq.quantity * p.standard_price, 0),
      COALESCE(sq.quantity * p.list_price, 0),
      15, -- default reorder point, should come from product config
      COALESCE(
        CAST(julianday('now') - julianday(
          (SELECT MAX(date) FROM stg_stock_moves sm WHERE sm.product_id = sq.product_id AND sm.state = 'done')
        ) AS INTEGER),
        999
      ),
      CASE
        WHEN COALESCE(sq.quantity, 0) <= 0 THEN 'stockout'
        WHEN COALESCE(sq.quantity, 0) <= 15 THEN 'low'
        WHEN COALESCE(sq.quantity, 0) > 100 THEN 'overstock'
        ELSE 'healthy'
      END
    FROM stg_stock_quants sq
    LEFT JOIN stg_products p ON p.odoo_id = sq.product_id
    WHERE sq.quantity != 0 OR sq.reserved_quantity != 0
  `);

  console.log('[TRANSFORM] Stock on hand transformed');
}

// ── Stock Movements Transform ──
async function transformStockMovements(db: D1Database): Promise<void> {
  await db.exec(`DELETE FROM fact_stock_movements`);

  await db.exec(`
    INSERT INTO fact_stock_movements (
      odoo_move_id, date_key, product_id, product_name, product_sku,
      qty_moved, move_type, source_location, dest_location,
      warehouse_name, picking_reference, company_id, reference
    )
    SELECT
      sm.odoo_id,
      COALESCE(substr(sm.date, 1, 10), '1970-01-01'),
      sm.product_id, sm.product_name, sm.product_sku,
      COALESCE(sm.quantity, sm.product_uom_qty, 0),
      CASE
        WHEN sm.location_name LIKE '%Vendor%' OR sm.location_name LIKE '%supplier%' THEN 'in'
        WHEN sm.location_dest_name LIKE '%Customer%' THEN 'out'
        ELSE 'internal'
      END,
      sm.location_name, sm.location_dest_name,
      'Default', -- resolved from picking in production
      sp.name,
      sm.company_id,
      sm.reference
    FROM stg_stock_moves sm
    LEFT JOIN stg_stock_pickings sp ON sp.odoo_id = sm.picking_id
    WHERE sm.state = 'done'
  `);

  console.log('[TRANSFORM] Stock movements transformed');
}

// ── Invoices Transform ──
async function transformInvoices(db: D1Database): Promise<void> {
  await db.exec(`DELETE FROM fact_invoices`);

  await db.exec(`
    INSERT INTO fact_invoices (
      odoo_id, name, move_type, state, partner_id, partner_name,
      date_key, due_date_key, amount_total, amount_residual,
      payment_state, company_id, origin
    )
    SELECT
      am.odoo_id, am.name, am.move_type, am.state,
      am.partner_id, am.partner_name,
      COALESCE(am.invoice_date, substr(am.synced_at, 1, 10)),
      am.invoice_date_due,
      COALESCE(am.amount_total, 0),
      COALESCE(am.amount_residual, 0),
      COALESCE(am.payment_state, 'not_paid'),
      am.company_id,
      am.origin
    FROM stg_account_moves am
    WHERE am.move_type IN ('out_invoice', 'out_refund')
  `);

  console.log('[TRANSFORM] Invoices transformed');
}

// ── Transaction Completeness Engine ──
async function detectExceptions(db: D1Database): Promise<void> {
  const now = new Date().toISOString();

  // Deactivate previously auto-detected exceptions that may now be resolved
  // (they'll be re-detected if still active)
  await db.exec(`UPDATE fact_exceptions SET is_active = 0 WHERE resolved_at IS NULL`);

  // EX-SO-001: Stale Quotation (draft > 7 days)
  await db.prepare(`
    INSERT INTO fact_exceptions (exception_type, exception_name, severity, entity_type, entity_id, entity_name, expected_state, actual_state, description, company_id, detected_at, is_active)
    SELECT
      'EX-SO-001', 'Stale Quotation',
      CASE WHEN days_open > 14 THEN 'critical' ELSE 'warning' END,
      'sale_order', order_name, order_name || ' - ' || partner_name,
      'sale', 'draft',
      'Quotation ' || order_name || ' has been open for ' || days_open || ' days without confirmation',
      company_id, ?, 1
    FROM fact_sales_orders
    WHERE order_state = 'draft' AND days_open > 7
    GROUP BY order_odoo_id
  `).bind(now).run();

  // EX-SO-002: Missing Delivery (confirmed but no picking)
  await db.prepare(`
    INSERT INTO fact_exceptions (exception_type, exception_name, severity, entity_type, entity_id, entity_name, expected_state, actual_state, description, company_id, detected_at, is_active)
    SELECT
      'EX-SO-002', 'Missing Delivery', 'critical',
      'sale_order', order_name, order_name || ' - ' || partner_name,
      'has_delivery', 'no_delivery',
      'Order ' || order_name || ' confirmed but no delivery created after ' || days_open || ' days',
      company_id, ?, 1
    FROM fact_sales_orders
    WHERE order_state IN ('sale','done') AND has_delivery = 0 AND days_open > 1
    GROUP BY order_odoo_id
  `).bind(now).run();

  // EX-SO-004: Uninvoiced Delivery
  await db.prepare(`
    INSERT INTO fact_exceptions (exception_type, exception_name, severity, entity_type, entity_id, entity_name, expected_state, actual_state, description, financial_impact, company_id, detected_at, is_active)
    SELECT
      'EX-SO-004', 'Uninvoiced Delivery',
      CASE WHEN days_open > 7 THEN 'critical' ELSE 'warning' END,
      'sale_order', order_name, order_name || ' - ' || partner_name,
      'invoiced', delivery_state,
      'Order ' || order_name || ' delivered but not fully invoiced',
      SUM(line_total),
      company_id, ?, 1
    FROM fact_sales_orders
    WHERE delivery_state = 'complete' AND invoice_state != 'complete' AND order_state != 'cancel'
    GROUP BY order_odoo_id
  `).bind(now).run();

  // EX-ST-001: Stockout Risk
  await db.prepare(`
    INSERT INTO fact_exceptions (exception_type, exception_name, severity, entity_type, entity_id, entity_name, expected_state, actual_state, description, company_id, detected_at, is_active)
    SELECT
      'EX-ST-001', 'Stockout Risk',
      CASE WHEN qty_on_hand <= 0 THEN 'critical' ELSE 'warning' END,
      'stock_quant', product_sku, product_name,
      'above_reorder', status,
      product_name || ' (' || product_sku || ') at ' || warehouse_name || ': ' || CAST(qty_on_hand AS INTEGER) || ' on hand (reorder point: ' || CAST(reorder_point AS INTEGER) || ')',
      company_id, ?, 1
    FROM fact_stock_on_hand
    WHERE date_key = date('now') AND (qty_on_hand <= reorder_point)
  `).bind(now).run();

  // EX-ST-004: Slow-Moving Stock
  await db.prepare(`
    INSERT INTO fact_exceptions (exception_type, exception_name, severity, entity_type, entity_id, entity_name, expected_state, actual_state, description, financial_impact, company_id, detected_at, is_active)
    SELECT
      'EX-ST-004', 'Slow-Moving Stock',
      CASE WHEN last_move_days > 180 THEN 'warning' ELSE 'info' END,
      'stock_quant', product_sku, product_name,
      'active', 'slow_moving',
      product_name || ' at ' || warehouse_name || ': no movement for ' || last_move_days || ' days',
      valuation_cost,
      company_id, ?, 1
    FROM fact_stock_on_hand
    WHERE date_key = date('now') AND last_move_days > 90 AND qty_on_hand > 0
  `).bind(now).run();

  console.log('[TCE] Exception detection complete');
}

// ── KV Aggregation Writer ──
async function writeKVAggregations(db: D1Database, cache: KVNamespace): Promise<void> {
  const TTL_5MIN = 300;
  const TTL_15MIN = 900;

  // Get all company IDs
  const companies = await db.prepare(`SELECT DISTINCT company_id FROM stg_sale_orders`).all<{ company_id: number }>();
  const companyIds = companies.results?.map(c => c.company_id) || [1];

  for (const companyId of companyIds) {
    // Sales overview per month
    const salesOverview = await db.prepare(`
      SELECT
        substr(date_key, 1, 7) as month,
        COUNT(DISTINCT order_odoo_id) as order_count,
        SUM(line_total) as revenue,
        SUM(line_cost) as cost,
        SUM(gross_margin) as margin
      FROM fact_sales_orders
      WHERE company_id = ? AND order_state != 'cancel'
      GROUP BY substr(date_key, 1, 7)
      ORDER BY month
    `).bind(companyId).all();

    await cache.put(
      `agg:sales:overview:${companyId}`,
      JSON.stringify(salesOverview.results),
      { expirationTtl: TTL_5MIN }
    );

    // Pipeline
    const pipeline = await db.prepare(`
      SELECT lifecycle_stage as stage, COUNT(DISTINCT order_odoo_id) as count, SUM(line_total) as value
      FROM fact_sales_orders
      WHERE company_id = ? AND order_state != 'cancel'
      GROUP BY lifecycle_stage
    `).bind(companyId).all();

    await cache.put(
      `agg:sales:pipeline:${companyId}`,
      JSON.stringify(pipeline.results),
      { expirationTtl: TTL_5MIN }
    );

    // Stock overview
    const stockOverview = await db.prepare(`
      SELECT
        COUNT(*) as total_items,
        SUM(qty_on_hand) as total_on_hand,
        SUM(qty_reserved) as total_reserved,
        SUM(valuation_cost) as total_val_cost,
        SUM(valuation_list) as total_val_list,
        SUM(CASE WHEN status = 'stockout' THEN 1 ELSE 0 END) as stockout_count,
        SUM(CASE WHEN status = 'low' THEN 1 ELSE 0 END) as low_count
      FROM fact_stock_on_hand
      WHERE company_id = ? AND date_key = date('now')
    `).bind(companyId).first();

    await cache.put(
      `agg:stock:overview:${companyId}`,
      JSON.stringify(stockOverview),
      { expirationTtl: TTL_15MIN }
    );

    // Exception summary
    const exSummary = await db.prepare(`
      SELECT
        exception_type, severity, COUNT(*) as count
      FROM fact_exceptions
      WHERE company_id = ? AND is_active = 1
      GROUP BY exception_type, severity
    `).bind(companyId).all();

    await cache.put(
      `agg:exceptions:summary:${companyId}`,
      JSON.stringify(exSummary.results),
      { expirationTtl: TTL_15MIN }
    );
  }

  console.log('[KV] Aggregations written for companies:', companyIds.join(', '));
}

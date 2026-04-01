// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Sync Worker Entry Point
// Cron Triggers → Queue → Odoo API → D1 Staging
// ═══════════════════════════════════════════════════════════════

import { OdooClient } from './odoo-client';
import { SYNC_FIELDS } from '../../shared/src/constants';
import type { Env, SyncMessage, TransformMessage } from '../../shared/src/types';

export default {
  // ── Cron Trigger Handler ──
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;
    console.log(`[CRON] Triggered: ${cron} at ${new Date().toISOString()}`);

    try {
      // Determine which models to sync based on cron schedule
      let models: string[] = [];

      if (cron === '*/5 * * * *') {
        // Every 5 minutes: sales
        models = ['sale.order', 'sale.order.line'];
      } else if (cron === '*/15 * * * *') {
        // Every 15 minutes: stock + finance
        models = ['stock.picking', 'stock.move', 'stock.quant', 'account.move', 'account.payment'];
      } else if (cron === '0 * * * *') {
        // Hourly: products
        models = ['product.product'];
      } else if (cron === '0 0 * * *') {
        // Daily: master data
        models = ['product.category', 'res.partner', 'res.users', 'res.company'];
      }

      // Get last sync times from D1
      for (const model of models) {
        const meta = await env.DB.prepare(
          'SELECT last_sync_at FROM sync_metadata WHERE model_name = ?'
        ).bind(model).first<{ last_sync_at: string }>();

        const message: SyncMessage = {
          model,
          action: 'incremental',
          last_sync_at: meta?.last_sync_at || '2000-01-01T00:00:00Z',
        };

        await env.SYNC_QUEUE.send(message);
        console.log(`[CRON] Queued sync for ${model} (last: ${message.last_sync_at})`);
      }
    } catch (err) {
      console.error(`[CRON] Error:`, err);
    }
  },

  // ── Queue Consumer ──
  async queue(batch: MessageBatch<SyncMessage>, env: Env): Promise<void> {
    const client = new OdooClient(env.ODOO_URL, env.ODOO_DB, env.ODOO_USER, env.ODOO_PASSWORD);
    const syncedModels: string[] = [];

    for (const msg of batch.messages) {
      const { model, action, last_sync_at } = msg.body;
      console.log(`[SYNC] Processing ${model} (${action}) since ${last_sync_at}`);

      try {
        const fields = SYNC_FIELDS[model];
        if (!fields) {
          console.warn(`[SYNC] No field config for model: ${model}`);
          msg.ack();
          continue;
        }

        const { records, total } = await client.syncModel(model, fields, last_sync_at);
        console.log(`[SYNC] ${model}: fetched ${records.length} of ${total} records`);

        if (records.length > 0) {
          await upsertRecords(env.DB, model, records);
        }

        // Update sync metadata
        await env.DB.prepare(
          `UPDATE sync_metadata SET last_sync_at = ?, last_sync_count = ?, last_error = NULL, updated_at = ? WHERE model_name = ?`
        ).bind(new Date().toISOString(), records.length, new Date().toISOString(), model).run();

        syncedModels.push(model);
        msg.ack();
      } catch (err: any) {
        console.error(`[SYNC] Error syncing ${model}:`, err.message);

        // Record error in metadata
        await env.DB.prepare(
          `UPDATE sync_metadata SET last_error = ?, updated_at = ? WHERE model_name = ?`
        ).bind(err.message, new Date().toISOString(), model).run();

        msg.retry();
      }
    }

    // After sync batch completes, trigger transform
    if (syncedModels.length > 0) {
      const transformMsg: TransformMessage = {
        trigger: 'post_sync',
        models_synced: syncedModels,
        batch_id: `batch_${Date.now()}`,
      };
      await env.TRANSFORM_QUEUE.send(transformMsg);
      console.log(`[SYNC] Triggered transform for: ${syncedModels.join(', ')}`);
    }
  },
};

// ── Upsert Records into Staging Tables ──
async function upsertRecords(db: D1Database, model: string, records: any[]): Promise<void> {
  const now = new Date().toISOString();
  const batchId = `batch_${Date.now()}`;

  // Map model to staging table and build upsert
  const tableMap: Record<string, string> = {
    'sale.order': 'stg_sale_orders',
    'sale.order.line': 'stg_sale_order_lines',
    'stock.picking': 'stg_stock_pickings',
    'stock.move': 'stg_stock_moves',
    'stock.quant': 'stg_stock_quants',
    'product.product': 'stg_products',
    'product.category': 'stg_product_categories',
    'account.move': 'stg_account_moves',
    'account.payment': 'stg_account_payments',
    'res.partner': 'stg_partners',
    'res.users': 'stg_users',
    'res.company': 'stg_companies',
  };

  const table = tableMap[model];
  if (!table) return;

  // Process in batches of 50 for D1
  for (let i = 0; i < records.length; i += 50) {
    const chunk = records.slice(i, i + 50);
    const stmts: D1PreparedStatement[] = [];

    for (const rec of chunk) {
      const stmt = buildUpsert(db, table, model, rec, now, batchId);
      if (stmt) stmts.push(stmt);
    }

    if (stmts.length > 0) {
      await db.batch(stmts);
    }
  }
}

function buildUpsert(
  db: D1Database, table: string, model: string, rec: any, now: string, batchId: string
): D1PreparedStatement | null {
  const m2o = OdooClient.resolveMany2one;

  switch (model) {
    case 'sale.order':
      return db.prepare(`
        INSERT OR REPLACE INTO ${table} (odoo_id, name, state, date_order, partner_id, partner_name, amount_total, amount_untaxed, user_id, user_name, team_id, team_name, company_id, picking_ids, invoice_ids, synced_at, write_date, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rec.id, rec.name, rec.state, rec.date_order,
        m2o(rec.partner_id).id, m2o(rec.partner_id).name,
        rec.amount_total, rec.amount_untaxed,
        m2o(rec.user_id).id, m2o(rec.user_id).name,
        m2o(rec.team_id).id, m2o(rec.team_id).name,
        m2o(rec.company_id).id || 1,
        JSON.stringify(rec.picking_ids || []),
        JSON.stringify(rec.invoice_ids || []),
        now, rec.write_date, batchId
      );

    case 'sale.order.line':
      return db.prepare(`
        INSERT OR REPLACE INTO ${table} (odoo_id, order_id, product_id, product_name, product_sku, product_uom_qty, qty_delivered, qty_invoiced, price_unit, price_subtotal, discount, state, synced_at, write_date, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rec.id, m2o(rec.order_id).id,
        m2o(rec.product_id).id, m2o(rec.product_id).name, '',
        rec.product_uom_qty, rec.qty_delivered, rec.qty_invoiced,
        rec.price_unit, rec.price_subtotal, rec.discount, rec.state,
        now, rec.write_date, batchId
      );

    case 'stock.picking':
      return db.prepare(`
        INSERT OR REPLACE INTO ${table} (odoo_id, name, state, picking_type_code, partner_id, scheduled_date, date_done, origin, location_id, location_dest_id, company_id, synced_at, write_date, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rec.id, rec.name, rec.state,
        rec.picking_type_id ? 'unknown' : 'unknown', // resolved in transform
        m2o(rec.partner_id).id,
        rec.scheduled_date, rec.date_done, rec.origin,
        m2o(rec.location_id).id, m2o(rec.location_dest_id).id,
        m2o(rec.company_id).id || 1,
        now, rec.write_date, batchId
      );

    case 'stock.quant':
      return db.prepare(`
        INSERT OR REPLACE INTO ${table} (odoo_id, product_id, product_name, location_id, location_name, quantity, reserved_quantity, lot_id, company_id, synced_at, write_date, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rec.id, m2o(rec.product_id).id, m2o(rec.product_id).name,
        m2o(rec.location_id).id, m2o(rec.location_id).name,
        rec.quantity, rec.reserved_quantity,
        m2o(rec.lot_id).id,
        m2o(rec.company_id).id || 1,
        now, rec.write_date, batchId
      );

    case 'product.product':
      return db.prepare(`
        INSERT OR REPLACE INTO ${table} (odoo_id, name, default_code, categ_id, categ_name, list_price, standard_price, product_type, qty_available, virtual_available, company_id, synced_at, write_date, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rec.id, rec.name, rec.default_code,
        m2o(rec.categ_id).id, m2o(rec.categ_id).name,
        rec.list_price, rec.standard_price, rec.type,
        rec.qty_available, rec.virtual_available,
        m2o(rec.company_id).id,
        now, rec.write_date, batchId
      );

    case 'account.move':
      return db.prepare(`
        INSERT OR REPLACE INTO ${table} (odoo_id, name, move_type, state, partner_id, partner_name, invoice_date, invoice_date_due, amount_total, amount_residual, payment_state, company_id, synced_at, write_date, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rec.id, rec.name, rec.move_type, rec.state,
        m2o(rec.partner_id).id, m2o(rec.partner_id).name,
        rec.invoice_date, rec.invoice_date_due,
        rec.amount_total, rec.amount_residual, rec.payment_state,
        m2o(rec.company_id).id || 1,
        now, rec.write_date, batchId
      );

    case 'res.partner':
      return db.prepare(`
        INSERT OR REPLACE INTO ${table} (odoo_id, name, company_type, city, country, is_company, active, synced_at, write_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rec.id, rec.name, rec.company_type, rec.city,
        m2o(rec.country_id).name,
        rec.is_company ? 1 : 0, rec.active ? 1 : 0,
        now, rec.write_date
      );

    case 'res.company':
      return db.prepare(`
        INSERT OR REPLACE INTO ${table} (odoo_id, name, currency, synced_at, write_date)
        VALUES (?, ?, ?, ?, ?)
      `).bind(rec.id, rec.name, 'ZAR', now, rec.write_date);

    default:
      return null;
  }
}

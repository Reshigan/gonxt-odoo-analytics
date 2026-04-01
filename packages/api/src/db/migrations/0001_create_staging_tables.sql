-- ═══════════════════════════════════════════════════════════════
-- GONXT Odoo 18 Analytics — 0001: Staging Tables
-- All Odoo models land here via sync workers
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stg_companies (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  synced_at TEXT NOT NULL,
  write_date TEXT
);

CREATE TABLE IF NOT EXISTS stg_sale_orders (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft',
  date_order TEXT,
  partner_id INTEGER,
  partner_name TEXT,
  amount_total REAL DEFAULT 0,
  amount_untaxed REAL DEFAULT 0,
  user_id INTEGER,
  user_name TEXT,
  team_id INTEGER,
  team_name TEXT,
  company_id INTEGER NOT NULL DEFAULT 1,
  picking_ids TEXT, -- JSON array
  invoice_ids TEXT, -- JSON array
  synced_at TEXT NOT NULL,
  write_date TEXT,
  batch_id TEXT
);

CREATE TABLE IF NOT EXISTS stg_sale_order_lines (
  odoo_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT,
  product_sku TEXT,
  product_uom_qty REAL DEFAULT 0,
  qty_delivered REAL DEFAULT 0,
  qty_invoiced REAL DEFAULT 0,
  price_unit REAL DEFAULT 0,
  price_subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  state TEXT,
  synced_at TEXT NOT NULL,
  write_date TEXT,
  batch_id TEXT,
  FOREIGN KEY (order_id) REFERENCES stg_sale_orders(odoo_id)
);

CREATE TABLE IF NOT EXISTS stg_stock_pickings (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  picking_type_code TEXT, -- incoming, outgoing, internal
  partner_id INTEGER,
  scheduled_date TEXT,
  date_done TEXT,
  origin TEXT, -- e.g. SO1001
  location_id INTEGER,
  location_dest_id INTEGER,
  company_id INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL,
  write_date TEXT,
  batch_id TEXT
);

CREATE TABLE IF NOT EXISTS stg_stock_moves (
  odoo_id INTEGER PRIMARY KEY,
  product_id INTEGER,
  product_name TEXT,
  product_sku TEXT,
  product_uom_qty REAL DEFAULT 0,
  quantity REAL DEFAULT 0,
  state TEXT NOT NULL,
  location_id INTEGER,
  location_name TEXT,
  location_dest_id INTEGER,
  location_dest_name TEXT,
  picking_id INTEGER,
  date TEXT,
  reference TEXT,
  company_id INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL,
  write_date TEXT,
  batch_id TEXT
);

CREATE TABLE IF NOT EXISTS stg_stock_quants (
  odoo_id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL,
  product_name TEXT,
  product_sku TEXT,
  location_id INTEGER,
  location_name TEXT,
  warehouse_name TEXT,
  quantity REAL DEFAULT 0,
  reserved_quantity REAL DEFAULT 0,
  lot_id INTEGER,
  company_id INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL,
  write_date TEXT,
  batch_id TEXT
);

CREATE TABLE IF NOT EXISTS stg_products (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  default_code TEXT, -- SKU
  categ_id INTEGER,
  categ_name TEXT,
  list_price REAL DEFAULT 0,
  standard_price REAL DEFAULT 0,
  product_type TEXT,
  qty_available REAL DEFAULT 0,
  virtual_available REAL DEFAULT 0,
  company_id INTEGER,
  synced_at TEXT NOT NULL,
  write_date TEXT,
  batch_id TEXT
);

CREATE TABLE IF NOT EXISTS stg_product_categories (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER,
  complete_name TEXT,
  synced_at TEXT NOT NULL,
  write_date TEXT
);

CREATE TABLE IF NOT EXISTS stg_account_moves (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  move_type TEXT, -- out_invoice, out_refund, in_invoice, etc
  state TEXT NOT NULL,
  partner_id INTEGER,
  partner_name TEXT,
  invoice_date TEXT,
  invoice_date_due TEXT,
  amount_total REAL DEFAULT 0,
  amount_residual REAL DEFAULT 0,
  payment_state TEXT,
  company_id INTEGER NOT NULL DEFAULT 1,
  origin TEXT, -- linked SO name
  synced_at TEXT NOT NULL,
  write_date TEXT,
  batch_id TEXT
);

CREATE TABLE IF NOT EXISTS stg_account_payments (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT,
  state TEXT NOT NULL,
  payment_type TEXT,
  amount REAL DEFAULT 0,
  date TEXT,
  partner_id INTEGER,
  ref TEXT,
  company_id INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL,
  write_date TEXT,
  batch_id TEXT
);

CREATE TABLE IF NOT EXISTS stg_partners (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  company_type TEXT, -- person or company
  city TEXT,
  country TEXT,
  is_company INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  synced_at TEXT NOT NULL,
  write_date TEXT
);

CREATE TABLE IF NOT EXISTS stg_users (
  odoo_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  login TEXT,
  sale_team_id INTEGER,
  sale_team_name TEXT,
  company_id INTEGER,
  company_ids TEXT, -- JSON array
  groups TEXT, -- JSON array of group XML IDs
  synced_at TEXT NOT NULL,
  write_date TEXT
);

-- Sync tracking
CREATE TABLE IF NOT EXISTS sync_metadata (
  model_name TEXT PRIMARY KEY,
  last_sync_at TEXT NOT NULL DEFAULT '2000-01-01T00:00:00Z',
  last_sync_count INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT '2000-01-01T00:00:00Z'
);

-- Seed sync metadata for all models
INSERT OR IGNORE INTO sync_metadata (model_name, last_sync_at, updated_at) VALUES
  ('sale.order', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('sale.order.line', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('stock.picking', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('stock.move', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('stock.quant', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('product.product', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('product.category', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('account.move', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('account.payment', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('res.partner', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('res.users', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
  ('res.company', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z');

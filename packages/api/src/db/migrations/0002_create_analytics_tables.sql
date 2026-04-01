-- ═══════════════════════════════════════════════════════════════
-- GONXT Odoo 18 Analytics — 0002: Analytics Tables
-- Dimensions (SCD2) + Facts + Exceptions
-- ═══════════════════════════════════════════════════════════════

-- ── Dimension: Date (pre-populated) ──
CREATE TABLE IF NOT EXISTS dim_date (
  date_key TEXT PRIMARY KEY, -- YYYY-MM-DD
  day INTEGER NOT NULL,
  month INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  quarter INTEGER NOT NULL,
  year INTEGER NOT NULL,
  fiscal_year INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sun
  is_weekday INTEGER NOT NULL DEFAULT 1,
  is_month_end INTEGER NOT NULL DEFAULT 0,
  is_sa_holiday INTEGER NOT NULL DEFAULT 0,
  week_number INTEGER NOT NULL
);

-- ── Dimension: Products ──
CREATE TABLE IF NOT EXISTS dim_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  odoo_id INTEGER NOT NULL,
  sku TEXT,
  name TEXT NOT NULL,
  category_name TEXT,
  category_path TEXT,
  list_price REAL DEFAULT 0,
  standard_price REAL DEFAULT 0,
  product_type TEXT,
  is_current INTEGER NOT NULL DEFAULT 1,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL DEFAULT '9999-12-31'
);
CREATE INDEX IF NOT EXISTS idx_dim_products_odoo ON dim_products(odoo_id, is_current);

-- ── Dimension: Partners ──
CREATE TABLE IF NOT EXISTS dim_partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  odoo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  company_type TEXT,
  city TEXT,
  country TEXT,
  is_company INTEGER DEFAULT 0,
  segment TEXT,
  is_current INTEGER NOT NULL DEFAULT 1,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL DEFAULT '9999-12-31'
);
CREATE INDEX IF NOT EXISTS idx_dim_partners_odoo ON dim_partners(odoo_id, is_current);

-- ── Dimension: Users ──
CREATE TABLE IF NOT EXISTS dim_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  odoo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  login TEXT,
  team_name TEXT,
  team_id INTEGER,
  role TEXT,
  is_current INTEGER NOT NULL DEFAULT 1,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL DEFAULT '9999-12-31'
);
CREATE INDEX IF NOT EXISTS idx_dim_users_odoo ON dim_users(odoo_id, is_current);

-- ── Fact: Sales Orders (grain = 1 row per order line) ──
CREATE TABLE IF NOT EXISTS fact_sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_odoo_id INTEGER NOT NULL,
  order_name TEXT NOT NULL,
  line_odoo_id INTEGER,
  partner_id INTEGER,
  partner_name TEXT,
  product_id INTEGER,
  product_name TEXT,
  product_sku TEXT,
  user_id INTEGER,
  user_name TEXT,
  team_id INTEGER,
  team_name TEXT,
  company_id INTEGER NOT NULL DEFAULT 1,
  date_key TEXT NOT NULL,
  order_state TEXT NOT NULL,
  qty_ordered REAL DEFAULT 0,
  qty_delivered REAL DEFAULT 0,
  qty_invoiced REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  discount_pct REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  line_cost REAL DEFAULT 0,
  gross_margin REAL DEFAULT 0,
  -- Traceability fields
  has_delivery INTEGER DEFAULT 0,
  delivery_state TEXT DEFAULT 'none', -- none, partial, complete
  has_invoice INTEGER DEFAULT 0,
  invoice_state TEXT DEFAULT 'none',
  is_paid INTEGER DEFAULT 0,
  payment_state TEXT DEFAULT 'not_paid',
  lifecycle_stage TEXT DEFAULT 'quotation',
  days_open INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fact_sales_date ON fact_sales_orders(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_company ON fact_sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_fact_sales_state ON fact_sales_orders(order_state);
CREATE INDEX IF NOT EXISTS idx_fact_sales_order ON fact_sales_orders(order_odoo_id);
CREATE INDEX IF NOT EXISTS idx_fact_sales_partner ON fact_sales_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_fact_sales_product ON fact_sales_orders(product_id);

-- ── Fact: Stock On Hand (daily snapshot per product per location) ──
CREATE TABLE IF NOT EXISTS fact_stock_on_hand (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_key TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT,
  product_sku TEXT,
  category_name TEXT,
  location_id INTEGER,
  location_name TEXT,
  warehouse_name TEXT,
  company_id INTEGER NOT NULL DEFAULT 1,
  qty_on_hand REAL DEFAULT 0,
  qty_reserved REAL DEFAULT 0,
  qty_available REAL DEFAULT 0,
  qty_incoming REAL DEFAULT 0,
  valuation_cost REAL DEFAULT 0,
  valuation_list REAL DEFAULT 0,
  reorder_point REAL DEFAULT 0,
  last_move_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'healthy' -- stockout, low, healthy, overstock
);
CREATE INDEX IF NOT EXISTS idx_fact_stock_date ON fact_stock_on_hand(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_stock_company ON fact_stock_on_hand(company_id);
CREATE INDEX IF NOT EXISTS idx_fact_stock_product ON fact_stock_on_hand(product_id);
CREATE INDEX IF NOT EXISTS idx_fact_stock_warehouse ON fact_stock_on_hand(warehouse_name);
CREATE INDEX IF NOT EXISTS idx_fact_stock_status ON fact_stock_on_hand(status);

-- ── Fact: Stock Movements ──
CREATE TABLE IF NOT EXISTS fact_stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  odoo_move_id INTEGER,
  date_key TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT,
  product_sku TEXT,
  qty_moved REAL DEFAULT 0,
  move_type TEXT, -- in, out, internal
  source_location TEXT,
  dest_location TEXT,
  warehouse_name TEXT,
  picking_reference TEXT,
  company_id INTEGER NOT NULL DEFAULT 1,
  reference TEXT
);
CREATE INDEX IF NOT EXISTS idx_fact_movements_date ON fact_stock_movements(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_movements_company ON fact_stock_movements(company_id);

-- ── Fact: Invoices ──
CREATE TABLE IF NOT EXISTS fact_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  odoo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  move_type TEXT,
  state TEXT NOT NULL,
  partner_id INTEGER,
  partner_name TEXT,
  date_key TEXT NOT NULL,
  due_date_key TEXT,
  amount_total REAL DEFAULT 0,
  amount_residual REAL DEFAULT 0,
  payment_state TEXT,
  company_id INTEGER NOT NULL DEFAULT 1,
  origin TEXT -- linked SO
);
CREATE INDEX IF NOT EXISTS idx_fact_invoices_date ON fact_invoices(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_invoices_company ON fact_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_fact_invoices_payment ON fact_invoices(payment_state);

-- ── Fact: Exceptions ──
CREATE TABLE IF NOT EXISTS fact_exceptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exception_type TEXT NOT NULL, -- EX-SO-001 etc
  exception_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning', -- info, warning, critical
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  expected_state TEXT,
  actual_state TEXT,
  description TEXT,
  financial_impact REAL,
  company_id INTEGER NOT NULL DEFAULT 1,
  detected_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution_notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_exceptions_active ON fact_exceptions(is_active);
CREATE INDEX IF NOT EXISTS idx_exceptions_company ON fact_exceptions(company_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_severity ON fact_exceptions(severity);
CREATE INDEX IF NOT EXISTS idx_exceptions_type ON fact_exceptions(exception_type);

// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Shared Types
// ═══════════════════════════════════════════════════════════════

// ── Cloudflare Bindings ──
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  SYNC_QUEUE: Queue;
  TRANSFORM_QUEUE: Queue;
  ODOO_URL: string;
  ODOO_DB: string;
  ODOO_USER: string;
  ODOO_PASSWORD: string;
  JWT_SECRET: string;
}

// ── API Response Envelope ──
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    page?: number;
    per_page?: number;
    total?: number;
    cached?: boolean;
    sync_age_seconds?: number;
    company_id?: number;
    date_from?: string;
    date_to?: string;
  };
  error?: string;
}

// ── Auth ──
export interface AuthPayload {
  uid: number;
  odoo_uid: number;
  login: string;
  name: string;
  roles: string[];
  team_id: number | null;
  company_ids: number[];
  active_company_id: number;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthPayload;
}

// ── Companies ──
export interface Company {
  id: number;
  name: string;
  code: string;
}

// ── Date Filters (used on every page) ──
export interface DateFilters {
  date_from: string; // YYYY-MM-DD
  date_to: string;   // YYYY-MM-DD
  year: number;
  month: number | null; // null = all months
  day: number | null;   // null = all days
  compare_year: number | null;
}

// ── Sales ──
export interface SalesOverview {
  revenue: number;
  revenue_prior: number;
  revenue_delta_pct: number;
  orders_count: number;
  orders_prior: number;
  avg_order_value: number;
  gross_margin_pct: number;
  gross_margin_prior: number;
  completion_rate: number;
}

export interface RevenueTrendPoint {
  period: string; // YYYY-MM-DD or YYYY-MM or YYYY-WXX
  revenue: number;
  target: number;
  cost: number;
  compare_revenue: number | null;
}

export interface SalesOrder {
  id: string;
  odoo_id: number;
  name: string;
  partner_name: string;
  partner_id: number;
  state: 'draft' | 'sent' | 'sale' | 'done' | 'cancel';
  date_order: string;
  amount_total: number;
  amount_untaxed: number;
  user_name: string;
  team_name: string;
  company_id: number;
  lines: SalesOrderLine[];
  // Traceability
  has_delivery: boolean;
  delivery_state: 'none' | 'partial' | 'complete';
  delivery_count: number;
  has_invoice: boolean;
  invoice_state: 'none' | 'partial' | 'complete';
  invoice_count: number;
  is_paid: boolean;
  payment_state: 'not_paid' | 'partial' | 'paid' | 'reversed';
  days_since_order: number;
  lifecycle_stage: 'quotation' | 'confirmed' | 'delivering' | 'delivered' | 'invoiced' | 'paid' | 'cancelled';
}

export interface SalesOrderLine {
  id: number;
  product_name: string;
  product_sku: string;
  qty_ordered: number;
  qty_delivered: number;
  qty_invoiced: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
  line_cost: number;
  gross_margin: number;
}

export interface PipelineData {
  stage: string;
  count: number;
  value: number;
  pct_of_total: number;
}

// ── Stock ──
export interface StockOverview {
  total_on_hand: number;
  total_reserved: number;
  total_available: number;
  valuation_cost: number;
  valuation_list: number;
  stockout_count: number;
  low_stock_count: number;
  overstock_count: number;
  pending_receipts: number;
  turnover_rate: number;
}

export interface StockItem {
  id: number;
  product_name: string;
  sku: string;
  category: string;
  warehouse: string;
  location: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_point: number;
  incoming: number;
  outgoing: number;
  valuation_cost: number;
  valuation_list: number;
  last_move_days: number;
  status: 'stockout' | 'low' | 'healthy' | 'overstock';
}

export interface StockMovement {
  id: number;
  reference: string;
  product_name: string;
  product_sku: string;
  qty: number;
  move_type: 'in' | 'out' | 'internal';
  source_location: string;
  dest_location: string;
  warehouse: string;
  date: string;
  state: string;
  picking_reference: string;
}

export interface AgeingBucket {
  range: string;
  count: number;
  value: number;
  pct_of_total: number;
}

// ── Exceptions ──
export type ExceptionSeverity = 'info' | 'warning' | 'critical';
export type ExceptionType = 
  | 'EX-SO-001' | 'EX-SO-002' | 'EX-SO-003' | 'EX-SO-004' | 'EX-SO-005'
  | 'EX-ST-001' | 'EX-ST-002' | 'EX-ST-003' | 'EX-ST-004' | 'EX-ST-005';

export interface Exception {
  id: number;
  code: ExceptionType;
  name: string;
  severity: ExceptionSeverity;
  entity_type: 'sale_order' | 'stock_picking' | 'stock_quant' | 'account_move';
  entity_id: string;
  entity_name: string;
  expected_state: string;
  actual_state: string;
  description: string;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  company_id: number;
  financial_impact: number | null;
}

export interface ExceptionSummary {
  total_active: number;
  critical: number;
  warning: number;
  info: number;
  resolved_30d: number;
  avg_resolution_hours: number;
  by_type: Record<ExceptionType, number>;
}

// ── Transaction Completeness ──
export interface TransactionTimeline {
  order_id: string;
  stages: TimelineStage[];
  current_stage: string;
  is_complete: boolean;
  days_to_complete: number | null;
  exceptions: Exception[];
}

export interface TimelineStage {
  name: string;
  status: 'complete' | 'current' | 'pending' | 'exception';
  date: string | null;
  expected_by: string | null;
  details: string;
}

export interface CompletenessRate {
  transaction_type: 'sales' | 'stock';
  total: number;
  complete: number;
  in_progress: number;
  exceptions_warning: number;
  exceptions_critical: number;
  completion_pct: number;
  avg_days_to_complete: number;
  bottleneck_stage: string;
}

// ── Sync ──
export interface SyncMessage {
  model: string;
  action: 'incremental' | 'full' | 'reconcile';
  last_sync_at: string;
  company_id?: number;
}

export interface TransformMessage {
  trigger: 'post_sync' | 'scheduled';
  models_synced: string[];
  batch_id: string;
}

export interface SyncMetadata {
  model_name: string;
  last_sync_at: string;
  last_sync_count: number;
  last_error: string | null;
  updated_at: string;
}

// ── Odoo JSON-RPC ──
export interface OdooRpcRequest {
  jsonrpc: '2.0';
  method: 'call';
  id: number;
  params: {
    service: 'common' | 'object';
    method: string;
    args: any[];
  };
}

export interface OdooRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data: { name: string; debug: string; message: string };
  };
}

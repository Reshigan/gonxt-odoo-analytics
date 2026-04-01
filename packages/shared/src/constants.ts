// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Constants
// ═══════════════════════════════════════════════════════════════

export const EXCEPTION_DEFINITIONS = {
  'EX-SO-001': { name: 'Stale Quotation', entity_type: 'sale_order', soft_days: 7, hard_days: 14 },
  'EX-SO-002': { name: 'Missing Delivery', entity_type: 'sale_order', soft_hours: 24, hard_hours: 24 },
  'EX-SO-003': { name: 'Partial Delivery Stuck', entity_type: 'stock_picking', soft_days: 3, hard_days: 7 },
  'EX-SO-004': { name: 'Uninvoiced Delivery', entity_type: 'sale_order', soft_hours: 48, hard_days: 7 },
  'EX-SO-005': { name: 'Overdue Invoice', entity_type: 'account_move', soft_days: 30, hard_days: 60 },
  'EX-ST-001': { name: 'Stockout Risk', entity_type: 'stock_quant', soft_pct: 100, hard_pct: 0 },
  'EX-ST-002': { name: 'Receipt Overdue', entity_type: 'stock_picking', soft_hours: 24, hard_hours: 48 },
  'EX-ST-003': { name: 'Large Variance', entity_type: 'stock_quant', soft_pct: 10, hard_value: 10000 },
  'EX-ST-004': { name: 'Slow-Moving Stock', entity_type: 'stock_quant', soft_days: 90, hard_days: 180 },
  'EX-ST-005': { name: 'Delivery SLA Breach', entity_type: 'stock_picking', soft_days: 1, hard_days: 3 },
} as const;

export const LIFECYCLE_STAGES = {
  sales: [
    { key: 'quotation', label: 'Quotation', odoo_state: 'draft' },
    { key: 'confirmed', label: 'Confirmed', odoo_state: 'sale' },
    { key: 'delivering', label: 'Delivering', odoo_state: null },
    { key: 'delivered', label: 'Delivered', odoo_state: null },
    { key: 'invoiced', label: 'Invoiced', odoo_state: null },
    { key: 'paid', label: 'Paid', odoo_state: null },
  ],
  stock: [
    { key: 'receipt', label: 'Receipt', odoo_state: null },
    { key: 'putaway', label: 'Put-away', odoo_state: null },
    { key: 'pick', label: 'Pick', odoo_state: 'assigned' },
    { key: 'pack_ship', label: 'Pack/Ship', odoo_state: 'done' },
  ],
} as const;

export const ODOO_MODELS = {
  SALE_ORDER: 'sale.order',
  SALE_ORDER_LINE: 'sale.order.line',
  STOCK_PICKING: 'stock.picking',
  STOCK_MOVE: 'stock.move',
  STOCK_QUANT: 'stock.quant',
  PRODUCT_PRODUCT: 'product.product',
  PRODUCT_CATEGORY: 'product.category',
  ACCOUNT_MOVE: 'account.move',
  ACCOUNT_PAYMENT: 'account.payment',
  RES_PARTNER: 'res.partner',
  RES_USERS: 'res.users',
  RES_COMPANY: 'res.company',
} as const;

export const SYNC_FIELDS: Record<string, string[]> = {
  'sale.order': ['name', 'state', 'date_order', 'partner_id', 'amount_total', 'amount_untaxed', 'user_id', 'team_id', 'company_id', 'order_line', 'invoice_ids', 'picking_ids', 'write_date'],
  'sale.order.line': ['order_id', 'product_id', 'product_uom_qty', 'qty_delivered', 'qty_invoiced', 'price_unit', 'price_subtotal', 'discount', 'state', 'write_date'],
  'stock.picking': ['name', 'state', 'picking_type_id', 'partner_id', 'scheduled_date', 'date_done', 'origin', 'location_id', 'location_dest_id', 'company_id', 'move_ids', 'write_date'],
  'stock.move': ['product_id', 'product_uom_qty', 'quantity', 'state', 'location_id', 'location_dest_id', 'picking_id', 'date', 'reference', 'company_id', 'write_date'],
  'stock.quant': ['product_id', 'location_id', 'quantity', 'reserved_quantity', 'lot_id', 'company_id', 'write_date'],
  'product.product': ['name', 'default_code', 'categ_id', 'list_price', 'standard_price', 'type', 'qty_available', 'virtual_available', 'company_id', 'write_date'],
  'product.category': ['name', 'parent_id', 'complete_name', 'write_date'],
  'account.move': ['name', 'move_type', 'state', 'partner_id', 'invoice_date', 'invoice_date_due', 'amount_total', 'amount_residual', 'payment_state', 'company_id', 'write_date'],
  'account.payment': ['name', 'state', 'payment_type', 'amount', 'date', 'partner_id', 'ref', 'company_id', 'write_date'],
  'res.partner': ['name', 'company_type', 'city', 'country_id', 'is_company', 'active', 'write_date'],
  'res.users': ['name', 'login', 'sale_team_id', 'company_id', 'company_ids', 'groups_id', 'write_date'],
  'res.company': ['name', 'currency_id', 'write_date'],
};

export const SYNC_CADENCE = {
  'sale.order': 300,       // 5 minutes
  'sale.order.line': 300,
  'stock.picking': 900,    // 15 minutes
  'stock.move': 900,
  'stock.quant': 900,
  'account.move': 900,
  'account.payment': 900,
  'product.product': 3600, // 1 hour
  'product.category': 86400, // daily
  'res.partner': 86400,
  'res.users': 86400,
  'res.company': 86400,
} as const;

// South African public holidays 2024-2027
export const SA_HOLIDAYS: Record<number, string[]> = {
  2024: ['2024-01-01','2024-03-21','2024-03-29','2024-04-01','2024-04-27','2024-05-01','2024-06-16','2024-06-17','2024-08-09','2024-09-24','2024-12-16','2024-12-25','2024-12-26'],
  2025: ['2025-01-01','2025-03-21','2025-04-18','2025-04-21','2025-04-27','2025-04-28','2025-05-01','2025-06-16','2025-08-09','2025-09-24','2025-12-16','2025-12-25','2025-12-26'],
  2026: ['2026-01-01','2026-01-02','2026-03-21','2026-04-03','2026-04-06','2026-04-27','2026-05-01','2026-06-16','2026-08-09','2026-08-10','2026-09-24','2026-12-16','2026-12-25','2026-12-26'],
  2027: ['2027-01-01','2027-03-21','2027-03-22','2027-03-26','2027-03-29','2027-04-27','2027-05-01','2027-06-16','2027-08-09','2027-09-24','2027-12-16','2027-12-25','2027-12-26'],
};

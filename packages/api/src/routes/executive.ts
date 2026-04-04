// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Executive Visibility Routes
// Specialized endpoints for executive-level insights and metrics
// ═══════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import type { Env } from '../../../shared/src/types';
import { requireAuth, requireExecutiveVisibility, requireOperationalVisibility } from '../middleware/rbac';

type HonoEnv = { Bindings: Env };
export const executiveRoutes = new Hono<HonoEnv>();

// Protected executive routes - only accessible to executives and admins
executiveRoutes.use('*', requireAuth(), requireExecutiveVisibility());

/**
 * GET /executive/dashboard
 * Comprehensive executive dashboard with KPIs and strategic metrics
 */
executiveRoutes.get('/dashboard', async (c) => {
  const db = c.env.DB;
  
  // Overall business performance
  const performanceQuery = await db.prepare(`
    SELECT 
      SUM(CASE WHEN strftime('%Y', date_key) = strftime('%Y', 'now') THEN line_total ELSE 0 END) as ytd_revenue,
      SUM(CASE WHEN strftime('%Y', date_key) = strftime('%Y', 'now', '-1 year') THEN line_total ELSE 0 END) as ly_ytd_revenue,
      COUNT(DISTINCT CASE WHEN strftime('%Y', date_key) = strftime('%Y', 'now') THEN order_odoo_id END) as ytd_orders,
      AVG(line_total) as avg_order_value,
      SUM(line_total - line_cost) as gross_profit,
      ROUND((SUM(line_total - line_cost) * 100.0 / NULLIF(SUM(line_total), 0)), 2) as gross_margin_pct
    FROM fact_sales_orders
    WHERE order_state IN ('sale', 'done')
  `).run();
  
  const performance = performanceQuery.rows[0];

  // Revenue trend by month
  const trendQuery = await db.prepare(`
    SELECT 
      strftime('%Y-%m', date_key) as month,
      SUM(line_total) as revenue,
      COUNT(DISTINCT order_odoo_id) as order_count
    FROM fact_sales_orders
    WHERE date_key >= date('now', '-12 months')
      AND order_state IN ('sale', 'done')
    GROUP BY strftime('%Y-%m', date_key)
    ORDER BY month
  `).run();
  
  const revenueTrend = trendQuery.rows;

  // Top performing entities
  const topCustomersQuery = await db.prepare(`
    SELECT 
      partner_name,
      COUNT(*) as order_count,
      SUM(line_total) as revenue
    FROM fact_sales_orders
    WHERE date_key >= date('now', '-12 months')
      AND order_state IN ('sale', 'done')
    GROUP BY partner_id, partner_name
    ORDER BY revenue DESC
    LIMIT 10
  `).run();
  
  const topCustomers = topCustomersQuery.rows;

  // Exception overview
  const exceptionSummaryQuery = await db.prepare(`
    SELECT 
      severity,
      COUNT(*) as count
    FROM fact_exceptions
    WHERE is_active = 1
    GROUP BY severity
  `).run();
  
  const exceptionsBySeverity: any = {};
  exceptionSummaryQuery.rows.forEach(row => {
    exceptionsBySeverity[row.severity] = row.count;
  });

  return c.json({
    success: true,
    data: {
      kpis: {
        ytd_revenue: performance.ytd_revenue || 0,
        revenue_growth: performance.ly_ytd_revenue ? 
          ((performance.ytd_revenue - performance.ly_ytd_revenue) / performance.ly_ytd_revenue * 100) : 0,
        ytd_orders: performance.ytd_orders || 0,
        avg_order_value: performance.avg_order_value || 0,
        gross_margin_pct: performance.gross_margin_pct || 0,
        ytd_gross_profit: performance.gross_profit || 0
      },
      revenue_trend: revenueTrend,
      top_customers: topCustomers,
      active_exceptions: {
        critical: exceptionsBySeverity.critical || 0,
        warning: exceptionsBySeverity.warning || 0,
        info: exceptionsBySeverity.info || 0
      }
    },
    meta: {
      generated_at: new Date().toISOString()
    }
  });
});

/**
 * GET /executive/financial-performance
 * Detailed financial performance analysis with trends and forecasts
 */
executiveRoutes.get('/financial-performance', async (c) => {
  const db = c.env.DB;
  const companyId = parseInt(c.req.query('company_id') || '0');
  
  // Quarterly financial performance
  let quarterlyQuery = `
    SELECT 
      CASE 
        WHEN CAST(strftime('%m', date_key) AS INTEGER) BETWEEN 1 AND 3 THEN 'Q1'
        WHEN CAST(strftime('%m', date_key) AS INTEGER) BETWEEN 4 AND 6 THEN 'Q2'
        WHEN CAST(strftime('%m', date_key) AS INTEGER) BETWEEN 7 AND 9 THEN 'Q3'
        ELSE 'Q4'
      END as quarter,
      strftime('%Y', date_key) as year,
      SUM(line_total) as revenue,
      SUM(line_cost) as cost,
      SUM(line_total - line_cost) as profit,
      ROUND((SUM(line_total - line_cost) * 100.0 / NULLIF(SUM(line_total), 0)), 2) as margin_pct,
      COUNT(DISTINCT order_odoo_id) as orders
    FROM fact_sales_orders
    WHERE order_state IN ('sale', 'done')
  `;
  
  const queryParams = [];
  if (companyId > 0) {
    quarterlyQuery += ` AND company_id = ?`;
    queryParams.push(companyId);
  }
  
  quarterlyQuery += `
    GROUP BY 
      CASE 
        WHEN CAST(strftime('%m', date_key) AS INTEGER) BETWEEN 1 AND 3 THEN 'Q1'
        WHEN CAST(strftime('%m', date_key) AS INTEGER) BETWEEN 4 AND 6 THEN 'Q2'
        WHEN CAST(strftime('%m', date_key) AS INTEGER) BETWEEN 7 AND 9 THEN 'Q3'
        ELSE 'Q4'
      END,
      strftime('%Y', date_key)
    ORDER BY year DESC, quarter
    LIMIT 8
  `;
  
  const quarterlyPerformance = await db.prepare(quarterlyQuery).bind(...queryParams).run();
  
  // Year-over-year growth analysis
  let yoyQuery = `
    SELECT 
      strftime('%Y', date_key) as year,
      SUM(line_total) as revenue,
      SUM(line_cost) as cost,
      SUM(line_total - line_cost) as profit,
      COUNT(DISTINCT order_odoo_id) as orders
    FROM fact_sales_orders
    WHERE order_state IN ('sale', 'done')
  `;
  
  if (companyId > 0) {
    yoyQuery += ` AND company_id = ?`;
    queryParams.push(companyId);
  }
  
  yoyQuery += `
    GROUP BY strftime('%Y', date_key)
    ORDER BY year DESC
    LIMIT 5
  `;
  
  const yoyPerformance = await db.prepare(yoyQuery).bind(...queryParams).run();

  return c.json({
    success: true,
    data: {
      quarterly_performance: quarterlyPerformance.rows,
      yearly_performance: yoyPerformance.rows
    },
    meta: {
      company_id: companyId > 0 ? companyId : null
    }
  });
});

/**
 * GET /executive/customer-intelligence
 * Deep customer analysis including segmentation and lifetime value
 */
executiveRoutes.get('/customer-intelligence', async (c) => {
  const db = c.env.DB;
  const companyId = parseInt(c.req.query('company_id') || '0');
  const limit = parseInt(c.req.query('limit') || '20');
  
  // Customer segmentation and RFM analysis
  let customerAnalysisQuery = `
    SELECT 
      partner_name,
      partner_id,
      COUNT(DISTINCT order_odoo_id) as order_frequency,
      SUM(line_total) as total_revenue,
      AVG(line_total) as avg_order_value,
      MAX(date_key) as last_order_date,
      MIN(date_key) as first_order_date,
      CASE 
        WHEN COUNT(DISTINCT order_odoo_id) >= 10 THEN 'High Frequency'
        WHEN COUNT(DISTINCT order_odoo_id) >= 5 THEN 'Medium Frequency'
        ELSE 'Low Frequency'
      END as frequency_segment,
      CASE 
        WHEN SUM(line_total) >= 100000 THEN 'High Value'
        WHEN SUM(line_total) >= 50000 THEN 'Medium Value'
        ELSE 'Low Value'
      END as value_segment
    FROM fact_sales_orders
    WHERE order_state IN ('sale', 'done')
  `;
  
  const queryParams = [];
  if (companyId > 0) {
    customerAnalysisQuery += ` AND company_id = ?`;
    queryParams.push(companyId);
  }
  
  customerAnalysisQuery += `
    GROUP BY partner_id, partner_name
    HAVING COUNT(DISTINCT order_odoo_id) > 0
    ORDER BY total_revenue DESC
    LIMIT ?
  `;
  
  queryParams.push(limit);
  
  const customerAnalysis = await db.prepare(customerAnalysisQuery).bind(...queryParams).run();

  return c.json({
    success: true,
    data: {
      customers: customerAnalysis.rows
    },
    meta: {
      company_id: companyId > 0 ? companyId : null,
      limit: limit
    }
  });
});

/**
 * GET /executive/companies
 * Multi-company performance comparison
 */
executiveRoutes.get('/companies', async (c) => {
  const db = c.env.DB;
  
  const companyPerformanceQuery = await db.prepare(`
    SELECT 
      co.name as company_name,
      COUNT(DISTINCT fso.order_odoo_id) as orders,
      SUM(fso.line_total) as revenue,
      SUM(fso.line_total - fso.line_cost) as profit,
      ROUND((SUM(fso.line_total - fso.line_cost) * 100.0 / NULLIF(SUM(fso.line_total), 0)), 2) as margin_pct,
      COUNT(DISTINCT fso.partner_id) as customers
    FROM fact_sales_orders fso
    JOIN stg_companies co ON fso.company_id = co.odoo_id
    WHERE fso.date_key >= date('now', '-3 months')
      AND fso.order_state IN ('sale', 'done')
    GROUP BY fso.company_id, co.name
    ORDER BY revenue DESC
  `).run();
  
  const companyPerformance = companyPerformanceQuery.rows;

  return c.json({
    success: true,
    data: {
      companies: companyPerformance
    }
  });
});

/**
 * GET /executive/product-performance
 * Deep product analysis including profitability and market trends
 */
executiveRoutes.get('/product-performance', async (c) => {
  const db = c.env.DB;
  const companyId = parseInt(c.req.query('company_id') || '0');
  const limit = parseInt(c.req.query('limit') || '20');
  
  // Product performance analysis
  let productQuery = `
    SELECT 
      product_name,
      product_sku,
      SUM(line_total) as revenue,
      SUM(line_cost) as cost,
      SUM(line_total - line_cost) as profit,
      SUM(qty_ordered) as quantity_sold,
      ROUND((SUM(line_total - line_cost) * 100.0 / NULLIF(SUM(line_total), 0)), 2) as margin_pct,
      COUNT(DISTINCT order_odoo_id) as order_frequency,
      AVG(line_total) as avg_order_value
    FROM fact_sales_orders
    WHERE order_state IN ('sale', 'done')
      AND product_name IS NOT NULL
  `;
  
  const queryParams = [];
  if (companyId > 0) {
    productQuery += ` AND company_id = ?`;
    queryParams.push(companyId);
  }
  
  productQuery += `
    GROUP BY product_name, product_sku
    ORDER BY revenue DESC
    LIMIT ?
  `;
  
  queryParams.push(limit);
  
  const productPerformance = await db.prepare(productQuery).bind(...queryParams).run();

  return c.json({
    success: true,
    data: {
      products: productPerformance.rows
    },
    meta: {
      company_id: companyId > 0 ? companyId : null,
      limit: limit
    }
  });
});

/**
 * GET /executive/team-performance
 * Sales team and department performance metrics
 */
executiveRoutes.get('/team-performance', async (c) => {
  const db = c.env.DB;
  
  const teamPerformanceQuery = await db.prepare(`
    SELECT 
      team_name,
      COUNT(DISTINCT order_odoo_id) as orders,
      SUM(line_total) as revenue,
      AVG(line_total) as avg_order_value,
      COUNT(DISTINCT partner_id) as customers,
      COUNT(DISTINCT user_id) as active_salespeople,
      SUM(line_total - line_cost) as profit,
      ROUND((SUM(line_total - line_cost) * 100.0 / NULLIF(SUM(line_total), 0)), 2) as margin_pct
    FROM fact_sales_orders
    WHERE date_key >= date('now', '-3 months')
      AND order_state IN ('sale', 'done')
      AND team_name IS NOT NULL
    GROUP BY team_name
    ORDER BY revenue DESC
  `).run();
  
  const teamPerformance = teamPerformanceQuery.rows;

  return c.json({
    success: true,
    data: {
      teams: teamPerformance
    }
  });
});

// Protected operational routes - accessible to operations staff and above
executiveRoutes.use('/operational/*', requireAuth(), requireOperationalVisibility());

/**
 * GET /executive/operational/daily-summary
 * Daily operational summary for operations teams
 */
executiveRoutes.get('/operational/daily-summary', async (c) => {
  const db = c.env.DB;
  
  // Today's metrics
  const todayQuery = await db.prepare(`
    SELECT 
      COUNT(CASE WHEN order_state = 'sale' THEN 1 END) as confirmed_today,
      COUNT(CASE WHEN delivery_state = 'complete' THEN 1 END) as delivered_today,
      COUNT(CASE WHEN invoice_state = 'paid' THEN 1 END) as paid_today,
      COUNT(CASE WHEN lifecycle_stage IN ('quotation', 'confirmed') THEN 1 END) as pipeline_items,
      SUM(CASE WHEN order_state = 'sale' THEN line_total ELSE 0 END) as revenue_confirmed
    FROM fact_sales_orders
    WHERE date(date_key) = date('now')
  `).run();
  
  const today = todayQuery.rows[0];

  // Pending items
  const pendingQuery = await db.prepare(`
    SELECT 
      'Late Deliveries' as category,
      COUNT(*) as count
    FROM fact_sales_orders
    WHERE delivery_state != 'complete' 
      AND date(date_key) < date('now')
      AND order_state = 'sale'
    UNION ALL
    SELECT 
      'Unpaid Invoices' as category,
      COUNT(*) as count
    FROM fact_sales_orders
    WHERE payment_state != 'paid' 
      AND date(date_key) < date('now', '-30 days')
      AND invoice_state = 'complete'
    UNION ALL
    SELECT 
      'Overdue Quotes' as category,
      COUNT(*) as count
    FROM fact_sales_orders
    WHERE lifecycle_stage = 'quotation' 
      AND date(date_key) < date('now', '-30 days')
  `).run();
  
  const pendingItems = pendingQuery.rows.reduce((acc: any, row: any) => {
    acc[row.category.toLowerCase().replace(' ', '_')] = row.count;
    return acc;
  }, {});

  return c.json({
    success: true,
    data: {
      today_summary: today,
      pending_items: pendingItems
    },
    meta: {
      as_of: new Date().toISOString()
    }
  });
});

/**
 * GET /executive/operational/exceptions
 * Real-time exception monitoring
 */
executiveRoutes.get('/operational/exceptions', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '50');
  const severity = c.req.query('severity') || null;
  const entityType = c.req.query('entity_type') || null;
  
  let exceptionsQuery = `
    SELECT 
      fe.id,
      fe.exception_type,
      fe.exception_name,
      fe.severity,
      fe.entity_type,
      fe.entity_name,
      fe.description,
      fe.detected_at,
      fe.financial_impact,
      so.name as related_order
    FROM fact_exceptions fe
    LEFT JOIN stg_sale_orders so ON 
      CAST(fe.entity_id AS INTEGER) = so.odoo_id 
      AND fe.entity_type = 'sale_order'
    WHERE fe.is_active = 1
  `;
  
  const queryParams = [];
  if (severity) {
    exceptionsQuery += ` AND fe.severity = ?`;
    queryParams.push(severity);
  }
  
  if (entityType) {
    exceptionsQuery += ` AND fe.entity_type = ?`;
    queryParams.push(entityType);
  }
  
  exceptionsQuery += `
    ORDER BY 
      CASE fe.severity 
        WHEN 'critical' THEN 1 
        WHEN 'warning' THEN 2 
        WHEN 'info' THEN 3 
      END,
      fe.detected_at DESC
    LIMIT ?
  `;
  
  queryParams.push(limit);
  
  const exceptionsQueryResult = await db.prepare(exceptionsQuery).bind(...queryParams).run();
  const exceptions = exceptionsQueryResult.rows;

  return c.json({
    success: true,
    data: {
      exceptions: exceptions,
      count: exceptions.length
    }
  });
});

/**
 * GET /executive/operational/exception-analysis
 * Detailed exception analysis by type and trend
 */
executiveRoutes.get('/operational/exception-analysis', async (c) => {
  const db = c.env.DB;
  
  // Exception summary by type and severity
  const exceptionSummaryQuery = await db.prepare(`
    SELECT 
      exception_type,
      exception_name,
      severity,
      COUNT(*) as count,
      SUM(financial_impact) as total_financial_impact,
      MAX(detected_at) as last_detected
    FROM fact_exceptions
    WHERE is_active = 1
    GROUP BY exception_type, exception_name, severity
    ORDER BY 
      CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'warning' THEN 2 
        WHEN 'info' THEN 3 
      END,
      count DESC
  `).run();
  
  const exceptionSummary = exceptionSummaryQuery.rows;

  // Exception trend over time
  const exceptionTrendQuery = await db.prepare(`
    SELECT 
      DATE(detected_at) as date,
      COUNT(*) as count,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning,
      SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info
    FROM fact_exceptions
    WHERE detected_at >= date('now', '-30 days')
    GROUP BY DATE(detected_at)
    ORDER BY date DESC
  `).run();
  
  const exceptionTrend = exceptionTrendQuery.rows;

  return c.json({
    success: true,
    data: {
      summary: exceptionSummary,
      trend: exceptionTrend
    }
  });
});
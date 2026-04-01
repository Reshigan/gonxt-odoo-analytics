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
      COUNT(DISTINCT user_id) as active_salespeople
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
  
  const exceptionsQuery = await db.prepare(`
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
    ORDER BY 
      CASE fe.severity 
        WHEN 'critical' THEN 1 
        WHEN 'warning' THEN 2 
        WHEN 'info' THEN 3 
      END,
      fe.detected_at DESC
    LIMIT ?
  `).bind(limit).run();
  
  const exceptions = exceptionsQuery.rows;

  return c.json({
    success: true,
    data: {
      exceptions: exceptions,
      count: exceptions.length
    }
  });
});
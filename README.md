# GONXT Odoo 18 Executive Reporting & Analytics Platform

**Cloudflare-Native Architecture** — Workers · D1 · KV · Queues · Pages

## Architecture

```
Odoo 18 (erp.gonxt.tech)
  → Cron Triggers (5min/15min/hourly/daily)
  → Sync Worker → Queue → D1 (staging tables)
  → Transform Worker → D1 (analytics facts/dims)
  → KV (pre-aggregated dashboards)
  → API Worker (Hono) → Pages (Next.js)
  → Executive Browser
```

## Quick Start

### 1. Prerequisites
- Node.js 20+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers Paid plan
- Access to erp.gonxt.tech (Odoo 18)

### 2. Create Odoo Service Account
```bash
# SSH into Odoo server
cd /opt/odoo
python3 odoo-bin shell -d gonxt --addons-path=addons
```
```python
user = env['res.users'].create({
    'name': 'GONXT Analytics Service',
    'login': 'analytics@gonxt.tech',
    'password': 'analytics1234#',
    'groups_id': [(6, 0, [
        env.ref('base.group_user').id,
        env.ref('sales_team.group_sale_salesman_all_leads').id,
        env.ref('sales_team.group_sale_manager').id,
        env.ref('stock.group_stock_manager').id,
        env.ref('account.group_account_readonly').id,
    ])],
    'active': True,
})
env.cr.commit()
```

### 3. Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### 4. Create Cloudflare Resources
```bash
wrangler d1 create gonxt-odoo-analytics
wrangler kv namespace create GONXT_ANALYTICS_CACHE
wrangler queues create odoo-sync-queue
wrangler queues create odoo-transform-queue
wrangler queues create odoo-sync-dlq
```
Update the database_id and KV id in all wrangler.toml files.

### 5. Set Secrets
```bash
cd packages/api && wrangler secret put ODOO_PASSWORD  # enter: analytics1234#
wrangler secret put JWT_SECRET  # enter a 256-bit random string
cd ../sync && wrangler secret put ODOO_PASSWORD
```

### 6. Run D1 Migrations
```bash
node scripts/migrate.js
```

### 7. Test Odoo Connection
```bash
npx tsx scripts/test-odoo-connection.ts
```

### 8. Deploy
```bash
# API Worker
cd packages/api && wrangler deploy

# Sync Worker
cd ../sync && wrangler deploy
wrangler deploy --config wrangler-transform.toml

# Frontend
cd ../../frontend && npm run build
wrangler pages deploy out --project-name=gonxt-odoo-analytics-ui
```

### 9. DNS
Add to gonxt.tech Cloudflare zone:
- `analytics.gonxt.tech` → CNAME → `gonxt-odoo-analytics-ui.pages.dev` (proxied)
- `analytics-api.gonxt.tech` → Worker route

## Project Structure

```
gonxt-odoo-analytics/
├── packages/
│   ├── api/                    # Hono API Worker
│   │   ├── src/
│   │   │   ├── index.ts        # Hono app entry
│   │   │   ├── routes/         # sales, stock, exceptions, auth, health
│   │   │   └── db/migrations/  # D1 SQL migrations
│   │   └── wrangler.toml
│   ├── sync/                   # Sync + Transform Workers
│   │   ├── src/
│   │   │   ├── odoo-client.ts  # JSON-RPC client (native fetch)
│   │   │   ├── sync-worker.ts  # Cron + Queue consumer
│   │   │   └── transform-worker.ts
│   │   ├── wrangler.toml
│   │   └── wrangler-transform.toml
│   └── shared/                 # Shared types, constants, utils
│       └── src/
├── frontend/                   # Next.js 15 (Cloudflare Pages)
│   └── src/
│       ├── app/                # Pages: dashboard, sales, stock, exceptions
│       ├── components/         # DateFilterBar, CoreUI, OrderDetail, AppLayout
│       └── lib/                # api-client, formatters
├── scripts/                    # Migration runner, Odoo test, seed
└── docs/                       # Specification documents
```

## Features
- **Multi-Company**: Admin switches active company from sidebar; all data filters by company_id
- **Year-on-Year**: Every page has year selector + compare year for YoY analysis
- **Month & Day Selectors**: DateFilterBar on every page with year → month → day drill-down
- **Quote-to-Invoice Traceability**: Visual timeline (Quotation → Confirmed → Delivered → Invoiced → Paid) on every sales order
- **Full Stock Visibility**: On-hand, reserved, available, incoming, reorder point, ageing, warehouse breakdown
- **Exception Engine**: 10 auto-detected exception types (EX-SO-001 to EX-ST-005) with severity classification
- **Actuals vs Exceptions**: Transactions classified as Complete, In Progress, Warning, Critical, or Resolved

## OpenHands Build Phases
| Phase | Scope |
|-------|-------|
| P0 | Scaffold monorepo, wrangler.toml, D1 migrations |
| P1 | OdooClient (JSON-RPC via fetch), connection test |
| P2 | Cron + Queue sync workers, staging tables populated |
| P3 | SQL transforms (staging → analytics), TCE |
| P4 | KV aggregation writer |
| P5 | Hono API routes with cache middleware |
| P6 | Next.js shell with auth + layout |
| P7 | Dashboard charts + data tables |
| P8 | Polish, error handling, exports |

## Odoo Connection
- URL: `https://erp.gonxt.tech`
- DB: `gonxt`
- User: `analytics@gonxt.tech`
- Password: stored as Workers Secret
- Protocol: JSON-RPC via `/jsonrpc` (native fetch, no xmlrpc library)

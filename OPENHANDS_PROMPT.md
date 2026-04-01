# GONXT Odoo 18 Analytics Platform — OpenHands Build Prompt

You are building the GONXT Odoo 18 Executive Reporting & Analytics Platform. This is a fully Cloudflare-native application (Workers, D1, KV, Queues, Pages). The codebase scaffold is already created — your job is to wire everything together, connect to the live Odoo instance, and make the frontend render real data.

## Architecture

- **API Worker**: Hono framework (TypeScript) on Cloudflare Workers — serves REST endpoints
- **Sync Worker**: Cron Triggers fire scheduled syncs → Queue messages → consumers pull from Odoo JSON-RPC → write to D1 staging tables
- **Transform Worker**: Queue consumer — runs SQL transforms from staging → analytics fact/dimension tables, then runs the Transaction Completeness Engine (TCE) to detect exceptions, then writes pre-aggregated dashboard data to KV
- **Frontend**: Next.js 15 with App Router, static export to Cloudflare Pages. Uses Recharts for charts, TailwindCSS for styling, DM Sans + JetBrains Mono fonts.
- **Database**: D1 (SQLite at the edge). All tables are defined in the migration files.
- **Cache**: KV stores pre-computed aggregations with TTLs matching sync cadence.

## Odoo Connection

- URL: https://erp.gonxt.tech
- Database: gonxt
- User: analytics@gonxt.tech
- Password: analytics1234# (stored as Workers Secret, never in code)
- Protocol: JSON-RPC via /jsonrpc endpoint using native fetch() — do NOT use xmlrpc Node.js library

## Critical Rules

1. **TypeScript everywhere.** No JavaScript files except config.
2. **D1 queries use raw SQL** via `env.DB.prepare(sql).bind(...params)`. No ORMs.
3. **KV reads first, D1 fallback.** API endpoints check `env.CACHE.get(key)` before querying D1.
4. **Odoo client uses native fetch()** — Workers runtime has no Node.js APIs. The OdooClient class in `packages/sync/src/odoo-client.ts` constructs JSON-RPC payloads manually.
5. **Never write to Odoo.** All operations are read-only against the ERP.
6. **South African locale**: ZAR currency (R symbol), DD/MM/YYYY dates, SAST timezone (UTC+2), SA public holidays in dim_date.
7. **Multi-company**: Every query must filter by company_id. The frontend passes company_id in every API call.
8. **Date filtering**: Every API endpoint accepts year, month (optional), day (optional), compare_year (optional). Build date ranges from these params.
9. **Error handling**: Workers return `{ success: false, error: "message" }`. Sync jobs retry via Queue max_retries.
10. **Tests**: Write Vitest tests alongside every module. Use Miniflare for D1/KV bindings in tests.

## Build Sequence

Work through these phases IN ORDER. Complete each fully before starting the next.

### Phase 0: Verify Scaffold
- Run `npm install` at root and in `frontend/`
- Verify wrangler.toml files are valid: `cd packages/api && wrangler dev` should start
- Run D1 migrations: `node scripts/migrate.js`

### Phase 1: Odoo Client
- Test the OdooClient by running `npx tsx scripts/test-odoo-connection.ts`
- Verify authentication succeeds and all 11 models return record counts
- Fix any issues with the JSON-RPC payload format

### Phase 2: Data Sync
- Deploy the sync worker and verify cron triggers fire
- Check that stg_* tables in D1 are populated with data from Odoo
- Verify incremental sync works (re-running only pulls changed records)

### Phase 3: Transforms + TCE
- Run the transform worker and verify fact_* and dim_* tables are populated
- Verify the Transaction Completeness Engine detects exceptions
- Check fact_exceptions table has auto-detected entries

### Phase 4: KV Aggregation
- Verify KV keys are written after transform completes
- Check agg:sales:overview, agg:stock:overview, agg:exceptions:summary keys

### Phase 5: API Layer
- Test all Hono routes with curl or the wrangler dev server
- Verify auth flow against Odoo (POST /api/v1/auth/login)
- Verify RBAC filters data by company_id
- Verify cache middleware returns cached:true when KV has data

### Phase 6: Frontend — Connect to Real API
- Replace mock data functions in DashboardPage, SalesPage, StockPage, ExceptionsPage with real fetch calls to the API client (frontend/src/lib/api-client.ts)
- Wire up the DateFilterBar state to API query parameters
- Test company switching, year/month/day selection

### Phase 7: Order Detail + Traceability
- Wire OrderDetail modal to /api/v1/sales/orders/:id endpoint
- Verify timeline shows correct lifecycle stage from real data
- Verify line-level delivery/invoice tracking

### Phase 8: Polish
- Add loading states (skeleton screens) to all pages
- Add error boundaries and toast notifications
- Implement CSV export on all tables
- Verify responsive layout on mobile
- Deploy to production

## File Locations

All code is in the monorepo at the project root:
- Backend API: `packages/api/src/`
- Sync/Transform: `packages/sync/src/`
- Shared types: `packages/shared/src/`
- Frontend pages: `frontend/src/app/`
- Frontend components: `frontend/src/components/`
- D1 migrations: `packages/api/src/db/migrations/`
- Scripts: `scripts/`

## Key Components to Wire Up

1. **DateFilterBar** (`frontend/src/components/DateFilterBar.tsx`) — already built with year/month/day/company/compare selectors. The FilterState type drives all API calls.

2. **api-client.ts** (`frontend/src/lib/api-client.ts`) — typed fetch wrapper with all endpoint functions. Currently the pages use mock data — replace mock functions with these API calls.

3. **OdooClient** (`packages/sync/src/odoo-client.ts`) — JSON-RPC client. Test with `scripts/test-odoo-connection.ts` first.

4. **Transform Worker** (`packages/sync/src/transform-worker.ts`) — SQL transforms and TCE. The SQL may need adjustment based on actual Odoo data shapes.

## What "Done" Looks Like

- Login with Odoo credentials → JWT issued → session in KV
- Dashboard shows real revenue, orders, margin from Odoo data
- Sales page shows actual sales orders with quote-to-invoice traceability
- Clicking an order shows the timeline with real delivery/invoice states
- Stock page shows real inventory from stock.quant
- Exceptions auto-detected from data anomalies
- Year/Month/Day selectors filter all data on every page
- Company switcher changes all data across all pages
- YoY comparison works when compare_year is selected
- All pages load in <2 seconds
- Mobile responsive

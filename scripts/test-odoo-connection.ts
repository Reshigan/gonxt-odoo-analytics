// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Connection Test Script
// Run: npx tsx scripts/test-odoo-connection.ts
// ═══════════════════════════════════════════════════════════════

const ODOO_URL = process.env.ODOO_URL || 'https://erp.gonxt.tech';
const ODOO_DB = process.env.ODOO_DB || 'gonxt';
const ODOO_USER = process.env.ODOO_USER || 'analytics@gonxt.tech';
const ODOO_PASS = process.env.ODOO_PASSWORD || 'analytics1234#';

interface RpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: { code: number; message: string; data: { message: string } };
}

async function rpc(service: string, method: string, args: any[]): Promise<any> {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: Date.now(),
      params: { service, method, args },
    }),
  });
  const data: RpcResponse = await res.json();
  if (data.error) throw new Error(data.error.data?.message || data.error.message);
  return data.result;
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  GONXT Odoo 18 Connection Test');
  console.log('═══════════════════════════════════════════');
  console.log(`URL:  ${ODOO_URL}`);
  console.log(`DB:   ${ODOO_DB}`);
  console.log(`User: ${ODOO_USER}`);
  console.log('');

  // 1. Authenticate
  console.log('1. Authenticating...');
  const uid = await rpc('common', 'authenticate', [ODOO_DB, ODOO_USER, ODOO_PASS, {}]);
  if (!uid) { console.error('   ✗ Authentication FAILED'); process.exit(1); }
  console.log(`   ✓ Authenticated — UID: ${uid}`);
  console.log('');

  // 2. Test models
  const models = [
    'sale.order', 'sale.order.line', 'stock.picking', 'stock.move',
    'stock.quant', 'product.product', 'product.category',
    'account.move', 'account.payment', 'res.partner', 'res.users', 'res.company',
  ];

  console.log('2. Testing model access:');
  for (const model of models) {
    try {
      const count = await rpc('object', 'execute_kw', [ODOO_DB, uid, ODOO_PASS, model, 'search_count', [[]]]);
      console.log(`   ✓ ${model.padEnd(22)} ${String(count).padStart(8)} records`);
    } catch (err: any) {
      console.log(`   ✗ ${model.padEnd(22)} ERROR: ${err.message}`);
    }
  }
  console.log('');

  // 3. Test incremental sync
  console.log('3. Testing incremental sync pattern:');
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString().replace('T', ' ').slice(0, 19);
  try {
    const recentSO = await rpc('object', 'execute_kw', [
      ODOO_DB, uid, ODOO_PASS, 'sale.order', 'search_count',
      [[['write_date', '>', oneHourAgo]]],
    ]);
    console.log(`   ✓ sale.order modified in last hour: ${recentSO}`);
  } catch (err: any) {
    console.log(`   ✗ Incremental query failed: ${err.message}`);
  }
  console.log('');

  // 4. Test multi-company
  console.log('4. Checking multi-company:');
  try {
    const companies = await rpc('object', 'execute_kw', [
      ODOO_DB, uid, ODOO_PASS, 'res.company', 'search_read',
      [[]],
      { fields: ['name', 'currency_id'] },
    ]);
    companies.forEach((c: any) => {
      const currency = Array.isArray(c.currency_id) ? c.currency_id[1] : c.currency_id;
      console.log(`   ✓ Company ${c.id}: ${c.name} (${currency})`);
    });
  } catch (err: any) {
    console.log(`   ✗ Company query failed: ${err.message}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Connection test COMPLETE');
  console.log('═══════════════════════════════════════════');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

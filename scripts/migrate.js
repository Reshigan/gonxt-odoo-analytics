#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — D1 Migration Runner
// Run: node scripts/migrate.js
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_NAME = 'gonxt-odoo-analytics';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'packages', 'api', 'src', 'db', 'migrations');

const files = fs.readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} migration files`);
console.log('');

for (const file of files) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  console.log(`Running: ${file}`);
  try {
    execSync(`npx wrangler d1 execute ${DB_NAME} --config=temp_wrangler.toml --file="${filePath}"`, { stdio: 'inherit' });
    console.log(`  ✓ ${file} applied`);
  } catch (err) {
    console.error(`  ✗ ${file} FAILED`);
    process.exit(1);
  }
  console.log('');
}

console.log('All migrations applied successfully.');

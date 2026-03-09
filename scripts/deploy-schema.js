#!/usr/bin/env node

/**
 * Deploy Supabase schema from migrations
 * Usage: node scripts/deploy-schema.js
 */

const fs = require('fs');
const path = require('path');
const pg = require('pg');

// Load env vars
require('dotenv').config({ path: '.env.local' });

const CONNECTION_STRING = process.env.CONNECTION_STRING;

if (!CONNECTION_STRING) {
  console.error('❌ Missing CONNECTION_STRING in .env.local');
  process.exit(1);
}

async function deploySchema() {
  console.log('🚀 Deploying Supabase schema...\n');

  // Create PostgreSQL client with connection string
  const client = new pg.Client(CONNECTION_STRING);

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260306_init_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📂 Migration file loaded');
    console.log('🔄 Executing SQL...\n');

    // Execute the entire migration as a single transaction
    await client.query(sql);

    console.log('\n✅ Schema deployed successfully!\n');
    console.log('📊 Tables created:');
    console.log('   • profiles');
    console.log('   • inventory_items');
    console.log('   • orders');
    console.log('   • order_items');
    console.log('   • audit_log');
    console.log('   • spin_events\n');
  } catch (error) {
    console.error('❌ Error deploying schema:');
    console.error(error.message);
    if (error.detail) console.error('Details:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deploySchema();

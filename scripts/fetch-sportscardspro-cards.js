#!/usr/bin/env node

/**
 * Fetch card data from SportscardsPro and populate the cards table
 * Usage: node scripts/fetch-sportscardspro-cards.js [sport] [limit]
 *
 * Examples:
 * node scripts/fetch-sportscardspro-cards.js baseball 100
 * node scripts/fetch-sportscardspro-cards.js football 50
 */

const pg = require('pg');
require('dotenv').config({ path: '.env.local' });

const sport = process.argv[2] || 'baseball';
const limit = parseInt(process.argv[3]) || 100;

const CONNECTION_STRING = process.env.CONNECTION_STRING;

if (!CONNECTION_STRING) {
  console.error('❌ Missing CONNECTION_STRING in .env.local');
  process.exit(1);
}

async function fetchSportscardsPro() {
  console.log(`🔍 Fetching ${limit} ${sport} cards from SportscardsPro...\n`);

  const client = new pg.Client(CONNECTION_STRING);

  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Try to fetch from SportscardsPro API
    // Note: Adjust endpoint/auth based on SportscardsPro documentation
    const endpoint = `https://api.sportscardspro.com/cards?sport=${sport}&limit=${limit}`;

    console.log(`📡 Fetching from: ${endpoint}\n`);

    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
        // Add SportscardsPro API key if needed:
        // 'Authorization': `Bearer ${process.env.SPORTSCARDSPRO_API_KEY}`
      },
    });

    if (!response.ok) {
      throw new Error(
        `SportscardsPro API returned ${response.status}: ${response.statusText}\n\n` +
        `ℹ️  SportscardsPro may require:\n` +
        `   1. API key (set SPORTSCARDSPRO_API_KEY in .env.local)\n` +
        `   2. Different endpoint (check https://sportscardspro.com/api)\n` +
        `   3. Or use TCDB/manual import instead\n`
      );
    }

    const data = await response.json();
    const cards = Array.isArray(data) ? data : data.cards || data.data || [];

    if (!cards.length) {
      console.warn('⚠️  No cards returned from API');
      return;
    }

    console.log(`📦 Inserting ${cards.length} cards...\n`);

    // Insert cards into Supabase
    for (const card of cards) {
      const query = `
        INSERT INTO cards (
          external_id, player, year, set_name, card_number,
          team, sport, position, manufacturer, data_source, source_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (external_id, data_source) DO NOTHING
      `;

      const values = [
        card.id || card.external_id,
        card.player_name || card.player,
        card.year,
        card.set || card.set_name,
        card.card_number || card.number,
        card.team,
        sport,
        card.position,
        card.manufacturer || 'Topps',
        'sportscardspro',
        card.url || null,
      ];

      await client.query(query, values);
    }

    console.log(`✅ Successfully inserted ${cards.length} cards!\n`);

    // Show sample cards
    const { rows } = await client.query(
      'SELECT player, year, set_name, card_number FROM cards LIMIT 5'
    );
    console.log('📋 Sample cards:');
    rows.forEach((row) => {
      console.log(
        `   ${row.card_number} — ${row.player} — ${row.year} ${row.set_name}`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check if SportscardsPro API is accessible');
    console.error('   2. Verify API key is set (if required)');
    console.error('   3. Check endpoint format in script');
    console.error('   4. Alternative: Use TCDB export or manual CSV import\n');
  } finally {
    await client.end();
  }
}

fetchSportscardsPro();

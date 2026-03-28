#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createBucket() {
  try {
    console.log('Creating card-photos bucket...');

    const { data, error } = await supabase
      .storage
      .createBucket('card-photos', {
        public: true,
      });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket card-photos already exists');
        return;
      }
      throw error;
    }

    console.log('✅ Bucket created successfully:', data);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createBucket();

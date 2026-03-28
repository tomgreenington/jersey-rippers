'use server';

import { createClient } from '@supabase/supabase-js';

export async function ensureCardPhotosBucket() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase credentials');
      return false;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Try to create the bucket
    const { error } = await supabase.storage.createBucket('card-photos', {
      public: true,
    });

    if (error) {
      // Bucket might already exist, which is fine
      if (error.message.includes('already exists') || error.message.includes('Bucket already exists')) {
        console.log('✅ Bucket card-photos already exists');
        return true;
      }
      console.error('Storage bucket creation failed:', error.message);
      return false;
    }

    console.log('✅ Storage bucket card-photos created successfully');
    return true;
  } catch (err) {
    console.error('Error ensuring storage bucket:', err);
    return false;
  }
}

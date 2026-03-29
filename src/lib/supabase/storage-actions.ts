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

/**
 * Upload card photos using service role (bypasses RLS)
 * Called from client via server action
 */
export async function uploadCardPhotos(
  files: { name: string; data: Buffer }[]
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Supabase credentials not configured' };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const { data, error } = await supabase.storage
        .from('card-photos')
        .upload(file.name, file.data, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: publicUrl } = supabase.storage
        .from('card-photos')
        .getPublicUrl(file.name);

      uploadedUrls.push(publicUrl.publicUrl);
    }

    return { success: true, urls: uploadedUrls };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

import { getServiceRoleClient } from '@/lib/supabase/server';
import { getCurrentAdminUser } from '@/lib/supabase/admin-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { isAdmin } = await getCurrentAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();

    // Fetch all inventory items, ordered by created_at desc
    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        'id, sku, title, player, set_name, card_number, type, price, status, photos, spin_pool, quantity_on_hand, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

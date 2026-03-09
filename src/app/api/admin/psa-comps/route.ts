/**
 * PSA Comps API Route
 * GET /api/admin/psa-comps?player=...&set=...&card=...&year=...
 */

import { fetchPSAComps } from '@/lib/psa-comps';
import type { PSAComp } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const player = searchParams.get('player');
  const set = searchParams.get('set');
  const card = searchParams.get('card');
  const year = searchParams.get('year');

  if (!player || !set || !card) {
    return Response.json({ error: 'Missing required parameters: player, set, card' }, { status: 400 });
  }

  const comps: PSAComp[] = await fetchPSAComps(player, set, card, year ? parseInt(year, 10) : undefined);

  return Response.json({ comps });
}

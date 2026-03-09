/**
 * Card Server Actions
 * Search, create, and manage card database
 */

'use server';

import { getServiceRoleClient } from './server';
import type { Card } from '@/types';

/**
 * Search cards by full-text query
 */
export async function searchCards(query: string): Promise<Card[]> {
  if (!query.trim()) return [];

  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .or(
      `player.ilike.%${query}%,set_name.ilike.%${query}%,card_number.ilike.%${query}%`
    )
    .limit(6);

  if (error) {
    console.error('Card search error:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new card in the database
 */
export async function createCard(
  data: Partial<Card> & { player: string; year: number; set_name: string; card_number: string }
): Promise<{ success: boolean; data?: Card; error?: string }> {
  try {
    const supabase = getServiceRoleClient();

    const { data: newCard, error } = await supabase
      .from('cards')
      .insert({
        player: data.player,
        year: data.year,
        set_name: data.set_name,
        card_number: data.card_number,
        team: data.team || null,
        sport: data.sport || null,
        position: data.position || null,
        rarity: data.rarity || null,
        rookie: data.rookie || false,
        parallel_type: data.parallel_type || null,
        manufacturer: data.manufacturer || null,
        data_source: 'manual',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: newCard };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

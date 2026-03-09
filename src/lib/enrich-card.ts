/**
 * Card Enrichment with Claude
 * Uses Claude API to extract card metadata from natural language description
 */

'use server';

import Anthropic from '@anthropic-ai/sdk';
import type { Card } from '@/types';

export interface EnrichedCard extends Partial<Card> {
  player: string;
  year: number;
  set_name: string;
  card_number: string;
}

/**
 * Enrich a card description using Claude
 * Sends text to Claude which returns structured JSON with card metadata
 */
export async function enrichCard(query: string): Promise<{ success: boolean; data?: Partial<Card>; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'Anthropic API key not configured' };
  }

  if (!query.trim()) {
    return { success: false, error: 'No text provided' };
  }

  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a sports card expert. Given a card description, extract and return structured JSON with these fields:

{
  "player": "player name",
  "year": 1990,
  "set_name": "set name",
  "card_number": "card number",
  "team": "team (optional)",
  "sport": "sport (baseball, football, hockey, basketball, etc)",
  "position": "position (optional)",
  "rarity": "rarity (optional)",
  "rookie": false,
  "parallel_type": "parallel type (optional)",
  "manufacturer": "manufacturer (optional)"
}

Card description: "${query}"

IMPORTANT:
- Return ONLY valid JSON, no markdown or explanation
- Fill in all fields you can determine from the description
- Leave fields null if unknown
- For missing year, try to infer from set name or context
- Be strict with the format`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    try {
      const parsed = JSON.parse(responseText);
      return { success: true, data: parsed };
    } catch {
      return { success: false, error: 'Failed to parse Claude response as JSON' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Claude enrichment failed: ${message}` };
  }
}

'use server';

import Anthropic from '@anthropic-ai/sdk';
import { getCurrentAdminUser } from '@/lib/supabase/admin-auth';

interface PhotoLookupInput {
  base64: string;
  mediaType: string;
}

type SupportedImageMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp';

interface ExtractedCardInfo {
  player?: string | null;
  set_name?: string | null;
  card_number?: string | null;
  year?: number | null;
  team?: string | null;
  sport?: string | null;
  rarity?: string | null;
  rookie?: boolean | null;
  parallel_type?: string | null;
  manufacturer?: string | null;
  confidence?: number | null;
  notes?: string | null;
}

export interface CardPhotoLookupResult {
  success: boolean;
  extracted?: ExtractedCardInfo;
  warning?: string;
  error?: string;
}

function parseJsonObject(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Lookup response did not include JSON');
  }

  return JSON.parse(text.slice(start, end + 1)) as ExtractedCardInfo;
}

function normalizeMediaType(mediaType: string): SupportedImageMediaType {
  if (
    mediaType === 'image/png' ||
    mediaType === 'image/gif' ||
    mediaType === 'image/webp'
  ) {
    return mediaType;
  }

  return 'image/jpeg';
}

export async function lookupCardFromPhoto({
  base64,
  mediaType,
}: PhotoLookupInput): Promise<CardPhotoLookupResult> {
  const { isAdmin } = await getCurrentAdminUser();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'Anthropic API key not configured' };
  }

  if (!base64) {
    return { success: false, error: 'No photo data provided' };
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: normalizeMediaType(mediaType),
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Read this sports card photo and return ONLY JSON:
{
  "player": "visible player or subject",
  "set_name": "visible or likely set name",
  "card_number": "visible card number, without inventing",
  "year": 2024,
  "team": "visible team or null",
  "sport": "baseball, basketball, football, hockey, soccer, wrestling, racing, ufc, pokemon, etc.",
  "rarity": "parallel/rarity text if visible",
  "rookie": true,
  "parallel_type": "parallel/refractor/prizm/etc if visible",
  "manufacturer": "Topps, Panini, Upper Deck, etc if visible",
  "confidence": 0-100,
  "notes": "short note about uncertainty"
}

Do not guess hidden text. If the image is ambiguous, use null and lower confidence.`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const extracted = parseJsonObject(responseText);

    return {
      success: true,
      extracted,
      warning:
        extracted.confidence !== null &&
        extracted.confidence !== undefined &&
        extracted.confidence < 70
          ? 'Low-confidence photo read. Please verify the fields against the card.'
          : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

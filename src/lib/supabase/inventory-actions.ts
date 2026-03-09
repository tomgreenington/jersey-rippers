/**
 * Inventory Server Actions
 * CRUD operations, Claude Vision AI intake, SKU generation, publish/unpublish
 */

'use server';

import Anthropic from '@anthropic-ai/sdk';
import { getServiceRoleClient } from './server';

interface AICardSuggestions {
  player?: string;
  set_name?: string;
  card_number?: string;
  year?: number;
  rarity?: string;
  language?: string;
  edition?: string;
  grade_company?: string;
  grade_value?: string;
  suggested_price_cents?: number;
  confidence?: number;
  notes?: string;
}

/**
 * Analyze a card photo with Claude Vision
 * Returns structured suggestions for card metadata
 */
export async function analyzeCardPhoto(
  imageUrl: string
): Promise<{ success: boolean; data?: AICardSuggestions; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'Anthropic API key not configured' };
  }

  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `You are an expert TCG (Trading Card Game) card appraiser. Analyze this card image and extract the following metadata. Return ONLY a JSON object with these fields (all optional):

{
  "player": "player name if visible",
  "set_name": "set name or series (e.g., 'Base Set', 'Pokemon Crown Zenith')",
  "card_number": "card number if visible (e.g., '102/102', 'SV-049/198')",
  "year": number,
  "rarity": "rarity level (Common, Uncommon, Rare, Ultra Rare, Secret Rare, etc.)",
  "language": "language (e.g., English, Japanese, German)",
  "edition": "edition (e.g., '1st Edition', 'Shadowless', 'Unlimited')",
  "grade_company": "grading company if this is a slab (PSA, BGS, CGC, etc.)",
  "grade_value": "grade if visible (e.g., '9', '10', '8.5')",
  "suggested_price_cents": suggested price in USD cents (based on typical market value),
  "confidence": confidence level 0-100,
  "notes": "any other relevant observations"
}

IMPORTANT:
- Do NOT guess condition if it's a raw card. Leave condition blank (the human will set it manually).
- Do NOT make up information. Only include fields you can clearly see.
- If unsure, set low confidence.
- Return ONLY valid JSON, no markdown or explanation.`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse the JSON response
    const suggestions: AICardSuggestions = JSON.parse(responseText);

    return { success: true, data: suggestions };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Claude Vision failed: ${message}` };
  }
}

/**
 * Generate SKU for a new inventory item
 * Format: JR-{TYPE}-{YYYYMMDD}-{SEQ}
 */
async function generateSKU(type: 'single' | 'slab' | 'sealed'): Promise<string> {
  const supabase = getServiceRoleClient();

  const typeMap = { single: 'SGL', slab: 'SLB', sealed: 'SLD' };
  const typeCode = typeMap[type];

  // Get today's date
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

  // Get count of items created today with this type
  const { count, error } = await supabase
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
    .eq('type', type)
    .gte('created_at', `${dateStr}T00:00:00Z`)
    .lt('created_at', `${dateStr}T23:59:59Z`);

  if (error) {
    throw new Error(`Failed to generate SKU: ${error.message}`);
  }

  // Sequence is 1-indexed, zero-padded to 4 digits
  const sequence = ((count ?? 0) + 1).toString().padStart(4, '0');

  return `JR-${typeCode}-${dateStr}-${sequence}`;
}

/**
 * Create a new inventory item (in draft status)
 */
export async function createInventoryItem(
  data: {
    type: 'single' | 'slab' | 'sealed';
    title: string;
    price: number; // in cents
    cost_basis?: number; // in cents
    description?: string;
    set_name?: string;
    card_number?: string;
    year?: number;
    player?: string;
    team?: string;
    sport?: string;
    position?: string;
    rarity?: string;
    rookie?: boolean;
    parallel_type?: string;
    manufacturer?: string;
    language?: string;
    edition?: string;
    condition?: string;
    grade_company?: string;
    grade_value?: string;
    cert_number?: string;
    quantity_on_hand?: number;
    photos?: string[];
    storage_location?: string;
    spin_pool?: boolean;
  },
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = getServiceRoleClient();

    // Generate SKU
    const sku = await generateSKU(data.type);

    // Create the item
    const { data: newItem, error } = await supabase
      .from('inventory_items')
      .insert({
        sku,
        type: data.type,
        status: 'draft', // Always start as draft
        title: data.title,
        price: data.price,
        cost_basis: data.cost_basis,
        description: data.description,
        set_name: data.set_name,
        card_number: data.card_number,
        year: data.year,
        player: data.player,
        team: data.team,
        sport: data.sport,
        position: data.position,
        rarity: data.rarity,
        rookie: data.rookie,
        parallel_type: data.parallel_type,
        manufacturer: data.manufacturer,
        language: data.language || 'English',
        edition: data.edition,
        condition: data.condition,
        grade_company: data.grade_company,
        grade_value: data.grade_value,
        cert_number: data.cert_number,
        quantity_on_hand: data.quantity_on_hand || 1,
        photos: data.photos,
        storage_location: data.storage_location,
        spin_pool: data.spin_pool || false,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log to audit trail
    await supabase.from('audit_log').insert({
      entity_type: 'inventory_item',
      entity_id: newItem.id,
      action: 'created',
      new_value: newItem,
      performed_by: userId,
    });

    return { success: true, data: newItem };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(
  itemId: string,
  updates: Partial<{
    title: string;
    price: number;
    description: string;
    set_name: string;
    card_number: string;
    year: number;
    player: string;
    rarity: string;
    language: string;
    edition: string;
    condition: string;
    grade_company: string;
    grade_value: string;
    cert_number: string;
    quantity_on_hand: number;
    photos: string[];
    storage_location: string;
  }>,
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = getServiceRoleClient();

    // Get current item for audit
    const { data: currentItem, error: fetchError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Item not found' };
    }

    // Update the item
    const { data: updatedItem, error } = await supabase
      .from('inventory_items')
      .update({
        ...updates,
        updated_by: userId,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log to audit trail
    await supabase.from('audit_log').insert({
      entity_type: 'inventory_item',
      entity_id: itemId,
      action: 'updated',
      old_value: currentItem,
      new_value: updatedItem,
      performed_by: userId,
    });

    return { success: true, data: updatedItem };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Publish a draft item (status: draft → listed)
 */
export async function publishInventoryItem(
  itemId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceRoleClient();

    const { data: currentItem, error: fetchError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Item not found' };
    }

    if (currentItem.status !== 'draft') {
      return { success: false, error: 'Only draft items can be published' };
    }

    const { data: published, error } = await supabase
      .from('inventory_items')
      .update({
        status: 'listed',
        updated_by: userId,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log to audit trail
    await supabase.from('audit_log').insert({
      entity_type: 'inventory_item',
      entity_id: itemId,
      action: 'published',
      old_value: { status: 'draft' },
      new_value: { status: 'listed' },
      performed_by: userId,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Unpublish a listed item (status: listed → archived)
 */
export async function unpublishInventoryItem(
  itemId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceRoleClient();

    const { data: currentItem, error: fetchError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Item not found' };
    }

    if (currentItem.status !== 'listed') {
      return { success: false, error: 'Only listed items can be unpublished' };
    }

    const { data: archived, error } = await supabase
      .from('inventory_items')
      .update({
        status: 'archived',
        updated_by: userId,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log to audit trail
    await supabase.from('audit_log').insert({
      entity_type: 'inventory_item',
      entity_id: itemId,
      action: 'unpublished',
      old_value: { status: 'listed' },
      new_value: { status: 'archived' },
      performed_by: userId,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

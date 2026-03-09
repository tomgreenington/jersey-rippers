-- Add cards table (master card database)
-- Source: SportscardsPro, TCDB, or other card data providers

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT, -- ID from the data source (SportscardsPro, TCDB, etc.)
  player TEXT NOT NULL,
  year INTEGER,
  set_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  team TEXT,
  sport TEXT, -- baseball, football, hockey, basketball
  position TEXT,
  rarity TEXT,
  rookie BOOLEAN DEFAULT false,
  parallel_type TEXT, -- chrome, base, rc, etc.
  manufacturer TEXT, -- Topps, Panini, Upper Deck, etc.

  -- For deduplication / source tracking
  data_source TEXT, -- sportscardspro, tcdb, ebay, etc.
  source_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast search
CREATE INDEX idx_cards_card_number ON cards(card_number);
CREATE INDEX idx_cards_player ON cards(player);
CREATE INDEX idx_cards_set_name ON cards(set_name);
CREATE INDEX idx_cards_year ON cards(year);
CREATE INDEX idx_cards_search ON cards USING GIN (
  to_tsvector('english', player || ' ' || set_name || ' ' || card_number)
);

-- Unique constraint: prevent duplicate cards from same source
CREATE UNIQUE INDEX idx_cards_unique_source ON cards(external_id, data_source)
WHERE external_id IS NOT NULL;

-- Auto-update timestamp
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

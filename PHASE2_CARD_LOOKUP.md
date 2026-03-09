# Phase 2: Card Lookup + Admin Listing Flow

## Problem

Admin has **tons of physical cards** (all sports, all years, all brands) but **zero digital data**.

**Current intake flow is broken:**
- Claude Vision tries to ID card from photo alone → error-prone, slow
- Admin has to manually type all metadata (player, set, year, condition, price)

**What we need:**
Admin should be able to list a card in **<30 seconds**:
```
1. Type: "Shohei Ohtani"
2. Type: "CP-2" (card number)
3. Type: "Topps Chrome" (brand)
4. System returns: full card metadata
5. Upload photos
6. Set price
7. Publish
```

---

## Solution (Not Vision — Keep It Simple)

### Step 1: Seed Card Database (One-Time)
- Scrape/import ~2-5k cards from **TCDB** or **Beckett** (all sports)
- Load into `cards` table in Supabase
- Takes ~30 min, done once

### Step 2: Admin Search Flow
```
Input: "Shohei Ohtani" + "CP-2" + "Topps Chrome"
         ↓
Check local cards table
         ↓
Found? → Return full card details (year, team, rarity, sport, position)
         ↓
Not found? → Show manual entry form
            → Claude (text, not vision) helps format/enrich details
            → Admin confirms
            → Save to cards table for next time
```

### Step 3: Admin Listing
```
1. Search cards (or add manually)
2. Select card from results
3. Upload photos (front + back)
4. Enter price + condition
5. Publish
```

### Step 4: Storefront Display
```
Shohei Ohtani
2021 Topps Chrome #CP-2
Baseball | Angels | Rookie

Photos (front, back)
Price: $35
Condition: NM

Add to Cart
```

---

## Why This Works

✅ **No Vision overhead** — just text parsing
✅ **Fast admin workflow** — search, upload, publish in <1 min
✅ **Database grows organically** — as they list more cards, DB expands
✅ **Covers edge cases** — manual fallback if card not in DB
✅ **Scales** — can bulk-load more cards later

---

## Tech Stack (Phase 2 MVP)

**Database:**
```sql
cards (id, player, year, set_name, card_number, team, sport, position, ...)
inventory (id, card_id, price, condition, front_image, back_image, ...)
```

**Admin Flow:**
1. Search component (fuzzy search against cards table)
2. Select card or create manually
3. Intake form (upload photos, set price/condition)
4. Publish

**Claude (Text Only):**
- Help format card details if manually entered
- Suggest pricing based on comparables (optional, later)

---

## Next Session Checklist

- [ ] Deploy `cards` table schema to Supabase
- [ ] Scrape/import 2-5k cards from TCDB or Beckett
- [ ] Build admin card search component (fuzzy search)
- [ ] Update intake form: search → select → upload → publish
- [ ] Test end-to-end: admin lists 1 card
- [ ] Verify card appears on storefront

---

## Open Questions

- TCDB source? (scrape or export?)
- Pricing guidance: use comparables from TCDB/eBay, or just manual?
- Should we load multiple sports/eras, or start with baseball only?

---

## Not Doing (Deferred)

- ❌ Claude Vision web scraping (overkill)
- ❌ Pre-loading 100k cards (too much for MVP)
- ❌ Advanced pricing algorithms (manual for now)
- ❌ Real-time price tracking (later)

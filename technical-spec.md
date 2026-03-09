# Technical Specification

This document contains the granular implementation reference: database schema, API endpoints, frontend routes, RLS policies, and infrastructure details.

---

## 1. Database Schema

### `profiles`
Extends Supabase Auth. Stores role and display info.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, FK → auth.users(id) | Matches Supabase Auth user ID |
| role | text | NOT NULL, CHECK (admin/staff/customer) | Default: `customer` |
| display_name | text | | |
| email | text | NOT NULL | Denormalized from auth for queries |
| avatar_url | text | | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

### `inventory_items`
Core product table. Covers singles, slabs, and sealed.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| sku | text | UNIQUE, NOT NULL | Generated on creation (see SKU format) |
| type | text | NOT NULL, CHECK (single/slab/sealed) | |
| status | text | NOT NULL, CHECK (draft/listed/reserved/sold/shipped/archived/returned) | Default: `draft` |
| title | text | NOT NULL | Standardized title format |
| description | text | | |
| price | integer | NOT NULL | In cents (e.g., 1999 = $19.99) |
| cost_basis | integer | | In cents. Internal only, never exposed to customers |
| set_name | text | | Card set / series |
| card_number | text | | Number within the set |
| year | integer | | Year of print/release |
| player | text | | Player or character name |
| rarity | text | | e.g., Common, Uncommon, Rare, Ultra Rare, Secret Rare |
| language | text | DEFAULT 'English' | |
| edition | text | | e.g., 1st Edition, Unlimited, Shadowless |
| condition | text | CHECK (Mint/Near Mint/Lightly Played/Moderately Played/Heavily Played/Damaged) | Required for singles, NULL for slabs |
| grade_company | text | | PSA, BGS, CGC, etc. NULL for non-slabs |
| grade_value | text | | e.g., "10", "9.5". NULL for non-slabs |
| cert_number | text | | Grading cert number. NULL for non-slabs |
| quantity_on_hand | integer | NOT NULL, DEFAULT 1 | Always 1 for singles/slabs. Can be > 1 for sealed |
| photos | text[] | | Array of Supabase Storage paths |
| storage_location | text | | Internal bin/box location |
| spin_pool | boolean | NOT NULL, DEFAULT false | Whether item is in the spin pool |
| reserved_by | uuid | FK → profiles(id) | User who reserved this item |
| reserved_until | timestamptz | | Reservation TTL expiry |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_by | uuid | FK → profiles(id) | Last user who modified |

**Indexes:**
- `idx_inventory_status` on (status)
- `idx_inventory_type` on (type)
- `idx_inventory_spin_pool` on (spin_pool) WHERE status = 'listed'
- `idx_inventory_sku` on (sku) — UNIQUE
- `idx_inventory_reserved_until` on (reserved_until) WHERE status = 'reserved'

### `orders`
One order per checkout session.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| order_number | text | UNIQUE, NOT NULL | Human-readable (e.g., JR-20260301-0001) |
| customer_id | uuid | NOT NULL, FK → profiles(id) | |
| status | text | NOT NULL, CHECK (pending/paid/shipped/refunded/partially_refunded/cancelled) | Default: `pending` |
| total_cents | integer | NOT NULL | Total in cents |
| is_spin | boolean | NOT NULL, DEFAULT false | Whether this order is a spin purchase |
| shipping_name | text | | From Stripe Checkout |
| shipping_address_line1 | text | | |
| shipping_address_line2 | text | | |
| shipping_city | text | | |
| shipping_state | text | | |
| shipping_postal_code | text | | |
| shipping_country | text | | |
| shipping_email | text | | |
| signature_required | boolean | NOT NULL, DEFAULT false | True if total >= $250 |
| tracking_number | text | | Added by admin when shipped |
| tracking_carrier | text | | e.g., USPS, UPS, FedEx |
| shipped_at | timestamptz | | |
| stripe_checkout_session_id | text | | |
| stripe_payment_intent_id | text | | |
| stripe_charge_id | text | | |
| stripe_customer_id | text | | |
| stripe_refund_id | text | | Populated if refunded |
| notes | text | | Internal admin notes |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes:**
- `idx_orders_customer` on (customer_id)
- `idx_orders_status` on (status)
- `idx_orders_stripe_session` on (stripe_checkout_session_id) — for webhook idempotency lookup

### `order_items`
Line items within an order.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| order_id | uuid | NOT NULL, FK → orders(id) | |
| inventory_item_id | uuid | NOT NULL, FK → inventory_items(id) | |
| quantity | integer | NOT NULL, DEFAULT 1 | |
| price_cents | integer | NOT NULL | Price at time of purchase (snapshot) |
| title | text | NOT NULL | Snapshot of item title at purchase time |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

### `audit_log`
Immutable log of all significant mutations.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| entity_type | text | NOT NULL | e.g., 'inventory_item', 'order', 'spin_event' |
| entity_id | uuid | NOT NULL | ID of the affected record |
| action | text | NOT NULL | e.g., 'price_changed', 'status_updated', 'condition_set', 'location_moved', 'refund_issued' |
| old_value | jsonb | | Previous state (relevant fields) |
| new_value | jsonb | | New state (relevant fields) |
| performed_by | uuid | NOT NULL, FK → profiles(id) | User who made the change |
| ip_address | text | | If available |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Immutable |

**Indexes:**
- `idx_audit_entity` on (entity_type, entity_id)
- `idx_audit_performed_by` on (performed_by)
- `idx_audit_created_at` on (created_at)

### `spin_events`
Log of every spin attempt and outcome.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → profiles(id) | |
| inventory_item_id | uuid | NOT NULL, FK → inventory_items(id) | The item selected |
| stripe_checkout_session_id | text | | |
| status | text | NOT NULL, CHECK (pending/completed/expired) | |
| nonce | text | | Random nonce for audit (not exposed to client) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Used for 24h cooldown check |

**Indexes:**
- `idx_spin_user_created` on (user_id, created_at DESC) — for 24h cooldown lookups

### Entity Relationship Summary

```
profiles 1──∞ orders
profiles 1──∞ audit_log (performed_by)
profiles 1──∞ spin_events
profiles 1──∞ inventory_items (updated_by, reserved_by)
orders   1──∞ order_items
inventory_items 1──∞ order_items
inventory_items 1──∞ spin_events
```

---

## 2. RLS Policies

### `profiles`
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| customer | Own row only | Via auth trigger | Own row (display_name, avatar_url only) | No |
| staff | All rows | No | No | No |
| admin | All rows | No | Any row (role changes) | No |

### `inventory_items`
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| customer | WHERE status IN ('listed', 'reserved', 'sold') — excludes cost_basis, storage_location, reserved_by | No | No | No |
| staff | All rows, all columns | Yes (intake) | Yes (all except role-restricted) | No (unpublish instead) |
| admin | All rows, all columns | Yes | Yes | Yes (soft delete via archive) |
| anon (public) | WHERE status = 'listed' — public catalog, excludes internal fields | No | No | No |

**Column-level security note:** `cost_basis`, `storage_location`, `reserved_by`, `reserved_until`, `updated_by` are excluded from customer/anon queries via a database view or select list in the API layer.

### `orders`
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| customer | Own orders only (customer_id = auth.uid()) | Via server action only (checkout) | No | No |
| staff | All orders | No | Shipping fields only (tracking, shipped_at) | No |
| admin | All orders | Via server action | All fields | No |

### `order_items`
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| customer | Items in own orders only | Via server action | No | No |
| staff | All | No | No | No |
| admin | All | Via server action | No | No |

### `audit_log`
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| customer | No | No | No | No |
| staff | All (read-only) | Via server triggers only | No | No |
| admin | All (read-only) | Via server triggers only | No | No |

**Note:** Audit log inserts happen via database triggers or server-side functions, never from client.

### `spin_events`
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| customer | Own spin events only | Via server action | No | No |
| staff | All | No | No | No |
| admin | All | Via server action | Via server action | No |

---

## 3. Frontend Route Map

### Store (Customer-Facing) — `(store)` route group

| Path | Page | Auth Required |
|------|------|--------------|
| `/` | Homepage — featured collections, new drops, hero | No |
| `/collections/singles` | Browse raw singles | No |
| `/collections/graded` | Browse graded slabs | No |
| `/collections/sealed` | Browse sealed product | No |
| `/collections/new-drops` | Browse newest listings | No |
| `/products/[id]` | Product detail — photo gallery, attributes, add-to-cart | No |
| `/search` | Search results — fuzzy search bar + facet filters + sort | No |
| `/cart` | Shopping cart — items, quantities, subtotal, checkout button | No |
| `/spin` | Spin page — rules, price, value range, buy button | No (auth required to purchase) |
| `/spin/reveal/[orderId]` | Spin card reveal — shows assigned card after purchase | Yes (customer) |
| `/orders` | My orders list | Yes (customer) |
| `/orders/[id]` | Order detail — items, status, tracking | Yes (customer) |
| `/orders/[id]/confirmation` | Order confirmation — post-checkout success page | Yes (customer) |
| `/login` | Sign in | No |
| `/signup` | Create account | No |
| `/forgot-password` | Password reset request | No |

### Admin Dashboard — `(admin)` route group

| Path | Page | Auth Required |
|------|------|--------------|
| `/admin` | Dashboard — key metrics (orders today, pool size, revenue) | Admin/Staff |
| `/admin/inventory` | Inventory list — filter by status, type, spin_pool, set | Admin/Staff |
| `/admin/inventory/new` | Inventory intake — photo upload, AI suggestions, manual fields | Admin/Staff |
| `/admin/inventory/[id]` | Inventory detail/edit — attributes, price, location, audit history | Admin/Staff |
| `/admin/orders` | Orders list — paid/unpaid/refunded, shipped/unshipped | Admin/Staff |
| `/admin/orders/[id]` | Order detail — items, customer, shipping, tracking, refund action | Admin/Staff |
| `/admin/orders/export` | Shipping CSV export — date range, filters | Admin/Staff |
| `/admin/spin` | Spin pool management — pool size, toggle items, current pool list | Admin/Staff |
| `/admin/audit-log` | Audit log viewer — filter by entity, action, user, date | Admin only |

---

## 4. API Endpoints / Server Actions

### Route Handlers (API Routes)

These handle external integrations and webhooks that require raw request access.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/webhooks/stripe` | Stripe signature | Handle all Stripe webhook events |
| GET | `/api/cron/release-reservations` | Vercel Cron secret | Release expired inventory reservations |
| GET | `/api/cron/sync-typesense` | Vercel Cron secret | Periodic full sync fallback (backup to realtime sync) |

**Stripe webhook events handled:**
- `checkout.session.completed` → Create order, mark items sold
- `checkout.session.expired` → Release reserved items
- `charge.refunded` → Update order status, return items to listed
- `charge.dispute.created` → Flag order, log audit event

### Server Actions

These are Next.js Server Actions called from the frontend. All run server-side.

#### Checkout & Payment
| Action | Auth | Purpose |
|--------|------|---------|
| `createCheckoutSession(items[])` | Customer | Validate items, reserve inventory (atomic), create Stripe Checkout Session, return URL |
| `createSpinCheckoutSession()` | Customer | Check 24h eligibility, select random item (crypto RNG), reserve, create $5 Stripe session |

#### Inventory (Admin/Staff)
| Action | Auth | Purpose |
|--------|------|---------|
| `createInventoryItem(data)` | Staff/Admin | Create new item (draft or listed), generate SKU, log audit |
| `updateInventoryItem(id, data)` | Staff/Admin | Update attributes/price/location, log audit with old+new values |
| `publishInventoryItem(id)` | Staff/Admin | Set status: draft → listed, sync to Typesense |
| `unpublishInventoryItem(id)` | Staff/Admin | Set status: listed → archived, remove from Typesense |
| `deleteInventoryItem(id)` | Admin only | Soft delete (archive). Hard delete only if draft |
| `bulkUpdateSpinPool(ids[], enabled)` | Staff/Admin | Toggle spin_pool flag on multiple items |
| `processAIIntake(imageUrl)` | Staff/Admin | Send image to Claude Vision API, return structured JSON |

#### Orders (Admin/Staff)
| Action | Auth | Purpose |
|--------|------|---------|
| `markOrderShipped(orderId, tracking?)` | Staff/Admin | Set shipped_at, tracking info, log audit |
| `processRefund(orderId, reason)` | Admin only | Call Stripe Refund API, update order + inventory status, log audit |
| `exportShippingCSV(filters)` | Staff/Admin | Generate CSV: order_id, name, address, email, items, declared value, signature flag |

#### Search
| Action | Auth | Purpose |
|--------|------|---------|
| `searchInventory(query, filters, sort, page)` | Public | Query Typesense, return results + facet counts |
| `syncItemToTypesense(itemId)` | Internal | Push single item to Typesense index (called after create/update) |
| `removeItemFromTypesense(itemId)` | Internal | Remove item from Typesense index (called after unpublish/sell) |

#### Auth
| Action | Auth | Purpose |
|--------|------|---------|
| `signUp(email, password)` | Public | Create Supabase Auth user + profile with role=customer |
| `signIn(email, password)` | Public | Authenticate, return session |
| `signOut()` | Any | Destroy session |
| `updateProfile(data)` | Customer | Update display_name, avatar |
| `updateUserRole(userId, role)` | Admin only | Change user role, log audit |

---

## 5. SKU Generation

**Format:** `JR-{TYPE}-{YYYYMMDD}-{SEQ}`

| Segment | Values | Example |
|---------|--------|---------|
| `JR` | Fixed prefix | `JR` |
| `TYPE` | `SGL` (single), `SLB` (slab), `SLD` (sealed) | `SGL` |
| `YYYYMMDD` | Date of creation | `20260301` |
| `SEQ` | 4-digit zero-padded daily sequence | `0001` |

**Example:** `JR-SGL-20260301-0042` — the 42nd single created on March 1, 2026.

**Implementation:** Use a database sequence or counter table per day. Atomic increment on creation.

---

## 6. Image Storage

### Supabase Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `card-photos` | Authenticated upload, public read | Full-resolution card images |
| `card-thumbnails` | Public read | Generated thumbnails |

### Rules
- **Max file size:** 10MB
- **Allowed types:** `image/jpeg`, `image/png`, `image/webp`
- **Naming convention:** `{inventory_item_id}/{index}.{ext}` (e.g., `abc-123/0.jpg`, `abc-123/1.jpg`)
- **Thumbnails:** Generate on upload — 400x560px (card aspect ratio ~5:7), WebP format, 80% quality
- **CDN:** Supabase Storage serves via CDN. Use `transform` API for on-the-fly resizing if thumbnail generation is deferred.

### Upload Flow
1. Staff selects images in intake form
2. Client uploads to Supabase Storage (authenticated)
3. Store file paths in `inventory_items.photos[]`
4. Thumbnail generation: on-upload via Edge Function or deferred via Supabase Image Transformations

---

## 7. Cron Jobs / Scheduled Functions

Implemented via **Vercel Cron Jobs** (`vercel.json` config).

| Job | Path | Schedule | Purpose |
|-----|------|----------|---------|
| Release expired reservations | `/api/cron/release-reservations` | Every 1 minute | Find items WHERE status='reserved' AND reserved_until < now(), set back to 'listed', clear reserved_by/reserved_until |
| Typesense full sync (backup) | `/api/cron/sync-typesense` | Every 6 hours | Full reconciliation sync in case realtime sync missed events |

**Security:** Cron endpoints verify `CRON_SECRET` header (set in Vercel environment). Not accessible publicly.

**Idempotency:** Both jobs are idempotent — running them multiple times has no adverse effect.

---

## 8. Email Notifications

### Provider: Resend (recommended for Next.js/Vercel)

| Trigger | Email | Recipient |
|---------|-------|-----------|
| `checkout.session.completed` (webhook) | Order confirmation — items, total, shipping address | Customer |
| Admin marks order shipped | Shipping notification — tracking number, carrier | Customer |
| Spin purchase completed | Spin reveal — card name, image, details | Customer |
| Admin processes refund | Refund confirmation — amount, order reference | Customer |
| Supabase Auth signup | Welcome / verify email | Customer |
| Supabase Auth password reset | Password reset link | Customer |

**Implementation:** Resend SDK called from server actions / webhook handler. React Email for templates.

---

## 9. Rate Limiting

### Provider: Upstash Redis (serverless, works with Vercel)

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| `/api/webhooks/stripe` | No limit | — | Stripe manages its own retry logic |
| `createCheckoutSession` | 10 requests | 1 minute | Per user |
| `createSpinCheckoutSession` | 3 requests | 1 minute | Per user (extra protection beyond 24h rule) |
| `processAIIntake` | 10 requests | 1 minute | Per user |
| `signIn` | 5 requests | 1 minute | Per IP |
| `signUp` | 3 requests | 1 minute | Per IP |
| `searchInventory` | 60 requests | 1 minute | Per IP |

**Response when exceeded:** HTTP 429 with `Retry-After` header.

---

## 10. Typesense Search Schema

### Collection: `inventory_items`

| Field | Type | Facet | Sort | Notes |
|-------|------|-------|------|-------|
| id | string | No | No | Document ID |
| title | string | No | No | Primary search field |
| type | string | Yes | No | single/slab/sealed |
| price | int32 | Yes | Yes | In cents |
| set_name | string | Yes | No | |
| card_number | string | No | No | |
| year | int32 | Yes | Yes | |
| player | string | Yes | No | |
| rarity | string | Yes | No | |
| language | string | Yes | No | |
| edition | string | Yes | No | |
| condition | string | Yes | No | NULL for slabs |
| grade_company | string | Yes | No | NULL for non-slabs |
| grade_value | string | Yes | No | NULL for non-slabs |
| photos | string[] | No | No | First photo for thumbnail |
| created_at | int64 | No | Yes | Unix timestamp for "newest" sort |

**Default sorting:** `_text_match:desc` (relevance)
**Typo tolerance:** Enabled, `num_typos: 2`
**Token separators:** Include `-` and `/` for card numbers like "SV-049/198"

### Sync Strategy
- **Realtime:** After every `createInventoryItem`, `updateInventoryItem`, `publishInventoryItem`, `unpublishInventoryItem` server action, call `syncItemToTypesense` or `removeItemFromTypesense`
- **Backup:** Full reconciliation cron every 6 hours ensures no drift

---

## 11. Testing Strategy

### Frameworks
- **Unit/Integration:** Vitest (fast, native TypeScript, Vite-based)
- **E2E:** Playwright (browser automation for critical flows)
- **API testing:** Vitest + `fetch` for server action / webhook tests

### Test Organization
```
tests/
├── unit/           # Pure function tests (SKU generation, price formatting)
├── integration/    # Server action tests with test database
│   ├── checkout.test.ts
│   ├── reservation.test.ts
│   ├── spin.test.ts
│   └── webhook.test.ts
└── e2e/            # Playwright browser tests
    ├── browse-and-buy.spec.ts
    ├── spin-purchase.spec.ts
    ├── admin-inventory.spec.ts
    └── auth-roles.spec.ts
```

### MVP Acceptance Test Cases (from spec Section 13)
1. **Race condition:** Two users buy same single → only one succeeds, other gets "unavailable"
2. **Webhook idempotency:** Replay `checkout.session.completed` → no duplicate orders
3. **Spin cooldown:** Second spin within 24h → rejected server-side
4. **Spin tamper-proof:** Client cannot influence which card is selected
5. **Role enforcement:** Non-admin/staff → blocked from admin pages
6. **Order isolation:** Customer A cannot see Customer B's orders
7. **Search accuracy:** Fuzzy search returns correct matches, facets filter correctly
8. **Inventory lifecycle:** Items move through states correctly (draft → listed → reserved → sold → shipped)
9. **CSV export:** Contains correct shipping details for filtered orders
10. **Refund flow:** Refund updates order status + returns inventory to listed

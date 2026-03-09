# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL (Hosting)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Next.js App Router                      │  │
│  │  ┌─────────────────┐  ┌────────────────────────────────┐  │  │
│  │  │  (store)        │  │  (admin)                       │  │  │
│  │  │  Browse/Search  │  │  Inventory / Orders / Spin     │  │  │
│  │  │  Cart/Checkout  │  │  AI Intake / Audit Logs        │  │  │
│  │  │  Spin Page      │  │  CSV Export / Refunds          │  │  │
│  │  └────────┬────────┘  └──────────────┬─────────────────┘  │  │
│  │           │                          │                    │  │
│  │  ┌────────┴──────────────────────────┴─────────────────┐  │  │
│  │  │              API Routes / Server Actions            │  │  │
│  │  │  • Stripe webhook handler                          │  │  │
│  │  │  • Checkout session creation                       │  │  │
│  │  │  • Inventory reservation                           │  │  │
│  │  │  • Spin selection + checkout                        │  │  │
│  │  │  • AI intake processing                            │  │  │
│  │  │  • Admin CRUD (privileged)                         │  │  │
│  │  └──┬──────────┬──────────┬──────────┬────────────────┘  │  │
│  └─────┼──────────┼──────────┼──────────┼────────────────────┘  │
└────────┼──────────┼──────────┼──────────┼────────────────────────┘
         │          │          │          │
    ┌────▼────┐ ┌───▼───┐ ┌───▼────┐ ┌───▼──────┐
    │Supabase │ │Stripe │ │Typesense│ │Anthropic │
    │ • DB    │ │       │ │        │ │ (Claude) │
    │ • Auth  │ │       │ │        │ │          │
    │ • Store │ │       │ │        │ │          │
    │ • RLS   │ │       │ │        │ │          │
    └─────────┘ └───────┘ └────────┘ └──────────┘
```

## Core Components

### Storefront (Customer-Facing)
**Purpose:** Browse collections, search/filter inventory, view product details, manage cart, complete checkout, view orders, purchase spins.
**Key files:** `src/app/(store)/`
**Depends on:** Supabase (read catalog), Typesense (search), Stripe (checkout)

### Admin Dashboard
**Purpose:** Inventory CRUD, AI-assisted intake, order management, spin pool management, shipping CSV export, refund processing, audit log viewing.
**Key files:** `src/app/(admin)/`
**Depends on:** Supabase (full CRUD), Stripe (refunds), Anthropic (AI intake)

### API Layer (Server Actions + Route Handlers)
**Purpose:** All server-side logic: checkout creation, inventory reservation, webhook processing, spin selection, AI intake calls. Enforces server-side authority.
**Key files:** `src/app/api/`, server actions in `src/lib/`
**Depends on:** All external services

### Supabase Layer
**Purpose:** PostgreSQL database, Row Level Security policies, authentication (JWT + roles), file storage for card photos.
**Key files:** `src/lib/supabase/`, `supabase/migrations/`
**Depends on:** Nothing (foundational)

### Search Layer
**Purpose:** Typesense integration for fuzzy search with typo tolerance, faceted filtering (set, player, year, condition, grade, price, rarity, language, edition), and sorting.
**Key files:** `src/lib/typesense/`
**Depends on:** Supabase (syncs inventory data to Typesense)

### Payment Layer
**Purpose:** Stripe Checkout session creation, webhook handling for payment confirmation, refund processing. Stores all Stripe object IDs for traceability.
**Key files:** `src/lib/stripe/`, `src/app/api/webhooks/stripe/`
**Depends on:** Supabase (order/inventory state updates)

### AI Intake Layer
**Purpose:** Claude Vision API integration for card metadata detection. Server-side only. Returns structured JSON, never freeform text.
**Key files:** `src/lib/ai/`
**Depends on:** Anthropic API, Supabase Storage (images)

## Data Flow

### Happy Path: Customer Purchase
1. Customer browses → Typesense query → results rendered
2. Customer adds item to cart (client-side state)
3. Customer initiates checkout → **Server** creates Stripe Checkout Session
4. **Server** atomically reserves inventory item (status: `listed` → `reserved`, sets `reserved_until` TTL)
5. Customer redirected to Stripe Checkout
6. Stripe processes payment → sends `checkout.session.completed` webhook
7. **Server** webhook handler: validates signature, updates order to `paid`, item to `sold`
8. Customer sees confirmation page + receives email
9. If checkout expires: cron/scheduled function releases reservation (status: `reserved` → `listed`)

### Happy Path: Daily Spin
1. Customer clicks "Spin" → **Server** checks eligibility (no spin in last 24h)
2. **Server** selects random item from spin pool using crypto RNG
3. **Server** atomically reserves selected item
4. **Server** creates Stripe Checkout Session for $5 with item attached
5. Stripe webhook confirms payment → item: `reserved` → `sold`, removed from spin pool
6. Customer sees card reveal on confirmation page
7. If checkout expires: item releases back to spin pool

### Happy Path: AI Intake
1. Staff uploads card photo → image sent to **Server**
2. **Server** sends image to Claude Vision API
3. Claude returns structured JSON (card_name, set, number, year, rarity, etc.)
4. Staff sees suggestion panel, reviews/edits metadata
5. Staff manually selects condition, sets price, assigns location
6. Staff confirms → draft record committed as `listed`

## Key Design Decisions

### Decision: Stripe Checkout (not Stripe Elements)
**Date:** 2026-03-01
**Context:** Need payment processing with strong security defaults.
**Decision:** Use Stripe Checkout (hosted payment page), not Stripe Elements (embedded).
**Rationale:** Checkout is PCI-compliant out of the box, handles 3DS/SCA, and gives us Stripe Radar for fraud. Simpler to implement. We don't need a custom payment form for MVP.
**Consequences:** Less UI customization on payment page; acceptable for MVP.

### Decision: Typesense over Meilisearch
**Date:** 2026-03-01
**Context:** Need fast fuzzy search with faceted filtering for card catalog.
**Decision:** Use Typesense as the search engine.
**Rationale:** Better faceted search support, explicit schema (matches our structured card data), good typo tolerance, self-hostable or Typesense Cloud, strong Node.js SDK.
**Consequences:** Additional infrastructure to manage (Typesense server). Requires sync mechanism from Supabase.

### Decision: Atomic Reservation with TTL
**Date:** 2026-03-01
**Context:** 1-of-1 items must never be oversold. Two buyers cannot purchase the same card.
**Decision:** Use PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) within a transaction to atomically reserve items. Set `reserved_until` timestamp (10-15 min TTL). Cron releases expired reservations.
**Rationale:** PostgreSQL transactions provide ACID guarantees. Row locks prevent race conditions. TTL prevents indefinite holds from abandoned checkouts.
**Consequences:** Need a scheduled function to release expired reservations. Slight complexity in checkout flow.

### Decision: Draft Intake Records
**Date:** 2026-03-01
**Context:** AI intake could produce errors, partial failures, or incorrect metadata.
**Decision:** Intake creates a temporary draft record first. Only committed as `listed` after human confirmation.
**Rationale:** Protects against AI mistakes, partial image upload failures, and accidental publishing. Clean separation between "in progress" and "live."
**Consequences:** Extra status state to manage (`draft`). Minimal overhead.

### Decision: Server-Side Spin Selection
**Date:** 2026-03-01
**Context:** Spin must be fair and tamper-proof. Customers cannot influence which card they receive.
**Decision:** All spin logic (eligibility check, random selection, reservation) happens server-side. Use `crypto.getRandomValues()` for RNG. Log seed/nonce for auditability (without exposing to client).
**Rationale:** Client-side selection would be trivially exploitable. Cryptographic RNG ensures fairness.
**Consequences:** Spin selection is a black box to the customer (by design).

## Patterns and Conventions

### Naming Conventions
- **Files:** kebab-case (`inventory-list.tsx`, `create-checkout.ts`)
- **Components:** PascalCase (`ProductCard`, `SpinButton`)
- **Database tables:** snake_case (`inventory_items`, `order_items`)
- **API routes:** kebab-case (`/api/create-checkout`, `/api/webhooks/stripe`)
- **Environment variables:** SCREAMING_SNAKE_CASE (`STRIPE_SECRET_KEY`, `SUPABASE_URL`)

### Error Handling
- Server actions return `{ success: boolean, data?, error? }` pattern
- Stripe webhook errors: log to Sentry, return appropriate HTTP status
- AI intake failures: graceful fallback to manual entry, never block workflow
- Inventory reservation failures: clear user-facing message ("Item no longer available")

### Testing Approach
- **Acceptance tests** for all MVP acceptance criteria (Section 13 of spec)
- **Integration tests** for Stripe webhook idempotency, reservation atomicity, spin eligibility
- **Unit tests** for business logic (reservation TTL, spin pool selection, SKU generation)

## Security Considerations

- **Authentication:** Supabase Auth with JWT. Three roles: `admin`, `staff`, `customer`.
- **Authorization:** RLS policies on all tables. Admin endpoints require verified JWT + admin/staff role.
- **Payments:** Stripe webhook signature verification on every event. Never trust client-side payment confirmation.
- **Inventory:** Atomic reservation with row locks. No client-side state can modify inventory status.
- **Spin:** Server-side only. Cryptographic RNG. Anti-cheat logging.
- **AI Intake:** API key stored in environment variables (never client-side). Server-side processing only. Rate-limited endpoint.
- **Fraud:** Stripe Radar enabled. AVS/CVV checks required. Signature required for orders >= $250.
- **Rate limiting:** Applied to auth-sensitive endpoints (spin, checkout, admin, intake).

## Performance Constraints

- **Search:** Typesense queries must return in < 100ms for good UX
- **AI Intake:** Claude Vision call must complete within 3 seconds
- **Inventory reservation:** Must be atomic — no perceivable delay for the user
- **Image loading:** Optimized thumbnails + CDN (Vercel/Supabase) for fast product pages
- **Reservation release:** Expired reservations cleaned up within 1 minute of TTL expiry

## Integration Points

| System | Purpose | Protocol | Notes |
|--------|---------|----------|-------|
| Supabase | DB, Auth, Storage | REST / Realtime WS | Primary data store. RLS enforced. |
| Stripe | Payments | REST + Webhooks | Checkout Sessions, Payment Intents, Refunds |
| Typesense | Search | REST | Synced from Supabase on inventory changes |
| Anthropic | AI card detection | REST | Claude Vision API, server-side only |
| Sentry | Error monitoring | SDK | Captures errors + performance traces |
| Vercel | Hosting + CDN | N/A | Deploys from Git, edge caching for assets |

## Infrastructure

### Environments
- **Development:** Local Next.js dev server + Supabase local (or dev project) + Typesense dev instance + Stripe test mode
- **Staging:** Vercel preview deployments + Supabase staging project + Stripe test mode
- **Production:** Vercel production + Supabase production project + Typesense Cloud + Stripe live mode

### Deployment Process
- Push to `main` → Vercel auto-deploys to production
- Push to feature branches → Vercel preview deployments
- Database migrations: applied via Supabase CLI (`supabase db push`)
- Typesense schema changes: applied via migration scripts

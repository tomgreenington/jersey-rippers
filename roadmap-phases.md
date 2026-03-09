# Roadmap Phases — Real Data MVP

**Philosophy:** Skip mock data. Get real Supabase + AI intake + Stripe checkout working immediately so admins can upload cards and customers can buy them. Full visual polish comes later.

## Phase Status

- [x] Phase 1: Project Scaffolding + UI Foundation
- [ ] Phase 2: Supabase + AI Intake + Payments (MVP Backbone)
- [ ] Phase 3: Storefront Pages + Search (Customer Experience)
- [ ] Phase 4: Spin Mechanic (Engagement)
- [ ] Phase 5: Search Optimization & Polishing (Future)
- [ ] Phase 6: Hardening & Acceptance Tests (Future)

---

## Phase Details

### Phase 1: Project Scaffolding + UI Foundation ✓
**Status:** COMPLETE
**Objective:** Set up the Next.js project with TypeScript, Tailwind, shadcn/ui, and establish the app structure, routing, shared layout, and reusable UI primitives.
**Delivered:**
- Next.js project initialized with App Router, TypeScript strict mode
- Tailwind CSS + shadcn/ui configured
- App shell: header, navigation, footer, responsive layout
- Route group structure: `(store)` for customer pages, `(admin)` for dashboard
- Placeholder logo + loading gif slots
- TypeScript types for all entities
- ESLint + Prettier configured

---

### Phase 2: Supabase + AI Intake + Payments (MVP Backbone)
**Status:** Next
**Objective:** Wire up Supabase (schema, auth, storage), build admin inventory intake with Claude Vision AI, and connect Stripe checkout. This is the MVP core — everything else depends on it.
**Key Deliverables:**
- **Supabase Setup:**
  - PostgreSQL schema: `profiles`, `inventory_items`, `orders`, `order_items`, `audit_log`, `spin_events`
  - Supabase Auth with role-based access (admin, staff, customer)
  - RLS policies for all tables
  - Storage buckets for card photos + thumbnails

- **Admin Inventory Intake Form:**
  - Photo upload UI (drop zone or file picker)
  - Claude Vision API integration (server-side)
  - AI suggests all TCG fields: player, set, card number, year, condition, grade (if slab), rarity, language, edition, quantity, price
  - Admin reviews + edits AI suggestions + manually sets condition + confirms
  - Creates inventory item in `draft` status
  - Published as `listed` when admin confirms
  - Audit logging on every change

- **Stripe Integration:**
  - Checkout session creation (server action)
  - Inventory reservation (atomic, TTL 10-15 min)
  - Stripe webhook handler (`checkout.session.completed`, `checkout.session.expired`, `charge.refunded`)
  - Order creation driven by webhook (not client success page)
  - Basic order confirmation email via Resend

- **Admin Dashboard (Minimal):**
  - Inventory list page (filter by status, type)
  - Inventory intake page (photo upload + AI + review)
  - Orders list page (paid/unpaid status)
  - Basic metrics dashboard

- **Customer Storefront (Minimal):**
  - Basic product browse page (list all `listed` items)
  - Product detail page (photo, attributes, price, add-to-cart)
  - Simple cart (client-side state only)
  - Checkout flow (reserve + Stripe session)
  - Order confirmation page (mock for now)
  - Order status / my orders page (basic)

**Success Criteria:**
- [ ] Supabase project created + schema deployed
- [ ] Admins can upload photo + AI suggests fields
- [ ] Admin can confirm + item appears as `listed` in inventory
- [ ] Customers see item on browse page
- [ ] Customers can add to cart + checkout via Stripe
- [ ] Webhook creates order + updates inventory to `sold`
- [ ] Order confirmation email sent
- [ ] `npm run lint` + `npx tsc --noEmit` pass
- [ ] No oversells (atomic reservation verified via test)

---

### Phase 3: Storefront Pages + Search (Customer Experience)
**Status:** After Phase 2
**Objective:** Build out all customer-facing pages with real data, add Typesense search with faceted filtering, make the storefront feel polished.
**Key Deliverables:**
- **Homepage:**
  - Hero section with featured collections
  - Dice roll / grab bag section (links to spin, placeholder for now)
  - Top sellers section (trending cards)
  - New inventory section (recently listed cards)
  - Clean responsive design

- **Browse/Collection Pages:**
  - Singles, Graded, Sealed, New Drops collections
  - Grid layout with ProductCard components
  - Responsive on mobile/tablet/desktop

- **Search + Filtering:**
  - Typesense integration + sync from Supabase
  - Faceted filters: set, player, year, condition, grade, price range, rarity, language, edition
  - Fuzzy search bar
  - Sort by: newest, price (low/high), best match
  - Mobile-friendly filter drawer

- **Navigation Improvements:**
  - Header with logo, search, cart, account menu
  - Footer with links, contact info
  - Mobile menu

- **Design Polish:**
  - Follow design-direction.md (Jersey Red primary, Collector Blue secondary, Inter font, dark mode)
  - Card shadows, hover states, loading states
  - Responsive images + lazy loading

**Success Criteria:**
- [ ] Homepage renders and displays real data from Supabase
- [ ] Browse pages show filtered collections
- [ ] Search + facets work via Typesense
- [ ] All pages responsive on mobile/tablet/desktop
- [ ] Linting + type checking pass
- [ ] Page load times acceptable (lighthouse score acceptable)

---

### Phase 4: Spin Mechanic (Engagement)
**Status:** After Phase 3
**Objective:** Build the daily $5 spin purchase (1 per 24h), server-side random selection, and spin pool management.
**Key Deliverables:**
- **Spin Purchase Flow:**
  - Spin page with rules, pricing, value range disclaimer
  - "Buy spin" button (checks 24h eligibility server-side)
  - $5 Stripe checkout for spin
  - Random selection via crypto RNG (server-side, tamper-proof)
  - Webhook confirms payment + reserves item + removes from spin pool

- **Spin Card Reveal:**
  - Post-purchase spin reveal page (shows assigned card)
  - Email notification with card details

- **Admin Spin Pool Management:**
  - Add/remove items from spin pool (toggle on inventory)
  - View current spin pool size
  - Bulk edit spin pool flag

- **Rate Limiting:**
  - Spin endpoint rate limited (3 requests / minute per user)
  - 24h cooldown enforced server-side

**Success Criteria:**
- [ ] Spin purchase flow works end-to-end
- [ ] Customer cannot spin twice in 24h (server-side enforced)
- [ ] Server-side random selection tamper-proof (no client influence)
- [ ] Spin adds item to spin pool / removes on sold
- [ ] Spin reveal page displays correct card
- [ ] Confirmation email sent
- [ ] Admin can manage spin pool

---

### Phase 5: Search Optimization & Polishing (Future)
**Status:** Nice-to-have, can ship without
**Objective:** Optimize Typesense schema, tweak facet behavior, add advanced sort options, polish UX edge cases.
**Key Deliverables:**
- Typesense schema refinements (token separators, typo tolerance)
- Sync mechanism optimizations
- Sort by relevance/newest/price/rarity
- Advanced filters (bulk actions)
- Performance monitoring

---

### Phase 6: Hardening & Acceptance Tests (Future)
**Status:** Before production release
**Objective:** Add error monitoring, rate limiting, acceptance tests, edge case handling.
**Key Deliverables:**
- Sentry integration for error reporting
- Upstash Redis for advanced rate limiting
- All MVP acceptance tests passing:
  - Race condition: two users buy same item → only one succeeds
  - Webhook idempotency: replay webhook → no duplicate orders
  - Spin cooldown: second spin in 24h → rejected
  - Role enforcement: non-admin blocked from admin pages
  - Order isolation: customers see only own orders
  - Inventory state machine correctness
  - CSV export accuracy
  - Refund flow updates inventory correctly
- Security hardening (CSRF, XSS, SQL injection prevention)
- Load testing

---

## Completed Phases Archive

### Phase 1: Project Scaffolding + UI Foundation ✓
- Completed 2026-03-06
- Next.js + TypeScript + Tailwind + shadcn/ui + all routing + types

---

## Rules

- **No reverting to mock data** — real data from Phase 2 onward
- **Admin-only intake** — customers cannot upload inventory
- **AI assists only** — human must confirm all metadata
- **Each phase must have clear, testable deliverables**
- **No phase is complete without verification against success criteria**

---

## Key Dependencies

- **Phase 2 blocks everything** — Supabase schema + AI intake + Stripe checkout are foundational
- **Phase 3 requires Phase 2** — storefront needs real data + payment flow working
- **Phase 4 requires Phases 2+3** — spin mechanic depends on inventory + checkout
- **Phases 5+6 are polish** — can happen in parallel after Phase 3

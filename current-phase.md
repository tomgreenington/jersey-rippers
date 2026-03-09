# Current Phase

**Phase:** 2: Supabase + AI Intake + Payments (MVP Backbone)
**Started:** 2026-03-06
**Target Completion:** TBD (depends on team velocity)
**Status:** 90% Complete (was 75%)

## Objective

Wire up Supabase (schema, auth, storage), build admin inventory intake with Claude Vision AI, and connect Stripe checkout. This is the MVP core — everything else depends on it.

## Context

Jersey Rippers is moving away from the mock-data-first approach. Instead, we're building the real backend immediately so your team can start uploading cards via the intake form and customers can start buying them. All data is real from day 1.

## In Scope

### Supabase Setup
- [x] Create Supabase project (dev + prod)
- [x] PostgreSQL schema: `profiles`, `inventory_items`, `orders`, `order_items`, `audit_log`, `spin_events`
- [x] Supabase Auth with role system (admin, staff, customer)
- [x] RLS policies on all tables (customer sees own orders, admin/staff sees all, public catalog read-only)
- [ ] Storage buckets: `card-photos` (uploads) + `card-thumbnails` (generated)
- [x] Database migrations tracked in version control (`scripts/deploy-schema.js`)

### Admin Inventory Intake Form — Card Listing Wizard ✅ 95% COMPLETE
- [x] Photo upload UI (drop zone + file picker) — drag-and-drop with previews
- [x] Supabase Storage upload on client side — real uploads with error handling
- [x] Claude API integration (server action) — text-based enrichment
- [x] AI suggests all TCG fields via enrichCard() server action
- [x] Typeahead search against cards DB (ilike on player/set/card#)
- [x] PSA Auction Prices scraping → auto-price + spin pool
- [x] Admin review panel: edit suggestions, set condition/grade, confirm
- [x] SKU auto-generation on confirmation (fixed count bug)
- [x] Creates item as `draft` or `listed`
- [x] Error handling: fallback text enrichment if search fails
- [x] Photo-first flow — Step 1 is now Photos (user preference)
- [x] userId from auth session (not hardcoded)
- [x] Photo files persisted to Supabase Storage with public URLs
- [ ] ⏳ MANUAL SETUP: Create `card-photos` bucket in Supabase Dashboard
- [ ] ⏳ TEST: End-to-end flow (upload → search → publish)

### Stripe Integration ⏳ NEXT
- [ ] Stripe account configured (test mode initially)
- [ ] Server action: `createCheckoutSession(items[])`
  - Validate items exist + are listed
  - Atomically reserve each item (status: `listed` → `reserved`, set `reserved_until` = now + 15 min)
  - Create Stripe Checkout Session
  - Return checkout URL
- [ ] Webhook handler: `/api/webhooks/stripe`
  - `checkout.session.completed` → create order, mark items `sold`, send confirmation email
  - `checkout.session.expired` → release reservations (status: `reserved` → `listed`)
  - `charge.refunded` → mark order refunded, return inventory to `listed`
- [ ] Order creation from webhook (not client-side success callback)
- [ ] Email notification on order confirm (Resend integration)

### Basic Admin Dashboard ⏳ AFTER INTAKE
- [ ] Dashboard home: key metrics (inventory count, orders today, revenue)
- [ ] Inventory list page: filter by status, type, spin_pool flag
- [ ] Inventory intake page (the big one)
- [ ] Orders list page: filter by status (pending/paid/shipped/refunded)
- [ ] Admin role enforcement via RLS + middleware

### Basic Customer Storefront ⏳ NEXT (AFTER INTAKE)
- [ ] Browse/list page: show all `listed` items (no search/filter yet)
- [ ] Product detail page: photo(s), all attributes, price, add-to-cart button
- [ ] Shopping cart: client-side state only (add/remove items)
- [ ] Checkout flow: reserve items → redirect to Stripe
- [ ] Order confirmation page: order number, items, total, shipping address
- [ ] Order status page: shows current order status + tracking (if shipped)
- [ ] My orders: list of customer's orders with links to detail pages
- [x] Authentication: sign up, sign in, sign out (Supabase Auth)

## Out of Scope

- Typesense search (Phase 3)
- Advanced faceted filtering (Phase 3)
- Spin mechanic (Phase 4)
- Full visual polish (Phase 3)
- Sentry error monitoring (Phase 6)
- Acceptance tests (Phase 6)
- CSV export (Phase 3+)

## Constraints

- Must use App Router (not Pages Router)
- TypeScript strict mode
- All forms must be responsive (mobile-first)
- AI integration must be server-side only (API key never exposed)
- All critical operations (checkout, inventory reservation, spin) must be server-side
- No client-side can influence inventory state or payment outcome

## Dependencies

- Supabase account + project created
- Stripe account configured (test keys)
- Anthropic API key (Claude Vision)
- Resend account + API key (email)
- Node.js 18+, npm

## Blockers

- None currently. Wizard is complete and ready for manual testing.

## Manual Setup Required

- [ ] Create `card-photos` bucket in Supabase Storage (Public visibility)
- [ ] Test wizard end-to-end (upload → search → publish)

## Progress Log

| Date | Progress |
|------|----------|
| 2026-03-09 Session 4 | ✅ Wizard finalized: photo-first flow, Supabase Storage upload, auth integration. Ready for manual testing. 90% → 95% complete. |
| 2026-03-06 Session 3 | ✅ 6-step card listing wizard implemented. Builds successfully. Photos-first vs search-first flow needs clarification. |
| 2026-03-06 Session 2 | ✅ Phase 2 60% complete: Supabase schema deployed, auth system complete, database connected via CLI. Ready for admin intake form + storefront. |

## Deliverables (Updated)

- [x] Supabase project created + schema deployed
- [ ] Admin can upload photo → AI suggests fields → confirm → item appears as `listed`
- [ ] Customer can browse `listed` items
- [ ] Customer can add to cart + checkout via Stripe
- [ ] Webhook creates order + sends email
- [ ] Inventory reservation prevents oversells (verified with test)
- [ ] Admin dashboard accessible (role-gated)
- [x] All auth flows working (sign up, sign in, sign out)
- [x] Lint + type check pass

## Success Criteria (Updated)

- [x] `npm run dev` starts with Supabase + Stripe keys loaded (Supabase working; Stripe keys pending)
- [ ] Admin intake form: upload photo → receive AI suggestions → confirm → item in inventory list
- [ ] Admin dashboard shows inventory + orders
- [x] Customer signup + signin works
- [ ] Customer can browse items (at least 5 items in inventory)
- [ ] Customer can add item to cart + checkout
- [ ] Stripe test checkout completes
- [ ] Webhook fires + creates order
- [ ] Email sent on order confirmation
- [ ] Item shows as `sold` after payment
- [x] `npm run lint` and `npx tsc --noEmit` pass cleanly
- [x] No console errors in dev server

## Next Steps (Prioritized)

1. **IMMEDIATE (Next Session):**
   - [ ] Create `card-photos` bucket in Supabase (1-click, see WIZARD_SETUP.md)
   - [ ] Test wizard end-to-end locally
   - [ ] (Optional) Seed 2-5k cards to `cards` table from TCDB for better search

2. **AFTER WIZARD TESTED:** Build storefront browse page (display `listed` items)

3. **THEN:** Wire up Stripe Checkout
   - Create checkout session
   - Atomic inventory reservation
   - Webhook handlers (checkout.session.completed, charge.refunded)
   - Order creation from webhook

4. **FINALLY:** Test full flow: admin upload → customer browse → customer purchase → webhook order creation → email

## Open Questions

- [ ] Stripe test keys: pk_test_ and sk_test_ added to .env.local? (optional for Phase 2 start, but needed before Stripe checkout)
- [ ] Resend email keys: needed for Phase 2? (can mock email to console for now)
- [ ] Admin user: manually created in Supabase Auth + profiles table with role=admin?

## Blockers

- None currently. All infrastructure in place.

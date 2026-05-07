# Current Phase

**Phase:** Rip-to-Ship V1 Foundation
**Roadmap Position:** Phase 2.7 - checkout, accounts, admin orders, and fulfillment
**Last Reality Audit:** 2026-05-06
**Status:** Admin intake is mostly working. Storefront, embedded checkout, order history, admin orders, fulfillment, shipping export, and random-pool management code exist. The live Supabase database already has the fulfillment migration and checkout idempotency guard applied, production dependency audit is clean, and one standard cart paid test order has finalized through the browser success-page fallback with a fulfillment task. The app is not launch-ready until signed Stripe webhook delivery, mystery checkout, mobile QA, and final acceptance verification are complete.

## Objective

Turn Buck & Baums Breaks from a working card-intake/storefront prototype into a launchable commerce operating loop:

`Inventory intake -> public listing -> cart or $5 mystery purchase -> Stripe payment -> order record -> fulfillment queue -> shipping/tracking -> customer history`

The immediate product goal is **Rip-to-Ship V1**: a professional card-selling machine where customers can buy confidently and admins can see exactly what needs to be packed, shipped, and tracked.

## Current Reality

### Working Or Mostly Working

- Supabase project, schema, auth, storage, and service-role code paths exist.
- The live `card-photos` Storage bucket exists and is public.
- Customer signup/signin/signout exist and create `profiles` rows with role `customer`.
- Admin auth/setup/settings exist, with fallback between `admin_users` and `profiles.role`.
- Admin card intake/listing wizard exists and has been smoke-tested locally.
- Inventory publish flow can create listed cards with real photos.
- Public catalog reads listed inventory from Supabase when env vars are configured and mock catalog fallback is disabled.
- Reserved/sold cards are hidden from public catalog and mystery previews because catalog reads only `status = listed`.
- Product detail pages exist with add-to-cart.
- Client-side cart exists in localStorage.
- Standard cart Stripe Checkout session creation exists in `src/lib/supabase/cart-checkout-actions.ts`.
- Random-card `$5` Stripe Checkout session creation exists in `src/lib/supabase/random-card-actions.ts`.
- Standard cart and `$5` mystery checkout now create Stripe `embedded_page` sessions and render Stripe's secure payment form on-site.
- Stripe checkout requests pin `Stripe-Version: 2026-03-25.dahlia`, which is required for `ui_mode=embedded_page`.
- Stripe webhook route exists at `src/app/api/webhooks/stripe/route.ts`.
- `fulfillment_tasks` migration exists, is already applied in live Supabase, and checkout finalization creates tasks idempotently.
- Checkout idempotency guard migration exists and is already applied in live Supabase.
- Customer `/orders` and `/orders/[id]` read real authenticated order history/details.
- Admin `/admin/orders`, `/admin/orders/[id]`, `/admin/orders/export`, and `/admin/spin` are backed by real server-side data/actions.
- Admin dashboard uses live Supabase metrics instead of mock data.
- Admin mark-shipped workflow updates fulfillment tasks, order tracking/status, inventory state, and audit log entries.
- Spin page and reveal page exist.
- Orders schema already includes shipping and tracking fields.
- `inventory_items.created_by` exists and is saved on intake, which can support fulfillment ownership.

### Verified Recently

- `/admin/settings` loaded without a Next overlay and showed readiness cards.
- `/admin/inventory` loaded without a Next overlay.
- `/admin/inventory/new` loaded without a Next overlay.
- A real card intake/list/publish flow worked for `Luis Severino Topps #CP-43`, SKU `BBB-SGL-20260430-0001`, price `$2.75`, `spin_pool=true`.
- When that card was in cart/reserved, the homepage and mystery pool appeared empty. This is desired behavior and must not be undone.
- `npm run lint` passed with existing older warnings only.
- `npm run build` passed after the fulfillment/order/admin changes.
- Local dev smoke checks returned `/` 200, `/orders` 200, `/spin` 200, and `/admin` 307 to login.
- Live Supabase has the fulfillment migration applied.
- Live Supabase has a public `card-photos` bucket.
- Standard cart checkout has one successful paid Stripe test-mode order finalized through the browser success-page fallback.
- That paid standard-cart order has a fulfillment task.
- Live Stripe currently has no configured webhook endpoint for `/api/webhooks/stripe`.
- Local `STRIPE_WEBHOOK_SECRET` is still not configured with a real `whsec_...` value.
- Live mystery checkout verification has not happened; the audit found `spin_events` count was `0`.
- `orders.stripe_checkout_session_id` now has a live unique guard for non-null Stripe sessions.
- Cart expired-reservation cleanup now cancels related pending cart orders.
- The stale pending order `BBB-ORD-20260430-E2C54623` was confirmed in Stripe as expired/unpaid and cancelled in Supabase.
- Mystery checkout finalization now reselects an existing order if duplicate webhook/browser replay hits the Stripe-session unique guard.
- Next was updated to `16.2.5`, `eslint-config-next` was matched to `16.2.5`, and Next's nested PostCSS is overridden to `8.5.10`.
- Stripe browser packages `@stripe/stripe-js` and `@stripe/react-stripe-js` are installed for embedded checkout.
- Cart and mystery checkout render the embedded Stripe form on-page and use `redirect_on_completion=never` so non-redirect payment methods stay in the same window.
- `npm audit --omit=dev` now reports `found 0 vulnerabilities`.
- `npm run lint` and `npm run build` passed after the embedded checkout changes.
- A direct Stripe test-mode smoke check confirmed `ui_mode=embedded_page` works when requests send `Stripe-Version: 2026-03-25.dahlia`; the throwaway session was expired immediately.

### Not Launch-Ready

- Standard cart checkout is partially verified through a paid success-page fallback, but webhook-first completion is not proven.
- Embedded standard cart checkout session creation is smoke-tested, but it still needs a real Stripe test-mode payment run.
- Embedded mystery checkout needs a real Stripe test-mode run with a listed spin-pool item.
- Webhook code exists, but Stripe has no configured test webhook endpoint, local `STRIPE_WEBHOOK_SECRET` is still placeholder/unconfigured, and webhook-driven completion has not been proven through Stripe CLI/dashboard.
- Confirmation pages can finalize from browser success pages, which is useful for local testing but is not enough for production confidence.
- Launch verification must run against real Supabase catalog data, not `NEXT_PUBLIC_USE_MOCK_CATALOG=true` or local mock fallback.
- No customer profile/account page exists for saved shipping, account details, or purchase history.
- Admin order/fulfillment pages are implemented, but need smoke-testing with real paid orders.
- No admin sale notification exists.
- No shipping label purchase integration exists beyond CSV export and manual tracking entry.
- No Resend/email notification implementation exists.
- No acceptance tests exist for checkout, webhooks, reservation races, order isolation, or fulfillment.
- Mobile responsiveness exists in pieces, but full mobile QA has not been performed.

## Non-Negotiables

- **Do not undo reserved-card hiding.** Public catalog, homepage mystery previews, and spin previews must only show currently listed inventory.
- **No oversells.** A card that is reserved, sold, shipped, archived, or returned must not be purchasable from public flows.
- **Server-side authority.** Inventory reservation, random-card selection, payment finalization, fulfillment updates, and admin actions must happen server-side.
- **Webhook-first production mindset.** Browser success pages may be allowed as an idempotent local fallback, but production confidence requires Stripe webhook completion.
- **Customer/admin isolation.** Customers see only their own orders and profile. Admin/staff see operational data.
- **Fulfillment must be operational, not decorative.** After payment, admins need a queue showing what sold, who owns/holds the card, where it is stored, what address to ship to, and what tracking status exists.
- **Audit important mutations.** Inventory status, order status, fulfillment status, shipping/tracking, refunds, and admin edits should be logged.

## In Scope Now: Rip-to-Ship V1

### 1. Checkout Professionalization

- Polish cart UI and mobile layout.
- Show clear inventory verification/reservation messaging.
- Improve checkout error states and empty states.
- Test embedded standard cart Stripe Checkout end-to-end in test mode.
- Test embedded mystery-card Stripe Checkout end-to-end in test mode.
- Confirm order rows, order item rows, spin event rows, and inventory `sold` state.
- Confirm cancelled/expired checkout releases reservations.

### 2. Customer Account Portal

- Build `/orders` as a real authenticated order-history page.
- Build `/orders/[id]` as a real authenticated order detail page.
- Show purchased items, mystery pulls, totals, shipping address, order status, tracking carrier/number, and dates.
- Add account/profile surface for email/display name and future shipping preferences.
- Ensure customer order isolation.

### 3. Admin Command Center

- Replace mock admin dashboard metrics with live Supabase metrics.
- Build real `/admin/orders` with filters for paid, pending, shipped, refunded, cancelled, and fulfillment status.
- Build real `/admin/orders/[id]` with customer, items, shipping address, payment IDs, admin notes, and status controls.
- Build real `/admin/spin` pool manager with listed pool count and item controls.
- Keep `/admin/settings` as readiness/admin management, but expand only after orders/fulfillment are real.

### 4. Fulfillment And Shipping

- Add a fulfillment model. Preferred approach: create `fulfillment_tasks` rather than overloading `orders`.
- Each paid order item should create or appear in a fulfillment queue.
- Track fulfillment owner from `inventory_items.created_by` initially; allow reassignment later.
- Track states such as `needs_packing`, `packed`, `label_created`, `shipped`, `delivered`, `blocked`, `cancelled`.
- Admin can enter carrier/tracking, mark shipped, and update order/inventory state consistently.
- Shipping/export page should export paid/unshipped orders with names, addresses, emails, item titles, SKUs, and declared value.
- Add admin-facing sale/fulfillment notification placeholder if email/Slack is not ready.

### 5. Mobile And Launch Hardening

- QA mobile for homepage, product page, cart, checkout return, spin, reveal, login/signup, orders, admin inventory, admin orders, and fulfillment.
- Add tests around reservation release, webhook idempotency, random-card purchase, customer order isolation, and admin role enforcement.
- Confirm env readiness: Supabase, Storage, Stripe keys, Stripe webhook secret, Anthropic, and optional Resend.

## Recommended Remaining Work

1. **Configure and verify Stripe webhooks.**
   - Configure a Stripe test webhook endpoint for `/api/webhooks/stripe`.
   - Replace the placeholder local/deployed `STRIPE_WEBHOOK_SECRET` with the endpoint signing secret.
   - Verify `checkout.session.completed`.
   - Verify `checkout.session.expired`.
   - Replay completed and expired events to prove idempotency and cancellation.
   - Success means order finalization works without the browser success-page fallback.

2. **Verify expired checkout cleanup.**
   - Code now cancels pending cart orders when expired cart reservations are released.
   - The known stale pending expired-session order has been cleaned.
   - Run a real `checkout.session.expired` webhook and confirm pending order cancellation end-to-end.

3. **Harden and verify mystery checkout.**
   - The unique DB guard for `orders.stripe_checkout_session_id` is applied live.
   - Random-card finalization now handles duplicate webhook/browser replay by reselecting the existing order.
   - Run a real Stripe test-mode mystery purchase and confirm `spin_events`, `order_items`, sold inventory, and fulfillment tasks.

4. **Keep dependency/security remediation verified.**
   - Production audit is clean after updating Next to `16.2.5`, matching `eslint-config-next`, and overriding Next's nested PostCSS to `8.5.10`.
   - Re-run `npm audit --omit=dev`, `npm run lint`, and `npm run build` before launch.

5. **Smoke-test customer/admin order flows.**
   - Customer `/orders` and `/orders/[id]` with real paid orders.
   - Admin `/admin/orders`, `/admin/orders/[id]`, `/admin/orders/export`, and `/admin/spin`.
   - Mark shipped and confirm order, task, inventory, audit log, and customer tracking display.

6. **Decide admin/staff behavior.**
   - Either allow staff through `/admin/login`, or make admin-only login intentional.
   - Keep `/admin/settings` admin-only if staff should only handle operations.

7. **Polish account and notification surfaces.**
   - Add account/profile page if scoped.
   - Add admin-facing sale/fulfillment notification placeholder or Resend implementation.

8. **Polish checkout UX.**
   - Cart and add-to-cart professionalism, mobile layout, payment status, reserve timers/errors where useful.

9. **Run final verification.**
   - `npm run lint`.
   - `npm run build`.
   - Browser smoke tests for `/`, `/search`, `/cart`, `/spin`, `/orders`, `/admin`, `/admin/inventory`, `/admin/orders`, `/admin/spin`, and `/admin/settings`.
   - Mobile QA and focused acceptance tests.

10. **Document what changed and what remains.**
   - Keep `current-phase.md`, `roadmap-phases.md`, `changelog.md`, and `RIP_TO_SHIP_HANDOFF.md` current.

## Success Criteria For Rip-to-Ship V1

- Admin can intake and publish a card.
- Listed cards appear publicly.
- Reserved cards disappear from public catalog/mystery previews.
- Customer can sign up/sign in.
- Customer can add a listed card to cart and complete Stripe test checkout.
- Customer can buy one or more `$5` mystery cards through Stripe test checkout.
- Paid checkout creates or updates one order with correct order items.
- Purchased inventory becomes `sold` and cannot be purchased again.
- Customer can view order history and order details.
- Admin can view all paid orders.
- Admin can see a fulfillment queue for paid/unshipped items.
- Admin can mark an order/item shipped with carrier/tracking.
- Customer can see shipped/tracking status.
- Admin dashboard uses live data, not mock data.
- Mobile store and admin critical paths are usable.
- `npm run lint` and `npm run build` pass.

## Useful Files

- Store catalog: `src/lib/supabase/catalog.ts`
- Cart checkout: `src/lib/supabase/cart-checkout-actions.ts`
- Mystery checkout: `src/lib/supabase/random-card-actions.ts`
- Stripe webhook: `src/app/api/webhooks/stripe/route.ts`
- Store cart: `src/app/(store)/cart/page.tsx`
- Store orders: `src/app/(store)/orders/page.tsx`, `src/app/(store)/orders/[id]/page.tsx`
- Admin dashboard: `src/app/(admin)/admin/page.tsx`
- Admin orders: `src/app/(admin)/admin/orders/page.tsx`, `src/app/(admin)/admin/orders/[id]/page.tsx`
- Admin export: `src/app/(admin)/admin/orders/export/page.tsx`
- Admin spin: `src/app/(admin)/admin/spin/page.tsx`
- Admin settings: `src/app/(admin)/admin/settings/page.tsx`, `src/lib/supabase/admin-actions.ts`
- Inventory actions: `src/lib/supabase/inventory-actions.ts`
- Schema: `supabase/migrations/20260306_init_schema.sql`, `supabase/migrations/20260328_add_created_by.sql`
- Zero-context handoff: `RIP_TO_SHIP_HANDOFF.md`

## Known Dirty Worktree Note

The repo has many existing changed files from prior user/agent work. Do not revert unrelated files. Work with the current state, keep edits scoped, and verify before declaring completion.

# Roadmap Phases - Rip-to-Ship V1

**Roadmap Name:** Rip-to-Ship V1
**Last Updated:** 2026-05-06
**Product Goal:** Build a complete operating loop for selling collectible cards: intake, listing, purchase, payment, order history, fulfillment, shipping, and tracking.

## Current Status

- [x] Phase 1: Project Scaffolding + UI Foundation
- [~] Phase 2: Supabase + Admin Intake + Storefront Backbone
- [~] Phase 3: Checkout + Mystery Purchase Backbone
- [ ] Phase 4: Customer Accounts + Order History
- [ ] Phase 5: Admin Orders + Fulfillment Queue
- [ ] Phase 6: Mobile Polish + Launch Hardening
- [ ] Phase 7: Search, Email, Labels, And Growth Features

Legend:
- `[x]` complete enough for current scope
- `[~]` partially implemented, not launch-confidence yet
- `[ ]` not implemented or still placeholder

## Current Truth From 2026-05-06 Audit

- The `20260501_add_fulfillment_tasks.sql` migration is already applied in live Supabase.
- The `20260506_add_checkout_idempotency_guards.sql` migration is already applied in live Supabase.
- The live `card-photos` Storage bucket exists and is public.
- Standard cart checkout has one successful paid Stripe test-mode order, finalized through the browser success-page fallback.
- That paid standard-cart order has a fulfillment task.
- Standard cart and `$5` mystery checkout now use Stripe embedded-page sessions so payment renders on-site instead of redirecting to a Stripe-hosted page.
- Stripe has no configured webhook endpoint for `/api/webhooks/stripe`, so webhook-first completion is not proven.
- `STRIPE_WEBHOOK_SECRET` is still placeholder/unconfigured locally and must be replaced with a real endpoint signing secret.
- `$5` mystery checkout is not proven; live `spin_events` count was `0` during the audit.
- The stale pending order `BBB-ORD-20260430-E2C54623` was confirmed expired/unpaid in Stripe and cancelled in Supabase.
- `npm audit --omit=dev` reports `found 0 vulnerabilities`.
- `npm run lint` and `npm run build` pass.

---

## Phase 1: Project Scaffolding + UI Foundation

**Status:** Complete

Delivered:
- Next.js App Router project structure.
- TypeScript, Tailwind, shadcn-style UI primitives.
- Store/admin route groups.
- Shared store/admin components.
- Branding assets and core layouts.

Remaining:
- None for current launch scope.

---

## Phase 2: Supabase + Admin Intake + Storefront Backbone

**Status:** Mostly complete, still needs operational polish

Delivered:
- Supabase schema for `profiles`, `inventory_items`, `orders`, `order_items`, `audit_log`, `spin_events`.
- Supabase Auth roles: `admin`, `staff`, `customer`.
- Storage bucket flow for card photos.
- Admin setup/login/settings.
- Admin intake wizard with photo upload, metadata, pricing, review, draft/list publish.
- `inventory_items.created_by` migration and save path for uploader ownership.
- Inventory page with status/detail badges.
- Public catalog functions reading live Supabase listed inventory.
- Homepage, collections/search, product detail, cart, and spin pages.

Launch gaps:
- Admin dashboard, order pages, and random-card pool manager are implemented but need real-data smoke testing.
- Inventory detail/edit maturity is limited.
- Storage thumbnails are not implemented.
- Orphaned uploaded photos can remain if storage succeeds but inventory insert fails.

Success criteria to close this phase:
- Admin dashboard uses live Supabase counts.
- Admin inventory workflows support real operational filters.
- Upload failure/orphan cleanup has a clear behavior.
- `npm run lint` and `npm run build` pass.

---

## Phase 3: Checkout + Mystery Purchase Backbone

**Status:** Implemented in code, not fully verified

Delivered:
- Client-side cart storage.
- Standard cart checkout server action in `src/lib/supabase/cart-checkout-actions.ts`.
- Standard cart creates pending order, reserves listed items, creates a Stripe embedded Checkout Session, and finalizes paid orders.
- One standard cart paid test order has been verified through the browser success-page fallback.
- Random-card checkout server action in `src/lib/supabase/random-card-actions.ts`.
- Random-card checkout creates Stripe embedded Checkout Sessions for on-site payment.
- Random-card flow selects server-side cards from `spin_pool=true` and `status=listed`.
- Random-card reveal page exists.
- Stripe webhook route exists at `src/app/api/webhooks/stripe/route.ts`.
- Checkout expiry handlers release reservations.
- Cart expired-reservation cleanup cancels related pending cart orders.
- `orders.stripe_checkout_session_id` has a live partial unique guard for non-null Stripe sessions.
- Random-card finalization reselects an existing order on duplicate webhook/browser replay.
- Public catalog only shows `status=listed`, so reserved cards stay hidden from public previews.

Launch gaps:
- Standard cart checkout still needs webhook-first verification; browser success-page fallback verification alone is not enough.
- Embedded standard cart checkout needs real Stripe test-mode verification.
- Embedded mystery checkout needs real Stripe test-mode verification.
- Stripe needs a configured test webhook endpoint for `/api/webhooks/stripe`, and webhook completion needs to be tested with signed events.
- Browser success-page finalization exists as local fallback; production confidence still needs webhook-first verification.
- No email confirmations.
- Fulfillment task creation is implemented and the migration is applied live, but it still needs live webhook verification.
- No focused tests for idempotency, reservation races, or expired sessions.

Success criteria to close this phase:
- Standard cart Stripe test checkout completes through webhook-first finalization.
- Mystery card Stripe test checkout completes.
- Webhook creates/updates order and marks inventory sold.
- Expired checkout releases reservations and cancels related pending orders.
- Replayed webhook is idempotent.
- Sold/reserved cards never appear in public catalog or spin previews.
- No old pending orders remain with zero reserved items.

---

## Phase 4: Customer Accounts + Order History

**Status:** Partially implemented

Delivered:
- Customer signup/signin/signout.
- Customer profiles are created with role `customer`.
- Real authenticated `/orders` list.
- Real authenticated `/orders/[id]` detail.
- Mystery-pull and single-card order items appear in order history/detail.
- Shipping address, fulfillment status, and tracking display when available.

Build next:
- Account/profile page for email/display name and future shipping preferences.
- Real customer order smoke test after Stripe test checkout.

Success criteria:
- Customer can see only their own orders.
- Customer can see purchased singles and mystery cards.
- Customer can see fulfillment/shipping status and tracking.
- Non-authenticated users are redirected to signin for account pages.

---

## Phase 5: Admin Orders + Fulfillment Queue

**Status:** Partially implemented

Delivered:
- `fulfillment_tasks` migration.
- `fulfillment_tasks` migration is already applied in live Supabase.
- Idempotent fulfillment task creation after paid cart and paid random-card finalization.
- Live `/admin/orders` table with filters for pending, paid, shipped, refunded, cancelled, unfulfilled.
- Live `/admin/orders/[id]` with customer, items, shipping address, payment IDs, notes, and status controls.
- Fulfillment queue backed by a new `fulfillment_tasks` table.
- Task ownership seeded from `inventory_items.created_by`.
- Fulfillment statuses: `needs_packing`, `packed`, `label_created`, `shipped`, `delivered`, `blocked`, `cancelled`.
- Mark shipped action that updates fulfillment task, order tracking fields, relevant inventory state, and audit log.
- Shipping CSV export for paid/unshipped orders.
- Real admin spin pool manager for current listed pool and bulk toggles.
- Live admin dashboard metrics.

Build next:
- Smoke-test admin order/fulfillment pages with real paid orders.
- Use the existing standard-cart paid test order to verify fulfillment visibility before creating more live test data.
- Admin notification placeholder for new paid orders/fulfillment tasks.
- Decide whether staff should access settings or only operational pages.

Recommended data model:

```sql
id uuid primary key default gen_random_uuid(),
order_id uuid not null references orders(id) on delete cascade,
order_item_id uuid not null references order_items(id) on delete cascade,
inventory_item_id uuid not null references inventory_items(id),
assigned_to uuid references profiles(id),
status text not null check (status in ('needs_packing','packed','label_created','shipped','delivered','blocked','cancelled')) default 'needs_packing',
storage_location text,
carrier text,
tracking_number text,
notes text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
packed_at timestamptz,
shipped_at timestamptz,
delivered_at timestamptz,
unique(order_item_id)
```

Implementation requirements:
- Create fulfillment tasks after paid cart and paid random-card checkout finalization.
- Keep fulfillment task creation idempotent for replayed webhooks and browser success-page fallback.
- When marking shipped, update task status/tracking/shipped time, order tracking fields, order status when all tasks are shipped, relevant inventory state when appropriate, and audit log entries.
- Customer order pages must enforce ownership; admin order pages must enforce admin/staff access.

Success criteria:
- Every paid order item appears in admin fulfillment.
- Admin can see who needs to ship each item.
- Admin can mark shipped with tracking.
- Customer can see tracking after shipment.
- Export contains usable shipping information.

---

## Phase 6: Mobile Polish + Launch Hardening

**Status:** Not started as a focused phase

Build next:
- Keep dependency security green: re-run `npm audit --omit=dev`, `npm run lint`, and `npm run build` before launch.
- Mobile QA for homepage, search, product detail, cart, checkout return, spin, reveal, login/signup, orders, admin inventory, admin orders, fulfillment.
- Browser smoke tests for `/`, `/search`, `/cart`, `/spin`, `/orders`, `/admin`, `/admin/inventory`, `/admin/orders`, `/admin/spin`, and `/admin/settings`.
- Real Stripe test-mode verification for standard cart, mystery purchase, signed webhook completion, and expired/cancelled reservation release.
- Loading, empty, error, and permission states across store/admin.
- Reservation cleanup job or endpoint if needed beyond on-demand release.
- Acceptance tests for critical flows.
- Stripe webhook replay/idempotency tests.
- RLS/customer isolation checks.
- Admin role enforcement checks.

Success criteria:
- No mobile layout breaks in critical flows.
- No unauthenticated admin access.
- No customer can view another customer's order.
- No public UI leaks reserved/sold inventory.
- `npm audit --omit=dev` reports zero production vulnerabilities.
- `npm run lint` and `npm run build` pass before launch.

---

## Phase 7: Search, Email, Labels, And Growth Features

**Status:** Future

Future work:
- Typesense full fuzzy/faceted search.
- Resend transactional emails.
- Shipping label integration.
- Refund handling and admin refund UI.
- Sentry/error monitoring.
- Rate limiting with Upstash or equivalent.
- Analytics and conversion tracking.
- Bulk inventory workflows.
- Better AI/vision confidence scoring.

---

## Critical Implementation Notes

- Keep reserved-card hiding behavior. Public catalog should continue to query only `status=listed`.
- Do not treat homepage or mystery preview emptiness as a bug if all spin-pool cards are reserved.
- Launch verification must use real Supabase catalog data, not mock catalog fallback.
- Do not rely on mock data for admin operational pages.
- Do not let client-side cart state change inventory or payment outcomes directly.
- Do not create fulfillment only as a UI status; it needs persistent records.
- Do not reapply the fulfillment migration unless live schema inspection shows it is missing; the 2026-05-05 audit says it is already applied.
- Do not reapply the checkout idempotency guard migration unless live schema inspection shows it is missing; it was applied live on 2026-05-06.
- The repo has a dirty worktree with unrelated existing changes. Do not revert unrelated files.

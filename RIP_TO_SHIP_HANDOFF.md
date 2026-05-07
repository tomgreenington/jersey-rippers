# Rip-to-Ship V1 - Zero-Context Agent Handoff

Use this document when handing the project to an agent or LLM with no prior chat context. It contains the copy/paste prompt, the required reading order, the real repo state, the implementation process, and the acceptance checklist.

---

## Copy/Paste Prompt For A Zero-Context LLM

You are taking over an existing project named **Buck & Baums Breaks**.

Repo path:

```text
/Users/adamlanel/Documents/Adam_Code_test/Jersey_Rippers
```

Stack:

```text
Next.js App Router, TypeScript, Supabase, Stripe test mode, Anthropic Vision, Tailwind/shadcn-style components
```

Local dev URL:

```text
http://localhost:3000
```

Your mission is to implement **Rip-to-Ship V1 Foundation**: turn the current working intake/storefront/checkout prototype into a launchable commerce operating loop.

Target operating loop:

```text
Inventory intake -> public listing -> cart or $5 mystery purchase -> Stripe payment -> order record -> fulfillment queue -> shipping/tracking -> customer history
```

Before coding, read these files in this exact order:

1. `agent-start-session.md`
2. `overview.md`
3. `architecture.md`
4. `current-phase.md`
5. `roadmap-phases.md`
6. `technical-spec.md`
7. `RIP_TO_SHIP_HANDOFF.md`
8. `SELL_CARDS_ASAP_HANDOFF.md`
9. Recent top entries in `changelog.md`

Then inspect the implementation with these searches:

```bash
rg "createCartCheckoutSession|finalizeCartCheckout|handleStripeCartWebhook" src
rg "createRandomCardCheckoutSession|finalizeRandomCardCheckout|spin_events" src
rg "getListedCatalogItems|getCatalogOverview|spinItems" src/lib src/app
rg "fulfill|shipment|tracking|markOrderShipped|created_by" src supabase
rg "export default function MyOrdersPage|AdminOrdersPage|SpinPoolPage|ExportOrdersPage" src/app
rg "mockInventoryItems|mockOrders" src/app src/components src/lib
```

Important non-negotiables:

- Do **not** undo reserved-card hiding. Public catalog, homepage mystery preview, and spin preview must only show `status = listed` inventory. Reserved cards disappearing from public views is desired.
- Do **not** revert unrelated dirty worktree changes.
- Do **not** rely on mock data for admin operational pages.
- Do **not** let client-side state directly mutate inventory/payment outcomes.
- Do **not** make fulfillment a decorative UI only; create persistent task records.
- Keep all critical inventory, checkout, random selection, order, and shipping mutations server-side.

Current real state:

- Admin intake/listing mostly works and has been smoke-tested.
- The live `card-photos` Storage bucket exists and is public.
- Storefront browse/product/cart exists.
- Standard cart Stripe Checkout session code exists.
- Standard cart checkout now renders Stripe embedded Checkout on-site instead of redirecting to Stripe-hosted Checkout.
- Standard cart checkout has one successful paid Stripe test-mode order, finalized through the browser success-page fallback.
- That paid standard-cart order has a fulfillment task.
- `$5` random-card checkout code exists, now uses embedded Checkout, but still needs real test-mode verification.
- Live `spin_events` count was `0` during the 2026-05-05 audit, so mystery checkout has not been proven.
- Stripe webhook route exists at `src/app/api/webhooks/stripe/route.ts`.
- Stripe has no configured test webhook endpoint for `/api/webhooks/stripe`, so webhook-first completion is not proven.
- Customer auth exists.
- Customer `/orders` and `/orders/[id]` read real authenticated order history/details.
- Admin `/admin/orders`, `/admin/orders/[id]`, `/admin/orders/export`, and `/admin/spin` are implemented with real server-side data/actions.
- Admin dashboard uses live Supabase metrics.
- `fulfillment_tasks` migration exists, is already applied in live Supabase, and paid checkout finalization creates fulfillment tasks idempotently.
- Checkout idempotency guard migration exists and is already applied in live Supabase.
- Orders table has shipping/tracking columns.
- `inventory_items.created_by` exists and is saved during intake; use this as the first fulfillment owner signal.
- The stale pending order `BBB-ORD-20260430-E2C54623` was confirmed expired/unpaid in Stripe and cancelled in Supabase.
- `STRIPE_WEBHOOK_SECRET` is still placeholder/unconfigured locally; replace it with the real endpoint signing secret before webhook testing.
- `npm audit --omit=dev` reports `found 0 vulnerabilities`.
- `npm run lint` and `npm run build` pass.
- `SELL_CARDS_ASAP_HANDOFF.md` contains the shortest fresh-context checklist for getting checkout launched.

Remaining implementation and verification task:

Continue Rip-to-Ship V1 Foundation in this order:

1. Keep docs synced to the 2026-05-06 audit facts so agents do not repeat stale migration/idempotency work.
2. Configure a Stripe test webhook endpoint for `/api/webhooks/stripe`.
3. Verify signed `checkout.session.completed`.
4. Verify signed `checkout.session.expired`.
5. Replay completed webhook and confirm no duplicate order/task.
6. Replay expired webhook and confirm pending order cancellation.
7. Verify expired checkout cleanup cancels pending orders whose Stripe sessions expired, not just releases inventory.
8. Keep the already-applied unique DB guard for `orders.stripe_checkout_session_id` in sync across environments.
9. Verify random-card finalization survives duplicate webhook/browser replay by reselecting the existing order.
10. Replace placeholder `STRIPE_WEBHOOK_SECRET` with the real Stripe endpoint signing secret.
11. Run real Stripe test-mode `$5` mystery checkout and confirm `spin_events`, `order_items`, sold inventory, and fulfillment tasks.
12. Keep dependency/security checks green: re-run `npm audit --omit=dev`, `npm run lint`, and `npm run build` before launch.
13. Decide staff behavior: allow staff through `/admin/login`, or make admin-only login intentional while keeping `/admin/settings` admin-only.
14. Smoke-test customer order history/detail and admin order/fulfillment/shipping export pages with real paid orders.
15. Enter tracking and mark shipped; confirm order, task, inventory, audit log, and customer tracking display.
16. Run browser smoke tests and mobile QA for critical store/admin paths.
17. Add focused acceptance tests for checkout, webhooks, reservation release, order isolation, admin role enforcement, and fulfillment.
18. Add admin sale notification/email placeholders or Resend implementation.
19. Update `current-phase.md`, `roadmap-phases.md`, `RIP_TO_SHIP_HANDOFF.md`, and `changelog.md` with what changed and what remains.

Expected implementation details:

- Do not reapply `supabase/migrations/20260501_add_fulfillment_tasks.sql` unless live schema inspection shows it is missing; the 2026-05-05 audit says it is already applied.
- Do not reapply `supabase/migrations/20260506_add_checkout_idempotency_guards.sql` unless live schema inspection shows it is missing; it was applied live on 2026-05-06.
- Next is on `16.2.5`, `eslint-config-next` is matched to `16.2.5`, and package overrides pin Next's nested PostCSS to `8.5.10` so production audit is clean.
- Cart and mystery checkout sessions use `ui_mode=embedded_page` with `redirect_on_completion=never`; non-redirect payment methods stay in the same browser window.
- The existing `fulfillment_tasks` table should match these columns:

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

- Seed `assigned_to` from `inventory_items.created_by` when possible.
- Fulfillment task creation must be idempotent. Replayed webhooks must not duplicate fulfillment tasks.
- `orders.stripe_checkout_session_id` has a unique guard for non-null sessions.
- Random-card finalization must continue to survive duplicate webhook/browser replay by finding the existing order for the Stripe session.
- Expired checkout cleanup now cancels related pending cart orders; prove it through a real `checkout.session.expired` webhook before launch.
- When marking shipped:
  - update fulfillment task status/tracking/shipped time
  - update order tracking fields
  - if all tasks for the order are shipped, set order status `shipped`
  - update related inventory items to `shipped` only when appropriate
  - write audit log entries
- Customer order pages must enforce that the logged-in customer owns the order.
- Admin order pages must enforce admin/staff access.
- Keep browser success-page finalization idempotent, but validate real Stripe webhook flow before calling checkout complete.

Verification requirements:

```bash
npm run lint
npm run build
```

Browser smoke targets:

```text
/
/search
/products/[listed-item-id]
/cart
/spin
/orders
/admin
/admin/inventory
/admin/orders
/admin/spin
/admin/settings
```

Stripe test-mode verification:

1. Configure a Stripe test webhook endpoint for `/api/webhooks/stripe`.
2. Verify standard cart `checkout.session.completed` finalizes without relying on the browser success-page fallback.
3. Verify standard cart `checkout.session.expired` releases reservations and cancels the related pending order.
4. Replay standard completed and expired webhook events and confirm no duplicate orders/tasks.
5. Ensure sold/reserved cards do not appear publicly.
6. Ensure customer can see order history/detail.
7. Ensure admin can see order and fulfillment task.
8. Run `$5` mystery-card purchase with at least one `listed` `spin_pool=true` item.
9. Confirm mystery `spin_events`, order items, sold inventory, and fulfillment tasks.
10. Enter tracking and mark shipped; ensure customer sees tracking.

If only docs are requested, do not implement code; update the roadmap/current-phase/changelog/handoff docs. If implementation is requested, do not stop at a plan unless blocked by credentials, missing env vars, or external service access.

---

## Agent Process

Follow this process for every substantial session.

### 1. Context Load

Read:

- `agent-start-session.md`
- `overview.md`
- `architecture.md`
- `current-phase.md`
- `roadmap-phases.md`
- `technical-spec.md`
- `RIP_TO_SHIP_HANDOFF.md`
- Latest entries in `changelog.md`

Confirm the active phase is still **Rip-to-Ship V1 Foundation**.

### 2. Reality Check

Use `rg` to inspect actual implementation. Do not trust stale docs over code.

High-signal files:

- `src/lib/supabase/catalog.ts`
- `src/lib/supabase/cart-checkout-actions.ts`
- `src/lib/supabase/random-card-actions.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/lib/supabase/inventory-actions.ts`
- `src/lib/supabase/admin-actions.ts`
- `src/app/(store)/cart/page.tsx`
- `src/app/(store)/orders/page.tsx`
- `src/app/(store)/orders/[id]/page.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/app/(admin)/admin/orders/page.tsx`
- `src/app/(admin)/admin/orders/[id]/page.tsx`
- `src/app/(admin)/admin/orders/export/page.tsx`
- `src/app/(admin)/admin/spin/page.tsx`
- `supabase/migrations/`
- `src/types/index.ts`

### 3. Decide The Next Slice

Keep implementation slices small and connected to the operating loop. Preferred order:

1. Docs truth sync.
2. Stripe webhook setup and signed event verification.
3. Expired checkout cleanup verification.
4. Mystery checkout idempotency verification.
5. Real mystery checkout test.
6. Dependency audit remediation.
7. Admin/staff behavior decision.
8. Final smoke, paid-flow, shipping/tracking, and mobile verification.

### 4. Implement Carefully

Guidelines:

- Use existing patterns in `src/lib/supabase/*`.
- Use service-role client only in server-side paths.
- Do not expose internal fields like cost basis or storage location to public catalog.
- Use `apply_patch` for manual edits.
- Keep changes scoped.
- Do not revert unrelated worktree changes.
- Preserve current public catalog filtering.

### 5. Verify

Minimum:

```bash
npm run lint
npm run build
```

For frontend changes, start the dev server and smoke-test with the in-app browser when available.

For checkout changes, run real Stripe test-mode flows when keys/webhook tooling are available.

### 6. Document Progress

Update:

- `current-phase.md`
- `roadmap-phases.md`
- `changelog.md`

If the session ends with implementation incomplete, state the exact next command/action/file to continue from.

---

## Current File Map

### Storefront

- Homepage: `src/app/(store)/page.tsx`
- Search/browse: `src/app/(store)/search/page.tsx`
- Collections: `src/app/(store)/collections/[slug]/page.tsx`
- Product detail: `src/app/(store)/products/[id]/page.tsx`
- Cart: `src/app/(store)/cart/page.tsx`
- Spin: `src/app/(store)/spin/page.tsx`
- Spin reveal: `src/app/(store)/spin/reveal/[orderId]/page.tsx`
- Order pages: `src/app/(store)/orders/page.tsx`, `src/app/(store)/orders/[id]/page.tsx`

### Admin

- Dashboard: `src/app/(admin)/admin/page.tsx`
- Inventory: `src/app/(admin)/admin/inventory/page.tsx`
- Intake: `src/app/(admin)/admin/inventory/new/page.tsx`
- Settings: `src/app/(admin)/admin/settings/page.tsx`
- Order pages: `src/app/(admin)/admin/orders/page.tsx`, `src/app/(admin)/admin/orders/[id]/page.tsx`
- Export page: `src/app/(admin)/admin/orders/export/page.tsx`
- Spin manager: `src/app/(admin)/admin/spin/page.tsx`

### Supabase And Business Logic

- Server client: `src/lib/supabase/server.ts`
- Auth actions: `src/lib/supabase/auth-actions.ts`
- Admin auth: `src/lib/supabase/admin-auth.ts`
- Admin actions/settings: `src/lib/supabase/admin-actions.ts`
- Inventory actions: `src/lib/supabase/inventory-actions.ts`
- Catalog reads: `src/lib/supabase/catalog.ts`
- Cart checkout: `src/lib/supabase/cart-checkout-actions.ts`
- Random-card checkout: `src/lib/supabase/random-card-actions.ts`
- Stripe webhook: `src/app/api/webhooks/stripe/route.ts`

### Schema

- Main schema: `supabase/migrations/20260306_init_schema.sql`
- Cards table: `supabase/migrations/20260306_add_cards_table.sql`
- Uploader tracking: `supabase/migrations/20260328_add_created_by.sql`

---

## Known Gotchas

- The repo is dirty with many existing user/agent changes. Do not revert unrelated files.
- Current roadmap docs were refreshed from the 2026-05-06 audit; trust `current-phase.md`, `roadmap-phases.md`, and this handoff over older summaries.
- Public inventory emptiness may be correct if all eligible cards are reserved.
- Standard checkout has one paid success-page fallback verification from before the embedded checkout change, but embedded checkout still needs webhook-first verification.
- Mystery checkout may appear implemented and embedded, but still requires real Stripe test-mode verification; live `spin_events` count was `0` during the audit.
- Stripe CLI is not installed locally as of 2026-05-06; use a deployed test webhook endpoint or install Stripe CLI for local forwarding.
- In-app browser file picker can be hard to automate; user may need to manually select card photos.
- If photo upload succeeds but inventory insert fails, orphaned storage photos are a known cleanup TODO.
- Admin dashboard uses live queries; validate counts against Supabase during final smoke.
- Customer and admin order pages are implemented; smoke-test them with real paid orders.

---

## Acceptance Checklist

Rip-to-Ship V1 is not complete until:

- [ ] Admin can intake and publish inventory.
- [ ] Public store shows only listed inventory.
- [ ] Reserved cards are hidden from public catalog and mystery previews.
- [ ] Customer can sign up/sign in.
- [ ] Customer can add a single to cart.
- [ ] Customer can complete standard Stripe test checkout.
- [ ] Customer can complete `$5` mystery Stripe test checkout.
- [ ] Stripe webhook finalizes paid orders.
- [ ] Replayed webhook does not duplicate orders/tasks.
- [ ] Purchased inventory becomes `sold`.
- [ ] Fulfillment tasks exist for paid order items.
- [ ] Customer can view order history.
- [ ] Customer can view order detail and tracking.
- [ ] Admin can view all orders.
- [ ] Admin can view fulfillment queue.
- [ ] Admin can mark shipped with carrier/tracking.
- [ ] Shipping CSV export is usable.
- [ ] Admin dashboard uses live data.
- [ ] Mobile critical paths are usable.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Roadmap/current-phase/changelog are updated.

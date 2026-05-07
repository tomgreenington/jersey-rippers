# Sell Cards ASAP - Fresh Context Handoff

Use this if a new person/agent needs to take over with no chat context.

## Project

**Name:** Buck & Baums Breaks / Jersey Rippers
**Repo:** `/Users/adamlanel/Documents/Adam_Code_test/Jersey_Rippers`
**Goal:** launch the fastest safe path to selling cards on-site.

Target loop:

```text
Inventory intake -> listed catalog -> embedded checkout -> Stripe payment -> order -> fulfillment task -> shipment/tracking -> customer order history
```

## Current Truth

- Admin inventory intake/listing exists and can be used to add cards.
- Public catalog, product detail, cart, spin, customer orders, admin orders, admin spin, fulfillment, shipping export, and mark-shipped code exist.
- `card-photos` Supabase Storage bucket exists and is public.
- `supabase/migrations/20260501_add_fulfillment_tasks.sql` is already applied in live Supabase.
- `supabase/migrations/20260506_add_checkout_idempotency_guards.sql` is already applied in live Supabase.
- A prior standard cart Stripe test payment succeeded through the browser success-page fallback and created a fulfillment task.
- Standard cart checkout now uses Stripe embedded Checkout on-site.
- `$5` mystery checkout now uses Stripe embedded Checkout on-site.
- The stale pending order `BBB-ORD-20260430-E2C54623` was confirmed in Stripe as expired/unpaid and cancelled in Supabase.
- `npm audit --omit=dev` reports `found 0 vulnerabilities`.
- `npm run lint` passes with existing warnings only.
- `npm run build` passes.

## Latest Important Changes

- `src/lib/supabase/cart-checkout-actions.ts`
  - Creates Stripe Checkout Sessions with `ui_mode=embedded_page`.
  - Sets `redirect_on_completion=never`.
  - Returns `clientSecret` and `sessionId` instead of a hosted Stripe URL.
  - Expired cart reservation cleanup cancels related pending cart orders.

- `src/lib/supabase/random-card-actions.ts`
  - Creates embedded Checkout Sessions for mystery cards.
  - Reselects existing orders on duplicate Stripe-session replay.
  - Rejects placeholder webhook secrets and stale webhook signatures.

- `src/components/store/embedded-checkout-panel.tsx`
  - Shared Stripe embedded Checkout renderer.
  - On completion, routes customers to the existing confirmation/reveal pages.

- `src/app/(store)/cart/page.tsx`
  - Opens secure checkout on the cart page.
  - Disables cart edits once checkout is open.

- `src/components/store/random-card-purchase-form.tsx`
  - Opens secure mystery checkout inside the spin purchase panel.

- `package.json`
  - Added `@stripe/stripe-js` and `@stripe/react-stripe-js`.
  - Uses `next@16.2.5`, `eslint-config-next@16.2.5`, and overrides Next's nested PostCSS to `8.5.10`.

## What Is Still Blocking Launch

The big blocker is **Stripe webhook setup**.

- `.env.local` still has placeholder/unconfigured `STRIPE_WEBHOOK_SECRET`.
- No Stripe test webhook endpoint is configured yet for `/api/webhooks/stripe`.
- `NEXT_PUBLIC_APP_URL` is still `http://localhost:3000`.
- Stripe CLI is not installed locally.
- Vercel CLI is not installed locally and this workspace is not linked to a Vercel project.
- Embedded checkout has not been proven with a real test-mode payment after the embedded conversion.
- Mystery checkout has not been proven; live `spin_events` count was previously `0`.

Do not launch checkout to real customers until webhook-first completion is verified.

## Required Next Step

Choose one webhook path.

### Option A: Deployed Test Webhook

1. Deploy the current app to a public URL, ideally Vercel.
2. Set deployed env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_APP_URL=https://YOUR_PUBLIC_APP_URL`
3. In Stripe test mode, create a webhook endpoint:
   - Endpoint URL: `https://YOUR_PUBLIC_APP_URL/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`
4. Copy the endpoint signing secret into env as `STRIPE_WEBHOOK_SECRET`.
5. Redeploy/restart.

### Option B: Local Stripe CLI

1. Install Stripe CLI.
2. Run local app:
   ```bash
   npm run dev
   ```
3. In another terminal:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the printed `whsec_...` into `.env.local` as `STRIPE_WEBHOOK_SECRET`.
5. Restart `npm run dev`.

## Verification Checklist

Run these before launch:

```bash
npm audit --omit=dev
npm run lint
npm run build
```

Expected today:

- audit: `found 0 vulnerabilities`
- lint: passes with existing warnings in `src/components/admin/intake-form.tsx` and `src/lib/psa-comps.ts`
- build: passes

Then test payment flows in Stripe test mode.

### Standard Embedded Cart Checkout

1. Ensure at least one `status=listed` card exists and is public.
2. Sign in as a customer.
3. Add card to cart.
4. Click **Checkout Here**.
5. Confirm Stripe embedded Checkout appears on the cart page.
6. Pay with Stripe test card.
7. Confirm browser routes to `/orders/{CHECKOUT_SESSION_ID}/confirmation`.
8. Confirm webhook finalizes the order without relying on browser return.
9. Confirm in Supabase:
   - one paid order
   - correct order items
   - sold inventory
   - one fulfillment task per order item
   - no duplicate order/task after webhook replay

### Expired Cart Checkout

1. Start embedded cart checkout and do not pay.
2. Let session expire or trigger/replay `checkout.session.expired`.
3. Confirm pending order is cancelled.
4. Confirm reserved inventory is released to `listed`.

### Mystery Embedded Checkout

1. Ensure at least one card has `status=listed`, `spin_pool=true`, and `quantity_on_hand > 0`.
2. Sign in as a customer.
3. Go to `/spin`.
4. Click **Draw My Card**.
5. Confirm Stripe embedded Checkout appears on the page.
6. Pay with Stripe test card.
7. Confirm browser routes to `/spin/reveal/{CHECKOUT_SESSION_ID}`.
8. Confirm in Supabase:
   - `spin_events` inserted and completed
   - one paid spin order
   - correct order items
   - sold inventory
   - fulfillment tasks
   - replay does not duplicate order/task

### Fulfillment Smoke

1. Go to `/admin/orders`.
2. Open the paid order.
3. Confirm fulfillment task is visible.
4. Enter carrier/tracking and mark shipped.
5. Confirm:
   - fulfillment task status `shipped`
   - order status/tracking updated
   - inventory status updated appropriately
   - customer order detail shows tracking

## Useful DB Checks

Use the repo's `.env.local` `CONNECTION_STRING` if available.

```bash
node -e 'const pg=require("pg"); require("dotenv").config({path:".env.local", quiet:true}); const client=new pg.Client(process.env.CONNECTION_STRING); (async()=>{await client.connect(); const r=await client.query("select status, is_spin, count(*)::int from orders group by status, is_spin order by status, is_spin"); console.log(r.rows); await client.end();})().catch(e=>{console.error(e.message); process.exit(1)})'
```

```bash
node -e 'const pg=require("pg"); require("dotenv").config({path:".env.local", quiet:true}); const client=new pg.Client(process.env.CONNECTION_STRING); (async()=>{await client.connect(); const r=await client.query("select status, count(*)::int from fulfillment_tasks group by status order by status"); console.log(r.rows); await client.end();})().catch(e=>{console.error(e.message); process.exit(1)})'
```

## High-Signal Files

- `current-phase.md`
- `roadmap-phases.md`
- `RIP_TO_SHIP_HANDOFF.md`
- `changelog.md`
- `src/lib/supabase/cart-checkout-actions.ts`
- `src/lib/supabase/random-card-actions.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/components/store/embedded-checkout-panel.tsx`
- `src/app/(store)/cart/page.tsx`
- `src/components/store/random-card-purchase-form.tsx`
- `src/lib/supabase/order-fulfillment-actions.ts`
- `supabase/migrations/20260506_add_checkout_idempotency_guards.sql`

## Non-Negotiables

- Do not undo public filtering to `status=listed`.
- Do not allow duplicate orders for one Stripe Checkout Session.
- Do not rely on browser confirmation alone for launch.
- Do not launch without a real `STRIPE_WEBHOOK_SECRET`.
- Do not revert unrelated dirty worktree changes.

## Plain-English Status

Cards can be added/listed now. The customer checkout experience has been converted to stay on-site. The last real launch gate is proving Stripe webhooks against a public endpoint or Stripe CLI forwarding, then running one standard payment and one mystery payment end-to-end.

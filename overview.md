# Project Overview

## Mission

Jersey Rippers is a direct-to-consumer collectible card storefront with integrated internal inventory/order operations. It solves the problem of managing high-volume 1-of-1 card inventory while providing customers a fast, professional shopping experience with a daily engagement hook (the $5 Spin).

## Primary Outcome

A production-ready MVP storefront where customers can browse, search, and purchase collectible cards (raw singles, graded slabs, sealed product) with Stripe payments, while the internal team manages inventory intake, order fulfillment, and a curated daily spin pool — all with zero oversells and full audit traceability.

## System Intent

The system is a secure e-commerce backbone for a card business that owns all inventory. It handles the full lifecycle: card intake (with AI-assisted metadata detection) → listing → customer discovery via fast fuzzy search → atomic inventory reservation → Stripe payment → order fulfillment. A daily $5 "Spin" mechanic lets customers purchase a random card from a curated pool for engagement and retention.

## Non-Negotiables

- **No oversells:** 1-of-1 items (singles/slabs) must use atomic inventory reservation with TTL. Two buyers cannot reserve the same item.
- **Server-side authority:** All critical operations (pricing, inventory state changes, spin selection, payment confirmation) happen server-side only. Client cannot influence outcomes.
- **Stripe webhook-driven orders:** Order creation and "paid" state must be driven by Stripe webhooks, never by client-side success callbacks.
- **Role-based access:** Supabase Auth with RLS. Admin, staff, and customer roles enforced at the database level.
- **Audit trail:** Every mutation to price, condition, grade, location, status, and spin events must be logged with who/when/what.
- **AI assists, never overrides:** AI intake suggestions require human confirmation. No auto-publish. Condition is always manual.

## Key User Flows

1. **Browse & Buy** — Customer browses collections (Singles, Graded, Sealed, New Drops), searches with fuzzy matching + facet filters, adds to cart, checks out via Stripe, receives confirmation.
2. **Daily Spin** — Customer purchases a $5 spin (1 per 24h), system randomly assigns a card from curated pool server-side, payment processes via Stripe, card is revealed on confirmation.
3. **Inventory Intake** — Staff uploads card photo, AI suggests metadata, staff reviews/edits/sets condition/price, confirms listing. Draft → listed.
4. **Order Fulfillment** — Admin views orders dashboard, exports shipping CSV, marks orders shipped with optional tracking, handles refunds when needed.
5. **Inventory Management** — Admin/staff edits items, moves locations, manages spin pool, publishes/unpublishes, views audit history.

## Tech Stack

- **Language:** TypeScript
- **Framework:** Next.js (App Router)
- **Database:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Search:** Typesense
- **Payments:** Stripe (Checkout + Webhooks)
- **AI Vision:** Claude (Anthropic API) for card intake
- **UI:** Tailwind CSS + shadcn/ui
- **Hosting:** Vercel
- **Error Reporting:** Sentry

## Repository Structure

```
/
├── src/
│   ├── app/              # Next.js App Router pages + layouts
│   │   ├── (store)/      # Customer-facing storefront routes
│   │   ├── (admin)/      # Admin/staff dashboard routes
│   │   └── api/          # API routes (webhooks, server actions)
│   ├── components/       # Shared UI components
│   │   ├── ui/           # shadcn/ui primitives
│   │   ├── store/        # Storefront components
│   │   └── admin/        # Admin components
│   ├── lib/              # Shared utilities
│   │   ├── supabase/     # Supabase client + server helpers
│   │   ├── stripe/       # Stripe helpers
│   │   ├── typesense/    # Search client + indexing
│   │   └── ai/           # Claude vision intake
│   ├── types/            # TypeScript types + database types
│   └── hooks/            # Custom React hooks
├── supabase/
│   ├── migrations/       # Database migrations
│   └── seed.sql          # Seed data
├── public/               # Static assets (placeholder logo, etc.)
└── tests/                # Test files
```

## External Dependencies

| Service | Purpose | Docs |
|---------|---------|------|
| Supabase | Database, Auth, Storage, RLS | https://supabase.com/docs |
| Stripe | Payments, Checkout, Webhooks, Radar | https://stripe.com/docs |
| Typesense | Fuzzy search + faceted filtering | https://typesense.org/docs |
| Anthropic (Claude) | AI vision for card intake | https://docs.anthropic.com |
| Vercel | Hosting + deployment | https://vercel.com/docs |
| Sentry | Error reporting + monitoring | https://docs.sentry.io |

## Glossary

| Term | Definition |
|------|------------|
| Single | A raw (ungraded) collectible card. Always qty=1, unique inventory item. |
| Slab | A graded card encased by a grading company (PSA, BGS, CGC, etc.). Always qty=1. |
| Sealed | Factory-sealed product (packs, boxes, cases). Can have qty > 1. |
| Spin | A $5 daily purchase where the system randomly assigns a card from a curated pool. |
| Spin Pool | A curated set of inventory items tagged `spin_pool=true` eligible for random assignment. |
| Reservation | A temporary hold on a 1-of-1 item during checkout (10-15 min TTL). Prevents oversells. |
| Intake | The process of adding a new inventory item: photo upload → AI detection → human review → listing. |
| Draft | An inventory item created during intake but not yet confirmed/published. |
| RLS | Row Level Security — Supabase/PostgreSQL feature enforcing access rules at the database row level. |
| SKU | Stock Keeping Unit — unique identifier generated for each inventory item. |
| Cost Basis | Internal wholesale cost of an item. Not shown to customers. |

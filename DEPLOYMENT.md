# Buck & Baums Breaks - Deployment & Next Steps

**Status:** Admin intake is ready for partner testing after deploy/env verification. Customer checkout is not production-ready yet.

## Current State

✅ **Phase 2 admin intake:**
- Admin card listing wizard: fully functional (6-step photo-first flow)
- Supabase auth: signin/signup working
- Auto-bucket creation: `card-photos` bucket created automatically on wizard load
- Storage integration: photos upload to Supabase Storage
- AI enrichment: Claude API for text-based card lookup
- PSA comps: auto-pricing from PSA Auction site
- Admin setup, login, and admin creation flow

⏳ **Customer sales blockers:**
- Customer storefront: browse all listed cards
- Product detail page
- Shopping cart
- Stripe checkout + payment
- Order confirmation

## Deploy to Vercel (5 minutes)

1. **Push to GitHub:**
   ```bash
   git add -A
   git commit -m "Phase 2 complete: Auto-bucket creation + wizard production-ready"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import repo → Select Buck & Baums Breaks
   - Add env vars (copy from `.env.local`):
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `ANTHROPIC_API_KEY`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_SECRET_KEY`
   - Deploy

3. **Share with Partners:**
   - Give them the Vercel URL
   - Have the first owner navigate to `/admin/setup`
   - After the first admin exists, use `/admin/settings` to create additional admin logins
   - Partners should sign in at `/admin/login`

## Before Partners Start Testing

1. **Create admin users:**
   - First admin: visit `/admin/setup`
   - Additional admins: sign in as the first admin, then go to `/admin/settings`
   - Admin records are stored in `admin_users`

2. **Verify setup:**
   - Deploy to Vercel
   - Sign in with test admin account
   - Visit `/admin/inventory/new`
   - Try uploading a photo and publishing a test card

## Next 24 Hours

**After partners validate intake workflow:**
1. Build customer storefront (browse listed items)
2. Connect Stripe checkout
3. Test full flow: admin upload -> customer purchase -> order confirmation
4. Launch

## Key Credentials Needed

All in `.env.local` — make sure these are in Vercel environment variables:

- ✅ Supabase (project exists)
- ✅ Anthropic API key (Claude Vision)
- ✅ Stripe test keys (have them, not in production mode yet)
- ⏳ Resend (email) — optional for Phase 2 (can mock to console)

## Rollback Plan

If something breaks:
- Vercel auto-rollback to previous deployment
- Or: delete current deployment, redeploy from git

## Questions?

Check `current-phase.md` for full scope and success criteria.

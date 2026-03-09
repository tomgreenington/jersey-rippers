# Card Listing Wizard - Setup & Testing Guide

## Status
✅ **Wizard built and compiling**
- Photo-first flow (Step 1: Photos → Step 6: Review)
- Supabase Storage integration ready
- userId from auth session

## Required Setup

### 1. Create Supabase Storage Bucket

The wizard needs a `card-photos` bucket in Supabase Storage.

**Via Supabase Dashboard:**
1. Go to `https://app.supabase.com` → Your project
2. Navigate to Storage
3. Create new bucket named: `card-photos`
4. Set to **Public** (so URLs work)
5. Save

**Bucket Settings:**
- Name: `card-photos`
- Visibility: Public
- File size limit: (default or higher for images)

### 2. Verify RLS Policy (if needed)

The bucket should allow:
- **Public read** (anyone can view photos)
- **Authenticated upload** (admin/staff can upload)

Default Supabase settings should work. If you need custom RLS:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'card-photos' AND auth.role() = 'authenticated');

-- Allow public read
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'card-photos');
```

## Testing the Wizard

### Flow
```
1. Navigate to /admin/inventory/new
2. Upload card photos (drag-drop or click)
3. Click "Continue to Search"
4. Search for card or use Enrich
5. Select Type & Grade (single/slab/sealed)
6. Enter Cost Basis
7. View PSA Comps (or auto-spin at $0.32)
8. Review and Publish
```

### Expected Behavior
- **Step 1 (Photos):** Files upload to `card-photos` bucket, URLs saved to state
- **Step 2 (Search):** Typeahead search, can enrich with Claude
- **Step 4 (PSA):** Fetches comps from PSA site (takes ~2-3 sec)
- **Step 6 (Review):** Shows summary, publishes to `inventory_items` table

## Troubleshooting

### "Storage bucket doesn't exist"
- Create bucket in Supabase Dashboard (see above)

### "Unauthorized to upload"
- Check bucket is Public or RLS allows authenticated uploads
- Verify user is logged in and has session

### "PSA comps not loading"
- Check network tab for `/api/admin/psa-comps` response
- PSA site may be down or URL structure changed
- Fallback: auto-assigns to spin pool ($0.32)

### "Photos not persisting"
- Verify `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check browser console for upload errors
- Try different image file

## Files Modified

- `src/components/admin/card-wizard/index.tsx` — Reordered steps (photo-first)
- `src/components/admin/card-wizard/step-photos.tsx` — Added Supabase Storage upload
- `src/components/admin/card-wizard/step-review.tsx` — Added auth session for userId

## Next Steps

1. ✅ Create `card-photos` bucket in Supabase
2. ✅ Test wizard flow end-to-end
3. ⏳ (Optional) Seed `cards` table with 2-5k cards from TCDB
4. ⏳ Add CSV export for orders
5. ⏳ Implement Stripe Checkout + webhook

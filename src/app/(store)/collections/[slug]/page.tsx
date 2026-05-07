import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/store/product-card'
import { getListedCatalogItems } from '@/lib/supabase/catalog'
import type { InventoryType } from '@/types'

export const dynamic = 'force-dynamic'

type CollectionConfig = {
  title: string
  description: string
  filters: {
    type?: InventoryType
    premium?: boolean
  }
}

const collections: Record<string, CollectionConfig> = {
  singles: {
    title: 'Singles',
    description: 'Raw cards, fresh pulls, and collector staples ready to ship.',
    filters: { type: 'single' },
  },
  graded: {
    title: 'Graded Slabs',
    description: 'Authenticated cards from PSA, BGS, CGC, and other graders.',
    filters: { type: 'slab' },
  },
  sealed: {
    title: 'Sealed Product',
    description: 'Unopened packs, boxes, and sealed inventory.',
    filters: { type: 'sealed' },
  },
  'new-drops': {
    title: 'New Releases',
    description: 'The newest listed inventory from the admin intake workflow.',
    filters: {},
  },
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const collection = collections[slug]

  if (!collection) {
    notFound()
  }

  const items = await getListedCatalogItems({
    ...collection.filters,
    sort: 'newest',
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight">
          {collection.title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {collection.description}
        </p>
        <p className="text-sm font-semibold text-primary">
          {items.length} in stock
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No listed cards in this collection yet.
        </div>
      )}
    </div>
  )
}

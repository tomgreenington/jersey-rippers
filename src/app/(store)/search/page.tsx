import { Search } from 'lucide-react'
import { ProductCard } from '@/components/store/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getListedCatalogItems } from '@/lib/supabase/catalog'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const query = getParam(params.q)?.trim() ?? ''
  const filter = getParam(params.filter)
  const items = await getListedCatalogItems({
    search: filter === 'premium' ? undefined : query,
    premium: filter === 'premium',
    sort: 'newest',
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">
            {filter === 'premium' ? 'Premium Cards' : 'All Cards'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} listed {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <form action="/search" className="flex w-full gap-2 md:max-w-md">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search player, set, card number..."
            className="h-11"
          />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        </form>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No listed cards match that search.
        </div>
      )}
    </div>
  )
}

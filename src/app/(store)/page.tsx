import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProductCard } from '@/components/store/product-card'
import { mockInventoryItems } from '@/lib/mock-data'

const collections = [
  {
    title: 'Singles',
    description: 'Raw cards in all conditions',
    href: '/collections/singles',
    count: mockInventoryItems.filter((i) => i.type === 'single').length,
  },
  {
    title: 'Graded Slabs',
    description: 'PSA, BGS, CGC authenticated',
    href: '/collections/graded',
    count: mockInventoryItems.filter((i) => i.type === 'slab').length,
  },
  {
    title: 'Sealed',
    description: 'Packs, boxes, and sealed product',
    href: '/collections/sealed',
    count: mockInventoryItems.filter((i) => i.type === 'sealed').length,
  },
  {
    title: 'New Drops',
    description: 'Latest additions to the shop',
    href: '/collections/new-drops',
    count: mockInventoryItems.filter((i) => i.status === 'listed').length,
  },
]

const featuredItems = mockInventoryItems
  .filter((i) => i.status === 'listed')
  .slice(0, 8)

export default function HomePage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Premium Cards.{' '}
            <span className="text-primary">No Nonsense.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Singles, graded slabs, and sealed product — curated by collectors, for
            collectors. Every card authenticated. Every price fair.
          </p>
          <div className="flex gap-3">
            <Link href="/collections/singles">
              <Button size="lg">
                Shop Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/spin">
              <Button size="lg" variant="outline">
                $5 Spin
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-bold">Collections</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {collections.map((col) => (
            <Link key={col.href} href={col.href}>
              <Card className="group h-full transition-all hover:-translate-y-1 hover:border-primary/50">
                <CardContent className="flex flex-col gap-2 p-6">
                  <h3 className="text-lg font-semibold">{col.title}</h3>
                  <p className="text-sm text-muted-foreground">{col.description}</p>
                  <p className="mt-auto text-sm font-medium text-primary">
                    {col.count} items
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured</h2>
          <Link href="/search" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featuredItems.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}

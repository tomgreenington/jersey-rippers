import Link from 'next/link'
import { ArrowRight, Zap, Trophy, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProductCard } from '@/components/store/product-card'
import { mockInventoryItems } from '@/lib/mock-data'

const collections = [
  {
    title: 'Daily Singles',
    description: 'Hot drops every day',
    href: '/collections/singles',
    icon: Zap,
    count: mockInventoryItems.filter((i) => i.type === 'single').length,
  },
  {
    title: 'Graded Slabs',
    description: 'PSA, BGS, CGC verified',
    href: '/collections/graded',
    icon: Trophy,
    count: mockInventoryItems.filter((i) => i.type === 'slab').length,
  },
  {
    title: 'Sealed Product',
    description: 'Packs & boxes unopened',
    href: '/collections/sealed',
    icon: Star,
    count: mockInventoryItems.filter((i) => i.type === 'sealed').length,
  },
  {
    title: 'New Releases',
    description: 'Fresh inventory alert',
    href: '/collections/new-drops',
    icon: Zap,
    count: mockInventoryItems.filter((i) => i.status === 'listed').length,
  },
]

const featuredItems = mockInventoryItems
  .filter((i) => i.status === 'listed')
  .slice(0, 8)

const spinItems = mockInventoryItems
  .filter((i) => i.status === 'listed')
  .slice(8, 12)

export default function HomePage() {
  return (
    <div className="space-y-20 py-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-secondary/10 opacity-60" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col items-center gap-8 py-24 text-center">
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
                🔥 WIN UP TO 100 CARDS
              </span>
              <h1 className="text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl">
                Premium Cards.{' '}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  No Nonsense.
                </span>
              </h1>
            </div>
            <p className="max-w-2xl text-lg text-foreground/70">
              Curated singles, graded slabs, and sealed product. Every card authenticated.
              Every price fair. And your chance to win BIG on our daily $5 spin.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/spin">
                <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
                  🎰 SPIN NOW — WIN UP TO $500
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/collections/singles">
                <Button size="lg" variant="outline">
                  Shop All Cards
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-3xl font-black tracking-tight">Shop By Category</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((col) => {
            const Icon = col.icon
            return (
              <Link key={col.href} href={col.href}>
                <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
                  <CardContent className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-foreground">{col.title}</h3>
                      <Icon className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100" />
                    </div>
                    <p className="text-sm text-muted-foreground">{col.description}</p>
                    <div className="mt-auto">
                      <p className="text-sm font-bold text-primary">
                        {col.count} items in stock
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Daily Spin Banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link href="/spin">
          <Card className="group overflow-hidden bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/30 transition-all hover:border-primary/60 hover:shadow-lg">
            <CardContent className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-primary">
                  🎰 Daily $5 Spin
                </h3>
                <p className="text-lg text-foreground/80">
                  Every spin could win you cards worth up to $500.
                  <span className="block text-sm text-muted-foreground mt-1">
                    Play daily for better odds. Limited spins per account.
                  </span>
                </p>
              </div>
              <Button
                size="lg"
                className="gap-2 bg-primary hover:bg-primary/90 whitespace-nowrap"
              >
                SPIN NOW
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Featured Cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Featured Inventory</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              New drops and popular hits in stock now
            </p>
          </div>
          <Link href="/search" className="text-sm font-bold text-primary hover:text-primary/80">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featuredItems.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Spin Pool Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-3xl font-black tracking-tight">What You Could Win</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cards in this month's spin pool
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-8">
          {spinItems.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
        <div className="flex justify-center">
          <Link href="/spin">
            <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
              Try Your Luck — $5 Per Spin
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center text-3xl font-black tracking-tight">Why Choose Jersey Rippers</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              title: 'Verified & Authenticated',
              description: 'Every card checked for authenticity and condition',
            },
            {
              title: 'Fair Pricing',
              description: 'Competitive prices based on real market data',
            },
            {
              title: 'Daily Spin Rewards',
              description: 'Win cards worth up to $500 for just $5',
            },
          ].map((item, i) => (
            <Card key={i} className="bg-accent/50 border-accent">
              <CardContent className="flex flex-col gap-3 p-6">
                <h3 className="font-bold text-lg text-foreground">{item.title}</h3>
                <p className="text-sm text-foreground/70">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-primary/30 to-secondary/30 border-2 border-primary/50 p-12 text-center">
          <h2 className="text-3xl font-black tracking-tight text-foreground">
            Ready to Build Your Collection?
          </h2>
          <p className="mt-4 text-lg text-foreground/80">
            Start shopping premium cards or spin to win today
          </p>
          <div className="mt-8 flex flex-col gap-3 justify-center sm:flex-row">
            <Link href="/collections/singles">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Browse Cards
              </Button>
            </Link>
            <Link href="/spin">
              <Button size="lg" variant="outline">
                🎰 Play Daily Spin
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

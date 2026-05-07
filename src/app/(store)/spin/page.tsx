import Link from 'next/link'
import { ArrowRight, LockKeyhole, Sparkles, Trophy, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MysteryPoolPreview } from '@/components/store/mystery-pool-preview'
import { RandomCardPurchaseForm } from '@/components/store/random-card-purchase-form'
import { getListedCatalogItems } from '@/lib/supabase/catalog'
import { getRandomCardAvailability } from '@/lib/supabase/random-card-actions'

export const dynamic = 'force-dynamic'

export default async function SpinPage() {
  const [availableCount, previewItems] = await Promise.all([
    getRandomCardAvailability(),
    getListedCatalogItems({ spinPool: true, limit: 8, sort: 'newest' }),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center gap-8">
            <div className="space-y-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
                <Shuffle className="h-4 w-4" />
                $5 MYSTERY CARDS
              </span>
              <h1 className="text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
                <span className="block">$5 In.</span>
                <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Take Your Shot.
                </span>
              </h1>
              <p className="max-w-xl text-lg text-foreground/70">
                Every mystery card costs $5. The pull could be tiny, ridiculous,
                or somewhere in between. The only way to find out is to draw.
              </p>
              <p className="max-w-xl text-sm font-medium text-foreground/80">
                All cards are real and pulled from a curated inventory.
              </p>
            </div>

            <Link href="#random-card-checkout">
              <Button size="lg" className="w-fit gap-2 bg-primary hover:bg-primary/90">
                Draw a Card
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Some pulls can be worth 50x the buy-in.
            </p>
          </div>

          <div id="random-card-checkout" className="flex items-center justify-center lg:justify-end">
            <RandomCardPurchaseForm availableCount={availableCount} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        {[
          {
            icon: Trophy,
            title: 'Any Value',
            desc: 'Turn $5 into anything from a tiny pull to a monster hit.',
          },
          {
            icon: LockKeyhole,
            title: 'Secure Draws',
            desc: 'Randomness is powered by secure server-side draws.',
          },
          {
            icon: Sparkles,
            title: 'Instant Unlock',
            desc: 'Your cards unlock instantly after purchase.',
          },
        ].map((step) => {
          const Icon = step.icon
          return (
            <Card key={step.title} className="border-primary/20 bg-card/50">
              <CardContent className="flex flex-col gap-4 p-6">
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="font-bold text-foreground">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {step.desc}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="border-t border-border bg-accent/30 py-12">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              Mystery Card Pool
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A preview of real cards in the curated inventory.
            </p>
          </div>

          {previewItems.length > 0 ? (
            <MysteryPoolPreview items={previewItems} />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/60 p-8 text-center text-sm text-muted-foreground">
              No mystery-card pool items are listed yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

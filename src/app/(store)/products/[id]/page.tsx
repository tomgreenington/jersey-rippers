import Link from 'next/link'
import { ArrowLeft, ShieldCheck, ShoppingCart } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { PhotoGallery } from '@/components/store/photo-gallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PriceDisplay } from '@/components/ui/price-display'
import { getListedCatalogItem } from '@/lib/supabase/catalog'

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const item = await getListedCatalogItem(id)

  if (!item) {
    notFound()
  }

  const isAvailable = item.status === 'listed' && item.quantity_on_hand > 0
  const cartItem = {
    id: item.id,
    title: item.title,
    price: item.price,
    photo: item.photos[0] ?? null,
    type: item.type,
    setName: item.set_name,
    cardNumber: item.card_number,
    condition: item.condition,
    gradeCompany: item.grade_company,
    gradeValue: item.grade_value,
  }

  const details = [
    ['SKU', item.sku],
    ['Type', item.type],
    ['Set', item.set_name],
    ['Card #', item.card_number],
    ['Year', item.year?.toString()],
    ['Player', item.player],
    ['Rarity', item.rarity],
    ['Language', item.language],
    ['Edition', item.edition],
    ['Condition', item.condition],
    ['Grade', [item.grade_company, item.grade_value].filter(Boolean).join(' ')],
    ['Cert #', item.cert_number],
  ].flatMap(([label, value]) => (value ? [[label, value.toString()]] : []))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/search">
          <Button variant="ghost" className="gap-2 px-0">
            <ArrowLeft className="h-4 w-4" />
            All Cards
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.7fr)] lg:items-start">
        <PhotoGallery photos={item.photos} />

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{item.type}</Badge>
              {item.spin_pool && <Badge variant="outline">Random Pool</Badge>}
              {isAvailable && <Badge>In Stock</Badge>}
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {item.title}
              </h1>
              {item.set_name && (
                <p className="text-sm text-muted-foreground">
                  {item.set_name}
                  {item.card_number ? ` #${item.card_number}` : ''}
                </p>
              )}
              <PriceDisplay cents={item.price} className="text-3xl" />
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              <AddToCartButton item={cartItem} disabled={!isAvailable} />
              <Link href="/cart">
                <Button variant="outline" size="lg" className="w-full gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  View Cart
                </Button>
              </Link>
              <div className="flex items-start gap-2 rounded-lg bg-accent/60 p-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Inventory is verified before it appears in the store.</span>
              </div>
            </CardContent>
          </Card>

          {item.description && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold">Description</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Details</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

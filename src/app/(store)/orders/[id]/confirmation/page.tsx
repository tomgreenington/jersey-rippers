import Image from 'next/image'
import Link from 'next/link'
import { Check, ImageIcon, ShoppingBag } from 'lucide-react'
import { CartClearer } from '@/components/store/cart-clearer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PriceDisplay } from '@/components/ui/price-display'
import { finalizeCartCheckout } from '@/lib/supabase/cart-checkout-actions'

export const dynamic = 'force-dynamic'

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await finalizeCartCheckout(id)

  if (!result.success) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h1 className="text-3xl font-black tracking-tight">Order Not Ready</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {result.error}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/cart">
            <Button>Back to Cart</Button>
          </Link>
          {result.status === 'signin_required' && (
            <Link href="/signin">
              <Button variant="outline">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <CartClearer />

      <div className="space-y-3 text-center">
        <Check className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-4xl font-black tracking-tight">Order Confirmed</h1>
        <p className="text-sm text-muted-foreground">
          Order {result.order.order_number}
        </p>
        <PriceDisplay cents={result.order.total_cents} className="text-2xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((entry) => {
          const photo = entry.item?.photos?.[0]

          return (
            <Card key={entry.inventory_item_id}>
              <CardContent className="flex gap-4 p-4">
                <div className="relative flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {photo ? (
                    <Image
                      src={photo}
                      alt={entry.title}
                      fill
                      unoptimized={photo.startsWith('http')}
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <h2 className="font-bold leading-snug">{entry.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {[entry.item?.set_name, entry.item?.card_number ? `#${entry.item.card_number}` : null]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                  <PriceDisplay cents={entry.price_cents} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-center">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/orders/${result.order.id}`}>
            <Button size="lg">View Order</Button>
          </Link>
          <Link href="/search">
            <Button size="lg" variant="outline">
              Browse More Cards
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { ImageIcon, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '@/components/store/cart-provider'
import { EmbeddedCheckoutPanel } from '@/components/store/embedded-checkout-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PriceDisplay } from '@/components/ui/price-display'
import { createCartCheckoutSession } from '@/lib/supabase/cart-checkout-actions'

export default function CartPage() {
  const { items, itemCount, totalCents, removeItem, clearCart } = useCart()
  const [error, setError] = useState('')
  const [checkoutSession, setCheckoutSession] = useState<{
    clientSecret: string
    sessionId: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const hasCheckoutSession = Boolean(checkoutSession)

  useEffect(() => {
    if (checkoutSession) {
      document
        .getElementById('secure-checkout')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [checkoutSession])

  function handleCheckout() {
    setError('')

    startTransition(async () => {
      const result = await createCartCheckoutSession(items.map((item) => item.id))

      if (!result.success || !result.clientSecret || !result.sessionId) {
        setError(result.error || 'Could not start checkout')
        return
      }

      setCheckoutSession({
        clientSecret: result.clientSecret,
        sessionId: result.sessionId,
      })
    })
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h1 className="text-3xl font-black tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Listed cards can be added from their product pages.
        </p>
        <Link href="/search" className="mt-6">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Browse Cards
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Cart</h1>
          <p className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={clearCart}
          disabled={hasCheckoutSession}
          className="gap-2 sm:self-center"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)]">
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex gap-4 p-4">
                <Link
                  href={`/products/${item.id}`}
                  className="relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
                >
                  {item.photo ? (
                    <Image
                      src={item.photo}
                      alt={item.title}
                      fill
                      unoptimized={item.photo.startsWith('http')}
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.id}`}
                    className="font-semibold leading-snug hover:text-primary"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[item.setName, item.cardNumber ? `#${item.cardNumber}` : null]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[item.condition, item.gradeCompany, item.gradeValue]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <PriceDisplay cents={item.price} />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={hasCheckoutSession}
                      onClick={() => removeItem(item.id)}
                      className="gap-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">
                Subtotal
              </span>
              <PriceDisplay cents={totalCents} className="text-2xl" />
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={isPending || hasCheckoutSession}
              onClick={handleCheckout}
            >
              {isPending
                ? 'Opening secure checkout...'
                : hasCheckoutSession
                  ? 'Secure Checkout Open'
                  : 'Checkout Here'}
            </Button>
            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              Checkout verifies live inventory and reserves each card before
              opening secure payment on this page.
            </p>
          </CardContent>
        </Card>
      </div>

      {checkoutSession && (
        <div className="mt-8 space-y-3" id="secure-checkout">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              Secure Checkout
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your cards are reserved for this checkout session.
            </p>
          </div>
          <EmbeddedCheckoutPanel
            clientSecret={checkoutSession.clientSecret}
            sessionId={checkoutSession.sessionId}
            completionPath={`/orders/${checkoutSession.sessionId}/confirmation`}
          />
        </div>
      )}
    </div>
  )
}

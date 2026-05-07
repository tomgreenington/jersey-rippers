'use client'

import { useEffect, useState, useTransition } from 'react'
import { Minus, Plus, Shuffle } from 'lucide-react'
import { EmbeddedCheckoutPanel } from '@/components/store/embedded-checkout-panel'
import { Button } from '@/components/ui/button'
import { createRandomCardCheckoutSession } from '@/lib/supabase/random-card-actions'

export function RandomCardPurchaseForm({
  availableCount,
}: {
  availableCount: number
}) {
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [checkoutSession, setCheckoutSession] = useState<{
    clientSecret: string
    sessionId: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const maxQuantity = Math.max(availableCount, 1)
  const canBuy = availableCount > 0
  const hasCheckoutSession = Boolean(checkoutSession)

  useEffect(() => {
    if (checkoutSession) {
      document
        .getElementById('random-card-embedded-checkout')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [checkoutSession])

  function updateQuantity(nextQuantity: number) {
    setQuantity(Math.min(Math.max(nextQuantity, 1), maxQuantity))
  }

  function handleCheckout(checkoutQuantity: number) {
    setError('')

    startTransition(async () => {
      const result = await createRandomCardCheckoutSession(checkoutQuantity)

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

  function handleSubmit() {
    handleCheckout(quantity)
  }

  function handleBuyPool() {
    handleCheckout(availableCount)
  }

  return (
    <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Quantity
          </p>
          <p className="text-xs text-muted-foreground">
            {availableCount} mystery cards available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canBuy || quantity <= 1 || isPending || hasCheckoutSession}
            onClick={() => updateQuantity(quantity - 1)}
          >
            <Minus className="h-4 w-4" />
            <span className="sr-only">Decrease quantity</span>
          </Button>
          <span className="flex h-10 w-14 items-center justify-center rounded-md border border-border font-bold tabular-nums">
            {quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={
              !canBuy || quantity >= maxQuantity || isPending || hasCheckoutSession
            }
            onClick={() => updateQuantity(quantity + 1)}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Increase quantity</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-semibold text-muted-foreground">
          Total
        </span>
        <span className="text-2xl font-black text-primary">
          ${(quantity * 5).toFixed(2)}
        </span>
      </div>

      <Button
        type="button"
        size="lg"
        disabled={!canBuy || isPending || hasCheckoutSession}
        onClick={handleSubmit}
        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Shuffle className="h-4 w-4" />
        {isPending
          ? 'Opening checkout...'
          : hasCheckoutSession
            ? 'Checkout Open'
            : quantity === 1
              ? 'Draw My Card'
              : 'Draw My Cards'}
      </Button>

      {canBuy && !hasCheckoutSession && (
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={isPending}
          onClick={handleBuyPool}
          className="w-full gap-2"
        >
          Buy the Pool · ${(availableCount * 5).toFixed(2)}
        </Button>
      )}

      {!canBuy && (
        <p className="text-sm text-muted-foreground">
          Mystery-card inventory is empty. Add listed cards to the random pool
          from admin inventory before taking purchases.
        </p>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {checkoutSession && (
        <div id="random-card-embedded-checkout" className="space-y-3 pt-2">
          <p className="text-sm font-semibold">Secure checkout</p>
          <EmbeddedCheckoutPanel
            clientSecret={checkoutSession.clientSecret}
            sessionId={checkoutSession.sessionId}
            completionPath={`/spin/reveal/${checkoutSession.sessionId}`}
          />
        </div>
      )}
    </div>
  )
}

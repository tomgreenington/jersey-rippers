'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null)

export function EmbeddedCheckoutPanel({
  clientSecret,
  sessionId,
  completionPath,
}: {
  clientSecret: string
  sessionId: string
  completionPath: string
}) {
  const router = useRouter()
  const options = useMemo(
    () => ({
      clientSecret,
      onComplete: () => {
        router.push(completionPath)
      },
    }),
    [clientSecret, completionPath, router]
  )

  if (!stripePublishableKey) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Stripe publishable key is not configured.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <EmbeddedCheckoutProvider
        key={sessionId}
        stripe={stripePromise}
        options={options}
      >
        <EmbeddedCheckout className="min-h-[620px]" />
      </EmbeddedCheckoutProvider>
    </div>
  )
}

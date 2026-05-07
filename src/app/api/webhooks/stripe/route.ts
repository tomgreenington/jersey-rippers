import { NextResponse } from 'next/server'
import { handleStripeCartWebhook } from '@/lib/supabase/cart-checkout-actions'
import {
  handleStripeRandomCardWebhook,
  verifyStripeWebhookPayload,
} from '@/lib/supabase/random-card-actions'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    )
  }

  try {
    const event = await verifyStripeWebhookPayload(payload, signature)
    const randomCardResult = await handleStripeRandomCardWebhook(event)
    if (!randomCardResult.ignored) {
      return NextResponse.json({ received: true, ...randomCardResult })
    }

    const cartResult = await handleStripeCartWebhook(event)

    return NextResponse.json({ received: true, ...cartResult })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

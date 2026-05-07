'use server'

import { randomBytes, randomInt, timingSafeEqual, createHmac } from 'crypto'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { getServiceRoleClient } from '@/lib/supabase/server'
import { createFulfillmentTasksForOrder } from '@/lib/supabase/order-fulfillment-actions'
import type { InventoryItem } from '@/types'

const RANDOM_CARD_PRICE_CENTS = 500
const RESERVATION_MINUTES = 30
const STRIPE_API_VERSION = '2026-03-25.dahlia'
const WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300

type StripeCheckoutSession = {
  id: string
  object: 'checkout.session'
  url?: string | null
  client_secret?: string | null
  client_reference_id?: string | null
  customer_email?: string | null
  payment_status?: 'paid' | 'unpaid' | 'no_payment_required'
  status?: 'open' | 'complete' | 'expired'
  metadata?: Record<string, string>
  customer_details?: {
    email?: string | null
    name?: string | null
    address?: {
      line1?: string | null
      line2?: string | null
      city?: string | null
      state?: string | null
      postal_code?: string | null
      country?: string | null
    } | null
  } | null
  shipping_details?: {
    name?: string | null
    address?: {
      line1?: string | null
      line2?: string | null
      city?: string | null
      state?: string | null
      postal_code?: string | null
      country?: string | null
    } | null
  } | null
  payment_intent?: string | null
}

type StripeEvent = {
  id: string
  type: string
  data: {
    object: StripeCheckoutSession
  }
}

type RandomCardOrderItem = {
  title: string
  price_cents: number
  inventory_item_id: string
  item: InventoryItem | null
}

type RandomCardFinalizeResult =
  | {
      success: true
      status: 'completed'
      order: {
        id: string
        order_number: string
        total_cents: number
      }
      items: RandomCardOrderItem[]
    }
  | {
      success: false
      status: 'signin_required' | 'not_paid' | 'expired' | 'unavailable' | 'error'
      error: string
    }

const RANDOM_CARD_COLUMNS = [
  'id',
  'sku',
  'type',
  'status',
  'title',
  'description',
  'price',
  'set_name',
  'card_number',
  'year',
  'player',
  'rarity',
  'language',
  'edition',
  'condition',
  'grade_company',
  'grade_value',
  'cert_number',
  'quantity_on_hand',
  'photos',
  'spin_pool',
  'reserved_by',
  'reserved_until',
  'created_at',
  'updated_at',
].join(', ')

function getAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (envUrl) {
    return envUrl
  }

  return 'http://localhost:3000'
}

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Stripe secret key is not configured')
  }
  return key
}

async function stripeRequest<T>(
  path: string,
  init: {
    method?: 'GET' | 'POST'
    body?: URLSearchParams
    idempotencyKey?: string
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getStripeSecretKey()}`,
    'Stripe-Version': STRIPE_API_VERSION,
  }

  if (init.body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  if (init.idempotencyKey) {
    headers['Idempotency-Key'] = init.idempotencyKey
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body,
  })

  const data = await response.json()

  if (!response.ok) {
    const message =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : 'Stripe request failed'
    throw new Error(message)
  }

  return data as T
}

async function getAuthenticatedUser(): Promise<User | null> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot always persist refreshed cookies.
          }
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) {
    return 1
  }

  return Math.max(Math.floor(quantity), 1)
}

async function ensureProfile(user: User) {
  const supabase = getServiceRoleClient()

  const { data: currentProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      display_name:
        user.user_metadata?.display_name ??
        user.email?.split('@')[0] ??
        'Customer',
      role: currentProfile?.role ?? 'customer',
    },
    { onConflict: 'id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

async function releaseReservedItems(itemIds: string[]) {
  if (itemIds.length === 0) {
    return
  }

  const supabase = getServiceRoleClient()

  await supabase
    .from('inventory_items')
    .update({
      status: 'listed',
      reserved_by: null,
      reserved_until: null,
    })
    .in('id', itemIds)
    .eq('status', 'reserved')
}

async function releaseExpiredRandomCardReservations() {
  const supabase = getServiceRoleClient()
  const now = new Date().toISOString()

  const { data: expiredItems, error: expiredItemsError } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('status', 'reserved')
    .eq('spin_pool', true)
    .lt('reserved_until', now)

  if (expiredItemsError) {
    throw new Error(expiredItemsError.message)
  }

  const expiredItemIds = ((expiredItems ?? []) as unknown as Array<{ id: string }>).map(
    (item) => item.id
  )

  if (expiredItemIds.length === 0) {
    return
  }

  await releaseReservedItems(expiredItemIds)

  const { error: eventError } = await supabase
    .from('spin_events')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .in('inventory_item_id', expiredItemIds)

  if (eventError) {
    throw new Error(eventError.message)
  }
}

async function reserveRandomCards(quantity: number, userId: string) {
  const supabase = getServiceRoleClient()
  const reserved: InventoryItem[] = []
  const reservedUntil = new Date(
    Date.now() + RESERVATION_MINUTES * 60 * 1000
  ).toISOString()

  await releaseExpiredRandomCardReservations()

  for (let attempt = 0; reserved.length < quantity && attempt < quantity * 20; attempt += 1) {
    const excludedIds = new Set(reserved.map((item) => item.id))

    const { data: candidates, error } = await supabase
      .from('inventory_items')
      .select(RANDOM_CARD_COLUMNS)
      .eq('status', 'listed')
      .eq('spin_pool', true)
      .gt('quantity_on_hand', 0)

    if (error) {
      throw new Error(error.message)
    }

    const available = ((candidates ?? []) as unknown as InventoryItem[]).filter(
      (item) => !excludedIds.has(item.id)
    )

    if (available.length === 0) {
      break
    }

    const selected = available[randomInt(available.length)]

    const { data: updated, error: updateError } = await supabase
      .from('inventory_items')
      .update({
        status: 'reserved',
        reserved_by: userId,
        reserved_until: reservedUntil,
      })
      .eq('id', selected.id)
      .eq('status', 'listed')
      .select(RANDOM_CARD_COLUMNS)
      .maybeSingle()

    if (updateError) {
      throw new Error(updateError.message)
    }

    if (updated) {
      reserved.push(updated as unknown as InventoryItem)
    }
  }

  if (reserved.length < quantity) {
    await releaseReservedItems(reserved.map((item) => item.id))
    throw new Error('Not enough random-card inventory is currently available')
  }

  return reserved
}

async function createPendingRandomCardEvents(
  userId: string,
  sessionId: string,
  itemIds: string[]
): Promise<void> {
  const supabase = getServiceRoleClient()

  const { error } = await supabase.from('spin_events').insert(
    itemIds.map((itemId) => ({
      user_id: userId,
      inventory_item_id: itemId,
      stripe_checkout_session_id: sessionId,
      status: 'pending',
      nonce: randomBytes(32).toString('hex'),
    }))
  )

  if (error) {
    await releaseReservedItems(itemIds)
    throw new Error(error.message)
  }
}

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `BBB-RND-${date}-${randomBytes(4).toString('hex').toUpperCase()}`
}

async function getCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`
  )
}

async function getOrderItemsForSession(sessionId: string) {
  const supabase = getServiceRoleClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, total_cents')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle()

  if (orderError) {
    throw new Error(orderError.message)
  }

  if (!order) {
    return null
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('title, price_cents, inventory_item_id')
    .eq('order_id', order.id)

  if (orderItemsError) {
    throw new Error(orderItemsError.message)
  }

  const typedOrderItems = (orderItems ?? []) as unknown as Array<{
    title: string
    price_cents: number
    inventory_item_id: string
  }>
  const itemIds = typedOrderItems.map((item) => item.inventory_item_id)
  const { data: inventoryItems, error: inventoryError } =
    itemIds.length > 0
      ? await supabase
          .from('inventory_items')
          .select(RANDOM_CARD_COLUMNS)
          .in('id', itemIds)
      : { data: [], error: null }

  if (inventoryError) {
    throw new Error(inventoryError.message)
  }

  return {
    order,
    items: typedOrderItems.map((orderItem) => ({
      ...orderItem,
      item:
        ((inventoryItems ?? []) as unknown as InventoryItem[]).find(
          (item) => item.id === orderItem.inventory_item_id
        ) ?? null,
    })) as RandomCardOrderItem[],
  }
}

function isUniqueConstraintError(error: { code?: string; message?: string }) {
  return (
    error.code === '23505' ||
    error.message?.includes('idx_orders_stripe_session_unique') ||
    error.message?.includes('orders_stripe_checkout_session_id_key') ||
    error.message?.includes('duplicate key value')
  )
}

async function getCompletedRandomCardOrderForSession(sessionId: string) {
  const existing = await getOrderItemsForSession(sessionId)
  if (!existing || existing.items.length === 0) {
    return null
  }

  const fulfillmentResult = await createFulfillmentTasksForOrder(existing.order.id)
  if (!fulfillmentResult.success) {
    throw new Error(fulfillmentResult.error)
  }

  return {
    success: true,
    status: 'completed',
    order: existing.order,
    items: existing.items,
  } satisfies RandomCardFinalizeResult
}

export async function createRandomCardCheckoutSession(quantityInput: number) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Please sign in before buying random cards' }
    }

    await ensureProfile(user)

    const quantity = normalizeQuantity(quantityInput)
    const reservedItems = await reserveRandomCards(quantity, user.id)
    const itemIds = reservedItems.map((item) => item.id)

    try {
      const body = new URLSearchParams()

      body.set('mode', 'payment')
      body.set('ui_mode', 'embedded_page')
      body.set('redirect_on_completion', 'never')
      body.set('client_reference_id', user.id)
      body.set(
        'expires_at',
        String(Math.floor(Date.now() / 1000) + RESERVATION_MINUTES * 60)
      )
      body.set('line_items[0][price_data][currency]', 'usd')
      body.set('line_items[0][price_data][unit_amount]', String(RANDOM_CARD_PRICE_CENTS))
      body.set('line_items[0][price_data][product_data][name]', '$5 Random Card')
      body.set(
        'line_items[0][price_data][product_data][description]',
        'Server-selected card from the Buck & Baums random-card pool'
      )
      body.set('line_items[0][quantity]', String(quantity))
      body.set('metadata[purchase_type]', 'random_cards')
      body.set('metadata[quantity]', String(quantity))
      body.set('metadata[user_id]', user.id)
      body.set('shipping_address_collection[allowed_countries][0]', 'US')

      if (user.email) {
        body.set('customer_email', user.email)
      }

      const session = await stripeRequest<StripeCheckoutSession>(
        '/checkout/sessions',
        {
          method: 'POST',
          body,
          idempotencyKey: randomBytes(16).toString('hex'),
        }
      )

      await createPendingRandomCardEvents(user.id, session.id, itemIds)

      if (!session.client_secret) {
        throw new Error('Stripe did not return an embedded checkout secret')
      }

      return {
        success: true,
        clientSecret: session.client_secret,
        sessionId: session.id,
      }
    } catch (error) {
      await releaseReservedItems(itemIds)
      throw error
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

async function completeRandomCardCheckout(
  session: StripeCheckoutSession
): Promise<RandomCardFinalizeResult> {
  const supabase = getServiceRoleClient()
  const userId = session.metadata?.user_id || session.client_reference_id

  if (!userId) {
    return {
      success: false,
      status: 'error',
      error: 'Checkout session is missing customer metadata',
    }
  }

  const existing = await getCompletedRandomCardOrderForSession(session.id)
  if (existing) {
    return existing
  }

  const { data: events, error: eventsError } = await supabase
    .from('spin_events')
    .select('id, inventory_item_id, status')
    .eq('stripe_checkout_session_id', session.id)

  if (eventsError) {
    throw new Error(eventsError.message)
  }

  const typedEvents = (events ?? []) as unknown as Array<{
    id: string
    inventory_item_id: string
    status: string
  }>

  const pendingEvents = typedEvents.filter(
    (event) => event.status === 'pending'
  )

  if (pendingEvents.length === 0) {
    return {
      success: false,
      status: 'unavailable',
      error: 'No pending random-card reservations were found for this checkout',
    }
  }

  const itemIds = pendingEvents.map((event) => event.inventory_item_id)
  const { data: inventoryItems, error: inventoryError } = await supabase
    .from('inventory_items')
    .select(RANDOM_CARD_COLUMNS)
    .in('id', itemIds)

  if (inventoryError) {
    throw new Error(inventoryError.message)
  }

  const reservedItems = ((inventoryItems ?? []) as unknown as InventoryItem[]).filter(
    (item) =>
      item.status === 'reserved' &&
      item.reserved_by === userId &&
      itemIds.includes(item.id)
  )

  if (reservedItems.length !== itemIds.length) {
    return {
      success: false,
      status: 'unavailable',
      error: 'One or more reserved random cards are no longer available',
    }
  }

  const address =
    session.shipping_details?.address ?? session.customer_details?.address
  const shippingName =
    session.shipping_details?.name ?? session.customer_details?.name ?? null

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: createOrderNumber(),
      customer_id: userId,
      status: 'paid',
      total_cents: pendingEvents.length * RANDOM_CARD_PRICE_CENTS,
      is_spin: true,
      shipping_name: shippingName,
      shipping_address_line1: address?.line1 ?? null,
      shipping_address_line2: address?.line2 ?? null,
      shipping_city: address?.city ?? null,
      shipping_state: address?.state ?? null,
      shipping_postal_code: address?.postal_code ?? null,
      shipping_country: address?.country ?? null,
      shipping_email:
        session.customer_details?.email ?? session.customer_email ?? null,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null,
    })
    .select('id, order_number, total_cents')
    .single()

  if (orderError) {
    if (isUniqueConstraintError(orderError)) {
      const existingAfterReplay = await getCompletedRandomCardOrderForSession(
        session.id
      )

      if (existingAfterReplay) {
        return existingAfterReplay
      }
    }

    throw new Error(orderError.message)
  }

  for (const item of reservedItems) {
    const { error } = await supabase
      .from('inventory_items')
      .update({
        status: 'sold',
        quantity_on_hand: 0,
        reserved_by: null,
        reserved_until: null,
      })
      .eq('id', item.id)
      .eq('status', 'reserved')
      .eq('reserved_by', userId)

    if (error) {
      throw new Error(error.message)
    }
  }

  const { error: orderItemsError } = await supabase.from('order_items').insert(
    reservedItems.map((item) => ({
      order_id: order.id,
      inventory_item_id: item.id,
      quantity: 1,
      price_cents: RANDOM_CARD_PRICE_CENTS,
      title: item.title,
    }))
  )

  if (orderItemsError) {
    throw new Error(orderItemsError.message)
  }

  const { error: eventUpdateError } = await supabase
    .from('spin_events')
    .update({ status: 'completed' })
    .eq('stripe_checkout_session_id', session.id)
    .eq('status', 'pending')

  if (eventUpdateError) {
    throw new Error(eventUpdateError.message)
  }

  const fulfillmentResult = await createFulfillmentTasksForOrder(order.id)
  if (!fulfillmentResult.success) {
    throw new Error(fulfillmentResult.error)
  }

  return {
    success: true,
    status: 'completed',
    order,
    items: reservedItems.map((item) => ({
      title: item.title,
      price_cents: RANDOM_CARD_PRICE_CENTS,
      inventory_item_id: item.id,
      item,
    })),
  }
}

export async function finalizeRandomCardCheckout(
  sessionId: string,
  options: { skipUserCheck?: boolean } = {}
): Promise<RandomCardFinalizeResult> {
  try {
    const session = await getCheckoutSession(sessionId)

    if (session.metadata?.purchase_type !== 'random_cards') {
      return {
        success: false,
        status: 'error',
        error: 'This checkout session is not a random-card purchase',
      }
    }

    if (!options.skipUserCheck) {
      const user = await getAuthenticatedUser()
      if (!user) {
        return {
          success: false,
          status: 'signin_required',
          error: 'Please sign in to reveal your random cards',
        }
      }

      const ownerId = session.metadata?.user_id ?? session.client_reference_id
      if (ownerId !== user.id) {
        return {
          success: false,
          status: 'error',
          error: 'This checkout session belongs to a different account',
        }
      }
    }

    if (session.status === 'expired') {
      await expireRandomCardCheckout(session.id)
      return {
        success: false,
        status: 'expired',
        error: 'This checkout session expired before payment completed',
      }
    }

    if (session.payment_status !== 'paid') {
      return {
        success: false,
        status: 'not_paid',
        error: 'Payment has not completed yet',
      }
    }

    return completeRandomCardCheckout(session)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, status: 'error', error: message }
  }
}

export async function expireRandomCardCheckout(sessionId: string) {
  const supabase = getServiceRoleClient()

  const { data: events, error } = await supabase
    .from('spin_events')
    .select('inventory_item_id')
    .eq('stripe_checkout_session_id', sessionId)
    .eq('status', 'pending')

  if (error) {
    throw new Error(error.message)
  }

  const itemIds = ((events ?? []) as unknown as Array<{ inventory_item_id: string }>).map(
    (event) => event.inventory_item_id
  )
  await releaseReservedItems(itemIds)

  await supabase
    .from('spin_events')
    .update({ status: 'expired' })
    .eq('stripe_checkout_session_id', sessionId)
    .eq('status', 'pending')
}

export async function verifyStripeWebhookPayload(payload: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || secret === 'whsec_...') {
    throw new Error('Stripe webhook secret is not configured')
  }

  const timestamp = signature
    .split(',')
    .find((part) => part.startsWith('t='))
    ?.slice(2)
  const signatures = signature
    .split(',')
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))

  if (!timestamp || signatures.length === 0) {
    throw new Error('Invalid Stripe signature header')
  }

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) {
    throw new Error('Invalid Stripe signature timestamp')
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds)
  if (ageSeconds > WEBHOOK_SIGNATURE_TOLERANCE_SECONDS) {
    throw new Error('Stripe webhook signature timestamp is outside tolerance')
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')

  const expectedBuffer = Buffer.from(expected, 'hex')
  const isValid = signatures.some((value) => {
    const valueBuffer = Buffer.from(value, 'hex')
    return (
      valueBuffer.length === expectedBuffer.length &&
      timingSafeEqual(valueBuffer, expectedBuffer)
    )
  })

  if (!isValid) {
    throw new Error('Stripe webhook signature verification failed')
  }

  return JSON.parse(payload) as StripeEvent
}

export async function handleStripeRandomCardWebhook(event: StripeEvent) {
  const session = event.data.object

  if (session.metadata?.purchase_type !== 'random_cards') {
    return { ignored: true }
  }

  if (event.type === 'checkout.session.completed') {
    const result = await finalizeRandomCardCheckout(session.id, {
      skipUserCheck: true,
    })
    return { ignored: false, result }
  }

  if (event.type === 'checkout.session.expired') {
    await expireRandomCardCheckout(session.id)
    return { ignored: false, expired: true }
  }

  return { ignored: true }
}

export async function getRandomCardAvailability() {
  const supabase = getServiceRoleClient()

  await releaseExpiredRandomCardReservations()

  const { count, error } = await supabase
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'listed')
    .eq('spin_pool', true)
    .gt('quantity_on_hand', 0)

  if (error) {
    return 0
  }

  return count ?? 0
}

export async function getRequestUrl() {
  const headerStore = await headers()
  return headerStore.get('referer') ?? getAppUrl()
}

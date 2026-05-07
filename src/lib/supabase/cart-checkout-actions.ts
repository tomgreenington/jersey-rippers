'use server'

import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { getServiceRoleClient } from '@/lib/supabase/server'
import { createFulfillmentTasksForOrder } from '@/lib/supabase/order-fulfillment-actions'
import type { InventoryItem } from '@/types'

const RESERVATION_MINUTES = 30
const MAX_CART_ITEMS = 20
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

type CartOrderRecord = {
  id: string
  order_number: string
  customer_id: string
  status: string
  total_cents: number
  is_spin: boolean
}

type CartOrderItem = {
  title: string
  price_cents: number
  inventory_item_id: string
  item: InventoryItem | null
}

type CartFinalizeResult =
  | {
      success: true
      status: 'completed'
      order: {
        id: string
        order_number: string
        total_cents: number
      }
      items: CartOrderItem[]
    }
  | {
      success: false
      status: 'signin_required' | 'not_paid' | 'expired' | 'unavailable' | 'error'
      error: string
    }

const CART_ITEM_COLUMNS = [
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
  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${getStripeSecretKey()}`,
  }

  if (init.body) {
    requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  if (init.idempotencyKey) {
    requestHeaders['Idempotency-Key'] = init.idempotencyKey
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: init.method ?? 'GET',
    headers: requestHeaders,
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

async function getCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`
  )
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

function normalizeCartItemIds(itemIds: string[]) {
  return Array.from(
    new Set(itemIds.filter((id) => typeof id === 'string' && UUID_PATTERN.test(id)))
  ).slice(0, MAX_CART_ITEMS)
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

async function releaseExpiredCartReservations() {
  const supabase = getServiceRoleClient()
  const now = new Date().toISOString()

  const { data: expiredItems, error: expiredItemsError } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('status', 'reserved')
    .lt('reserved_until', now)

  if (expiredItemsError) {
    throw new Error(expiredItemsError.message)
  }

  const typedExpiredItems = (expiredItems ?? []) as Array<{ id: string }>
  const expiredItemIds = typedExpiredItems.map((item) => item.id)

  if (expiredItemIds.length === 0) {
    return
  }

  const { data: pendingSpinEvents, error: spinError } = await supabase
    .from('spin_events')
    .select('inventory_item_id')
    .eq('status', 'pending')
    .in('inventory_item_id', expiredItemIds)

  if (spinError) {
    throw new Error(spinError.message)
  }

  const pendingSpinIds = new Set(
    ((pendingSpinEvents ?? []) as Array<{ inventory_item_id: string }>).map(
      (event) => event.inventory_item_id
    )
  )
  const cartReservationIds = expiredItemIds.filter((id) => !pendingSpinIds.has(id))

  if (cartReservationIds.length === 0) {
    return
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('order_id, inventory_item_id')
    .in('inventory_item_id', cartReservationIds)

  if (orderItemsError) {
    throw new Error(orderItemsError.message)
  }

  const pendingOrderIds = Array.from(
    new Set(
      ((orderItems ?? []) as Array<{
        order_id: string
        inventory_item_id: string
      }>).map((item) => item.order_id)
    )
  )

  const ordersToCancel =
    pendingOrderIds.length > 0
      ? await supabase
          .from('orders')
          .select('id')
          .in('id', pendingOrderIds)
          .eq('status', 'pending')
          .eq('is_spin', false)
      : { data: [], error: null }

  if (ordersToCancel.error) {
    throw new Error(ordersToCancel.error.message)
  }

  const cancelOrderIds = ((ordersToCancel.data ?? []) as Array<{ id: string }>).map(
    (order) => order.id
  )

  if (cancelOrderIds.length > 0) {
    const { data: cancelItems, error: cancelItemsError } = await supabase
      .from('order_items')
      .select('inventory_item_id')
      .in('order_id', cancelOrderIds)

    if (cancelItemsError) {
      throw new Error(cancelItemsError.message)
    }

    const itemIdsToRelease = ((cancelItems ?? []) as Array<{
      inventory_item_id: string
    }>).map((item) => item.inventory_item_id)

    await releaseReservedItems(itemIdsToRelease)

    const { error: cancelOrdersError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .in('id', cancelOrderIds)
      .eq('status', 'pending')

    if (cancelOrdersError) {
      throw new Error(cancelOrdersError.message)
    }
  }

  const cancelOrderIdSet = new Set(cancelOrderIds)
  const cancelledCartReservationIds = new Set(
    ((orderItems ?? []) as Array<{
      order_id: string
      inventory_item_id: string
    }>)
      .filter((item) => cancelOrderIdSet.has(item.order_id))
      .map((item) => item.inventory_item_id)
  )
  const orphanedCartReservationIds = typedExpiredItems
    .filter(
      (item) =>
        cartReservationIds.includes(item.id) &&
        !cancelledCartReservationIds.has(item.id)
    )
    .map((item) => item.id)

  await releaseReservedItems(orphanedCartReservationIds)
}

async function reserveCartItems(itemIds: string[], userId: string) {
  const supabase = getServiceRoleClient()
  const reservedUntil = new Date(
    Date.now() + RESERVATION_MINUTES * 60 * 1000
  ).toISOString()
  const reservedItems: InventoryItem[] = []

  await releaseExpiredCartReservations()

  const { data: candidates, error } = await supabase
    .from('inventory_items')
    .select(CART_ITEM_COLUMNS)
    .in('id', itemIds)
    .eq('status', 'listed')
    .gt('quantity_on_hand', 0)

  if (error) {
    throw new Error(error.message)
  }

  const availableItems = (candidates ?? []) as unknown as InventoryItem[]
  if (availableItems.length !== itemIds.length) {
    throw new Error('One or more cart items are no longer available')
  }

  const invalidPriceItem = availableItems.find((item) => item.price <= 0)
  if (invalidPriceItem) {
    throw new Error(`${invalidPriceItem.title} is missing a valid price`)
  }

  for (const itemId of itemIds) {
    const { data: updated, error: updateError } = await supabase
      .from('inventory_items')
      .update({
        status: 'reserved',
        reserved_by: userId,
        reserved_until: reservedUntil,
      })
      .eq('id', itemId)
      .eq('status', 'listed')
      .gt('quantity_on_hand', 0)
      .select(CART_ITEM_COLUMNS)
      .maybeSingle()

    if (updateError) {
      await releaseReservedItems(reservedItems.map((item) => item.id))
      throw new Error(updateError.message)
    }

    if (!updated) {
      await releaseReservedItems(reservedItems.map((item) => item.id))
      throw new Error('A cart item was just reserved by another checkout')
    }

    reservedItems.push(updated as unknown as InventoryItem)
  }

  return reservedItems
}

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `BBB-ORD-${date}-${randomBytes(4).toString('hex').toUpperCase()}`
}

async function createPendingCartOrder(userId: string, items: InventoryItem[]) {
  const supabase = getServiceRoleClient()
  const totalCents = items.reduce((sum, item) => sum + item.price, 0)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: createOrderNumber(),
      customer_id: userId,
      status: 'pending',
      total_cents: totalCents,
      is_spin: false,
    })
    .select('id, order_number, total_cents')
    .single()

  if (orderError) {
    throw new Error(orderError.message)
  }

  const { error: orderItemsError } = await supabase.from('order_items').insert(
    items.map((item) => ({
      order_id: order.id,
      inventory_item_id: item.id,
      quantity: 1,
      price_cents: item.price,
      title: item.title,
    }))
  )

  if (orderItemsError) {
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)
    throw new Error(orderItemsError.message)
  }

  return order
}

async function cancelPendingCartOrder(orderId: string, itemIds: string[]) {
  const supabase = getServiceRoleClient()

  await releaseReservedItems(itemIds)
  await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .eq('status', 'pending')
}

async function getCartOrder(sessionId: string, orderId?: string | null) {
  const supabase = getServiceRoleClient()

  const { data: orderBySession, error: orderBySessionError } = await supabase
    .from('orders')
    .select('id, order_number, customer_id, status, total_cents, is_spin')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle()

  if (orderBySessionError) {
    throw new Error(orderBySessionError.message)
  }

  let order = orderBySession as CartOrderRecord | null

  if (!order && orderId) {
    const { data: orderById, error: orderByIdError } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, status, total_cents, is_spin')
      .eq('id', orderId)
      .maybeSingle()

    if (orderByIdError) {
      throw new Error(orderByIdError.message)
    }

    order = orderById as CartOrderRecord | null
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

  const typedOrderItems = (orderItems ?? []) as Array<{
    title: string
    price_cents: number
    inventory_item_id: string
  }>
  const itemIds = typedOrderItems.map((item) => item.inventory_item_id)
  const { data: inventoryItems, error: inventoryError } =
    itemIds.length > 0
      ? await supabase
          .from('inventory_items')
          .select(CART_ITEM_COLUMNS)
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
    })) as CartOrderItem[],
  }
}

export async function createCartCheckoutSession(itemIdsInput: string[]) {
  let orderId: string | null = null
  let reservedItemIds: string[] = []

  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Please sign in before checking out' }
    }

    await ensureProfile(user)

    const itemIds = normalizeCartItemIds(itemIdsInput)
    if (itemIds.length === 0) {
      return { success: false, error: 'Your cart is empty' }
    }

    const reservedItems = await reserveCartItems(itemIds, user.id)
    reservedItemIds = reservedItems.map((item) => item.id)

    const order = await createPendingCartOrder(user.id, reservedItems)
    orderId = order.id

    const body = new URLSearchParams()

    body.set('mode', 'payment')
    body.set('ui_mode', 'embedded_page')
    body.set('redirect_on_completion', 'never')
    body.set('client_reference_id', user.id)
    body.set(
      'expires_at',
      String(Math.floor(Date.now() / 1000) + RESERVATION_MINUTES * 60)
    )
    body.set('metadata[purchase_type]', 'cart')
    body.set('metadata[user_id]', user.id)
    body.set('metadata[order_id]', order.id)
    body.set('metadata[item_count]', String(reservedItems.length))
    body.set('shipping_address_collection[allowed_countries][0]', 'US')

    if (user.email) {
      body.set('customer_email', user.email)
    }

    reservedItems.forEach((item, index) => {
      body.set(`line_items[${index}][price_data][currency]`, 'usd')
      body.set(`line_items[${index}][price_data][unit_amount]`, String(item.price))
      body.set(`line_items[${index}][price_data][product_data][name]`, item.title)
      body.set(
        `line_items[${index}][price_data][product_data][description]`,
        [item.set_name, item.card_number ? `#${item.card_number}` : null, item.sku]
          .filter(Boolean)
          .join(' ')
      )
      body.set(`line_items[${index}][quantity]`, '1')

      const photo = item.photos?.[0]
      if (photo?.startsWith('http')) {
        body.set(`line_items[${index}][price_data][product_data][images][0]`, photo)
      }
    })

    const session = await stripeRequest<StripeCheckoutSession>(
      '/checkout/sessions',
      {
        method: 'POST',
        body,
        idempotencyKey: randomBytes(16).toString('hex'),
      }
    )

    if (!session.client_secret) {
      throw new Error('Stripe did not return an embedded checkout secret')
    }

    const { error: updateOrderError } = await getServiceRoleClient()
      .from('orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id)

    if (updateOrderError) {
      throw new Error(updateOrderError.message)
    }

    return {
      success: true,
      clientSecret: session.client_secret,
      sessionId: session.id,
    }
  } catch (error) {
    if (orderId) {
      await cancelPendingCartOrder(orderId, reservedItemIds)
    } else {
      await releaseReservedItems(reservedItemIds)
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

async function completeCartCheckout(
  session: StripeCheckoutSession
): Promise<CartFinalizeResult> {
  const supabase = getServiceRoleClient()
  const userId = session.metadata?.user_id || session.client_reference_id
  const orderId = session.metadata?.order_id

  if (!userId || !orderId) {
    return {
      success: false,
      status: 'error',
      error: 'Checkout session is missing order metadata',
    }
  }

  const existing = await getCartOrder(session.id, orderId)
  if (!existing) {
    return {
      success: false,
      status: 'unavailable',
      error: 'No pending cart order was found for this checkout',
    }
  }

  if (existing.order.is_spin) {
    return {
      success: false,
      status: 'error',
      error: 'This checkout session is not a standard cart order',
    }
  }

  if (existing.order.customer_id !== userId) {
    return {
      success: false,
      status: 'error',
      error: 'This checkout session belongs to a different account',
    }
  }

  if (existing.order.status === 'paid') {
    const fulfillmentResult = await createFulfillmentTasksForOrder(existing.order.id)
    if (!fulfillmentResult.success) {
      throw new Error(fulfillmentResult.error)
    }

    return {
      success: true,
      status: 'completed',
      order: {
        id: existing.order.id,
        order_number: existing.order.order_number,
        total_cents: existing.order.total_cents,
      },
      items: existing.items,
    }
  }

  if (existing.order.status !== 'pending') {
    return {
      success: false,
      status: 'unavailable',
      error: 'This cart checkout is no longer active',
    }
  }

  const unavailableItem = existing.items.find(
    (entry) =>
      !entry.item ||
      entry.item.status !== 'reserved' ||
      entry.item.reserved_by !== userId
  )

  if (unavailableItem) {
    return {
      success: false,
      status: 'unavailable',
      error: `${unavailableItem.title} is no longer reserved for this checkout`,
    }
  }

  for (const entry of existing.items) {
    const { error } = await supabase
      .from('inventory_items')
      .update({
        status: 'sold',
        quantity_on_hand: 0,
        reserved_by: null,
        reserved_until: null,
      })
      .eq('id', entry.inventory_item_id)
      .eq('status', 'reserved')
      .eq('reserved_by', userId)

    if (error) {
      throw new Error(error.message)
    }
  }

  const address =
    session.shipping_details?.address ?? session.customer_details?.address
  const shippingName =
    session.shipping_details?.name ?? session.customer_details?.name ?? null

  const { data: paidOrder, error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
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
    .eq('id', existing.order.id)
    .select('id, order_number, total_cents')
    .single()

  if (orderUpdateError) {
    throw new Error(orderUpdateError.message)
  }

  const fulfillmentResult = await createFulfillmentTasksForOrder(existing.order.id)
  if (!fulfillmentResult.success) {
    throw new Error(fulfillmentResult.error)
  }

  return {
    success: true,
    status: 'completed',
    order: paidOrder,
    items: existing.items,
  }
}

export async function finalizeCartCheckout(
  sessionId: string,
  options: { skipUserCheck?: boolean } = {}
): Promise<CartFinalizeResult> {
  try {
    const session = await getCheckoutSession(sessionId)

    if (session.metadata?.purchase_type !== 'cart') {
      return {
        success: false,
        status: 'error',
        error: 'This checkout session is not a standard cart purchase',
      }
    }

    if (!options.skipUserCheck) {
      const user = await getAuthenticatedUser()
      if (!user) {
        return {
          success: false,
          status: 'signin_required',
          error: 'Please sign in to view this order',
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
      await expireCartCheckout(session.id, session.metadata?.order_id)
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

    return completeCartCheckout(session)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, status: 'error', error: message }
  }
}

export async function expireCartCheckout(sessionId: string, orderId?: string | null) {
  const supabase = getServiceRoleClient()
  const existing = await getCartOrder(sessionId, orderId)

  if (!existing || existing.order.status !== 'pending' || existing.order.is_spin) {
    return
  }

  await releaseReservedItems(
    existing.items.map((item) => item.inventory_item_id)
  )

  await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', existing.order.id)
    .eq('status', 'pending')
}

export async function handleStripeCartWebhook(event: StripeEvent) {
  const session = event.data.object

  if (session.metadata?.purchase_type !== 'cart') {
    return { ignored: true }
  }

  if (event.type === 'checkout.session.completed') {
    const result = await finalizeCartCheckout(session.id, {
      skipUserCheck: true,
    })
    return { ignored: false, result }
  }

  if (event.type === 'checkout.session.expired') {
    await expireCartCheckout(session.id, session.metadata?.order_id)
    return { ignored: false, expired: true }
  }

  return { ignored: true }
}

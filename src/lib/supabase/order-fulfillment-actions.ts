'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { getCurrentAdminUser } from '@/lib/supabase/admin-auth'
import { getServiceRoleClient } from '@/lib/supabase/server'
import type {
  FulfillmentStatus,
  FulfillmentTask,
  InventoryItem,
  Order,
  OrderItem,
} from '@/types'

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; status?: 'signin_required' | 'unauthorized' | 'not_found' }

type CustomerProfile = {
  id: string
  email: string
  display_name: string | null
}

type InventorySummary = Pick<
  InventoryItem,
  | 'id'
  | 'sku'
  | 'title'
  | 'type'
  | 'status'
  | 'price'
  | 'photos'
  | 'set_name'
  | 'card_number'
  | 'year'
  | 'player'
  | 'condition'
  | 'grade_company'
  | 'grade_value'
  | 'storage_location'
  | 'created_by'
  | 'spin_pool'
  | 'quantity_on_hand'
>

export type AdminSpinPoolItem = InventorySummary

export type OrderLineItem = OrderItem & {
  inventory: InventorySummary | null
  fulfillmentTask: FulfillmentTask | null
}

export type OrderBundle = Order & {
  customer: CustomerProfile | null
  items: OrderLineItem[]
  fulfillmentSummary: {
    total: number
    shipped: number
    open: number
    blocked: number
  }
}

export type AdminDashboardMetrics = {
  totalItems: number
  listedItems: number
  paidOrders: number
  openFulfillmentTasks: number
  randomPoolItems: number
  revenueCents: number
}

export type ShippingExportRow = {
  order_number: string
  shipping_name: string
  shipping_email: string
  shipping_address_line1: string
  shipping_address_line2: string
  shipping_city: string
  shipping_state: string
  shipping_postal_code: string
  shipping_country: string
  item_titles: string
  skus: string
  declared_value: string
}

const INVENTORY_SUMMARY_COLUMNS = [
  'id',
  'sku',
  'title',
  'type',
  'status',
  'price',
  'photos',
  'set_name',
  'card_number',
  'year',
  'player',
  'condition',
  'grade_company',
  'grade_value',
  'storage_location',
  'created_by',
  'spin_pool',
  'quantity_on_hand',
].join(', ')

const OPEN_FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  'needs_packing',
  'packed',
  'label_created',
  'blocked',
]

async function createCookieClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
}

async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createCookieClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

async function requireCustomer() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false as const, error: 'Please sign in to view orders', status: 'signin_required' as const }
  }

  return { success: true as const, user }
}

async function requireOperationalUser() {
  const { user, role } = await getCurrentAdminUser()

  if (!user || (role !== 'admin' && role !== 'staff')) {
    return { success: false as const, error: 'Unauthorized', status: 'unauthorized' as const }
  }

  return { success: true as const, user, role }
}

function groupBy<T, K extends string>(items: T[], getKey: (item: T) => K) {
  return items.reduce<Record<K, T[]>>((groups, item) => {
    const key = getKey(item)
    groups[key] = groups[key] ?? []
    groups[key].push(item)
    return groups
  }, {} as Record<K, T[]>)
}

function keyBy<T, K extends string>(items: T[], getKey: (item: T) => K) {
  return items.reduce<Record<K, T>>((map, item) => {
    map[getKey(item)] = item
    return map
  }, {} as Record<K, T>)
}

function getFulfillmentSummary(tasks: FulfillmentTask[]) {
  return {
    total: tasks.length,
    shipped: tasks.filter((task) => task.status === 'shipped' || task.status === 'delivered').length,
    open: tasks.filter((task) => OPEN_FULFILLMENT_STATUSES.includes(task.status)).length,
    blocked: tasks.filter((task) => task.status === 'blocked').length,
  }
}

async function buildOrderBundles(orders: Order[]): Promise<OrderBundle[]> {
  if (orders.length === 0) {
    return []
  }

  const supabase = getServiceRoleClient()
  const orderIds = orders.map((order) => order.id)
  const customerIds = Array.from(new Set(orders.map((order) => order.customer_id)))

  const [
    profilesResult,
    orderItemsResult,
    fulfillmentResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', customerIds),
    supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true }),
    supabase
      .from('fulfillment_tasks')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true }),
  ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  if (orderItemsResult.error) {
    throw new Error(orderItemsResult.error.message)
  }

  if (fulfillmentResult.error) {
    throw new Error(fulfillmentResult.error.message)
  }

  const orderItems = (orderItemsResult.data ?? []) as unknown as OrderItem[]
  const tasks = (fulfillmentResult.data ?? []) as unknown as FulfillmentTask[]
  const inventoryIds = Array.from(
    new Set(orderItems.map((item) => item.inventory_item_id).filter(Boolean))
  )

  const inventoryResult =
    inventoryIds.length > 0
      ? await supabase
          .from('inventory_items')
          .select(INVENTORY_SUMMARY_COLUMNS)
          .in('id', inventoryIds)
      : { data: [], error: null }

  if (inventoryResult.error) {
    throw new Error(inventoryResult.error.message)
  }

  const profilesById = keyBy(
    (profilesResult.data ?? []) as unknown as CustomerProfile[],
    (profile) => profile.id
  )
  const inventoryById = keyBy(
    (inventoryResult.data ?? []) as unknown as InventorySummary[],
    (item) => item.id
  )
  const tasksByOrderItemId = keyBy(tasks, (task) => task.order_item_id)
  const tasksByOrderId = groupBy(tasks, (task) => task.order_id)
  const itemsByOrderId = groupBy(orderItems, (item) => item.order_id)

  return orders.map((order) => {
    const lineItems = (itemsByOrderId[order.id] ?? []).map((item) => ({
      ...item,
      inventory: inventoryById[item.inventory_item_id] ?? null,
      fulfillmentTask: tasksByOrderItemId[item.id] ?? null,
    }))
    const orderTasks = tasksByOrderId[order.id] ?? []

    return {
      ...order,
      customer: profilesById[order.customer_id] ?? null,
      items: lineItems,
      fulfillmentSummary: getFulfillmentSummary(orderTasks),
    }
  })
}

export async function createFulfillmentTasksForOrder(orderId: string): Promise<{
  success: boolean
  createdCount?: number
  error?: string
}> {
  try {
    const supabase = getServiceRoleClient()

    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id, order_id, inventory_item_id')
      .eq('order_id', orderId)

    if (orderItemsError) {
      throw new Error(orderItemsError.message)
    }

    const typedOrderItems = (orderItems ?? []) as unknown as Array<{
      id: string
      order_id: string
      inventory_item_id: string
    }>

    if (typedOrderItems.length === 0) {
      return { success: true, createdCount: 0 }
    }

    const inventoryIds = typedOrderItems.map((item) => item.inventory_item_id)
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, created_by, storage_location')
      .in('id', inventoryIds)

    if (inventoryError) {
      throw new Error(inventoryError.message)
    }

    const inventoryById = keyBy(
      (inventoryItems ?? []) as unknown as Array<{
        id: string
        created_by: string | null
        storage_location: string | null
      }>,
      (item) => item.id
    )

    const tasks = typedOrderItems.map((item) => {
      const inventory = inventoryById[item.inventory_item_id]

      return {
        order_id: item.order_id,
        order_item_id: item.id,
        inventory_item_id: item.inventory_item_id,
        assigned_to: inventory?.created_by ?? null,
        storage_location: inventory?.storage_location ?? null,
        status: 'needs_packing',
      }
    })

    const { error: upsertError } = await supabase
      .from('fulfillment_tasks')
      .upsert(tasks, {
        onConflict: 'order_item_id',
        ignoreDuplicates: true,
      })

    if (upsertError) {
      throw new Error(upsertError.message)
    }

    return { success: true, createdCount: tasks.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getCustomerOrders(): Promise<Result<OrderBundle[]>> {
  try {
    const customer = await requireCustomer()
    if (!customer.success) {
      return customer
    }

    const supabase = getServiceRoleClient()
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customer.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    const bundles = await buildOrderBundles((orders ?? []) as unknown as Order[])
    return { success: true, data: bundles }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getCustomerOrderDetail(orderId: string): Promise<Result<OrderBundle>> {
  try {
    const customer = await requireCustomer()
    if (!customer.success) {
      return customer
    }

    const supabase = getServiceRoleClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('customer_id', customer.user.id)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!order) {
      return { success: false, error: 'Order not found', status: 'not_found' }
    }

    const [bundle] = await buildOrderBundles([order as Order])
    return { success: true, data: bundle }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getAdminOrders(status?: string): Promise<Result<OrderBundle[]>> {
  try {
    const admin = await requireOperationalUser()
    if (!admin.success) {
      return admin
    }

    const supabase = getServiceRoleClient()
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all' && status !== 'unfulfilled') {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    let bundles = await buildOrderBundles((orders ?? []) as unknown as Order[])

    if (status === 'unfulfilled') {
      bundles = bundles.filter(
        (order) => order.status === 'paid' && order.fulfillmentSummary.open > 0
      )
    }

    return { success: true, data: bundles }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getAdminOrderDetail(orderId: string): Promise<Result<OrderBundle>> {
  try {
    const admin = await requireOperationalUser()
    if (!admin.success) {
      return admin
    }

    const supabase = getServiceRoleClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!order) {
      return { success: false, error: 'Order not found', status: 'not_found' }
    }

    const [bundle] = await buildOrderBundles([order as Order])
    return { success: true, data: bundle }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function markFulfillmentTaskShipped(formData: FormData): Promise<void> {
  const admin = await requireOperationalUser()
  if (!admin.success) {
    throw new Error(admin.error)
  }

  const taskId = String(formData.get('task_id') ?? '')
  const carrier = String(formData.get('carrier') ?? '').trim()
  const trackingNumber = String(formData.get('tracking_number') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!taskId || !carrier || !trackingNumber) {
    throw new Error('Carrier and tracking number are required')
  }

  const supabase = getServiceRoleClient()
  const { data: currentTask, error: taskError } = await supabase
    .from('fulfillment_tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle()

  if (taskError) {
    throw new Error(taskError.message)
  }

  if (!currentTask) {
    throw new Error('Fulfillment task not found')
  }

  const task = currentTask as FulfillmentTask
  const shippedAt = new Date().toISOString()

  const { error: updateTaskError } = await supabase
    .from('fulfillment_tasks')
    .update({
      status: 'shipped',
      carrier,
      tracking_number: trackingNumber,
      notes: notes || task.notes,
      shipped_at: shippedAt,
    })
    .eq('id', task.id)

  if (updateTaskError) {
    throw new Error(updateTaskError.message)
  }

  await supabase
    .from('inventory_items')
    .update({ status: 'shipped', updated_by: admin.user.id })
    .eq('id', task.inventory_item_id)
    .eq('status', 'sold')

  const { data: orderTasks, error: orderTasksError } = await supabase
    .from('fulfillment_tasks')
    .select('status')
    .eq('order_id', task.order_id)

  if (orderTasksError) {
    throw new Error(orderTasksError.message)
  }

  const allTasksShipped = ((orderTasks ?? []) as unknown as Array<{ status: FulfillmentStatus }>).every(
    (entry) => entry.status === 'shipped' || entry.status === 'delivered'
  )

  const orderUpdate: Partial<Order> = {
    tracking_carrier: carrier,
    tracking_number: trackingNumber,
    shipped_at: allTasksShipped ? shippedAt : null,
  }

  if (allTasksShipped) {
    orderUpdate.status = 'shipped'
  }

  const { error: updateOrderError } = await supabase
    .from('orders')
    .update(orderUpdate)
    .eq('id', task.order_id)

  if (updateOrderError) {
    throw new Error(updateOrderError.message)
  }

  await supabase.from('audit_log').insert([
    {
      entity_type: 'fulfillment_task',
      entity_id: task.id,
      action: 'marked_shipped',
      old_value: task,
      new_value: {
        status: 'shipped',
        carrier,
        tracking_number: trackingNumber,
        shipped_at: shippedAt,
      },
      performed_by: admin.user.id,
    },
    {
      entity_type: 'order',
      entity_id: task.order_id,
      action: allTasksShipped ? 'shipped' : 'tracking_updated',
      new_value: orderUpdate,
      performed_by: admin.user.id,
    },
  ])

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${task.order_id}`)
  revalidatePath(`/orders/${task.order_id}`)
}

export async function getAdminDashboardMetrics(): Promise<Result<AdminDashboardMetrics>> {
  try {
    const admin = await requireOperationalUser()
    if (!admin.success) {
      return admin
    }

    const supabase = getServiceRoleClient()
    const [
      totalItems,
      listedItems,
      paidOrders,
      spinPool,
      openTasks,
      revenueOrders,
    ] = await Promise.all([
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }),
      supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'listed'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['paid', 'shipped']),
      supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'listed')
        .eq('spin_pool', true),
      supabase
        .from('fulfillment_tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', OPEN_FULFILLMENT_STATUSES),
      supabase.from('orders').select('total_cents').in('status', ['paid', 'shipped']),
    ])

    const firstError = [
      totalItems.error,
      listedItems.error,
      paidOrders.error,
      spinPool.error,
      openTasks.error,
      revenueOrders.error,
    ].find(Boolean)

    if (firstError) {
      throw new Error(firstError.message)
    }

    const revenueCents = ((revenueOrders.data ?? []) as unknown as Array<{ total_cents: number }>).reduce(
      (sum, order) => sum + order.total_cents,
      0
    )

    return {
      success: true,
      data: {
        totalItems: totalItems.count ?? 0,
        listedItems: listedItems.count ?? 0,
        paidOrders: paidOrders.count ?? 0,
        randomPoolItems: spinPool.count ?? 0,
        openFulfillmentTasks: openTasks.count ?? 0,
        revenueCents,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getAdminSpinPoolItems(): Promise<
  Result<{
    poolItems: InventorySummary[]
    availableItems: InventorySummary[]
  }>
> {
  try {
    const admin = await requireOperationalUser()
    if (!admin.success) {
      return admin
    }

    const supabase = getServiceRoleClient()
    const { data, error } = await supabase
      .from('inventory_items')
      .select(INVENTORY_SUMMARY_COLUMNS)
      .in('status', ['draft', 'listed', 'reserved', 'sold'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(error.message)
    }

    const items = (data ?? []) as unknown as InventorySummary[]

    return {
      success: true,
      data: {
        poolItems: items.filter((item) => item.spin_pool),
        availableItems: items.filter((item) => !item.spin_pool && item.status === 'listed'),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function setInventorySpinPoolStatus(formData: FormData): Promise<void> {
  const admin = await requireOperationalUser()
  if (!admin.success) {
    throw new Error(admin.error)
  }

  const itemId = String(formData.get('item_id') ?? '')
  const spinPool = String(formData.get('spin_pool') ?? '') === 'true'

  if (!itemId) {
    throw new Error('Inventory item is required')
  }

  const supabase = getServiceRoleClient()
  const { data: currentItem, error: currentError } = await supabase
    .from('inventory_items')
    .select('id, spin_pool')
    .eq('id', itemId)
    .maybeSingle()

  if (currentError) {
    throw new Error(currentError.message)
  }

  if (!currentItem) {
    throw new Error('Inventory item not found')
  }

  const { error } = await supabase
    .from('inventory_items')
    .update({ spin_pool: spinPool, updated_by: admin.user.id })
    .eq('id', itemId)

  if (error) {
    throw new Error(error.message)
  }

  await supabase.from('audit_log').insert({
    entity_type: 'inventory_item',
    entity_id: itemId,
    action: spinPool ? 'added_to_spin_pool' : 'removed_from_spin_pool',
    old_value: currentItem,
    new_value: { spin_pool: spinPool },
    performed_by: admin.user.id,
  })

  revalidatePath('/admin/spin')
  revalidatePath('/')
  revalidatePath('/spin')
}

function formatCurrency(cents: number) {
  return (cents / 100).toFixed(2)
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export async function getShippingExport(): Promise<
  Result<{
    rows: ShippingExportRow[]
    csv: string
  }>
> {
  try {
    const admin = await requireOperationalUser()
    if (!admin.success) {
      return admin
    }

    const ordersResult = await getAdminOrders('unfulfilled')
    if (!ordersResult.success) {
      return ordersResult
    }

    const rows = ordersResult.data.map((order) => ({
      order_number: order.order_number,
      shipping_name: order.shipping_name ?? '',
      shipping_email: order.shipping_email ?? order.customer?.email ?? '',
      shipping_address_line1: order.shipping_address_line1 ?? '',
      shipping_address_line2: order.shipping_address_line2 ?? '',
      shipping_city: order.shipping_city ?? '',
      shipping_state: order.shipping_state ?? '',
      shipping_postal_code: order.shipping_postal_code ?? '',
      shipping_country: order.shipping_country ?? '',
      item_titles: order.items.map((item) => item.title).join('; '),
      skus: order.items.map((item) => item.inventory?.sku ?? '').filter(Boolean).join('; '),
      declared_value: formatCurrency(order.total_cents),
    }))

    const headers: Array<keyof ShippingExportRow> = [
      'order_number',
      'shipping_name',
      'shipping_email',
      'shipping_address_line1',
      'shipping_address_line2',
      'shipping_city',
      'shipping_state',
      'shipping_postal_code',
      'shipping_country',
      'item_titles',
      'skus',
      'declared_value',
    ]
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
    ].join('\n')

    return { success: true, data: { rows, csv } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

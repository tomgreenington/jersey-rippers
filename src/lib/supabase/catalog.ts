import type { InventoryItem, InventoryType } from '@/types'
import { mockInventoryItems } from '@/lib/mock-data'
import { getServiceRoleClient } from '@/lib/supabase/server'

type CatalogSort = 'newest' | 'price-asc' | 'price-desc'

type CatalogFilters = {
  type?: InventoryType
  spinPool?: boolean
  premium?: boolean
  search?: string
  limit?: number
  sort?: CatalogSort
}

type CatalogCounts = {
  singles: number
  slabs: number
  sealed: number
  newDrops: number
}

const PUBLIC_INVENTORY_COLUMNS = [
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
  'created_at',
  'updated_at',
].join(', ')

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function getPublicCatalogClient() {
  if (!hasSupabaseEnv()) {
    return null
  }

  return getServiceRoleClient()
}

function shouldUseMockCatalog() {
  return (
    process.env.NEXT_PUBLIC_USE_MOCK_CATALOG === 'true' ||
    (!hasSupabaseEnv() && process.env.NODE_ENV !== 'production')
  )
}

function sanitizeInventoryItem(item: Partial<InventoryItem>): InventoryItem {
  return {
    id: item.id ?? '',
    sku: item.sku ?? '',
    type: item.type ?? 'single',
    status: item.status ?? 'listed',
    title: item.title ?? 'Untitled card',
    description: item.description ?? null,
    price: item.price ?? 0,
    cost_basis: null,
    set_name: item.set_name ?? null,
    card_number: item.card_number ?? null,
    year: item.year ?? null,
    player: item.player ?? null,
    rarity: item.rarity ?? null,
    language: item.language ?? 'English',
    edition: item.edition ?? null,
    condition: item.condition ?? null,
    grade_company: item.grade_company ?? null,
    grade_value: item.grade_value ?? null,
    cert_number: item.cert_number ?? null,
    quantity_on_hand: item.quantity_on_hand ?? 0,
    photos: item.photos ?? [],
    storage_location: null,
    spin_pool: item.spin_pool ?? false,
    reserved_by: null,
    reserved_until: null,
    created_at: item.created_at ?? '',
    updated_at: item.updated_at ?? '',
    created_by: item.created_by ?? null,
    updated_by: null,
  }
}

function getMockCatalogItems() {
  return mockInventoryItems
    .filter((item) => item.status === 'listed' && item.quantity_on_hand > 0)
    .map(sanitizeInventoryItem)
}

function getSearchText(item: InventoryItem) {
  return [
    item.title,
    item.player,
    item.set_name,
    item.card_number,
    item.rarity,
    item.year?.toString(),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function applyLocalCatalogFilters(
  items: InventoryItem[],
  filters: CatalogFilters = {}
) {
  const search = filters.search?.trim().toLowerCase()

  let filtered = items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false
    if (filters.spinPool !== undefined && item.spin_pool !== filters.spinPool) {
      return false
    }
    if (filters.premium && item.price < 10000) return false
    if (search && !getSearchText(item).includes(search)) return false
    return true
  })

  if (filters.sort === 'price-asc') {
    filtered = [...filtered].sort((a, b) => a.price - b.price)
  } else if (filters.sort === 'price-desc') {
    filtered = [...filtered].sort((a, b) => b.price - a.price)
  } else {
    filtered = [...filtered].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    )
  }

  return typeof filters.limit === 'number'
    ? filtered.slice(0, filters.limit)
    : filtered
}

function safeSearchTerm(search: string) {
  return search.trim().replace(/[%(),]/g, ' ').replace(/\s+/g, ' ')
}

function getOrder(sort: CatalogSort = 'newest') {
  if (sort === 'price-asc') {
    return { column: 'price', ascending: true }
  }

  if (sort === 'price-desc') {
    return { column: 'price', ascending: false }
  }

  return { column: 'created_at', ascending: false }
}

export async function getListedCatalogItems(
  filters: CatalogFilters = {}
): Promise<InventoryItem[]> {
  if (shouldUseMockCatalog()) {
    return applyLocalCatalogFilters(getMockCatalogItems(), filters)
  }

  const supabase = getPublicCatalogClient()
  if (!supabase) {
    return []
  }

  const order = getOrder(filters.sort)
  let query = supabase
    .from('inventory_items')
    .select(PUBLIC_INVENTORY_COLUMNS)
    .eq('status', 'listed')
    .gt('quantity_on_hand', 0)
    .order(order.column, { ascending: order.ascending })

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.spinPool !== undefined) {
    query = query.eq('spin_pool', filters.spinPool)
  }

  if (filters.premium) {
    query = query.gte('price', 10000)
  }

  const search = filters.search ? safeSearchTerm(filters.search) : ''
  if (search) {
    query = query.or(
      [
        `title.ilike.%${search}%`,
        `player.ilike.%${search}%`,
        `set_name.ilike.%${search}%`,
        `card_number.ilike.%${search}%`,
        `rarity.ilike.%${search}%`,
      ].join(',')
    )
  }

  if (typeof filters.limit === 'number') {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to load catalog inventory:', error.message)
    return []
  }

  return ((data ?? []) as Partial<InventoryItem>[]).map(sanitizeInventoryItem)
}

export async function getListedCatalogItem(id: string) {
  if (shouldUseMockCatalog()) {
    return getMockCatalogItems().find((item) => item.id === id) ?? null
  }

  const supabase = getPublicCatalogClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .select(PUBLIC_INVENTORY_COLUMNS)
    .eq('id', id)
    .eq('status', 'listed')
    .gt('quantity_on_hand', 0)
    .single()

  if (error || !data) {
    return null
  }

  return sanitizeInventoryItem(data as Partial<InventoryItem>)
}

export function getCatalogCounts(items: InventoryItem[]): CatalogCounts {
  return {
    singles: items.filter((item) => item.type === 'single').length,
    slabs: items.filter((item) => item.type === 'slab').length,
    sealed: items.filter((item) => item.type === 'sealed').length,
    newDrops: items.length,
  }
}

export async function getCatalogOverview() {
  const items = await getListedCatalogItems({ sort: 'newest' })

  return {
    counts: getCatalogCounts(items),
    featuredItems: items.slice(0, 8),
    spinItems: items.filter((item) => item.spin_pool).slice(0, 4),
  }
}

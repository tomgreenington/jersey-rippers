// ── Enums / Union Types ──────────────────────────────────────────────

export type InventoryType = 'single' | 'slab' | 'sealed'

export type InventoryStatus =
  | 'draft'
  | 'listed'
  | 'reserved'
  | 'sold'
  | 'shipped'
  | 'archived'
  | 'returned'

export type Condition =
  | 'Mint'
  | 'Near Mint'
  | 'Lightly Played'
  | 'Moderately Played'
  | 'Heavily Played'
  | 'Damaged'

export type UserRole = 'admin' | 'staff' | 'customer'

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled'

export type SpinEventStatus = 'pending' | 'completed' | 'expired'

// ── Core Entities ────────────────────────────────────────────────────

export interface User {
  id: string
  role: UserRole
  display_name: string | null
  email: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  sku: string
  type: InventoryType
  status: InventoryStatus
  title: string
  description: string | null
  price: number // cents
  cost_basis: number | null // cents, internal only
  set_name: string | null
  card_number: string | null
  year: number | null
  player: string | null
  rarity: string | null
  language: string
  edition: string | null
  condition: Condition | null // required for singles, null for slabs
  grade_company: string | null // PSA, BGS, CGC — null for non-slabs
  grade_value: string | null // e.g. "10", "9.5" — null for non-slabs
  cert_number: string | null // grading cert number — null for non-slabs
  quantity_on_hand: number
  photos: string[]
  storage_location: string | null // internal
  spin_pool: boolean
  reserved_by: string | null
  reserved_until: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  status: OrderStatus
  total_cents: number
  is_spin: boolean
  shipping_name: string | null
  shipping_address_line1: string | null
  shipping_address_line2: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_postal_code: string | null
  shipping_country: string | null
  shipping_email: string | null
  signature_required: boolean
  tracking_number: string | null
  tracking_carrier: string | null
  shipped_at: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  stripe_customer_id: string | null
  stripe_refund_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  inventory_item_id: string
  quantity: number
  price_cents: number
  title: string
  created_at: string
}

export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  performed_by: string
  ip_address: string | null
  created_at: string
}

export interface SpinEvent {
  id: string
  user_id: string
  inventory_item_id: string
  stripe_checkout_session_id: string | null
  status: SpinEventStatus
  nonce: string | null
  created_at: string
}

export interface Card {
  id: string
  external_id: string | null
  player: string
  year: number
  set_name: string
  card_number: string
  team: string | null
  sport: string | null
  position: string | null
  rarity: string | null
  rookie: boolean
  parallel_type: string | null
  manufacturer: string | null
  data_source: string | null
  source_url: string | null
  created_at: string
}

export interface PSAComp {
  grade: string
  most_recent_price: number | null
  average_price: number | null
  population: number | null
  pop_higher: number | null
}

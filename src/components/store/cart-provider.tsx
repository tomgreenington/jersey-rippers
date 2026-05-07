'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

export type CartItem = {
  id: string
  title: string
  price: number
  photo: string | null
  type: string
  setName: string | null
  cardNumber: string | null
  condition: string | null
  gradeCompany: string | null
  gradeValue: string | null
}

type CartContextValue = {
  items: CartItem[]
  itemCount: number
  totalCents: number
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
  isInCart: (id: string) => boolean
}

const CART_STORAGE_KEY = 'buck-baums-breaks-cart-v1'
const CART_CHANGE_EVENT = 'buck-baums-breaks-cart-change'
const CartContext = createContext<CartContextValue | null>(null)

function getCartSnapshot() {
  if (typeof window === 'undefined') {
    return '[]'
  }

  return window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]'
}

function subscribeToCart(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener('storage', onStoreChange)
  window.addEventListener(CART_CHANGE_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(CART_CHANGE_EVENT, onStoreChange)
  }
}

function parseCartSnapshot(snapshot: string): CartItem[] {
  try {
    const parsed = JSON.parse(snapshot)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CART_CHANGE_EVENT))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    () => '[]'
  )
  const items = useMemo(() => parseCartSnapshot(snapshot), [snapshot])

  const addItem = useCallback((item: CartItem) => {
    const current = parseCartSnapshot(getCartSnapshot())
    if (current.some((cartItem) => cartItem.id === item.id)) {
      return
    }

    writeCart([...current, item])
  }, [])

  const removeItem = useCallback((id: string) => {
    const current = parseCartSnapshot(getCartSnapshot())
    writeCart(current.filter((item) => item.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    writeCart([])
  }, [])

  const isInCart = useCallback(
    (id: string) => items.some((item) => item.id === id),
    [items]
  )

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.length,
      totalCents: items.reduce((sum, item) => sum + item.price, 0),
      addItem,
      removeItem,
      clearCart,
      isInCart,
    }),
    [addItem, clearCart, isInCart, items, removeItem]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }

  return context
}

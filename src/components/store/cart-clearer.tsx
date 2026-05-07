'use client'

import { useEffect } from 'react'
import { useCart } from '@/components/store/cart-provider'

export function CartClearer() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return null
}

'use client'

import { Check, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CartItem } from '@/components/store/cart-provider'
import { useCart } from '@/components/store/cart-provider'

export function AddToCartButton({
  item,
  disabled = false,
}: {
  item: CartItem
  disabled?: boolean
}) {
  const { addItem, isInCart } = useCart()
  const inCart = isInCart(item.id)

  return (
    <Button
      size="lg"
      disabled={disabled}
      onClick={() => addItem(item)}
      className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
    >
      {inCart ? (
        <>
          <Check className="h-4 w-4" />
          In Cart
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
        </>
      )}
    </Button>
  )
}

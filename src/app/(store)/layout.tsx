import { StoreHeader } from '@/components/store/header'
import { StoreFooter } from '@/components/store/footer'
import { CartProvider } from '@/components/store/cart-provider'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
      </div>
    </CartProvider>
  )
}

import Link from 'next/link'
import { PackageCheck, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PriceDisplay } from '@/components/ui/price-display'
import { StatusBadge } from '@/components/ui/status-badge'
import { getCustomerOrders } from '@/lib/supabase/order-fulfillment-actions'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function MyOrdersPage() {
  const result = await getCustomerOrders()

  if (!result.success) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h1 className="text-3xl font-black tracking-tight">Sign In For Orders</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {result.error}
        </p>
        <Link href="/signin" className="mt-6">
          <Button>Sign In</Button>
        </Link>
      </div>
    )
  }

  if (result.data.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <PackageCheck className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h1 className="text-3xl font-black tracking-tight">No orders yet</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Completed purchases and mystery pulls will show up here with shipping
          status and tracking.
        </p>
        <Link href="/search" className="mt-6">
          <Button>Browse Cards</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">My Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Purchase history, fulfillment status, and tracking.
        </p>
      </div>

      <div className="space-y-3">
        {result.data.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{order.order_number}</h2>
                    <StatusBadge status={order.status} />
                    {order.is_spin && <span className="text-xs text-primary">Mystery</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.created_at)} · {order.items.length}{' '}
                    {order.items.length === 1 ? 'item' : 'items'} ·{' '}
                    {order.fulfillmentSummary.shipped} of{' '}
                    {order.fulfillmentSummary.total || order.items.length} shipped
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {order.items.map((item) => item.title).join(', ')}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <PriceDisplay cents={order.total_cents} className="text-xl" />
                  <span className="text-sm font-medium text-primary">View details</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

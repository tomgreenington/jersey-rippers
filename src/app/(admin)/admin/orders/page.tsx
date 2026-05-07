import Link from 'next/link'
import { Download, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PriceDisplay } from '@/components/ui/price-display'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAdminOrders } from '@/lib/supabase/order-fulfillment-actions'

export const dynamic = 'force-dynamic'

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Unfulfilled', value: 'unfulfilled' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'all' } = await searchParams
  const result = await getAdminOrders(status)

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  const orders = result.data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            Paid orders, fulfillment state, and shipment actions.
          </p>
        </div>
        <Link href="/admin/orders/export">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Shipping Export
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link key={filter.value} href={`/admin/orders?status=${filter.value}`}>
            <Button
              size="sm"
              variant={status === filter.value ? 'default' : 'outline'}
            >
              {filter.label}
            </Button>
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <PackageCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h2 className="text-lg font-bold">No orders found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Orders matching this filter will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {order.order_number}
                      </Link>
                      {order.is_spin && (
                        <Badge variant="outline" className="ml-2">
                          Mystery
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48 truncate">
                        {order.customer?.display_name ?? order.customer?.email ?? 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      {order.fulfillmentSummary.total > 0 ? (
                        <span className="text-sm">
                          {order.fulfillmentSummary.shipped}/
                          {order.fulfillmentSummary.total} shipped
                          {order.fulfillmentSummary.blocked > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              blocked
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No tasks</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PriceDisplay cents={order.total_cents} />
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

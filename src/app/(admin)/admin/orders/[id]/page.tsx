import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ImageIcon, PackageCheck, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PriceDisplay } from '@/components/ui/price-display'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  getAdminOrderDetail,
  markFulfillmentTaskShipped,
} from '@/lib/supabase/order-fulfillment-actions'

export const dynamic = 'force-dynamic'

function formatDate(value: string | null) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getAdminOrderDetail(id)

  if (!result.success && result.status === 'not_found') {
    notFound()
  }

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  const order = result.data
  const address = [
    order.shipping_address_line1,
    order.shipping_address_line2,
    [order.shipping_city, order.shipping_state, order.shipping_postal_code]
      .filter(Boolean)
      .join(', '),
    order.shipping_country,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <Link href="/admin/orders">
        <Button variant="ghost" className="gap-2 px-0">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Button>
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {order.is_spin && <Badge variant="outline">Mystery</Badge>}
          </div>
          <h1 className="text-3xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground">
            Placed {formatDate(order.created_at)}
          </p>
        </div>
        <PriceDisplay cents={order.total_cents} className="text-3xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">
              {order.customer?.display_name ?? 'Customer'}
            </p>
            <p className="text-muted-foreground">
              {order.shipping_email ?? order.customer?.email ?? 'No email'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {order.shipping_name ?? 'Name pending'}
            </p>
            {address.length > 0 ? (
              address.map((line) => <p key={line}>{line}</p>)
            ) : (
              <p>No shipping address captured yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Checkout: {order.stripe_checkout_session_id ?? 'Not set'}</p>
            <p>Payment intent: {order.stripe_payment_intent_id ?? 'Not set'}</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <PackageCheck className="h-5 w-5" />
          Fulfillment
        </h2>

        <div className="space-y-4">
          {order.items.map((lineItem) => {
            const photo = lineItem.inventory?.photos?.[0]
            const task = lineItem.fulfillmentTask
            const isShipped = task?.status === 'shipped' || task?.status === 'delivered'

            return (
              <Card key={lineItem.id}>
                <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="flex gap-4">
                    <div className="relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={lineItem.title}
                          fill
                          unoptimized={photo.startsWith('http')}
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{lineItem.title}</h3>
                        <Badge variant="outline">
                          {task?.status?.replace('_', ' ') ?? 'no task'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[
                          lineItem.inventory?.sku,
                          lineItem.inventory?.set_name,
                          lineItem.inventory?.card_number
                            ? `#${lineItem.inventory.card_number}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Storage: {task?.storage_location ?? lineItem.inventory?.storage_location ?? 'Not set'}
                      </p>
                      <PriceDisplay cents={lineItem.price_cents} />
                    </div>
                  </div>

                  {task ? (
                    <form action={markFulfillmentTaskShipped} className="space-y-3">
                      <input type="hidden" name="task_id" value={task.id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          name="carrier"
                          aria-label="Carrier"
                          placeholder="Carrier"
                          defaultValue={task.carrier ?? ''}
                          disabled={isShipped}
                          required
                        />
                        <Input
                          name="tracking_number"
                          aria-label="Tracking number"
                          placeholder="Tracking number"
                          defaultValue={task.tracking_number ?? ''}
                          disabled={isShipped}
                          required
                        />
                      </div>
                      <Input
                        name="notes"
                        aria-label="Fulfillment notes"
                        placeholder="Fulfillment notes"
                        defaultValue={task.notes ?? ''}
                        disabled={isShipped}
                      />
                      <Button type="submit" disabled={isShipped} className="w-full gap-2">
                        <Truck className="h-4 w-4" />
                        {isShipped ? 'Shipped' : 'Mark shipped'}
                      </Button>
                    </form>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                      This item does not have a fulfillment task yet. Replaying
                      checkout finalization will backfill paid orders.
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}

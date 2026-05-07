import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ImageIcon, PackageCheck, ShoppingBag, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriceDisplay } from '@/components/ui/price-display'
import { StatusBadge } from '@/components/ui/status-badge'
import { getCustomerOrderDetail } from '@/lib/supabase/order-fulfillment-actions'

export const dynamic = 'force-dynamic'

function formatDate(value: string | null) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function fulfillmentLabel(status?: string) {
  return status ? status.replace('_', ' ') : 'needs packing'
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getCustomerOrderDetail(id)

  if (!result.success && result.status === 'not_found') {
    notFound()
  }

  if (!result.success) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h1 className="text-3xl font-black tracking-tight">Order unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {result.error}
        </p>
        <Link href="/signin" className="mt-6">
          <Button>Sign In</Button>
        </Link>
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/orders">
        <Button variant="ghost" className="gap-2 px-0">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Button>
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {order.is_spin && <Badge variant="outline">Mystery order</Badge>}
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDate(order.created_at)}
          </p>
        </div>
        <PriceDisplay cents={order.total_cents} className="text-3xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Shipping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {order.shipping_name ?? 'Shipping name pending'}
            </p>
            {address.length > 0 ? (
              address.map((line) => <p key={line}>{line}</p>)
            ) : (
              <p>Shipping address will appear after checkout finalizes.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageCheck className="h-4 w-4" />
              Fulfillment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {order.fulfillmentSummary.shipped} of{' '}
              {order.fulfillmentSummary.total || order.items.length} shipped
            </p>
            <p>
              {order.fulfillmentSummary.open} open task
              {order.fulfillmentSummary.open === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {order.tracking_number ? (
              <>
                <p className="font-medium text-foreground">
                  {order.tracking_carrier ?? 'Carrier'} {order.tracking_number}
                </p>
                <p>Shipped {formatDate(order.shipped_at)}</p>
              </>
            ) : (
              <p>Tracking will appear here once the order ships.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Items</h2>
        <div className="space-y-3">
          {order.items.map((lineItem) => {
            const photo = lineItem.inventory?.photos?.[0]

            return (
              <Card key={lineItem.id}>
                <CardContent className="flex gap-4 p-4">
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
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{lineItem.title}</h3>
                      <Badge variant="outline">
                        {fulfillmentLabel(lineItem.fulfillmentTask?.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[
                        lineItem.inventory?.set_name,
                        lineItem.inventory?.card_number
                          ? `#${lineItem.inventory.card_number}`
                          : null,
                        lineItem.inventory?.sku,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {lineItem.fulfillmentTask?.tracking_number && (
                      <p className="text-sm text-muted-foreground">
                        Tracking: {lineItem.fulfillmentTask.carrier}{' '}
                        {lineItem.fulfillmentTask.tracking_number}
                      </p>
                    )}
                    <PriceDisplay cents={lineItem.price_cents} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}

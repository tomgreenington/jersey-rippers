import Image from 'next/image'
import { Dices, ImageIcon, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PriceDisplay } from '@/components/ui/price-display'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  type AdminSpinPoolItem,
  getAdminSpinPoolItems,
  setInventorySpinPoolStatus,
} from '@/lib/supabase/order-fulfillment-actions'

export const dynamic = 'force-dynamic'

function PoolItemCard({
  item,
  action,
}: {
  item: AdminSpinPoolItem
  action: 'add' | 'remove'
}) {
  const photo = item.photos?.[0]
  const nextValue = action === 'add'

  return (
    <Card>
      <CardContent className="flex gap-4 p-4">
        <div className="relative flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {photo ? (
            <Image
              src={photo}
              alt={item.title}
              fill
              unoptimized={photo.startsWith('http')}
              className="object-cover"
            />
          ) : (
            <ImageIcon className="h-7 w-7 text-muted-foreground/40" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-snug">{item.title}</h3>
            <StatusBadge status={item.status} />
            {item.spin_pool && <Badge variant="outline">Pool</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {[item.sku, item.set_name, item.card_number ? `#${item.card_number}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="flex items-center justify-between gap-3">
            <PriceDisplay cents={item.price} />
            <form action={setInventorySpinPoolStatus}>
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="spin_pool" value={String(nextValue)} />
              <Button
                type="submit"
                size="sm"
                variant={action === 'add' ? 'default' : 'outline'}
                className="gap-2"
              >
                {action === 'add' ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {action === 'add' ? 'Add' : 'Remove'}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function SpinPoolPage() {
  const result = await getAdminSpinPoolItems()

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  const { poolItems, availableItems } = result.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Dices className="h-7 w-7 text-primary" />
          Random Card Pool
        </h1>
        <p className="text-muted-foreground">
          Manage listed cards eligible for the $5 mystery purchase flow.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Listed pool count
            </p>
            <p className="mt-1 text-3xl font-bold">
              {poolItems.filter((item) => item.status === 'listed').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Listed cards available to add
            </p>
            <p className="mt-1 text-3xl font-bold">{availableItems.length}</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Current Pool</h2>
        {poolItems.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              No cards are currently marked for the mystery pool.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {poolItems.map((item) => (
              <PoolItemCard key={item.id} item={item} action="remove" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Add Listed Cards</h2>
        {availableItems.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              No listed cards are available to add to the pool.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {availableItems.map((item) => (
              <PoolItemCard key={item.id} item={item} action="add" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

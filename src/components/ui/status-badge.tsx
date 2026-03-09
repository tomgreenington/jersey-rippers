import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { InventoryStatus, OrderStatus } from '@/types'

const statusColors: Record<InventoryStatus | OrderStatus, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  listed: 'bg-green-500/20 text-green-400 border-green-500/30',
  reserved: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  sold: 'bg-red-500/20 text-red-400 border-red-500/30',
  shipped: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  returned: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  refunded: 'bg-red-500/20 text-red-400 border-red-500/30',
  partially_refunded: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export function StatusBadge({
  status,
  className,
}: {
  status: InventoryStatus | OrderStatus
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn(statusColors[status], className)}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

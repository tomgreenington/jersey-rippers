import { cn } from '@/lib/utils'

export function PriceDisplay({
  cents,
  className,
}: {
  cents: number
  className?: string
}) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)

  return (
    <span className={cn('font-semibold tabular-nums text-primary', className)}>
      {formatted}
    </span>
  )
}

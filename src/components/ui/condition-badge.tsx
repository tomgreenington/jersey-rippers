import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Condition } from '@/types'

const conditionColors: Record<Condition, string> = {
  Mint: 'bg-green-500/20 text-green-400 border-green-500/30',
  'Near Mint': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Lightly Played': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Moderately Played': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Heavily Played': 'bg-red-500/20 text-red-400 border-red-500/30',
  Damaged: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function ConditionBadge({
  condition,
  gradeCompany,
  gradeValue,
  className,
}: {
  condition?: Condition | null
  gradeCompany?: string | null
  gradeValue?: string | null
  className?: string
}) {
  if (gradeCompany && gradeValue) {
    return (
      <Badge variant="outline" className={cn('bg-blue-500/20 text-blue-400 border-blue-500/30', className)}>
        {gradeCompany} {gradeValue}
      </Badge>
    )
  }

  if (condition) {
    return (
      <Badge variant="outline" className={cn(conditionColors[condition], className)}>
        {condition}
      </Badge>
    )
  }

  return null
}

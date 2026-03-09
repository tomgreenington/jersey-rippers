import Link from 'next/link'
import { ImageIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PriceDisplay } from '@/components/ui/price-display'
import { ConditionBadge } from '@/components/ui/condition-badge'
import type { InventoryItem } from '@/types'

export function ProductCard({ item }: { item: InventoryItem }) {
  return (
    <Link href={`/products/${item.id}`}>
      <Card className="group overflow-hidden border-border py-0 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
        {/* Image placeholder — 5:7 aspect ratio */}
        <div className="relative flex aspect-[5/7] items-center justify-center bg-muted">
          <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
          {/* Condition / Grade badge */}
          <div className="absolute right-2 top-2">
            <ConditionBadge
              condition={item.condition}
              gradeCompany={item.grade_company}
              gradeValue={item.grade_value}
            />
          </div>
        </div>

        <CardContent className="space-y-1.5 p-4">
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {item.title}
          </p>
          {item.set_name && (
            <p className="text-xs text-muted-foreground">{item.set_name}</p>
          )}
          <PriceDisplay cents={item.price} className="text-base" />
        </CardContent>
      </Card>
    </Link>
  )
}

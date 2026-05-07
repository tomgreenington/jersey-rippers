'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ImageIcon } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type PointerEvent } from 'react'
import { PriceDisplay } from '@/components/ui/price-display'
import type { InventoryItem } from '@/types'

type MysteryPoolPreviewProps = {
  items: InventoryItem[]
}

type PreviewCard = {
  item: InventoryItem
  x: number
  y: number
  rotation: number
  scale: number
  delay: number
  duration: number
}

function buildPreviewCards(items: InventoryItem[]) {
  if (items.length === 0) {
    return []
  }

  const positions = [
    { x: 6, y: 18, rotation: -10, scale: 0.95 },
    { x: 20, y: 8, rotation: 7, scale: 1.04 },
    { x: 38, y: 22, rotation: -4, scale: 0.98 },
    { x: 56, y: 10, rotation: 11, scale: 1.05 },
    { x: 74, y: 25, rotation: -8, scale: 0.94 },
    { x: 10, y: 58, rotation: 8, scale: 1 },
    { x: 30, y: 48, rotation: -12, scale: 1.06 },
    { x: 50, y: 62, rotation: 5, scale: 0.96 },
    { x: 68, y: 50, rotation: -3, scale: 1.03 },
    { x: 82, y: 62, rotation: 10, scale: 0.92 },
  ]

  return positions.map((position, index) => ({
    item: items[index % items.length],
    ...position,
    delay: index * -1.7,
    duration: 13 + (index % 4) * 1.6,
  }))
}

function PoolCard({
  card,
  crisp = false,
}: {
  card: PreviewCard
  crisp?: boolean
}) {
  const image = card.item.photos?.[0]
  const style = {
    left: `${card.x}%`,
    top: `${card.y}%`,
    '--pool-rotation': `${card.rotation}deg`,
    '--pool-scale': String(card.scale),
    animationDelay: `${card.delay}s`,
    animationDuration: `${card.duration}s`,
  } as CSSProperties

  return (
    <div
      aria-hidden="true"
      className={`mystery-pool-card absolute w-32 sm:w-40 lg:w-48 ${
        crisp ? 'mystery-pool-card-crisp' : 'mystery-pool-card-soft'
      }`}
      style={style}
    >
      <div className="overflow-hidden rounded-lg border border-white/15 bg-card/90 shadow-2xl">
        <div className="relative flex aspect-[5/7] items-center justify-center overflow-hidden bg-muted">
          {image ? (
            <Image
              src={image}
              alt={card.item.title}
              fill
              unoptimized={image.startsWith('http')}
              className="object-cover"
              sizes="(min-width: 1024px) 12rem, (min-width: 640px) 10rem, 8rem"
            />
          ) : (
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <p className="line-clamp-2 text-xs font-semibold leading-snug">
            {card.item.title}
          </p>
          <PriceDisplay cents={card.item.price} className="text-sm" />
        </div>
      </div>
    </div>
  )
}

export function MysteryPoolPreview({ items }: MysteryPoolPreviewProps) {
  const previewCards = useMemo(() => buildPreviewCards(items), [items])
  const [spot, setSpot] = useState({ x: 50, y: 50 })
  const [isActive, setIsActive] = useState(false)

  function handlePointerMove(event: PointerEvent<HTMLAnchorElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    setSpot({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    })
  }

  if (previewCards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
        Random pool cards will appear here when they are listed.
      </div>
    )
  }

  return (
    <Link
      href="/spin#random-card-checkout"
      aria-label="Draw a mystery card from the current pool"
      className="mystery-pool-stage group relative block min-h-[440px] overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/60 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      style={
        {
          '--spot-x': `${spot.x}%`,
          '--spot-y': `${spot.y}%`,
          '--spot-opacity': isActive ? 1 : 0,
        } as CSSProperties
      }
      onPointerEnter={() => setIsActive(true)}
      onPointerLeave={() => setIsActive(false)}
      onPointerMove={handlePointerMove}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(239,68,68,0.22),transparent_34%),radial-gradient(circle_at_75%_65%,rgba(59,130,246,0.18),transparent_36%)]" />
      <div className="absolute inset-0 mystery-pool-soft-layer">
        {previewCards.map((card, index) => (
          <PoolCard key={`${card.item.id}-soft-${index}`} card={card} />
        ))}
      </div>
      <div className="absolute inset-0 mystery-pool-crisp-layer">
        {previewCards.map((card, index) => (
          <PoolCard key={`${card.item.id}-crisp-${index}`} card={card} crisp />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-background via-background/80 to-transparent p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            {items.length} card{items.length === 1 ? '' : 's'} in the pool
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight">
            $5 mystery pulls
          </p>
        </div>
        <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform group-hover:translate-x-0.5">
          Draw
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}

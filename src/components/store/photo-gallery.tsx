'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const placeholderCount = photos.length > 0 ? photos.length : 4

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="flex aspect-[5/7] items-center justify-center rounded-lg bg-muted">
        <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2">
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => setSelectedIndex(i)}
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-md bg-muted transition-all',
              selectedIndex === i
                ? 'ring-2 ring-primary'
                : 'opacity-60 hover:opacity-100'
            )}
          >
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          </button>
        ))}
      </div>
    </div>
  )
}

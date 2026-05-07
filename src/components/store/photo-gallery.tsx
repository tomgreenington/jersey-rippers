'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedPhoto = photos[selectedIndex]

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative flex aspect-[5/7] items-center justify-center overflow-hidden rounded-lg bg-muted">
        {selectedPhoto ? (
          <Image
            src={selectedPhoto}
            alt="Selected card photo"
            fill
            priority
            unoptimized={selectedPhoto.startsWith('http')}
            className="object-cover"
          />
        ) : (
          <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2">
        {photos.length > 0 ? photos.map((photo, i) => (
          <button
            key={photo}
            onClick={() => setSelectedIndex(i)}
            aria-label={`View card photo ${i + 1}`}
            className={cn(
              'relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-muted transition-all',
              selectedIndex === i
                ? 'ring-2 ring-primary'
                : 'opacity-60 hover:opacity-100'
            )}
          >
            <Image
              src={photo}
              alt=""
              fill
              unoptimized={photo.startsWith('http')}
              className="object-cover"
            />
          </button>
        )) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
      </div>
    </div>
  )
}

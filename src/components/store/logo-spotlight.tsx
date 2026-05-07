'use client'

import Image from 'next/image'
import { useState, type CSSProperties, type PointerEvent } from 'react'

type LogoSpotlightProps = {
  alt: string
  baseSrc: string
  className?: string
  priority?: boolean
  revealSrc?: string
  sizes?: string
}

export function LogoSpotlight({
  alt,
  baseSrc,
  className,
  priority = false,
  revealSrc,
  sizes = '18rem',
}: LogoSpotlightProps) {
  const [spot, setSpot] = useState({ x: 50, y: 50 })
  const [isActive, setIsActive] = useState(false)

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()

    setSpot({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    })
  }

  return (
    <div
      className={`logo-spotlight relative isolate overflow-hidden rounded-md ${className ?? ''}`}
      style={
        {
          '--logo-spot-x': `${spot.x}%`,
          '--logo-spot-y': `${spot.y}%`,
          '--logo-spot-opacity': isActive ? 1 : 0,
        } as CSSProperties
      }
      onPointerEnter={() => setIsActive(true)}
      onPointerLeave={() => setIsActive(false)}
      onPointerMove={handlePointerMove}
    >
      <Image
        src={baseSrc}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain"
      />
      {revealSrc && (
        <div className="logo-spotlight-reveal absolute inset-0" aria-hidden="true">
          <Image
            src={revealSrc}
            alt=""
            fill
            sizes={sizes}
            className="object-contain"
          />
        </div>
      )}
      <div className="logo-spotlight-invert absolute inset-0" aria-hidden="true" />
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, ShoppingCart, Search, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { useThemeToggle } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const categories = [
  {
    label: 'Daily Singles',
    href: '/collections/singles',
    description: 'Hot cards in play right now',
  },
  {
    label: 'Graded Slabs',
    href: '/collections/graded',
    description: 'PSA, BGS, CGC authenticated',
  },
  {
    label: 'Sealed Product',
    href: '/collections/sealed',
    description: 'Packs, boxes, and sealed product',
  },
  {
    label: 'New Releases',
    href: '/collections/new-drops',
    description: 'Latest additions to inventory',
  },
  {
    label: 'Premium Cards',
    href: '/search?filter=premium',
    description: 'High-grade, high-value cards',
  },
  {
    label: 'Supplies',
    href: '/search?filter=supplies',
    description: 'Sleeves, binders, and cases',
  },
]

export function StoreHeader() {
  const pathname = usePathname()
  const { theme, toggle } = useThemeToggle()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex flex-col items-start gap-0">
            <span className="text-lg font-black tracking-tighter text-primary lg:text-xl">
              BUCKS BREAKS
            </span>
            <span className="text-[10px] font-semibold uppercase text-secondary lg:text-xs">
              Premium Cards
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {categories.slice(0, 3).map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
              >
                {cat.label}
              </Link>
            ))}
            <div className="h-6 w-px bg-border" />
            <Link
              href="/spin"
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-all hover:bg-primary/20 hover:scale-105"
            >
              🎰 $5 SPIN
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link href="/search" className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  2
                </span>
                <span className="sr-only">Cart</span>
              </Button>
            </Link>

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="text-lg font-black text-primary">
                  BUCKS BREAKS
                </SheetTitle>
                <nav className="mt-8 flex flex-col gap-2">
                  {categories.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      className="rounded-lg px-3 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-primary"
                    >
                      {cat.label}
                      <p className="text-xs text-muted-foreground font-normal">
                        {cat.description}
                      </p>
                    </Link>
                  ))}
                  <div className="my-2 h-px bg-border" />
                  <Link href="/spin">
                    <Button
                      className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      size="lg"
                    >
                      🎰 $5 SPIN
                    </Button>
                  </Link>
                  <Link href="/login" className="mt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      Sign In
                    </Button>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mega menu dropdown (desktop only) */}
        <div className="hidden lg:block border-t border-border">
          <div className="flex gap-1 overflow-x-auto py-3">
            {categories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="flex flex-shrink-0 flex-col gap-1 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-accent/50"
              >
                <span className="font-semibold text-foreground/60">{cat.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {cat.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

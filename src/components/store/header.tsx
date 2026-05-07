'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Dices, Menu, ShoppingCart, Search, Moon, Sun, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { useThemeToggle } from '@/components/theme-provider'
import { useCart } from '@/components/store/cart-provider'
import { BRAND } from '@/lib/brand'
import { createClient } from '@/lib/supabase/client'

const categories = [
  {
    label: 'Raw Singles',
    href: '/collections/singles',
    description: 'Hot cards in play right now',
  },
  {
    label: 'Slabs',
    href: '/collections/graded',
    description: 'PSA, BGS, CGC authenticated',
  },
  {
    label: 'Sealed',
    href: '/collections/sealed',
    description: 'Packs, boxes, and sealed product',
  },
  {
    label: 'New Drops',
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
  const { theme, toggle } = useThemeToggle()
  const { itemCount } = useCart()
  const [hasUser, setHasUser] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setHasUser(Boolean(data.user))
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasUser(Boolean(session?.user))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={BRAND.logo}
              alt={BRAND.name}
              width={48}
              height={48}
              className="h-12 w-12 object-contain lg:h-14 lg:w-14"
              priority
            />
            <div className="hidden flex-col items-start gap-0 sm:flex">
              <span className="text-sm font-black tracking-tighter text-primary lg:text-base">
                {BRAND.navTitle}
              </span>
              <span className="text-[9px] font-semibold uppercase text-secondary lg:text-[10px]">
                BREAKS
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
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
              <Dices className="h-4 w-4" />
              $5 MYSTERY
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
              <Button variant="ghost" size="icon-sm" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {itemCount}
                  </span>
                )}
                <span className="sr-only">Cart</span>
              </Button>
            </Link>

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[19rem] gap-0 p-0">
                <SheetTitle className="border-b border-border px-5 py-4 text-base font-black text-primary">
                  {BRAND.navTitle}
                </SheetTitle>
                <nav className="flex flex-col gap-1 p-3">
                  {categories.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      className="rounded-md px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-primary"
                    >
                      {cat.label}
                      <p className="mt-0.5 text-xs font-normal leading-4 text-muted-foreground">
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
                      <Dices className="h-4 w-4" />
                      $5 MYSTERY
                    </Button>
                  </Link>
                  {hasUser ? (
                    <Link href="/orders">
                      <Button variant="ghost" className="w-full gap-2" size="lg">
                        <PackageCheck className="h-4 w-4" />
                        Order History
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/signin" className="mt-2">
                      <Button variant="outline" className="w-full" size="lg">
                        Sign In
                      </Button>
                    </Link>
                  )}
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

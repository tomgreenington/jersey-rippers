'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Dices,
  ScrollText,
  Menu,
  Settings,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'

const sidebarItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/inventory', label: 'Inventory', icon: Package, exact: false },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, exact: false },
  { href: '/admin/spin', label: 'Spin Pool', icon: Dices, exact: false },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText, exact: false },
]

function NavItems() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {sidebarItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
      <Link
        href="/admin/settings"
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Settings className="h-4 w-4" />
        Settings
      </Link>
    </nav>
  )
}

function SidebarFooter() {
  const router = useRouter()
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setEmail(session.user.email)
      }
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="mt-auto border-t border-border pt-4 space-y-3">
      <div className="px-3">
        <p className="text-xs font-medium text-muted-foreground uppercase">Signed in as</p>
        <p className="text-sm font-medium truncate">{email}</p>
      </div>
      <Button
        onClick={handleLogout}
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  )
}

export function AdminSidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
        <div className="flex h-full flex-col px-4 py-6">
          <Link href="/admin" className="mb-8 px-3">
            <span className="text-lg font-black tracking-tight text-primary">
              BUCKS BREAKS
            </span>
          </Link>
          <NavItems />
          <SidebarFooter />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <Link href="/admin">
          <span className="text-lg font-black tracking-tight text-primary">
            BUCKS BREAKS
          </span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <div className="flex h-full flex-col px-4 py-6">
              <SheetTitle className="mb-8 px-3 text-lg font-black tracking-tight text-primary">
                BUCKS BREAKS
              </SheetTitle>
              <NavItems />
              <SidebarFooter />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

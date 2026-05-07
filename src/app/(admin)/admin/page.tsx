import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Dices, DollarSign, ClipboardList } from 'lucide-react'
import { getAdminDashboardMetrics } from '@/lib/supabase/order-fulfillment-actions'

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const result = await getAdminDashboardMetrics()

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  const metrics = result.data
  const stats = [
    {
      label: 'Total Items',
      value: metrics.totalItems.toLocaleString(),
      icon: Package,
    },
    {
      label: 'Listed',
      value: metrics.listedItems.toLocaleString(),
      icon: DollarSign,
    },
    {
      label: 'Paid Orders',
      value: metrics.paidOrders.toLocaleString(),
      icon: ShoppingCart,
    },
    {
      label: 'Open Fulfillment',
      value: metrics.openFulfillmentTasks.toLocaleString(),
      icon: ClipboardList,
    },
    {
      label: 'Random Pool',
      value: metrics.randomPoolItems.toLocaleString(),
      icon: Dices,
    },
    {
      label: 'Paid Revenue',
      value: formatCurrency(metrics.revenueCents),
      icon: DollarSign,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Live store and fulfillment metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

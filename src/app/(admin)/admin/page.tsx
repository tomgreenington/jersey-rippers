import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockInventoryItems, mockOrders } from '@/lib/mock-data'
import { Package, ShoppingCart, Dices, DollarSign } from 'lucide-react'

const stats = [
  {
    label: 'Total Items',
    value: mockInventoryItems.length,
    icon: Package,
  },
  {
    label: 'Listed',
    value: mockInventoryItems.filter((i) => i.status === 'listed').length,
    icon: DollarSign,
  },
  {
    label: 'Orders',
    value: mockOrders.length,
    icon: ShoppingCart,
  },
  {
    label: 'Spin Pool',
    value: mockInventoryItems.filter((i) => i.spin_pool).length,
    icon: Dices,
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

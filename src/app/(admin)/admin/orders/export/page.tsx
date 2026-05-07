import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getShippingExport } from '@/lib/supabase/order-fulfillment-actions'

export const dynamic = 'force-dynamic'

export default async function ExportOrdersPage() {
  const result = await getShippingExport()

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  const { rows, csv } = result.data
  const downloadHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shipping Export</h1>
          <p className="text-muted-foreground">
            Paid, unshipped orders ready for packing and label creation.
          </p>
        </div>
        <Button asChild className="gap-2">
          <a href={downloadHref} download="paid-unshipped-orders.csv">
            <Download className="h-4 w-4" />
            Download CSV
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? 'order' : 'orders'} ready
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            readOnly
            value={csv}
            aria-label="Shipping CSV contents"
            className="min-h-96 w-full rounded-md border border-border bg-muted/40 p-3 font-mono text-xs"
          />
        </CardContent>
      </Card>
    </div>
  )
}

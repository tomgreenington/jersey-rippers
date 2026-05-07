import { AdminSidebar } from '@/components/admin/sidebar'
import { getCurrentAdminUser } from '@/lib/supabase/admin-auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getCurrentAdminUser()

  if (!user || (role !== 'admin' && role !== 'staff')) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

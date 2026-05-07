import { getCurrentAdminUser } from '@/lib/supabase/admin-auth';
import CardWizard from '@/components/admin/card-wizard';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'List a Card',
  description: 'Add a card to inventory using our card listing wizard',
};

export default async function InventoryNewPage() {
  const { isAdmin } = await getCurrentAdminUser();

  if (!isAdmin) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <CardWizard />
      </div>
    </div>
  );
}

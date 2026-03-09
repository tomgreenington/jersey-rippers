import { getSession } from '@/lib/supabase/auth-actions';
import CardWizard from '@/components/admin/card-wizard';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'List a Card',
  description: 'Add a card to inventory using our card listing wizard',
};

export default async function InventoryNewPage() {
  const { session } = await getSession();

  // TODO: Check if user is admin/staff
  // For now, allow anyone to access. In production, verify role in Supabase.
  if (!session) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <CardWizard />
      </div>
    </div>
  );
}

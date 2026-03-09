'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createInventoryItem } from '@/lib/supabase/inventory-actions';
import { getSession } from '@/lib/supabase/auth-actions';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { InventoryType } from '@/types';

interface StepReviewProps {
  state: {
    player: string;
    setName: string;
    cardNumber: string;
    year: number | null;
    team: string | null;
    sport: string | null;
    position: string | null;
    rarity: string | null;
    rookie: boolean;
    parallelType: string | null;
    manufacturer: string | null;
    type: InventoryType;
    condition: string | null;
    gradeCompany: string | null;
    gradeValue: string | null;
    certNumber: string | null;
    costBasis: number | null;
    price: number | null;
    spinPool: boolean;
    photos: string[];
  };
  updateState: (updates: any) => void;
}

interface CreateState {
  isLoading: boolean;
  error: string;
  success: boolean;
  itemId?: string;
}

export default function StepReview({ state }: StepReviewProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [createState, setCreateState] = useState<CreateState>({
    isLoading: false,
    error: '',
    success: false,
  });

  useEffect(() => {
    const loadSession = async () => {
      const { session } = await getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    loadSession();
  }, []);

  const marginPercent =
    state.costBasis && state.price
      ? (((state.price / 100 - state.costBasis) / state.costBasis) * 100).toFixed(1)
      : null;

  const handlePublish = async () => {
    await handleCreate(true);
  };

  const handleSaveDraft = async () => {
    await handleCreate(false);
  };

  const handleCreate = async (publishNow: boolean) => {
    if (!userId) {
      setCreateState({ isLoading: false, error: 'Not authenticated', success: false });
      return;
    }

    setCreateState({ isLoading: true, error: '', success: false });

    try {

      const result = await createInventoryItem(
        {
          type: state.type,
          title: `${state.player} ${state.setName} #${state.cardNumber}`,
          player: state.player,
          set_name: state.setName,
          card_number: state.cardNumber,
          year: state.year ?? undefined,
          team: state.team ?? undefined,
          sport: state.sport ?? undefined,
          position: state.position ?? undefined,
          rarity: state.rarity ?? undefined,
          rookie: state.rookie,
          parallel_type: state.parallelType ?? undefined,
          manufacturer: state.manufacturer ?? undefined,
          condition: state.condition ?? undefined,
          grade_company: state.gradeCompany ?? undefined,
          grade_value: state.gradeValue ?? undefined,
          cert_number: state.certNumber ?? undefined,
          price: state.price ?? 0,
          cost_basis: state.costBasis ? Math.round(state.costBasis * 100) : undefined,
          photos: state.photos,
          quantity_on_hand: 1,
        },
        userId
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create item');
      }

      setCreateState({
        isLoading: false,
        error: '',
        success: true,
        itemId: result.data?.id,
      });

      // Redirect to inventory list after short delay
      setTimeout(() => {
        router.push('/admin/inventory');
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setCreateState({ isLoading: false, error: message, success: false });
    }
  };

  if (createState.success) {
    return (
      <div className="text-center py-8">
        <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Card Listed Successfully!</h2>
        <p className="text-muted-foreground mb-4">
          Redirecting to inventory in a moment...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Card Info */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Card</p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Player:</span>
              <p className="font-medium">{state.player}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Set:</span>
              <p className="font-medium">{state.setName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Card #:</span>
              <p className="font-medium">{state.cardNumber}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Year:</span>
              <p className="font-medium">{state.year}</p>
            </div>
            {state.rarity && (
              <div>
                <span className="text-muted-foreground">Rarity:</span>
                <p className="font-medium">{state.rarity}</p>
              </div>
            )}
            {state.sport && (
              <div>
                <span className="text-muted-foreground">Sport:</span>
                <p className="font-medium">{state.sport}</p>
              </div>
            )}
          </div>
        </div>

        {/* Type & Grade */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Type & Condition</p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium capitalize">{state.type}</p>
            </div>
            {state.type === 'single' && (
              <div>
                <span className="text-muted-foreground">Condition:</span>
                <p className="font-medium">{state.condition}</p>
              </div>
            )}
            {state.type === 'slab' && (
              <>
                <div>
                  <span className="text-muted-foreground">Grade Company:</span>
                  <p className="font-medium">{state.gradeCompany}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Grade Value:</span>
                  <p className="font-medium">{state.gradeValue}</p>
                </div>
                {state.certNumber && (
                  <div>
                    <span className="text-muted-foreground">Cert #:</span>
                    <p className="font-medium">{state.certNumber}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Pricing</p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Cost Basis:</span>
              <p className="font-medium">
                {state.costBasis ? `$${state.costBasis.toFixed(2)}` : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Selling Price:</span>
              <p className="font-bold text-lg text-red-600">
                {state.price ? `$${(state.price / 100).toFixed(2)}` : '—'}
              </p>
            </div>
            {marginPercent && (
              <div>
                <span className="text-muted-foreground">Margin:</span>
                <p className={`font-medium ${parseFloat(marginPercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {marginPercent}%
                </p>
              </div>
            )}
            {state.spinPool && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <p className="font-medium">Spin Pool: Yes</p>
              </div>
            )}
          </div>
        </div>

        {/* Photos */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Photos</p>
          <div className="text-sm">
            <span className="text-muted-foreground">Count:</span>
            <p className="font-medium">{state.photos.length} photo(s)</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {createState.error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{createState.error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={createState.isLoading}
          className="gap-2"
        >
          {createState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save as Draft
        </Button>
        <Button
          onClick={handlePublish}
          disabled={createState.isLoading}
          className="gap-2 bg-red-600 hover:bg-red-700"
        >
          {createState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Publish Now
        </Button>
      </div>
    </div>
  );
}

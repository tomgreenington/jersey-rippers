'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createInventoryItem, publishInventoryItem } from '@/lib/supabase/inventory-actions';
import { getSession } from '@/lib/supabase/auth-actions';
import { uploadCardPhotos } from '@/lib/supabase/storage-actions';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { Condition, InventoryType } from '@/types';

interface WizardPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface StepReviewState {
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
  condition: Condition | null;
  gradeCompany: string | null;
  gradeValue: string | null;
  certNumber: string | null;
  costBasis: number | null;
  price: number | null;
  spinPool: boolean;
  photos: string[];
  photoFiles: WizardPhoto[];
}

interface StepReviewProps {
  state: StepReviewState;
  updateState: (updates: Partial<StepReviewState>) => void;
}

interface CreateState {
  isLoading: boolean;
  error: string;
  success: boolean;
  itemId?: string;
  published?: boolean;
}

function getPhotoExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';

  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildInventoryTitle(state: StepReviewState) {
  const subject = cleanText(state.player);
  const setName = cleanText(state.setName);
  const cardNumber = cleanText(state.cardNumber);
  const titleParts = [
    subject,
    setName,
    cardNumber ? `#${cardNumber.replace(/^#/, '')}` : undefined,
  ].filter(Boolean);

  return titleParts.length > 0 ? titleParts.join(' ') : 'Incomplete card intake';
}

export default function StepReview({ state, updateState }: StepReviewProps) {
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

  // Price is already in cents from the cost step
  const displayPrice = state.price ? `$${(state.price / 100).toFixed(2)}` : 'Not set';
  const isMetadataIncomplete =
    !cleanText(state.player) || !cleanText(state.setName) || !cleanText(state.cardNumber);

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
      if (state.photoFiles.length === 0 && state.photos.length === 0) {
        throw new Error('Select at least one card photo before saving');
      }

      let photoUrls = state.photos;

      if (state.photoFiles.length > 0) {
        const uploadedPhotoUrls: string[] = [];

        for (const photo of state.photoFiles) {
          const extension = getPhotoExtension(photo.file);
          const filename = `card-photo-${Date.now()}-${crypto.randomUUID()}.${extension}`;
          const uploadResult = await uploadCardPhotos([
            {
              name: filename,
              base64: await readFileAsBase64(photo.file),
              contentType: photo.file.type || 'image/jpeg',
            },
          ]);

          if (!uploadResult.success || !uploadResult.urls?.[0]) {
            throw new Error(uploadResult.error || 'Photo upload failed');
          }

          uploadedPhotoUrls.push(uploadResult.urls[0]);
        }

        photoUrls = uploadedPhotoUrls;
        updateState({ photos: photoUrls, photoFiles: [] });
      }

      const result = await createInventoryItem(
        {
          type: state.type,
          title: buildInventoryTitle(state),
          player: cleanText(state.player),
          set_name: cleanText(state.setName),
          card_number: cleanText(state.cardNumber),
          year: state.year ?? undefined,
          rarity: cleanText(state.rarity) ?? undefined,
          condition: state.condition ?? undefined,
          grade_company: cleanText(state.gradeCompany) ?? undefined,
          grade_value: cleanText(state.gradeValue) ?? undefined,
          cert_number: cleanText(state.certNumber) ?? undefined,
          cost_basis: state.costBasis ?? undefined,
          price: state.price ?? 0,
          photos: photoUrls,
          quantity_on_hand: 1,
          spin_pool: state.spinPool,
        },
        userId
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create item');
      }

      const itemId =
        result.data &&
        typeof result.data === 'object' &&
        'id' in result.data &&
        typeof result.data.id === 'string'
          ? result.data.id
          : undefined;

      if (publishNow && itemId) {
        const publishResult = await publishInventoryItem(itemId, userId);

        if (!publishResult.success) {
          throw new Error(publishResult.error || 'Item was saved as a draft, but publishing failed');
        }
      }

      setCreateState({
        isLoading: false,
        error: '',
        success: true,
        itemId,
        published: publishNow,
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
        <h2 className="text-xl font-bold mb-2">
          {createState.published ? 'Card Published Successfully' : 'Draft Saved Successfully'}
        </h2>
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
              <p className="font-medium">{cleanText(state.player) ?? 'Not added'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Set:</span>
              <p className="font-medium">{cleanText(state.setName) ?? 'Not added'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Card #:</span>
              <p className="font-medium">{cleanText(state.cardNumber) ?? 'Not added'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Year:</span>
              <p className="font-medium">{state.year ?? 'Not added'}</p>
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
              <span className="text-muted-foreground">Selling Price:</span>
              <p className="font-bold text-lg text-red-600">
                {displayPrice}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Mystery Pool:</span>
              <p className="font-medium">{state.spinPool ? 'Included' : 'Not included'}</p>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Photos</p>
          <div className="text-sm">
            <span className="text-muted-foreground">Count:</span>
            <p className="font-medium">
              {state.photos.length + state.photoFiles.length} photo(s)
            </p>
          </div>
        </div>
      </div>

      {isMetadataIncomplete && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Details incomplete</p>
            <p className="text-sm text-amber-800 mt-1">
              This card can still be saved or published. Inventory will flag it
              until the missing player, set, or card number is filled in.
            </p>
          </div>
        </div>
      )}

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

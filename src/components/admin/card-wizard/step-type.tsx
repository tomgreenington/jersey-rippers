'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ImageIcon, Loader2, Maximize2, Sparkles, X } from 'lucide-react';
import { lookupCardFromPhoto } from '@/lib/card-photo-lookup';
import { InventoryType, Condition } from '@/types';

interface StepTypeState {
  photos: string[];
  photoFiles: {
    id: string;
    file: File;
    previewUrl: string;
  }[];
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
  price: number | null;
}

interface StepTypeProps {
  state: StepTypeState;
  updateState: (updates: Partial<StepTypeState>) => void;
  onNext: () => void;
}

const CONDITION_OPTIONS: Condition[] = [
  'Mint',
  'Near Mint',
  'Lightly Played',
  'Moderately Played',
  'Heavily Played',
  'Damaged',
];

const GRADE_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC'];

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

function yearFromText(value?: string) {
  const match = value?.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

export default function StepType({ state, updateState, onNext }: StepTypeProps) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupWarning, setLookupWarning] = useState('');
  const [lookupMatch, setLookupMatch] = useState('');
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const isSingle = state.type === 'single';
  const isSlab = state.type === 'slab';
  const hasTypeDetails = isSingle
    ? Boolean(state.condition)
    : isSlab
      ? Boolean(state.gradeCompany && state.gradeValue)
      : true;
  const canContinue = hasTypeDetails;
  const selectedPhotoFile = state.photoFiles[0]?.file;
  const referencePhoto = state.photoFiles[0]?.previewUrl ?? state.photos[0];

  const handlePhotoLookup = async () => {
    if (!selectedPhotoFile) return;

    setIsLookingUp(true);
    setLookupError('');
    setLookupWarning('');
    setLookupMatch('');

    try {
      const result = await lookupCardFromPhoto({
        base64: await readFileAsBase64(selectedPhotoFile),
        mediaType: selectedPhotoFile.type || 'image/jpeg',
      });

      if (!result.success || !result.extracted) {
        setLookupError(result.error || 'Could not read card photo');
        return;
      }

      const extracted = result.extracted;
      const matchedSetName = cleanText(extracted.set_name);
      const suggestedCardNumber = cleanText(extracted.card_number);
      const suggestedYear =
        extracted.year ??
        yearFromText(matchedSetName);

      updateState({
        player: cleanText(extracted.player) ?? state.player,
        setName: matchedSetName ?? cleanText(extracted.set_name) ?? state.setName,
        cardNumber: suggestedCardNumber ?? state.cardNumber,
        year: suggestedYear ?? state.year,
        team: cleanText(extracted.team) ?? state.team,
        sport: cleanText(extracted.sport) ?? state.sport,
        rarity: cleanText(extracted.rarity) ?? state.rarity,
        rookie: extracted.rookie ?? state.rookie,
        parallelType: cleanText(extracted.parallel_type) ?? state.parallelType,
        manufacturer: cleanText(extracted.manufacturer) ?? state.manufacturer,
      });

      if (extracted.confidence !== null && extracted.confidence !== undefined) {
        setLookupMatch(`Photo read confidence: ${extracted.confidence}%`);
      }

      if (result.warning) {
        setLookupWarning(result.warning);
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Photo Reference</h3>
          <p className="text-xs text-muted-foreground">
            Selected card image
          </p>
        </div>
        <button
          type="button"
          onClick={() => referencePhoto && setIsReferenceOpen(true)}
          disabled={!referencePhoto}
          className="relative mx-auto flex aspect-[3/4] w-24 items-center justify-center overflow-hidden rounded-md border border-border bg-muted transition hover:border-primary disabled:cursor-default disabled:hover:border-border lg:w-28"
        >
          {referencePhoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referencePhoto}
                alt="Uploaded card reference"
                className="h-full w-full object-contain"
              />
              <span className="absolute bottom-1 right-1 rounded bg-background/90 p-1 text-foreground shadow-sm">
                <Maximize2 className="h-3 w-3" />
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">No photo</span>
            </div>
          )}
        </button>
        <Button
          type="button"
          variant="outline"
          onClick={handlePhotoLookup}
          disabled={!selectedPhotoFile || isLookingUp}
          size="sm"
          className="w-full gap-2"
        >
          {isLookingUp ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isLookingUp ? 'Reading Photo...' : 'Suggest Info'}
        </Button>
        {lookupMatch && (
          <p className="rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
            {lookupMatch}
          </p>
        )}
        {lookupWarning && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            {lookupWarning}
          </p>
        )}
        {lookupError && (
          <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}
        </aside>

        <div className="space-y-6">
        {/* Card Information */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Card Information</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill what you know now. Missing set or card number details will be
              flagged as incomplete in inventory, but they will not block saving.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium block mb-2">Player/Subject</label>
              <Input
                placeholder="e.g., LeBron James"
                value={state.player}
                onChange={(e) => updateState({ player: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Set Name (Optional)</label>
              <Input
                placeholder="e.g., 2003-04 Upper Deck"
                value={state.setName}
                onChange={(e) => updateState({ setName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Card Number (Optional)</label>
              <Input
                placeholder="e.g., 23, #23/100"
                value={state.cardNumber}
                onChange={(e) => updateState({ cardNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Year (Optional)</label>
              <Input
                type="number"
                placeholder="e.g., 2003"
                value={state.year || ''}
                onChange={(e) => updateState({ year: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
          </div>
        </div>

        {/* Type Selection */}
        <div>
          <label className="text-sm font-medium block mb-3">Card Type</label>
          <div className="flex gap-3">
            {(['single', 'slab', 'sealed'] as InventoryType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  updateState({ type });
                  if (type === 'sealed') {
                    updateState({ condition: null, gradeCompany: null, gradeValue: null });
                  }
                }}
                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${
                  state.type === type
                    ? 'border-red-600 bg-red-50 text-red-900'
                    : 'border-muted hover:border-muted-foreground'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Condition/Grade Fields */}
        {isSingle && (
          <div>
            <label className="text-sm font-medium block mb-3">Condition</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITION_OPTIONS.map((cond) => (
                <button
                  key={cond}
                  onClick={() => updateState({ condition: cond })}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                    state.condition === cond
                      ? 'border-red-600 bg-red-50 text-red-900'
                      : 'border-muted hover:border-muted-foreground'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSlab && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Grade Company</label>
              <div className="flex gap-2">
                {GRADE_COMPANIES.map((company) => (
                  <button
                    key={company}
                    onClick={() => updateState({ gradeCompany: company })}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      state.gradeCompany === company
                        ? 'border-red-600 bg-red-50 text-red-900'
                        : 'border-muted hover:border-muted-foreground'
                    }`}
                  >
                    {company}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Grade Value</label>
                <Input
                  placeholder="e.g., 9.5, 10"
                  value={state.gradeValue || ''}
                  onChange={(e) => updateState({ gradeValue: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Cert Number</label>
                <Input
                  placeholder="e.g., 123456789"
                  value={state.certNumber || ''}
                  onChange={(e) => updateState({ certNumber: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sealed has no additional fields */}

        <div className="flex justify-end">
          <Button
            onClick={onNext}
            disabled={!canContinue}
            className="bg-red-600 hover:bg-red-700"
          >
            Continue to Cost
          </Button>
        </div>
        </div>
      </div>

      {isReferenceOpen && referencePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Card photo reference"
        >
          <button
            type="button"
            onClick={() => setIsReferenceOpen(false)}
            className="absolute right-4 top-4 rounded-md bg-background/95 p-2 text-foreground shadow-sm hover:bg-background"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close photo reference</span>
          </button>
          <div className="flex max-h-[88vh] max-w-4xl items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referencePhoto}
              alt="Enlarged uploaded card reference"
              className="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

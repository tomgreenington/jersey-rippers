'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InventoryType, Condition } from '@/types';

interface StepTypeProps {
  state: {
    type: InventoryType;
    condition: Condition | null;
    gradeCompany: string | null;
    gradeValue: string | null;
    certNumber: string | null;
  };
  updateState: (updates: any) => void;
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

export default function StepType({ state, updateState, onNext }: StepTypeProps) {
  const isSingle = state.type === 'single';
  const isSlab = state.type === 'slab';
  const canContinue = isSingle ? state.condition : isSlab ? state.gradeCompany && state.gradeValue : true;

  return (
    <div className="space-y-6">
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
  );
}

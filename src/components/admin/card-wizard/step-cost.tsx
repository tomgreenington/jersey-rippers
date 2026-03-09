'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StepCostProps {
  state: {
    costBasis: number | null;
  };
  updateState: (updates: any) => void;
  onNext: () => void;
}

export default function StepCost({ state, updateState, onNext }: StepCostProps) {
  const canContinue = state.costBasis !== null && state.costBasis >= 0;

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || value === '0') {
      updateState({ costBasis: null });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        updateState({ costBasis: numValue });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium block mb-2">Cost Basis (USD)</label>
        <p className="text-sm text-muted-foreground mb-3">What did you pay for this card?</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-medium">$</span>
          <Input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={state.costBasis ?? ''}
            onChange={handleCostChange}
            className="text-lg"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-red-600 hover:bg-red-700"
        >
          Continue to PSA Comps
        </Button>
      </div>
    </div>
  );
}

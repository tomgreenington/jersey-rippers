'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface StepCostState {
  price: number | null;
  spinPool: boolean;
}

interface StepCostProps {
  state: StepCostState;
  updateState: (updates: Partial<StepCostState>) => void;
  onNext: () => void;
}

export default function StepCost({ state, updateState, onNext }: StepCostProps) {
  const [priceInput, setPriceInput] = useState(
    state.price ? (state.price / 100).toFixed(2) : ''
  );
  const canContinue = state.price !== null && state.price > 0;

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPriceInput(value);

    if (value === '' || value === '.') {
      updateState({ price: null });
      return;
    }

    const numValue = Number(value);
    if (Number.isFinite(numValue) && numValue > 0) {
      updateState({ price: Math.round(numValue * 100) });
    } else {
      updateState({ price: null });
    }
  };

  const handlePriceBlur = () => {
    if (state.price && state.price > 0) {
      setPriceInput((state.price / 100).toFixed(2));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium block mb-2">Selling Price (USD)</label>
        <p className="text-sm text-muted-foreground mb-3">What should this card sell for?</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-medium">$</span>
          <Input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={priceInput}
            onChange={handlePriceChange}
            onBlur={handlePriceBlur}
            className="text-lg"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4">
        <Checkbox
          checked={state.spinPool}
          onCheckedChange={(checked) => {
            updateState({ spinPool: checked === true });
          }}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium">Include in $5 mystery pool</span>
          <span className="block text-sm text-muted-foreground">
            The card can still keep this listed price, but mystery purchases charge
            customers $5 and select from cards marked for the pool.
          </span>
        </span>
      </label>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-red-600 hover:bg-red-700"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}

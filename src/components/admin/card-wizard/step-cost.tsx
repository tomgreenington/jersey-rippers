'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StepCostProps {
  state: {
    price: number | null;
  };
  updateState: (updates: any) => void;
  onNext: () => void;
}

export default function StepCost({ state, updateState, onNext }: StepCostProps) {
  const canContinue = state.price !== null && state.price > 0;

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || value === '0') {
      updateState({ price: null });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // Convert to cents for internal storage
        updateState({ price: numValue * 100 });
      }
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
            value={state.price ? (state.price / 100).toFixed(2) : ''}
            onChange={handlePriceChange}
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
          Continue to Review
        </Button>
      </div>
    </div>
  );
}

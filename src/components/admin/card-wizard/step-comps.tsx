'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PSAComp } from '@/types';

interface StepCompsProps {
  state: {
    player: string;
    setName: string;
    cardNumber: string;
    year: number | null;
    gradeValue: string | null;
    type: 'single' | 'slab' | 'sealed';
    price: number | null;
    spinPool: boolean;
  };
  updateState: (updates: any) => void;
  onNext: () => void;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function parsePriceInput(value: string): number | null {
  if (!value) return null;
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return null;
  return Math.round(numValue * 100);
}

export default function StepComps({ state, updateState, onNext }: StepCompsProps) {
  const [comps, setComps] = useState<PSAComp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch comps on mount
  useEffect(() => {
    const fetchComps = async () => {
      try {
        const params = new URLSearchParams({
          player: state.player,
          set: state.setName,
          card: state.cardNumber,
          ...(state.year && { year: state.year.toString() }),
        });

        const response = await fetch(`/api/admin/psa-comps?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch PSA comps');
        }

        const data = await response.json();
        const compsData = data.comps || [];

        if (compsData.length === 0) {
          // No comps found - auto-assign to spin pool
          updateState({
            price: 32, // $0.32 in cents
            spinPool: true,
          });
        } else {
          // Comps found - pre-fill with average price of selected grade
          if (state.gradeValue) {
            const gradeValue = state.gradeValue;
            const matchingComp = compsData.find(
              (c: PSAComp) =>
                c.grade.includes(gradeValue) || c.grade.includes(`PSA ${gradeValue}`)
            );
            if (matchingComp?.average_price) {
              updateState({ price: matchingComp.average_price });
            }
          }
        }

        setComps(compsData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComps();
  }, [state.player, state.setName, state.cardNumber, state.year, state.gradeValue, updateState]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cents = parsePriceInput(e.target.value);
    updateState({ price: cents, spinPool: false });
  };

  const canContinue = state.price !== null && state.price >= 0;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error loading comps</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      ) : comps.length === 0 ? (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">No PSA auction data found</p>
              <p className="text-sm text-yellow-700 mt-1">
                This card has been automatically added to the spin pool at <strong>$0.32</strong>.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded border text-sm">
            <p>
              <span className="text-muted-foreground">Price:</span> <strong className="text-lg">$0.32</strong>
            </p>
            <p className="text-muted-foreground text-xs mt-2">Price is locked for spin pool cards</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium">PSA Auction Prices by Grade</p>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>Grade</TableHead>
                  <TableHead>Most Recent</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Pop</TableHead>
                  <TableHead>Pop Higher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comps.map((comp, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{comp.grade}</TableCell>
                    <TableCell>{formatPrice(comp.most_recent_price)}</TableCell>
                    <TableCell className="font-medium">{formatPrice(comp.average_price)}</TableCell>
                    <TableCell>{comp.population ?? '—'}</TableCell>
                    <TableCell>{comp.pop_higher ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Price Input */}
      <div>
        <label className="text-sm font-medium block mb-2">Selling Price (USD)</label>
        <div className="flex items-center gap-2">
          <span className="text-xl font-medium">$</span>
          <Input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={state.price === null ? '' : (state.price / 100).toFixed(2)}
            onChange={handlePriceChange}
            disabled={state.spinPool}
            className="text-lg"
          />
        </div>
        {state.spinPool && (
          <p className="text-xs text-muted-foreground mt-2">Price is locked for spin pool cards</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-red-600 hover:bg-red-700"
        >
          Continue to Photos
        </Button>
      </div>
    </div>
  );
}

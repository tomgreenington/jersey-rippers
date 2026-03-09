'use client';

import { useEffect, useRef, useState } from 'react';
import { searchCards, createCard } from '@/lib/supabase/card-actions';
import { enrichCard } from '@/lib/enrich-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import type { Card } from '@/types';

interface StepSearchProps {
  state: {
    cardId: string | null;
    player: string;
    year: number | null;
    setName: string;
    cardNumber: string;
    team: string | null;
    sport: string | null;
    position: string | null;
    rarity: string | null;
    rookie: boolean;
    parallelType: string | null;
    manufacturer: string | null;
  };
  updateState: (updates: any) => void;
  onNext: () => void;
}

export default function StepSearch({ state, updateState, onNext }: StepSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const cards = await searchCards(query);
      setResults(cards);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  const selectCard = (card: Card) => {
    updateState({
      cardId: card.id,
      player: card.player,
      year: card.year,
      setName: card.set_name,
      cardNumber: card.card_number,
      team: card.team,
      sport: card.sport,
      position: card.position,
      rarity: card.rarity,
      rookie: card.rookie,
      parallelType: card.parallel_type,
      manufacturer: card.manufacturer,
    });
    setQuery('');
    setResults([]);
  };

  const handleEnrich = async () => {
    if (!query.trim()) return;

    setIsEnriching(true);
    setEnrichError('');

    try {
      const result = await enrichCard(query);

      if (!result.success || !result.data) {
        setEnrichError(result.error || 'Failed to enrich card');
        setIsEnriching(false);
        return;
      }

      // Create the card in the database
      const cardResult = await createCard({
        player: result.data.player || '',
        year: result.data.year || new Date().getFullYear(),
        set_name: result.data.set_name || '',
        card_number: result.data.card_number || '',
        team: result.data.team,
        sport: result.data.sport,
        position: result.data.position,
        rarity: result.data.rarity,
        rookie: result.data.rookie,
        parallel_type: result.data.parallel_type,
        manufacturer: result.data.manufacturer,
      });

      if (!cardResult.success || !cardResult.data) {
        setEnrichError(cardResult.error || 'Failed to save card');
        setIsEnriching(false);
        return;
      }

      // Select the newly created card
      selectCard(cardResult.data);
    } catch (error) {
      setEnrichError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsEnriching(false);
    }
  };

  const canContinue = !!(state.player && state.setName && state.cardNumber);

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium">Search Card Database</label>
        <div className="flex gap-2 mt-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Player name, set name, card number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={handleEnrich}
            disabled={!query.trim() || isEnriching}
            variant="secondary"
          >
            {isEnriching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enriching...
              </>
            ) : (
              'Enrich'
            )}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {query.trim() && (
        <div>
          {isSearching ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{results.length} match(es) found</p>
              {results.map((card) => (
                <button
                  key={card.id}
                  onClick={() => selectCard(card)}
                  className="w-full p-3 text-left border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="font-medium">
                    {card.player} • {card.set_name} #{card.card_number}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {card.year} • {card.sport}
                    {card.team && ` • ${card.team}`}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground">No cards found</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Enrich" to add a new card</p>
            </div>
          )}
        </div>
      )}

      {/* Enrich Error */}
      {enrichError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{enrichError}</p>
          </div>
        </div>
      )}

      {/* Selected Card Preview */}
      {state.player && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-2">Selected Card</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
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
          <button
            onClick={() => setQuery('')}
            className="text-xs text-blue-600 hover:text-blue-700 mt-3 underline"
          >
            Change card
          </button>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-red-600 hover:bg-red-700"
        >
          Continue to Type & Grade
        </Button>
      </div>
    </div>
  );
}

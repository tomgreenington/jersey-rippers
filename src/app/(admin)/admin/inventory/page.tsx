'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronRight } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  player: string | null;
  set_name: string | null;
  card_number: string | null;
  type: string;
  price: number;
  status: string;
  photos: string[];
  spin_pool: boolean;
  quantity_on_hand: number;
  created_at: string;
}

function hasMissingDetails(item: InventoryItem) {
  return !item.player?.trim() || !item.set_name?.trim() || !item.card_number?.trim();
}

function getDetailLine(item: InventoryItem) {
  const parts = [
    item.set_name?.trim(),
    item.card_number?.trim() ? `#${item.card_number.trim().replace(/^#/, '')}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : 'Set and card number not added';
}

function getAdminStatusLabel(item: InventoryItem) {
  return hasMissingDetails(item) ? `${item.status} · incomplete` : item.status;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        // This will be a client call to a route handler since we can't use getServiceRoleClient in client
        const res = await fetch('/api/admin/inventory');
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load inventory');
          return;
        }

        setItems(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your card collection</p>
        </div>
        <Link href="/admin/inventory/new">
          <Button className="gap-2 bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Add Card
          </Button>
        </Link>
      </div>

      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
            <p className="mt-1 text-2xl font-bold">{items.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Listed</p>
            <p className="mt-1 text-2xl font-bold">
              {items.filter((item) => item.status === 'listed').length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Needs Details</p>
            <p className="mt-1 text-2xl font-bold">
              {items.filter(hasMissingDetails).length}
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-muted-foreground mb-4">No cards yet. Start by uploading your first card!</p>
          <Link href="/admin/inventory/new">
            <Button className="gap-2 bg-primary text-white">
              <Plus className="w-4 h-4" />
              Add Your First Card
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link key={item.id} href={`/admin/inventory/${item.id}`}>
              <div className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                {/* Photo */}
                <div className="relative w-full aspect-square bg-muted overflow-hidden">
                  {item.photos && item.photos[0] ? (
                    <Image
                      src={item.photos[0]}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No photo</p>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs font-medium">
                    {getAdminStatusLabel(item)}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {item.type}
                    </Badge>
                    {item.spin_pool && <Badge variant="secondary">Mystery pool</Badge>}
                    {hasMissingDetails(item) && (
                      <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                        Incomplete details
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{item.sku}</p>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {item.title || item.player || 'Incomplete card intake'}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">{getDetailLine(item)}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-primary">${(item.price / 100).toFixed(2)}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

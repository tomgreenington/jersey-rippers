'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getServiceRoleClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  player: string;
  set_name: string;
  price: number;
  status: string;
  photos: string[];
  created_at: string;
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
                    {item.status}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{item.sku}</p>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.player}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{item.set_name} #{item.title.split('#').pop()}</p>
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

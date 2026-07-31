import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';

export default function RecommendationCards({ recommendations = [], items = [] }) {
  const addItem = useCartStore((s) => s.addItem);
  const isViewOnly = useCartStore((s) => s.isViewOnly);

  if (!recommendations || recommendations.length === 0) return null;

  // Match AI recommendations with real items in menu catalog for accurate prices & IDs
  const resolvedRecs = recommendations
    .map((rec) => {
      const match = items.find(
        (i) =>
          i._id === rec._id ||
          i.name?.toLowerCase() === (rec.item_name || rec.name || '').toLowerCase()
      );

      if (match) {
        return {
          ...match,
          reason: rec.reason || 'Popular pairing',
        };
      }

      // If no exact name match, fallback only if price exists
      return rec.price ? { ...rec, name: rec.item_name || rec.name } : null;
    })
    .filter(Boolean);

  if (resolvedRecs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Sparkles size={14} />
        <span>Chef & AI Recommended Add-Ons</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {resolvedRecs.map((item, idx) => (
          <div
            key={item._id || idx}
            className="bg-card border border-border rounded-xl p-3 w-48 shrink-0 flex flex-col justify-between space-y-2"
          >
            <div>
              <h5 className="text-xs font-semibold text-foreground line-clamp-1">{item.name}</h5>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{item.reason || 'Popular pairing'}</p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-primary font-display">
                ₹{item.price ? item.price.toFixed(2) : '0.00'}
              </span>
              {!isViewOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addItem(item, 1)}
                  className="h-7 text-[10px] gap-1 px-2"
                >
                  <Plus size={12} /> Add
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

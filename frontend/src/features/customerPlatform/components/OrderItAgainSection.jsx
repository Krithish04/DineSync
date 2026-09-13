import React, { useEffect, useState } from 'react';
import { RotateCcw, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as customerApi from '../api/customerPlatform.api';

export default function OrderItAgainSection({ restaurantId, phone, onAddToCart }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId || !phone) {
      setHistory(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    customerApi
      .getGuestOrderHistory(restaurantId, phone)
      .then((res) => {
        if (isMounted) {
          setHistory(res);
        }
      })
      .catch((err) => {
        console.error('Failed loading guest order history for Order It Again:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [restaurantId, phone]);

  if (loading || !history || !history.hasHistory || !history.topFavoriteItems || history.topFavoriteItems.length === 0) {
    return null; // Return null when unverified or cold-start (no prior history)
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-primary/10 via-amber-500/10 to-transparent border border-primary/20 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
            <RotateCcw size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display text-foreground flex items-center gap-1.5">
              <span>Order It Again</span>
              <Sparkles size={13} className="text-amber-500 fill-amber-500" />
            </h3>
            <p className="text-[11px] text-muted-foreground">Your top favorite choices from past visits</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {history.topFavoriteItems.map((item, idx) => (
          <div
            key={item.menuItemId || idx}
            className="flex items-center justify-between p-3 rounded-xl bg-background/80 backdrop-blur-sm border border-border/60 hover:border-primary/40 transition-all shadow-2xs group"
          >
            <div className="space-y-0.5 pr-2 min-w-0">
              <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {item.itemName}
              </p>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-semibold text-primary">₹{item.unitPrice}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  Ordered {item.quantity}x
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => onAddToCart && onAddToCart(item)}
              className="h-8 px-2.5 text-xs font-semibold gap-1 rounded-lg shrink-0 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
            >
              <Plus size={14} />
              <span>Add</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

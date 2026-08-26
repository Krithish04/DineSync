import React from 'react';
import { Plus, Star, Clock, AlertTriangle, ShieldCheck, Flame, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';

export default function ChatRecommendationCard({ item, onSelectDetails }) {
  const { addItem, isViewOnly } = useCartStore();

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addItem(item, 1);
  };

  const isVeg = item.dietaryType === 'veg' || item.dietaryType === 'vegan' || item.dietaryType === 'jain';

  return (
    <div className="bg-slate-900/90 border border-amber-500/20 hover:border-amber-500/40 rounded-xl p-3 shadow-lg backdrop-blur-md transition-all flex flex-col justify-between w-64 shrink-0 text-white">
      {/* Image & Badges Overlay */}
      <div className="relative w-full h-28 rounded-lg overflow-hidden mb-2 bg-slate-800">
        <img
          src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {/* Dietary Tag Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 shadow bg-black/60 backdrop-blur-sm">
          <span className={`w-2 h-2 rounded-full ${isVeg ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span className="capitalize">{item.dietaryType || 'Veg'}</span>
        </div>

        {/* Prep Time Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-950/80 text-amber-300 flex items-center gap-1 backdrop-blur-sm">
          <Clock className="w-3 h-3" />
          <span>{item.preparationTime || 15} mins</span>
        </div>
      </div>

      {/* Item Title & Price */}
      <div>
        <div className="flex justify-between items-start gap-1">
          <h4 className="font-semibold text-sm text-slate-100 line-clamp-1">{item.name}</h4>
          <span className="font-bold text-amber-400 text-sm whitespace-nowrap">₹{item.price}</span>
        </div>

        {/* Rating & Spice Level */}
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {item.rating || 4.5}
          </span>
          {item.spiceLevel && item.spiceLevel !== 'none' && (
            <span className="flex items-center gap-0.5 text-orange-400 capitalize">
              <Flame className="w-3 h-3" />
              {item.spiceLevel}
            </span>
          )}
        </div>

        {/* Why Recommended AI Box */}
        {item.whyRecommended && (
          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-snug">
            <span className="font-semibold text-amber-400 block mb-0.5">✨ Why Recommended:</span>
            {item.whyRecommended}
          </div>
        )}

        {/* Allergen Warning Banner if applicable */}
        {item.allergenWarning && (
          <div className="mt-1.5 p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0 text-rose-400" />
            <span>Verify ingredients with staff</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectDetails && onSelectDetails(item)}
          className="flex-1 h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Info className="w-3 h-3 mr-1" />
          Details
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isViewOnly || !item.isAvailable}
          onClick={handleAddToCart}
          className="flex-1 h-8 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

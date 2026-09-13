import React from 'react';
import { Plus, Star, Clock, AlertTriangle, Flame, Info } from 'lucide-react';
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
    <div className="bg-white border border-amber-200/80 hover:border-amber-400 rounded-2xl p-3 shadow-md hover:shadow-lg transition-all flex flex-col justify-between w-64 shrink-0 text-slate-900">
      {/* Image & Badges Overlay */}
      <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2 bg-slate-100">
        <img
          src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {/* Dietary Tag Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-xs bg-white/90 text-slate-900 backdrop-blur-md border border-slate-200">
          <span className={`w-2 h-2 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="capitalize">{item.dietaryType || 'Veg'}</span>
        </div>

        {/* Prep Time Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/85 text-amber-300 flex items-center gap-1 backdrop-blur-md shadow-xs">
          <Clock className="w-3 h-3" />
          <span>{item.preparationTime || 15} mins</span>
        </div>
      </div>

      {/* Item Title & Price */}
      <div>
        <div className="flex justify-between items-start gap-1">
          <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.name}</h4>
          <span className="font-bold text-amber-600 text-sm whitespace-nowrap">₹{item.price}</span>
        </div>

        {/* Rating & Spice Level */}
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {item.rating || 4.5}
          </span>
          {item.spiceLevel && item.spiceLevel !== 'none' && (
            <span className="flex items-center gap-0.5 text-orange-600 font-medium capitalize">
              <Flame className="w-3 h-3 text-orange-500" />
              {item.spiceLevel}
            </span>
          )}
        </div>

        {/* Why Recommended AI Box */}
        {item.whyRecommended && (
          <div className="mt-2 p-2 rounded-xl bg-amber-50/90 border border-amber-200/90 text-[11px] text-amber-900 leading-snug">
            <span className="font-bold text-amber-700 block mb-0.5">✨ Why Recommended:</span>
            {item.whyRecommended}
          </div>
        )}

        {/* Allergen Warning Banner if applicable */}
        {item.allergenWarning && (
          <div className="mt-1.5 p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-700 flex items-center gap-1 font-medium">
            <AlertTriangle className="w-3 h-3 shrink-0 text-rose-500" />
            <span>Verify ingredients with staff</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectDetails && onSelectDetails(item)}
          className="flex-1 h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        >
          <Info className="w-3 h-3 mr-1" />
          Details
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isViewOnly || !item.isAvailable}
          onClick={handleAddToCart}
          className="flex-1 h-8 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

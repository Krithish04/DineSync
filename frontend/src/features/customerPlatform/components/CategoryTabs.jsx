import React from 'react';

/**
 * CategoryTabs — horizontal scrollable category selection bar
 */
export default function CategoryTabs({ categories = [], selectedCategory, onSelectCategory }) {
  return (
    <div className="w-full max-w-full border-b border-border/80 overflow-hidden">
      <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap py-1 scrollbar-none touch-pan-x px-1 font-semibold text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`pb-2.5 pt-1.5 min-h-[44px] transition-all flex-none min-w-max whitespace-nowrap touch-manipulation flex items-center justify-center ${
            selectedCategory === 'all'
              ? 'border-b-2 border-primary text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
          }`}
        >
          All Categories
        </button>

        {categories.map((cat) => (
          <button
            type="button"
            key={cat._id}
            onClick={() => onSelectCategory(cat._id)}
            className={`pb-2.5 pt-1.5 min-h-[44px] transition-all flex-none min-w-max whitespace-nowrap touch-manipulation flex items-center justify-center ${
              selectedCategory === cat._id
                ? 'border-b-2 border-primary text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}

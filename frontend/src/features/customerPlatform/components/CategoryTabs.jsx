import React from 'react';

/**
 * CategoryTabs — horizontal scrollable category selection bar
 */
export default function CategoryTabs({ categories = [], selectedCategory, onSelectCategory }) {
  return (
    <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-1 scrollbar-none touch-pan-x">
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        className={`px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition-all shrink-0 touch-manipulation ${
          selectedCategory === 'all'
            ? 'bg-primary text-primary-foreground shadow-md scale-105'
            : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
        }`}
      >
        All Items
      </button>

      {categories.map((cat) => (
        <button
          type="button"
          key={cat._id}
          onClick={() => onSelectCategory(cat._id)}
          className={`px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition-all shrink-0 touch-manipulation ${
            selectedCategory === cat._id
              ? 'bg-primary text-primary-foreground shadow-md scale-105'
              : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

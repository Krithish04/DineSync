import React from 'react';

/**
 * CategoryTabs — horizontal scrollable category selection bar
 */
export default function CategoryTabs({ categories = [], selectedCategory, onSelectCategory }) {
  return (
    <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-2 pt-1 scrollbar-none">
      <button
        onClick={() => onSelectCategory('all')}
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
          selectedCategory === 'all'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        All Items
      </button>

      {categories.map((cat) => (
        <button
          key={cat._id}
          onClick={() => onSelectCategory(cat._id)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
            selectedCategory === cat._id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

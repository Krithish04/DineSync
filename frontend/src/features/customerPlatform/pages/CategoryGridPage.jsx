import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  UtensilsCrossed,
  ArrowRight,
  ChevronRight,
  Flame,
  Coffee,
  Sparkles,
  ChefHat,
  GlassWater,
  Cake,
  Pizza,
  Utensils,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import LocationVerifier from '../components/LocationVerifier';
import RecommendationCards from '../components/RecommendationCards';
import QrCodeRequiredCard from '../components/QrCodeRequiredCard';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';

// Configurable threshold: if restaurant has fewer than MIN_GRID_CATEGORIES, auto-skip to full menu list
export const MIN_GRID_CATEGORIES = 3;

/**
 * Returns a category icon based on the category name
 */
function getCategoryIcon(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('starter') || lower.includes('appetizer') || lower.includes('snack')) return Flame;
  if (lower.includes('main') || lower.includes('curry') || lower.includes('gravy')) return Utensils;
  if (lower.includes('bread') || lower.includes('rotis') || lower.includes('naan')) return ChefHat;
  if (lower.includes('rice') || lower.includes('biryani') || lower.includes('thali')) return Pizza;
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('shake') || lower.includes('juice')) return GlassWater;
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('ice cream')) return Cake;
  if (lower.includes('tea') || lower.includes('coffee')) return Coffee;
  if (lower.includes('special') || lower.includes('chef')) return Sparkles;
  return UtensilsCrossed;
}

export default function CategoryGridPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const restaurantId = useCartStore((s) => s.restaurantId);
  const tableId = useCartStore((s) => s.tableId);
  const tableNumber = useCartStore((s) => s.tableNumber);

  const queryRestaurantId = searchParams.get('restaurantId');
  const queryTableId = searchParams.get('tableId');

  const effectiveRestId = restaurantId || queryRestaurantId;
  const hasContext = Boolean(effectiveRestId && (tableId || queryTableId));

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [aiRecs, setAiRecs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!effectiveRestId) {
      setIsLoading(false);
      return;
    }

    const fetchMenuData = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const data = await customerApi.getPublicMenu(effectiveRestId);

        if (!isMounted) return;

        const fetchedCategories = data?.categories || [];
        const fetchedItems = data?.items || [];
        const fetchedAiRecs = data?.aiRecommendations || [];

        // Calculate item count per category
        const categoriesWithCounts = fetchedCategories.map((cat) => {
          const count = fetchedItems.filter(
            (item) => (item.category?._id || item.category) === cat._id
          ).length;
          return {
            ...cat,
            itemCount: count,
          };
        });

        // Configurable Auto-Skip: if fewer than MIN_GRID_CATEGORIES exist, skip straight to full menu list
        if (categoriesWithCounts.length > 0 && categoriesWithCounts.length < MIN_GRID_CATEGORIES) {
          navigate('/menu/browse', { replace: true });
          return;
        }

        setCategories(categoriesWithCounts);
        setItems(fetchedItems);
        setAiRecs(fetchedAiRecs);
      } catch (err) {
        if (!isMounted) return;
        setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMenuData();

    return () => {
      isMounted = false;
    };
  }, [restaurantId, navigate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/menu/browse?search=${encodeURIComponent(searchQuery.trim())}`, {
        state: { fromCategories: true },
      });
    } else {
      navigate('/menu/browse', { state: { fromCategories: true } });
    }
  };

  const handleSelectCategory = (categoryId) => {
    navigate(`/menu/browse?category=${categoryId}`, {
      state: { fromCategories: true },
    });
  };

  const handleViewFullMenu = () => {
    navigate('/menu/browse', { state: { fromCategories: true } });
  };

  if (!hasContext) {
    return (
      <CustomerLayout title="Digital Menu">
        <QrCodeRequiredCard message="Please scan your table's QR code to view our live digital menu and explore categories." />
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="space-y-4 max-w-full overflow-hidden">
        {/* Single Unified Compact Status Banner */}
        <LocationVerifier tableNumber={tableNumber} />

        {/* Search Bar (Escape Hatch to instant search results) */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes, drinks or ingredients..."
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs transition-all min-h-[44px]"
            aria-label="Search menu items"
          />
        </form>

        {/* AI Recommendations Section */}
        {aiRecs.length > 0 && (
          <div className="pt-1">
            <RecommendationCards recommendations={aiRecs} items={items} />
          </div>
        )}

        {/* Browse By Category Grid Header */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UtensilsCrossed size={16} />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">
                Browse by Category
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {categories.length} Categories
            </span>
          </div>

          {/* Skeleton Loading State */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-card border border-border rounded-2xl p-4 h-24 animate-pulse flex flex-col justify-between shadow-xs"
                >
                  <div className="flex justify-between items-center">
                    <div className="w-9 h-9 rounded-xl bg-muted" />
                    <div className="w-4 h-4 rounded-full bg-muted" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : hasError ? (
            /* Partial Error Fallback */
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
              <p className="text-xs text-muted-foreground font-medium">
                Unable to load category counts right now.
              </p>
              <Button size="sm" onClick={handleViewFullMenu} className="text-xs font-bold rounded-xl px-5 h-10">
                View Full Menu
              </Button>
            </div>
          ) : (
            /* Category Grid Cards (1-col on 320px, 2-col on >=360px) */
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const IconComponent = getCategoryIcon(cat.name);
                return (
                  <button
                    type="button"
                    key={cat._id}
                    onClick={() => handleSelectCategory(cat._id)}
                    className="bg-card border border-border/80 hover:border-primary/50 active:border-primary rounded-2xl p-3.5 sm:p-4 text-left flex flex-col justify-between transition-all shadow-xs active:scale-[0.98] min-h-[94px] touch-manipulation group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <IconComponent size={18} />
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>

                    <div className="mt-2.5 min-w-0 w-full">
                      <h4 className="font-display text-sm sm:text-base font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                        {cat.name}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 truncate">
                        {cat.itemCount !== undefined ? `${cat.itemCount} items` : 'Explore dishes'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky/Bottom Full-Width View Full Menu Button (Escape Hatch) */}
        <div className="pt-3 pb-2">
          <Button
            onClick={handleViewFullMenu}
            variant="outline"
            className="w-full h-12 text-xs sm:text-sm font-bold border-primary/30 text-primary hover:bg-primary/5 active:bg-primary/10 rounded-2xl gap-2 shadow-xs touch-manipulation min-h-[48px]"
          >
            <span>View Full Menu</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}

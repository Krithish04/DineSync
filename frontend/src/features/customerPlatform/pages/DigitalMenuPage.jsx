import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import CustomerMenuCard from '../components/CustomerMenuCard';
import CategoryTabs from '../components/CategoryTabs';
import RecommendationCards from '../components/RecommendationCards';
import LocationVerifier from '../components/LocationVerifier';
import CustomerAuthModal from '../components/CustomerAuthModal';
import InMenuOrderTracker from '../components/InMenuOrderTracker';
import Loader from '@/components/common/Loader';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';

export default function DigitalMenuPage() {
  const [searchParams] = useSearchParams();
  const promptAuth = searchParams.get('promptAuth');

  const restaurantId = useCartStore((s) => s.restaurantId) || '66aa11112222333344445555';
  const branchId = useCartStore((s) => s.branchId);
  const tableHost = useCartStore((s) => s.tableHost);
  const isViewOnly = useCartStore((s) => s.isViewOnly);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [aiRecs, setAiRecs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Auto-open OTP modal if table is available and requested
  useEffect(() => {
    if (promptAuth === 'true' && !tableHost && !isViewOnly) {
      setIsAuthModalOpen(true);
    }
  }, [promptAuth, tableHost, isViewOnly]);

  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await customerApi.getPublicMenu(restaurantId, {
        branchId,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        dietary: dietaryFilter || undefined,
        search: searchQuery || undefined,
      });
      setCategories(data.categories || []);
      setItems(data.items || []);
      setAiRecs(data.aiRecommendations || []);
    } catch {
      /* non-fatal */
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, branchId, selectedCategory, dietaryFilter, searchQuery]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  return (
    <CustomerLayout title="Digital Menu">
      <div className="space-y-4">
        {/* Geolocation Verification Banner */}
        <LocationVerifier />

        {/* In-Menu Active Order Tracker with 10-Second Countdown Cancellation Timer */}
        <InMenuOrderTracker />

        {/* Search Bar & Dietary Filter Pills */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dishes, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <Filter size={13} className="text-muted-foreground shrink-0" />
            {['', 'Veg', 'Non Veg', 'Vegan', 'Jain'].map((diet) => (
              <button
                key={diet}
                onClick={() => setDietaryFilter(diet)}
                className={`px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
                  dietaryFilter === diet
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {diet || 'All Dietary'}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Tab Strip */}
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* AI Recommendations Section */}
        {aiRecs.length > 0 && (
          <div className="pt-2">
            <RecommendationCards recommendations={aiRecs} items={items} />
          </div>
        )}

        {/* Menu Items List */}
        {isLoading ? (
          <Loader />
        ) : items.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-xs">
            No dishes found matching your search or filters.
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {items.map((item) => (
              <CustomerMenuCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Customer OTP Login Modal */}
      <CustomerAuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </CustomerLayout>
  );
}

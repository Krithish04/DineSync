import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, AlertTriangle } from 'lucide-react';
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

import TableReservationLockModal from '../components/TableReservationLockModal';
import QrCodeRequiredCard from '../components/QrCodeRequiredCard';
import { Sparkles } from 'lucide-react';

export default function DigitalMenuPage() {
  const [searchParams] = useSearchParams();
  const promptAuth = searchParams.get('promptAuth');
  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const restaurantId = useCartStore((s) => s.restaurantId);
  const tableId = useCartStore((s) => s.tableId);
  const branchId = useCartStore((s) => s.branchId);
  const tableHost = useCartStore((s) => s.tableHost);
  const isViewOnly = useCartStore((s) => s.isViewOnly);
  const isInactiveTable = useCartStore((s) => s.isInactiveTable || s.tableStatus === 'Inactive');
  const tableNumber = useCartStore((s) => s.tableNumber);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [aiRecs, setAiRecs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [dietaryFilter, setDietaryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showFirstVisitHint, setShowFirstVisitHint] = useState(true);
  const [reservationLockInfo, setReservationLockInfo] = useState(null);

  // Check Table Reservation Lock Status (15-min buffer window)
  useEffect(() => {
    if (!restaurantId || !tableId) return;
    customerApi.checkTableReservationLock(restaurantId, tableId)
      .then((data) => {
        if (data?.isLocked) {
          setReservationLockInfo(data);
        }
      })
      .catch(() => {});
  }, [restaurantId, tableId]);

  // Debounce search input to reduce network calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Route Guarding: check for valid table + restaurant context
  const hasContext = Boolean(restaurantId && (tableId || searchParams.get('tableId')));

  // Auto-open OTP modal if table is available and requested
  useEffect(() => {
    if (promptAuth === 'true' && !tableHost && !isViewOnly && !isInactiveTable) {
      setIsAuthModalOpen(true);
    }
  }, [promptAuth, tableHost, isViewOnly, isInactiveTable]);

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const data = await customerApi.getPublicMenu(restaurantId, {
        branchId,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        dietary: dietaryFilter || undefined,
        search: debouncedSearchQuery || undefined,
      });
      setCategories(data.categories || []);
      setItems(data.items || []);
      setAiRecs(data.aiRecommendations || []);
    } catch {
      /* non-fatal */
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, branchId, selectedCategory, dietaryFilter, debouncedSearchQuery]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  if (!hasContext) {
    return (
      <CustomerLayout title="Digital Menu">
        <QrCodeRequiredCard message="Please scan your table's QR code to view our live digital menu and place orders." />
      </CustomerLayout>
    );
  }

  // Extract IDs of items shown in AI Recommendations scroller to deduplicate main list
  const recItemIds = new Set(
    aiRecs
      .map((rec) => {
        const match = items.find(
          (i) => i._id === rec._id || i.name?.toLowerCase() === (rec.item_name || rec.name || '').toLowerCase()
        );
        return match?._id || rec._id;
      })
      .filter(Boolean)
  );
  const mainListItems = aiRecs.length > 0 ? items.filter((item) => !recItemIds.has(item._id)) : items;

  return (
    <CustomerLayout title="Digital Menu">
      {/* Table Reservation Lock & Phone Verification Modal */}
      {reservationLockInfo?.isLocked && (
        <TableReservationLockModal
          lockInfo={reservationLockInfo}
          restaurantId={restaurantId}
          tableId={tableId}
          onUnlocked={() => setReservationLockInfo(null)}
        />
      )}

      <div className="space-y-3">
        {/* Inactive Table Banner (Conditional) */}
        {isInactiveTable && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-xl p-3 text-xs flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-amber-600" />
            <div>
              <span className="font-bold block text-amber-900 dark:text-amber-200">
                Table {tableNumber ? `#${tableNumber}` : ''} is Inactive
              </span>
              <span className="text-[11px] text-amber-700/90 dark:text-amber-300/90">
                Direct table ordering is turned off. You are browsing the digital menu in View-Only mode.
              </span>
            </div>
          </div>
        )}

        {/* Single Unified Compact Status Banner (Welcome + GPS Verification + Dismissible) */}
        <LocationVerifier tableNumber={tableNumber} />

        {/* In-Menu Active Order Tracker */}
        <InMenuOrderTracker />

        {/* Search Bar & Dietary Filter Pills */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dishes, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm border border-border rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto text-xs py-1 scrollbar-none pr-6">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            {['', 'Veg', 'Non Veg', 'Vegan', 'Jain'].map((diet) => (
              <button
                key={diet}
                type="button"
                onClick={() => setDietaryFilter(diet)}
                className={`px-3.5 py-2 min-h-[44px] rounded-full border transition-colors shrink-0 font-medium touch-manipulation flex items-center justify-center whitespace-nowrap text-xs ${
                  dietaryFilter === diet
                    ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
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

        {/* Menu Items List with Skeleton Loading State (Deduplicated against AI Recommended Add-Ons) */}
        {isLoading ? (
          <div className="space-y-3 pt-1">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-card border border-border rounded-2xl p-3.5 flex gap-3.5 animate-pulse shadow-xs">
                <div className="w-28 h-28 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-5 bg-muted rounded w-16" />
                    <div className="h-9 bg-muted rounded-xl w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-xs space-y-2 shadow-xs">
            <p className="font-bold text-sm text-foreground">No dishes found</p>
            <p className="text-muted-foreground">Try clearing your search query or switching dietary filters.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {mainListItems.map((item) => (
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

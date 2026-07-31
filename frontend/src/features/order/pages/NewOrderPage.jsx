import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, AlertCircle, Sparkles } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Loader from '@/components/common/Loader';
import CartPanel from '../components/CartPanel';
import useAuthStore from '@/features/auth/store/auth.store';
import * as menuItemApi from '@/features/menu/api/menuItem.api';
import * as categoryApi from '@/features/category/api/category.api';
import * as branchApi from '@/features/branch/api/branch.api';
import * as orderApi from '../api/order.api';

// Modifier selector overlay dialog
function ModifiersModal({ item, onAdd, onCancel }) {
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');

  const handleOptionSelect = (groupName, optionName, price) => {
    setSelectedModifiers((prev) => ({
      ...prev,
      [groupName]: { optionName, price },
    }));
  };

  const handleConfirm = () => {
    // Convert selectedModifiers map to schema list
    const modifiersList = Object.entries(selectedModifiers).map(([groupName, { optionName, price }]) => ({
      groupName,
      optionName,
      price,
    }));
    onAdd(modifiersList, specialInstructions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h4 className="font-bold text-sm text-foreground">Customize: {item.name}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">Select modifiers options and details.</p>
        </div>

        <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto">
          {item.modifierGroups?.map((group) => (
            <div key={group.name} className="space-y-2 border-b border-border/40 pb-3 last:border-none last:pb-0">
              <Label className="text-xs font-bold text-foreground capitalize">{group.name}</Label>
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const isSelected = selectedModifiers[group.name]?.optionName === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => handleOptionSelect(group.name, opt.name, opt.price)}
                      className={`text-xs px-2.5 py-1.5 rounded border transition-all font-medium ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {opt.name} (+₹{opt.price})
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="special-inst" className="text-xs font-bold text-foreground">Special Instructions</Label>
            <Input
              id="special-inst"
              placeholder="e.g. No onions, extra spicy..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/15">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handleConfirm} className="text-xs">Add to cart</Button>
        </div>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [dietaryType, setDietaryType] = useState('all');
  
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);
  const [activeModifyingItem, setActiveModifyingItem] = useState(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load Categories & Menu Items & Branches
  const loadPOSData = useCallback(async () => {
    setIsLoadingMenu(true);
    try {
      const [catResult, menuResult, branchResult] = await Promise.all([
        categoryApi.listCategories(restaurantId, { limit: 100 }),
        menuItemApi.listMenuItems(restaurantId, { limit: 150 }),
        branchApi.listBranches(restaurantId, { limit: 100 }),
      ]);
      setCategories(catResult.items || []);
      setMenuItems(menuResult.items || []);
      setBranches(branchResult.items || []);
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingMenu(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadPOSData();
    }
  }, [restaurantId, loadPOSData]);

  // Filters calculation
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category?._id === selectedCategory || item.category === selectedCategory;
      const matchesDiet = dietaryType === 'all' || item.dietaryType === dietaryType;
      return matchesSearch && matchesCategory && matchesDiet;
    });
  }, [menuItems, search, selectedCategory, dietaryType]);

  // Cart mutations
  const handleAddToCartClick = (item) => {
    if (item.modifierGroups?.length > 0) {
      setActiveModifyingItem(item);
    } else {
      handleAdd(item, [], '');
    }
  };

  const handleAdd = (item, modifiers, specialInstructions) => {
    setCart((prev) => {
      // Check if duplicate exists (same item + same modifiers)
      const existingIdx = prev.findIndex((cartItem) => {
        if (cartItem.menuItemId !== item._id) return false;
        if (cartItem.modifiers.length !== modifiers.length) return false;
        return cartItem.modifiers.every((m1) =>
          modifiers.some((m2) => m1.groupName === m2.groupName && m1.optionName === m2.optionName)
        );
      });

      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      }

      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          gst: item.gst || 0,
          quantity: 1,
          modifiers,
          specialInstructions,
        },
      ];
    });
    setActiveModifyingItem(null);
  };

  const handleUpdateQty = (idx, newQty) => {
    if (newQty < 1) return;
    setCart((prev) => {
      const copy = [...prev];
      copy[idx].quantity = newQty;
      return copy;
    });
  };

  const handleRemoveItem = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit/Checkout order
  const handlePlaceOrder = async (payload) => {
    setError('');
    setSuccess('');
    setIsPlacing(true);
    try {
      await orderApi.createOrder(restaurantId, payload);
      setSuccess('Order placed successfully.');
      setCart([]);
      setTimeout(() => navigate('/restaurant/orders/active'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Select tables and tap menu items to take customer orders."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: POS Menu Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-border/40 pb-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search menu catalogue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Diet toggle */}
            <div className="flex rounded border border-border overflow-hidden bg-muted/40 p-0.5 self-stretch sm:self-auto shrink-0">
              {['all', 'Veg', 'Non Veg', 'Vegan'].map((type) => (
                <button
                  key={type}
                  onClick={() => setDietaryType(type)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded capitalize transition-colors ${
                    dietaryType === type ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type === 'all' ? 'All' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Tab strip */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-muted text-muted-foreground'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat._id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border shrink-0 transition-all ${
                  selectedCategory === cat._id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:bg-muted text-muted-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          {isLoadingMenu ? (
            <Loader label="Loading catalogue..." />
          ) : filteredMenuItems.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded bg-muted/5">
              No menu items available matching current filters.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              {filteredMenuItems.map((item) => (
                <Card
                  key={item._id}
                  onClick={() => handleAddToCartClick(item)}
                  className="overflow-hidden hover:shadow transition-shadow border border-border flex flex-col justify-between cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full bg-muted relative">
                    {item.itemImage ? (
                      <img src={item.itemImage} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground/35">
                        <Sparkles className="h-8 w-8" />
                      </div>
                    )}
                    {/* Diet tag */}
                    <span className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm capitalize ${
                      item.dietaryType === 'Veg' ? 'bg-emerald-600' :
                      item.dietaryType === 'Non Veg' ? 'bg-rose-600' :
                      'bg-teal-600'
                    }`}>
                      {item.dietaryType}
                    </span>
                  </div>

                  <div className="p-3 space-y-1">
                    <h5 className="font-bold text-xs text-foreground truncate">{item.name}</h5>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</p>
                    <div className="flex justify-between items-center pt-1 mt-1 border-t border-border/40">
                      <span className="font-bold text-xs text-foreground">₹{item.price.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10">
                        <Plus className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Cart Panel */}
        <div className="lg:col-span-1 h-[680px]">
          {success && (
            <div className="mb-3 rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
              {success}
            </div>
          )}
          <CartPanel
            restaurantId={restaurantId}
            cartItems={cart}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            branches={branches}
            onSubmit={handlePlaceOrder}
            isPlacing={isPlacing}
          />
        </div>
      </div>

      {/* Modifiers modal selection wrapper */}
      {activeModifyingItem && (
        <ModifiersModal
          item={activeModifyingItem}
          onCancel={() => setActiveModifyingItem(null)}
          onAdd={(modifiers, instructions) => handleAdd(activeModifyingItem, modifiers, instructions)}
        />
      )}
    </RestaurantLayout>
  );
}

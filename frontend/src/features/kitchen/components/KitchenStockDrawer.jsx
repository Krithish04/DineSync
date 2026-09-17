import { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, XCircle, Send, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';

export default function KitchenStockDrawer({ isOpen, onClose, restaurantId }) {
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | '86'
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const [ingRes, menuRes] = await Promise.all([
        api.get(`/restaurants/${restaurantId}/inventory/ingredients`),
        api.get(`/restaurants/${restaurantId}/menu/items`),
      ]);

      if (ingRes.data?.data?.ingredients) {
        setIngredients(ingRes.data.data.ingredients);
      }
      if (menuRes.data?.data?.items) {
        setMenuItems(menuRes.data.data.items);
      }
    } catch (err) {
      console.error('[StockDrawer] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, restaurantId]);

  const handleStatusChange = async (ingredientId, newStatus) => {
    setActionLoadingId(ingredientId);
    try {
      const res = await api.patch(`/restaurants/${restaurantId}/inventory/ingredients/${ingredientId}/kitchen-status`, { status: newStatus });
      if (res.status === 200) {
        setMessage(`Status updated to ${newStatus}`);
        setTimeout(() => setMessage(null), 3000);
        await fetchData();
      }
    } catch (err) {
      console.error('[StockDrawer] Status update failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRequestReorder = async (ingredientId, ingName) => {
    setActionLoadingId(ingredientId);
    try {
      const res = await api.post(`/restaurants/${restaurantId}/inventory/ingredients/${ingredientId}/reorder-request`);
      if (res.status === 200) {
        setMessage(`Reorder request sent to manager for ${ingName}`);
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('[StockDrawer] Reorder request failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  const auto86Items = menuItems.filter((i) => !i.isAvailable || i.isAuto86);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end transition-all animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border-l-4 border-primary h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-muted/60 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 text-primary rounded-2xl border-2 border-primary/40">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Kitchen Stock & Auto-86</h2>
              <p className="text-sm font-bold text-muted-foreground">One-tap stock status & real-time guest menu availability</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b bg-muted/30 p-2 gap-2">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 py-3.5 px-4 font-black text-lg rounded-2xl transition-all flex items-center justify-center gap-2 min-h-[52px] ${
              activeTab === 'stock'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Package className="h-5 w-5" /> Tracked Stock ({ingredients.length})
          </button>
          <button
            onClick={() => setActiveTab('86')}
            className={`flex-1 py-3.5 px-4 font-black text-lg rounded-2xl transition-all flex items-center justify-center gap-2 min-h-[52px] ${
              activeTab === '86'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ShieldAlert className="h-5 w-5" /> Auto-86'd Items ({auto86Items.length})
          </button>
        </div>

        {/* Feedback Alert Message */}
        {message && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-500/50 rounded-2xl font-black text-center animate-in fade-in">
            ✓ {message}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground font-black text-lg gap-3">
              <RefreshCw className="h-7 w-7 animate-spin text-primary" /> Loading Kitchen Inventory...
            </div>
          ) : activeTab === 'stock' ? (
            ingredients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-bold">No ingredients registered yet.</div>
            ) : (
              ingredients.map((ing) => {
                const isOut = ing.currentStock <= 0;
                const isLow = !isOut && ing.currentStock <= (ing.reorderLevel || 5);
                const isOk = !isOut && !isLow;

                return (
                  <div
                    key={ing._id}
                    className={`p-5 rounded-3xl border-3 shadow-md space-y-3 transition-all ${
                      isOut
                        ? 'border-rose-600/60 bg-rose-500/10'
                        : isLow
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : 'border-emerald-500/40 bg-emerald-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-xl sm:text-2xl font-black text-foreground">{ing.ingredientName}</h4>
                        <p className="text-xs sm:text-sm font-mono font-bold text-muted-foreground">
                          Tracked: <span className="text-foreground font-black">{ing.currentStock} {ing.unit}</span> (Min: {ing.minimumStock || ing.reorderLevel || 5} {ing.unit})
                        </p>
                      </div>

                      {/* Primary Glanceable Status Badge */}
                      <div>
                        {isOut && (
                          <span className="px-4 py-2 rounded-full bg-rose-600 text-white font-black text-sm sm:text-base flex items-center gap-1.5 shadow-md">
                            <XCircle className="h-5 w-5" /> OUT OF STOCK
                          </span>
                        )}
                        {isLow && (
                          <span className="px-4 py-2 rounded-full bg-amber-500 text-slate-950 font-black text-sm sm:text-base flex items-center gap-1.5 shadow-md">
                            <AlertTriangle className="h-5 w-5" /> LOW STOCK
                          </span>
                        )}
                        {isOk && (
                          <span className="px-4 py-2 rounded-full bg-emerald-600 text-white font-black text-sm sm:text-base flex items-center gap-1.5 shadow-md">
                            <CheckCircle className="h-5 w-5" /> IN STOCK OK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* One-Tap Action Buttons (56px+ Touch Standard) */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/40">
                      <Button
                        size="lg"
                        className={`min-h-[52px] font-black text-sm rounded-2xl touch-manipulation ${
                          isOk ? 'bg-emerald-600 text-white' : 'variant-outline text-emerald-600 border-2 border-emerald-500/50 hover:bg-emerald-500/20'
                        }`}
                        disabled={actionLoadingId === ing._id}
                        onClick={() => handleStatusChange(ing._id, 'OK')}
                      >
                        ✓ Restock OK
                      </Button>
                      <Button
                        size="lg"
                        className={`min-h-[52px] font-black text-sm rounded-2xl touch-manipulation ${
                          isLow ? 'bg-amber-600 text-white' : 'variant-outline text-amber-600 border-2 border-amber-500/50 hover:bg-amber-500/20'
                        }`}
                        disabled={actionLoadingId === ing._id}
                        onClick={() => handleStatusChange(ing._id, 'Low')}
                      >
                        ⚠️ Mark Low
                      </Button>
                      <Button
                        size="lg"
                        className={`min-h-[52px] font-black text-sm rounded-2xl touch-manipulation ${
                          isOut ? 'bg-rose-600 text-white' : 'variant-outline text-rose-600 border-2 border-rose-500/50 hover:bg-rose-500/20'
                        }`}
                        disabled={actionLoadingId === ing._id}
                        onClick={() => handleStatusChange(ing._id, 'Out')}
                      >
                        🚨 Mark Out
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="min-h-[52px] font-black text-sm rounded-2xl touch-manipulation gap-1.5 border-2 border-primary/40 text-primary hover:bg-primary/20"
                        disabled={actionLoadingId === ing._id}
                        onClick={() => handleRequestReorder(ing._id, ing.ingredientName)}
                      >
                        <Send className="h-4 w-4" /> Reorder
                      </Button>
                    </div>
                  </div>
                );
              })
            )
          ) : auto86Items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-bold">No menu items currently 86'd. All dishes available for ordering!</div>
          ) : (
            auto86Items.map((item) => (
              <div key={item._id} className="p-5 rounded-3xl border-3 border-rose-500/40 bg-rose-500/10 space-y-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-foreground">{item.name}</h4>
                  <p className="text-sm font-bold text-muted-foreground">Price: ₹{item.price}</p>
                </div>
                <div className="text-right">
                  {item.auto86Reason === 'stock' ? (
                    <span className="px-4 py-2 rounded-full bg-rose-600 text-white font-black text-sm inline-flex items-center gap-1.5 shadow-md">
                      <ShieldAlert className="h-4 w-4" /> AUTO-86 (STOCK OUT)
                    </span>
                  ) : (
                    <span className="px-4 py-2 rounded-full bg-slate-800 text-amber-300 font-black text-sm inline-flex items-center gap-1.5 border border-amber-400">
                      ✋ MANUALLY 86'D BY STAFF
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

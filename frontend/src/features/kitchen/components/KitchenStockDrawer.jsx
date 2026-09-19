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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex justify-end transition-all animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">Kitchen Stock & Auto-86</h2>
              <p className="text-xs font-medium text-muted-foreground">One-tap stock status & real-time guest menu availability</p>
            </div>
          </div>
          <Button variant="outline" size="icon" className="rounded-xl h-9 w-9 border-border hover:bg-muted cursor-pointer" onClick={onClose}>
            <X className="h-4 w-4 text-foreground" />
          </Button>
        </div>

        {/* Tab Controls */}
        <div className="p-3 bg-muted/30 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60">
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex-1 h-9 px-3 text-xs sm:text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer ${
                activeTab === 'stock'
                  ? 'bg-primary text-primary-foreground shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              }`}
            >
              <Package className="h-4 w-4" /> Tracked Stock ({ingredients.length})
            </button>
            <button
              onClick={() => setActiveTab('86')}
              className={`flex-1 h-9 px-3 text-xs sm:text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer ${
                activeTab === '86'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              }`}
            >
              <ShieldAlert className="h-4 w-4" /> Auto-86'd Items ({auto86Items.length})
            </button>
          </div>
        </div>

        {/* Feedback Alert Message */}
        {message && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 rounded-xl font-extrabold text-xs text-center animate-in fade-in">
            ✓ {message}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground font-bold text-sm gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" /> Loading Kitchen Inventory...
            </div>
          ) : activeTab === 'stock' ? (
            ingredients.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-2 my-auto text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
                  <Package className="h-6 w-6" />
                </div>
                <p className="text-sm font-extrabold text-foreground">No Ingredients Registered</p>
                <p className="text-xs text-muted-foreground max-w-xs">Ingredients tracked in inventory will automatically appear here for one-tap kitchen stock controls.</p>
              </div>
            ) : (
              ingredients.map((ing) => {
                const isOut = ing.currentStock <= 0;
                const isLow = !isOut && ing.currentStock <= (ing.reorderLevel || 5);
                const isOk = !isOut && !isLow;

                return (
                  <div
                    key={ing._id}
                    className={`p-3.5 rounded-xl border shadow-2xs space-y-2.5 transition-all ${
                      isOut
                        ? 'border-rose-500/50 bg-rose-500/10'
                        : isLow
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-border/80 bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-sm sm:text-base font-extrabold text-foreground">{ing.ingredientName}</h4>
                        <p className="text-xs font-mono font-semibold text-muted-foreground">
                          Stock: <span className="text-foreground font-extrabold">{ing.currentStock} {ing.unit}</span> (Min: {ing.minimumStock || ing.reorderLevel || 5} {ing.unit})
                        </p>
                      </div>

                      {/* Primary Status Badge */}
                      <div>
                        {isOut && (
                          <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-xs flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> OUT OF STOCK
                          </span>
                        )}
                        {isLow && (
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> LOW STOCK
                          </span>
                        )}
                        {isOk && (
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> IN STOCK OK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-border/40">
                      <Button
                        size="sm"
                        className={`h-8 font-bold text-xs rounded-lg touch-manipulation cursor-pointer ${
                          isOk ? 'bg-emerald-600 text-white' : 'variant-outline text-emerald-600 border border-emerald-500/40 hover:bg-emerald-500/15'
                        }`}
                        disabled={actionLoadingId === ing._id}
                        onClick={() => handleStatusChange(ing._id, 'OK')}
                      >
                        ✓ Restock
                      </Button>
                      <Button
                        size="sm"
                        className={`h-8 font-bold text-xs rounded-lg touch-manipulation cursor-pointer ${
                          isLow ? 'bg-amber-600 text-white' : 'variant-outline text-amber-600 border border-amber-500/40 hover:bg-amber-500/15'
                        }`}
                        disabled={actionLoadingId === ing._id}
                        onClick={() => handleStatusChange(ing._id, 'Low')}
                      >
                        ⚠️ Low
                      </Button>
                      <Button
                        size="sm"
                        className={`h-8 font-bold text-xs rounded-lg touch-manipulation cursor-pointer ${
                          isOut ? 'bg-rose-600 text-white' : 'variant-outline text-rose-600 border border-rose-500/40 hover:bg-rose-500/15'
                        }`}
                        disabled={actionLoadingId === ing._id}
                        onClick={() => handleStatusChange(ing._id, 'Out')}
                      >
                        🚨 Out
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 font-bold text-xs rounded-lg touch-manipulation gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                        disabled={actionLoadingId === ing._id}
                        onClick={() => handleRequestReorder(ing._id, ing.ingredientName)}
                      >
                        <Send className="h-3.5 w-3.5" /> Reorder
                      </Button>
                    </div>
                  </div>
                );
              })
            )
          ) : auto86Items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-2 my-auto text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/60 border border-border flex items-center justify-center text-emerald-500">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-extrabold text-foreground">No Items Auto-86'd</p>
              <p className="text-xs text-muted-foreground max-w-xs">All menu items are currently available for customer ordering.</p>
            </div>
          ) : (
            auto86Items.map((item) => (
              <div key={item._id} className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">{item.name}</h4>
                  <p className="text-xs font-semibold text-muted-foreground">Price: ₹{item.price}</p>
                </div>
                <div className="text-right">
                  {item.auto86Reason === 'stock' ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-xs inline-flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" /> AUTO-86 (OUT)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-amber-300 font-extrabold text-xs inline-flex items-center gap-1 border border-amber-400/40">
                      ✋ MANUALLY 86'D
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

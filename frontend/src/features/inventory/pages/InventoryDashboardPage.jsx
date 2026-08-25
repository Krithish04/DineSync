import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShieldAlert, BadgeAlert, Coins, TrendingUp, AlertOctagon, Plus, Eye } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as inventoryApi from '../api/inventory.api';

export default function InventoryDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [lowStockList, setLowStockList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load KDS stats & low stock list
  const loadDashboardData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      // Stats
      const statsResult = await inventoryApi.getInventoryStats(restaurantId);
      setStats(statsResult);

      // Mapped items lists
      const ingredientsList = await inventoryApi.listIngredients(restaurantId);
      
      // Calculate low/out of stock items in JS
      const lowStock = (ingredientsList || []).filter(
        (ing) => ing.currentStock <= ing.reorderLevel || ing.currentStock <= 0
      );
      setLowStockList(lowStock);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory stats.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadDashboardData();
    }
  }, [restaurantId, loadDashboardData]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Overview of total stock valuation, procurement cycles, and alerts."
    >
      <div className="space-y-8">
        {/* Navigation Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Inventory Overview</h2>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/inventory/ingredients')} className="h-8">
              <Package className="h-4 w-4 mr-1.5" /> Ingredients List
            </Button>
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/inventory/suppliers')} className="h-8">
              <Eye className="h-4 w-4 mr-1.5" /> Suppliers Directory
            </Button>
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/inventory/purchases')} className="h-8">
              <Plus className="h-4 w-4 mr-1" /> Purchase Invoices
            </Button>
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/inventory/history')} className="h-8">
              <Eye className="h-4 w-4 mr-1.5" /> Audit History
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <Loader label="Opening stock manager..." />
        ) : (
          <>
            {/* KPI Counts Grid */}
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-5">
              {/* Total items */}
              <Card>
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Ingredients</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats?.totalIngredients || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              {/* Low stock */}
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Low Stock Alert</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats?.lowStockItems || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <ShieldAlert className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              {/* Out of stock */}
              <Card className="border-l-4 border-l-rose-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Out of Stock</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats?.outOfStockItems || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center">
                    <BadgeAlert className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Purchases (Month)</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">₹{stats?.purchasesThisMonth?.toFixed(2) || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Coins className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              {/* Valuation */}
              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Valuation Value</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">₹{stats?.inventoryValue?.toFixed(2) || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Low stock alerts widget list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertOctagon className="h-4.5 w-4.5 text-amber-600" />
                  Reorder Threshold Alerts
                </CardTitle>
                <CardDescription className="text-xs">Ingredients matching or dropping below critical safety margins.</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.totalIngredients === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded bg-muted/5">
                    No ingredients found in inventory. Go to 'Ingredients List' to add your first ingredient.
                  </p>
                ) : lowStockList.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded bg-muted/5">
                    Excellent! All ingredient stocks are safely above reorder levels.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                          <th className="pb-2 font-medium">Ingredient Name</th>
                          <th className="pb-2 font-medium">Category</th>
                          <th className="pb-2 font-medium text-center">Reorder level</th>
                          <th className="pb-2 font-medium text-center font-bold text-foreground">Current balance</th>
                          <th className="pb-2 font-medium text-center">Alert status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockList.map((ing) => (
                          <tr key={ing._id} className="border-b border-border last:border-none">
                            <td className="py-3 font-semibold text-foreground">{ing.ingredientName}</td>
                            <td className="py-3 text-muted-foreground">{ing.category}</td>
                            <td className="py-3 text-center font-mono">{ing.reorderLevel} {ing.unit}</td>
                            <td className="py-3 text-center font-mono font-bold text-foreground">
                              {ing.currentStock} {ing.unit}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                ing.currentStock <= 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {ing.currentStock <= 0 ? 'Out of Stock' : 'Low Stock'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}

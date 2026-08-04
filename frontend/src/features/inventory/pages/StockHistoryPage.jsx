import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ClipboardList, Info } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as inventoryApi from '../api/inventory.api';

export default function StockHistoryPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [transactions, setTransactions] = useState([]);
  
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load stock transactions history
  const loadStockHistory = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await inventoryApi.listStockTransactions(restaurantId);
      setTransactions(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stock transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadStockHistory();
    }
  }, [restaurantId, loadStockHistory]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = tx.ingredient?.ingredientName?.toLowerCase().includes(search.toLowerCase());
      const matchesType = selectedType === 'all' || tx.transactionType === selectedType;
      return matchesSearch && matchesType;
    });
  }, [transactions, search, selectedType]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Stock audit trail ledger tracking all procurements and waste updates."
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Inventory Transaction History</CardTitle>
          <CardDescription>Chronological logs of purchases, recipe consumptions, and manual stock updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Filtering bar */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 border-b border-border/40 pb-4">
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex h-9 w-full appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Transaction Types</option>
                <option value="Purchase">Purchase (+)</option>
                <option value="Consumption">Consumption (-)</option>
                <option value="Adjustment">Adjustment (+/-)</option>
                <option value="Waste">Waste (-)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ingredient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Transactions audit logs table */}
          {isLoading ? (
            <Loader label="Mapping transactions logs..." />
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
              <ClipboardList className="h-8 w-8 text-muted-foreground opacity-55" />
              <p className="text-sm text-muted-foreground">No stock transactions logged matching current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                    <th className="p-3 font-medium">Ingredient Name</th>
                    <th className="p-3 font-medium text-center">Type</th>
                    <th className="p-3 font-medium text-center">Delta Quantity</th>
                    <th className="p-3 font-medium flex-1">Reason / Notes</th>
                    <th className="p-3 font-medium">Handled By</th>
                    <th className="p-3 font-medium text-center">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isPositive = tx.quantity > 0;
                    return (
                      <tr key={tx._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                        <td className="p-3 font-semibold text-foreground">{tx.ingredient?.ingredientName}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                            tx.transactionType === 'Purchase' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            tx.transactionType === 'Consumption' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            tx.transactionType === 'Waste' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {tx.transactionType}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPositive ? `+${tx.quantity}` : tx.quantity}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal ml-1">
                            {tx.ingredient?.unit}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground flex items-center gap-1 min-w-[200px]">
                          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[220px]">{tx.reason || '-'}</span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {tx.createdBy?.name || 'KDS Automation'}
                        </td>
                        <td className="p-3 text-center text-muted-foreground font-mono">
                          {new Date(tx.createdAt).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}{' '}
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </RestaurantLayout>
  );
}

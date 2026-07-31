import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Sparkles, UserCheck, ShieldAlert, Award } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as customerApi from '../api/customer.api';

export default function LoyaltyDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load loyalty transactions history
  const loadLoyaltyHistory = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await customerApi.listLoyaltyTransactions(restaurantId);
      setTransactions(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load loyalty ledger.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadLoyaltyHistory();
    }
  }, [restaurantId, loadLoyaltyHistory]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        tx.customer?.phoneNumber?.includes(search) ||
        tx.customer?.customerId?.toLowerCase().includes(search.toLowerCase());
      const matchesType = selectedType === 'all' || tx.transactionType === selectedType;
      return matchesSearch && matchesType;
    });
  }, [transactions, search, selectedType]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Loyalty points ledger tracking points earned, redeemed, and birthday rewards."
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loyalty Transaction History</CardTitle>
          <CardDescription>Chronological logs of all customer points operations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Filtering row */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 border-b border-border/40 pb-4">
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex h-9 w-full appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Operations</option>
                <option value="Earned">Earned (+)</option>
                <option value="Redeemed">Redeemed (-)</option>
                <option value="Adjustment">Adjustment (+/-)</option>
                <option value="Referral">Referral (+)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patron name, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* History table */}
          {isLoading ? (
            <Loader label="Mapping transactions logs..." />
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded bg-muted/5">
              No loyalty point transactions found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                    <th className="p-3 font-medium">Patron Name</th>
                    <th className="p-3 font-medium text-center">Patron ID</th>
                    <th className="p-3 font-medium text-center">Operation</th>
                    <th className="p-3 font-medium text-center">Delta Points</th>
                    <th className="p-3 font-medium flex-1">Description Notes</th>
                    <th className="p-3 font-medium text-center">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isPos = tx.points > 0;
                    return (
                      <tr key={tx._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                        <td className="p-3">
                          <div>
                            <span className="font-semibold text-foreground">{tx.customer?.fullName}</span>
                            <p className="text-[10px] text-muted-foreground font-mono">{tx.customer?.phoneNumber}</p>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-muted-foreground">
                          {tx.customer?.customerId}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                            tx.transactionType === 'Earned' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            tx.transactionType === 'Redeemed' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            tx.transactionType === 'Referral' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {tx.transactionType}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={isPos ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPos ? `+${tx.points}` : tx.points} pts
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground truncate max-w-[240px]">
                          {tx.reason || '-'}
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

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw, Star, Landmark, Award, TrendingUp } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as customerApi from '../api/customer.api';

export default function CustomerDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load CRM details
  const loadDashboardData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const [statsRes, reportsRes] = await Promise.all([
        customerApi.getCustomerStats(restaurantId),
        customerApi.getCustomerReports(restaurantId),
      ]);
      setStats(statsRes);
      setReports(reportsRes);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer dashboard.');
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
      description="Customer metrics, loyalty tier counts, and repeat visit frequency."
    >
      <div className="space-y-8">
        {/* Navigation Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Customer Relationship Management (CRM)</h2>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/customers/list')} className="h-8">
              <Users className="h-4 w-4 mr-1.5" /> Customer Directory
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <Loader label="Opening guest database..." />
        ) : (
          <>
            {/* KPI Counts Grid */}
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Total Customers</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">{stats?.totalCustomers || 0}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Repeat Guests</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">{stats?.repeatCustomers || 0}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Total Loyalty Points</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">{stats?.totalLoyaltyPoints?.toLocaleString() || 0} pts</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Award className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Avg Customer Value</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">₹{stats?.avgLifetimeSpend?.toFixed(2) || 0}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Loyalty Tier Distribution */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h4 className="font-bold text-sm text-foreground">Loyalty Tier Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {reports?.tierBreakdown?.map((tier) => (
                    <div key={tier.name} className="border border-border/60 rounded-lg p-3 bg-muted/10 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{tier.name}</p>
                      <p className="text-lg font-bold text-foreground font-mono">{tier.count} members</p>
                    </div>
                  ))}
                  {(!reports?.tierBreakdown || reports.tierBreakdown.length === 0) && (
                    <p className="text-xs text-muted-foreground italic col-span-4 py-4 text-center">No tier data available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, ShoppingBag, DollarSign } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import ForecastCard from '../components/ForecastCard';
import PredictionTable from '../components/PredictionTable';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import ExecutionModeBadge from '../components/ExecutionModeBadge';
import ExportToolbar from '@/features/reports/components/ExportToolbar';
import * as aiApi from '../api/ai.api';

export default function InventoryForecastPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [inventory, setInventory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await aiApi.getInventoryForecast(restaurantId);
      setInventory(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory forecast.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const columns = [
    { header: 'Ingredient', accessor: 'ingredient_name' },
    {
      header: 'Current Stock',
      accessor: 'current_stock',
      render: (val, row) => <span className="font-semibold">{val} {row.unit}</span>,
    },
    { header: 'Predicted Low Stock Date', accessor: 'predicted_low_stock_date' },
    {
      header: 'Days Remaining',
      accessor: 'days_remaining',
      render: (val) => (
        <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
          val <= 1 ? 'bg-rose-100 text-rose-700' : val <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {val} {val === 1 ? 'day' : 'days'}
        </span>
      ),
    },
    {
      header: 'Rec. Purchase Qty',
      accessor: 'recommended_purchase_qty',
      render: (val, row) => `${val} ${row.unit}`,
      align: 'right',
    },
    {
      header: 'Est. Cost',
      accessor: 'estimated_cost',
      render: (val) => <span className="font-semibold text-primary">₹{val.toLocaleString('en-IN')}</span>,
      align: 'right',
    },
  ];

  return (
    <RestaurantLayout title="Inventory & Stock Forecast" description="AI predictions for low stock dates, ingredient consumption velocity, and purchase orders.">
      <div className="space-y-8 max-w-full">
        {/* Forecast Source & Execution Mode Badge Bar */}
        {inventory && (
          <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="space-y-0.5">
              <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider block">Depletion Engine Source</span>
              <p className="text-sm font-bold text-foreground">
                Ingredient consumption velocity &amp; reorder prediction mode
              </p>
            </div>
            <ExecutionModeBadge executionMode={inventory.execution_mode} />
          </div>
        )}

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && inventory && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ForecastCard
                title="Predicted Low Stock Items"
                value={inventory.low_stock_predictions?.length || 0}
                icon={AlertTriangle}
                confidence={0.91}
                variant="amber"
              />
              <ForecastCard
                title="Purchase Recommendations"
                value={inventory.purchase_recommendations?.length || 0}
                subtitle="Immediate reorder suggestions"
                icon={ShoppingBag}
                confidence={0.88}
                variant="primary"
              />
              <ForecastCard
                title="Est. Purchase Order Spend"
                value={inventory.total_estimated_purchase_cost}
                prefix="₹"
                icon={DollarSign}
                confidence={0.86}
                variant="purple"
              />
            </div>

            {/* Low Stock Date Predictions Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Stock Depletion & Low Stock Date Predictions</h3>
                  <ConfidenceIndicator confidence={0.90} />
                </div>
                <ExportToolbar
                  data={inventory.low_stock_predictions || []}
                  fileName="inventory-depletion-forecast"
                  title="Inventory Depletion Forecast"
                />
              </div>
              <PredictionTable columns={columns} data={inventory.low_stock_predictions || []} />
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}

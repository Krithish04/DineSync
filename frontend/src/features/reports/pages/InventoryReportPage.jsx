import { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, XCircle, ShoppingCart } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import KpiCard from '../components/KpiCard';
import ChartWidget from '../components/ChartWidget';
import ReportFilters from '../components/ReportFilters';
import ExportToolbar from '../components/ExportToolbar';
import * as reportsApi from '../api/reports.api';
import * as branchApi from '@/features/branch/api/branch.api';

const today = new Date();
const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const defaultEnd = today.toISOString().slice(0, 10);

export default function InventoryReportPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [filters, setFilters] = useState({ startDate: defaultStart, endDate: defaultEnd });
  const [branches, setBranches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [waste, setWaste] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch { /* non-fatal */ }
  }, [restaurantId]);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    const params = { startDate: filters.startDate, endDate: filters.endDate, branch: filters.branch || undefined };
    try {
      const [sumRes, purRes, conRes, wasteRes] = await Promise.all([
        reportsApi.getInventorySummary(restaurantId, params),
        reportsApi.getPurchaseSummary(restaurantId, params),
        reportsApi.getIngredientConsumption(restaurantId, params),
        reportsApi.getWasteAnalysis(restaurantId, params),
      ]);
      setSummary(sumRes);
      setPurchases(purRes || []);
      setConsumption(conRes || []);
      setWaste(wasteRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory data.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, filters]);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { loadData(); }, [loadData]);

  const purchaseChartData = purchases.map((p) => ({ date: p._id, spend: p.totalSpend, purchases: p.purchases }));
  const consumptionExport = consumption.map((c) => ({
    Ingredient: c.ingredientName,
    Unit: c.unit,
    'Total Consumed': c.totalConsumed,
    Transactions: c.transactions,
  }));
  const wasteExport = waste.map((w) => ({
    Ingredient: w.ingredientName,
    Unit: w.unit,
    'Total Wasted': w.totalWasted,
    Incidents: w.incidents,
    'Estimated Loss (₹)': w.estimatedLoss?.toFixed(2),
  }));

  return (
    <RestaurantLayout title="Inventory Reports" description="Stock levels, purchase trends, consumption, and waste analytics.">
      <div className="space-y-6 max-w-full">
        <ReportFilters filters={filters} onChange={setFilters} branches={branches} />

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && summary && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="Total Ingredients" value={summary.totalIngredients} icon={Package} colorClass="text-primary" bgClass="bg-primary/10" />
              <KpiCard title="Low Stock Items" value={summary.lowStock?.length || 0} icon={AlertTriangle} colorClass="text-amber-600" bgClass="bg-amber-50" />
              <KpiCard title="Out of Stock" value={summary.outOfStock?.length || 0} icon={XCircle} colorClass="text-rose-600" bgClass="bg-rose-50" />
              <KpiCard title="Inventory Value" value={summary.totalInventoryValue} prefix="₹" icon={ShoppingCart} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
            </div>

            {/* Purchase Timeline */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Purchase Spend Timeline</h2>
              <ChartWidget
                type="bar"
                data={purchaseChartData}
                xKey="date"
                dataKeys={[{ key: 'spend', label: 'Spend (₹)', color: '#c2440f' }]}
                height={240}
                emptyLabel="No purchase data for the selected period."
              />
            </div>

            {/* Out of Stock + Low Stock lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle size={14} className="text-rose-500" />
                  <h2 className="text-sm font-semibold text-foreground">Out of Stock</h2>
                </div>
                {summary.outOfStock.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-700 text-center font-medium">✓ No out-of-stock items</div>
                ) : (
                  <div className="bg-card border border-rose-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-rose-50"><tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-rose-700">Ingredient</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-rose-700">Stock</th>
                      </tr></thead>
                      <tbody>
                        {summary.outOfStock.map((i, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-4 py-2.5 font-medium">{i.name}</td>
                            <td className="px-4 py-2.5 text-right text-rose-600 font-semibold">{i.current} {i.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <h2 className="text-sm font-semibold text-foreground">Low Stock</h2>
                </div>
                {summary.lowStock.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-700 text-center font-medium">✓ No low-stock items</div>
                ) : (
                  <div className="bg-card border border-amber-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-amber-50"><tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-amber-700">Ingredient</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-amber-700">Current</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-amber-700">Reorder At</th>
                      </tr></thead>
                      <tbody>
                        {summary.lowStock.map((i, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-4 py-2.5 font-medium">{i.name}</td>
                            <td className="px-4 py-2.5 text-right text-amber-600 font-semibold">{i.current} {i.unit}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{i.reorderLevel} {i.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Consumption + Waste tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Ingredient Consumption</h2>
                  <ExportToolbar data={consumptionExport} fileName="ingredient-consumption" title="Ingredient Consumption Report" />
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ingredient</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Consumed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumption.length === 0 ? (
                        <tr><td colSpan={2} className="px-4 py-6 text-center text-sm text-muted-foreground">No consumption data.</td></tr>
                      ) : consumption.map((c, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2.5 font-medium">{c.ingredientName}</td>
                          <td className="px-4 py-2.5 text-right">{c.totalConsumed} {c.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Waste Analysis</h2>
                  <ExportToolbar data={wasteExport} fileName="waste-analysis" title="Waste Analysis Report" />
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ingredient</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Wasted</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Est. Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waste.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">No waste records.</td></tr>
                      ) : waste.map((w, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2.5 font-medium">{w.ingredientName}</td>
                          <td className="px-4 py-2.5 text-right text-rose-600">{w.totalWasted} {w.unit}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">₹{w.estimatedLoss?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}

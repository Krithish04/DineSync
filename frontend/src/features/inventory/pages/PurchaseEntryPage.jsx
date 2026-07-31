import { useState, useEffect, useCallback } from 'react';
import { Plus, List, Clipboard, ArrowLeft } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import PurchaseForm from '../components/PurchaseForm';
import useAuthStore from '@/features/auth/store/auth.store';
import * as inventoryApi from '../api/inventory.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function PurchaseEntryPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [purchases, setPurchases] = useState([]);
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load baseline details
  const loadProcurementDetails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [pList, bList, sList, iList] = await Promise.all([
        inventoryApi.listPurchases(restaurantId),
        branchApi.listBranches(restaurantId, { limit: 100 }),
        inventoryApi.listSuppliers(restaurantId),
        inventoryApi.listIngredients(restaurantId),
      ]);
      setPurchases(pList || []);
      setBranches(bList.items || []);
      setSuppliers(sList || []);
      setIngredients(iList || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase invoices.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadProcurementDetails();
    }
  }, [restaurantId, loadProcurementDetails]);

  // Submit invoice
  const handlePurchaseSubmit = async (payload) => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await inventoryApi.createPurchase(restaurantId, payload);
      setSuccess('Purchase invoice submitted and ingredients stocks increased.');
      setIsFormOpen(false);
      loadProcurementDetails();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit purchase invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Record supplier invoices and increase ingredient stocks."
    >
      <div className="space-y-6">
        {/* Toggle Form / List view */}
        {isFormOpen ? (
          <div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold mb-4"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Invoices List
            </button>

            <Card className="max-w-4xl border border-border">
              <CardHeader>
                <CardTitle>New Purchase Invoice</CardTitle>
                <CardDescription>Enter supplier invoice details. Ingredient stocks will be added automatically.</CardDescription>
              </CardHeader>
              <CardContent>
                <PurchaseForm
                  restaurantId={restaurantId}
                  branches={branches}
                  suppliers={suppliers}
                  ingredients={ingredients}
                  onSubmit={handlePurchaseSubmit}
                  onCancel={() => setIsFormOpen(false)}
                  isSaving={isSaving}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
              <div>
                <CardTitle>Procurement Invoices</CardTitle>
                <CardDescription>Invoice sheets from suppliers.</CardDescription>
              </div>
              <Button size="xs" onClick={() => setIsFormOpen(true)} className="h-8">
                <Plus className="h-4 w-4 mr-1" /> New Purchase Entry
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notifications */}
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                  {success}
                </div>
              )}

              {isLoading ? (
                <Loader label="Loading invoice history..." />
              ) : purchases.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
                  <Clipboard className="h-8 w-8 text-muted-foreground opacity-55" />
                  <p className="text-sm text-muted-foreground">No purchase invoices registered yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg bg-card">
                  <table className="w-full text-xs text-left min-w-[650px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                        <th className="p-3 font-medium">Purchase Number</th>
                        <th className="p-3 font-medium">Supplier</th>
                        <th className="p-3 font-medium">Invoice Number</th>
                        <th className="p-3 font-medium text-center">Items Purchased</th>
                        <th className="p-3 font-medium text-right">Invoice Amount (₹)</th>
                        <th className="p-3 font-medium text-center">Payment Status</th>
                        <th className="p-3 font-medium text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p) => (
                        <tr key={p._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                          <td className="p-3">
                            <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                              {p.purchaseNumber}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-foreground">{p.supplier?.supplierName}</td>
                          <td className="p-3 text-muted-foreground font-mono">{p.invoiceNumber || '-'}</td>
                          <td className="p-3 text-center text-muted-foreground">{p.items?.length || 0} ingredients</td>
                          <td className="p-3 text-right font-mono font-semibold text-foreground">
                            ₹{p.totalAmount.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                              p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              p.paymentStatus === 'Partial' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {p.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {new Date(p.purchaseDate).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RestaurantLayout>
  );
}

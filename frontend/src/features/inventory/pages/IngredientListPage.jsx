import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, FileSpreadsheet, Pencil, Trash2, ShieldAlert, BadgeAlert } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import useAuthStore from '@/features/auth/store/auth.store';
import * as inventoryApi from '../api/inventory.api';

// Create/Edit Ingredient Dialog
function IngredientModal({ suppliers = [], initialData = null, onSubmit, onCancel, isSaving = false }) {
  const isEditMode = !!initialData;
  const [form, setForm] = useState({
    ingredientName: '',
    category: 'General',
    unit: 'kg',
    currentStock: 0,
    minimumStock: 0,
    maximumStock: 0,
    reorderLevel: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    supplier: '',
    expiryDate: '',
    barcode: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm({
        ingredientName: initialData.ingredientName || '',
        category: initialData.category || 'General',
        unit: initialData.unit || 'kg',
        currentStock: initialData.currentStock || 0,
        minimumStock: initialData.minimumStock || 0,
        maximumStock: initialData.maximumStock || 0,
        reorderLevel: initialData.reorderLevel || 0,
        purchasePrice: initialData.purchasePrice || 0,
        sellingPrice: initialData.sellingPrice || 0,
        supplier: initialData.supplier?._id || initialData.supplier || '',
        expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate).toISOString().slice(0, 10) : '',
        barcode: initialData.barcode || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['currentStock', 'minimumStock', 'maximumStock', 'reorderLevel', 'purchasePrice', 'sellingPrice'].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.ingredientName.trim()) return setError('Ingredient name is required.');
    if (!form.unit.trim()) return setError('Unit of measurement is required.');
    if (form.purchasePrice < 0) return setError('Purchase price cannot be negative.');

    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-border bg-muted/20">
          <h4 className="font-bold text-sm text-foreground">
            {isEditMode ? `Edit Ingredient: ${form.ingredientName}` : 'Add New Ingredient'}
          </h4>
        </div>

        <form onSubmit={handleFormSubmit} className="p-4 space-y-4 max-h-[480px] overflow-y-auto">
          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ingredientName">Ingredient Name *</Label>
              <Input
                id="ingredientName"
                name="ingredientName"
                value={form.ingredientName}
                onChange={handleChange}
                placeholder="e.g. Fresh Paneer, Refined Flour"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. Dairy, Flour, Spices"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unit">Measurement Unit *</Label>
              <Input
                id="unit"
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="e.g. kg, L, pcs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input
                id="currentStock"
                name="currentStock"
                type="number"
                min="0"
                step="any"
                disabled={isEditMode}
                value={form.currentStock}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reorderLevel">Reorder level</Label>
              <Input
                id="reorderLevel"
                name="reorderLevel"
                type="number"
                min="0"
                step="any"
                value={form.reorderLevel}
                onChange={handleChange}
                placeholder="e.g. 5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="minimumStock">Minimum stock</Label>
              <Input
                id="minimumStock"
                name="minimumStock"
                type="number"
                min="0"
                step="any"
                value={form.minimumStock}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maximumStock">Maximum stock</Label>
              <Input
                id="maximumStock"
                name="maximumStock"
                type="number"
                min="0"
                step="any"
                value={form.maximumStock}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purchasePrice">Purchase Price (₹) *</Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                min="0"
                step="any"
                value={form.purchasePrice}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="supplier">Default Supplier</Label>
              <select
                id="supplier"
                name="supplier"
                value={form.supplier}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">No Supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.supplierName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                name="expiryDate"
                type="date"
                value={form.expiryDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <Button variant="outline" size="sm" type="button" onClick={onCancel} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" type="submit" isLoading={isSaving} className="text-xs">
              {isEditMode ? 'Save Changes' : 'Create Ingredient'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IngredientListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEditData, setActiveEditData] = useState(null);
  
  const [activeAdjustItem, setActiveAdjustItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load suppliers
  const loadSuppliers = useCallback(async () => {
    try {
      const supplierList = await inventoryApi.listSuppliers(restaurantId);
      setSuppliers(supplierList || []);
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load ingredients list
  const loadIngredients = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await inventoryApi.listIngredients(restaurantId);
      setIngredients(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ingredients.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadSuppliers();
      loadIngredients();
    }
  }, [restaurantId, loadSuppliers, loadIngredients]);

  // Ingredient mutation callbacks
  const handleModalSubmit = async (formPayload) => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      if (activeEditData) {
        await inventoryApi.updateIngredient(restaurantId, activeEditData._id, formPayload);
        setSuccess('Ingredient updated successfully.');
      } else {
        await inventoryApi.createIngredient(restaurantId, formPayload);
        setSuccess('Ingredient created successfully.');
      }
      setIsModalOpen(false);
      setActiveEditData(null);
      loadIngredients();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit ingredient.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustSubmit = async (adjustPayload) => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await inventoryApi.adjustStock(restaurantId, adjustPayload);
      setSuccess('Stock adjusted successfully.');
      setActiveAdjustItem(null);
      loadIngredients();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust stock.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteIngredient = async (ingId) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?')) return;
    try {
      await inventoryApi.deleteIngredient(restaurantId, ingId);
      setSuccess('Ingredient deleted successfully.');
      loadIngredients();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete ingredient.');
    }
  };

  // CSV Export
  const handleCsvExport = () => {
    const headers = ['Ingredient Name', 'Category', 'Unit', 'Current Stock', 'Min Stock', 'Reorder Level', 'Purchase Price', 'Supplier'];
    const rows = filteredIngredients.map((ing) => [
      `"${ing.ingredientName}"`,
      `"${ing.category}"`,
      `"${ing.unit}"`,
      ing.currentStock,
      ing.minimumStock,
      ing.reorderLevel,
      ing.purchasePrice,
      `"${ing.supplier?.supplierName || 'N/A'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ingredients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Low stock and out of stock counts
  const { lowStockCount, outOfStockCount } = useMemo(() => {
    let low = 0;
    let out = 0;
    ingredients.forEach((ing) => {
      if (ing.currentStock <= 0) {
        out++;
      } else if (ing.currentStock <= ing.reorderLevel) {
        low++;
      }
    });
    return { lowStockCount: low, outOfStockCount: out };
  }, [ingredients]);

  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Search and low-stock filter
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchesSearch = ing.ingredientName.toLowerCase().includes(search.toLowerCase()) ||
                            ing.category?.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (showLowStockOnly) {
        return ing.currentStock <= ing.reorderLevel || ing.currentStock <= 0;
      }
      return true;
    });
  }, [ingredients, search, showLowStockOnly]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Stock list sheet, safety reorder limits, and manual audits."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Ingredients Inventory</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Directory of all ingredients, prices, and unit stocks.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs" variant="outline" onClick={handleCsvExport} className="min-h-[44px] px-3.5 touch-manipulation font-medium text-xs">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> CSV Export
            </Button>
            <Button size="xs" onClick={() => {
              setActiveEditData(null);
              setIsModalOpen(true);
            }} className="min-h-[44px] px-4 touch-manipulation font-bold text-xs bg-[#b23c17] hover:bg-[#963213] text-white">
              <Plus className="h-4 w-4 mr-1" /> Add Ingredient
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Low-Stock Alert Header Banner */}
          {(outOfStockCount > 0 || lowStockCount > 0) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Stock Attention Required</h4>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                    {outOfStockCount > 0 && <span className="font-semibold text-rose-700 dark:text-rose-400 mr-2">{outOfStockCount} Out of Stock</span>}
                    {lowStockCount > 0 && <span>{lowStockCount} Below Reorder Threshold</span>}
                  </p>
                </div>
              </div>
              <Button
                variant={showLowStockOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLowStockOnly((prev) => !prev)}
                className={`min-h-[44px] px-4 text-xs font-semibold touch-manipulation shrink-0 border-amber-400 ${
                  showLowStockOnly ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-white/80 hover:bg-white text-amber-900'
                }`}
              >
                {showLowStockOnly ? 'Show All Items' : 'Filter Low Stock'}
              </Button>
            </div>
          )}

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

          {/* Filtering bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ingredients by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showLowStockOnly ? "secondary" : "outline"}
                onClick={() => setShowLowStockOnly((prev) => !prev)}
                className={`min-h-[44px] px-4 text-xs font-semibold touch-manipulation ${
                  showLowStockOnly ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200' : ''
                }`}
              >
                <ShieldAlert className="h-4 w-4 mr-1.5 text-amber-600" />
                Low Stock Only {lowStockCount + outOfStockCount > 0 && `(${lowStockCount + outOfStockCount})`}
              </Button>
            </div>
          </div>

          {/* Table display */}
          {isLoading ? (
            <Loader label="Mapping stock ledger..." />
          ) : filteredIngredients.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded-xl bg-muted/5">
              {showLowStockOnly ? 'No low stock ingredients matching filter.' : 'No ingredients created yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl bg-card shadow-sm">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 font-bold">Ingredient Name</th>
                    <th className="p-3.5 font-bold">Category</th>
                    <th className="p-3.5 font-bold text-center">Unit</th>
                    <th className="p-3.5 font-bold text-center">Current Stock</th>
                    <th className="p-3.5 font-bold text-center">Reorder limit</th>
                    <th className="p-3.5 font-bold text-right">Cost Price (₹)</th>
                    <th className="p-3.5 font-bold">Default Supplier</th>
                    <th className="p-3.5 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredIngredients.map((ing) => {
                    const isOutOfStock = ing.currentStock <= 0;
                    const isLowStock = ing.currentStock <= ing.reorderLevel && !isOutOfStock;
                    return (
                      <tr key={ing._id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3.5 font-bold text-foreground">{ing.ingredientName}</td>
                        <td className="p-3.5 text-muted-foreground">{ing.category}</td>
                        <td className="p-3.5 text-center font-mono text-muted-foreground">{ing.unit}</td>
                        <td className="p-3.5 text-center">
                          <span className={`font-mono font-bold mr-2 text-sm ${
                            isOutOfStock ? 'text-rose-600 dark:text-rose-400' : isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                          }`}>
                            {ing.currentStock}
                          </span>
                          {isOutOfStock && (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <BadgeAlert className="h-3 w-3" /> Out of Stock
                            </span>
                          )}
                          {isLowStock && (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <ShieldAlert className="h-3 w-3" /> Low Stock
                            </span>
                          )}
                          {!isOutOfStock && !isLowStock && (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono text-muted-foreground">{ing.reorderLevel}</td>
                        <td className="p-3.5 text-right font-mono font-semibold text-foreground">
                          ₹{ing.purchasePrice?.toFixed(2) || '0.00'}
                        </td>
                        <td className="p-3.5 text-muted-foreground truncate max-w-[130px]">
                          {ing.supplier?.supplierName || 'N/A'}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] min-w-[70px] text-xs font-semibold px-3 touch-manipulation"
                              onClick={() => setActiveAdjustItem(ing)}
                            >
                              Adjust
                            </Button>
                            <Button
                              variant="ghost"
                              className="min-h-[44px] min-w-[44px] h-11 w-11 p-0 text-muted-foreground hover:text-foreground touch-manipulation"
                              onClick={() => {
                                setActiveEditData(ing);
                                setIsModalOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="min-h-[44px] min-w-[44px] h-11 w-11 p-0 text-destructive hover:bg-destructive/10 touch-manipulation"
                              onClick={() => handleDeleteIngredient(ing._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Ingredient create/edit modal wrapper */}
      {isModalOpen && (
        <IngredientModal
          suppliers={suppliers}
          initialData={activeEditData}
          onSubmit={handleModalSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setActiveEditData(null);
          }}
          isSaving={isSaving}
        />
      )}

      {/* Stock adjustment modal wrapper */}
      {activeAdjustItem && (
        <StockAdjustmentModal
          ingredient={activeAdjustItem}
          onClose={() => setActiveAdjustItem(null)}
          onSubmit={handleAdjustSubmit}
          isSaving={isSaving}
        />
      )}
    </RestaurantLayout>
  );
}


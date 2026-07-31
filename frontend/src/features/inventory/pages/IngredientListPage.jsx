import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, FileSpreadsheet, Pencil, Trash2, ArrowUpDown, ShieldAlert, BadgeAlert } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import useAuthStore from '@/features/auth/store/auth.store';
import * as inventoryApi from '../api/inventory.api';
import * as branchApi from '@/features/branch/api/branch.api';

// Create/Edit Ingredient Dialog
function IngredientModal({ suppliers = [], branchId, initialData = null, onSubmit, onCancel, isSaving = false }) {
  const isEditMode = !!initialData;
  const [form, setForm] = useState({
    branch: branchId,
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
        branch: initialData.branch?._id || initialData.branch || branchId,
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
  }, [initialData, branchId]);

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
                disabled={isEditMode} // Edit mode must use manual adjustments
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
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEditData, setActiveEditData] = useState(null);
  
  const [activeAdjustItem, setActiveAdjustItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load basic configurations
  const loadBaseDetails = useCallback(async () => {
    try {
      const [branchList, supplierList] = await Promise.all([
        branchApi.listBranches(restaurantId, { limit: 100 }),
        inventoryApi.listSuppliers(restaurantId),
      ]);
      setBranches(branchList.items || []);
      setSuppliers(supplierList || []);
      if (branchList.items?.length > 0) {
        setSelectedBranch(branchList.items[0]._id);
      }
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load ingredients list
  const loadIngredients = useCallback(async () => {
    if (!selectedBranch) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await inventoryApi.listIngredients(restaurantId, { branch: selectedBranch });
      setIngredients(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ingredients.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedBranch]);

  useEffect(() => {
    if (restaurantId) {
      loadBaseDetails();
    }
  }, [restaurantId, loadBaseDetails]);

  useEffect(() => {
    if (selectedBranch) {
      loadIngredients();
    }
  }, [selectedBranch, loadIngredients]);

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
    link.setAttribute('download', `ingredients_branch_${selectedBranch}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search filter
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) =>
      ing.ingredientName.toLowerCase().includes(search.toLowerCase())
    );
  }, [ingredients, search]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Stock list sheet, safety reorder limits, and manual audits."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Ingredients Inventory</CardTitle>
            <CardDescription>Directory of all ingredients, prices, and unit stocks.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="xs" variant="outline" onClick={handleCsvExport} className="h-8">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> CSV Export
            </Button>
            <Button size="xs" onClick={() => {
              setActiveEditData(null);
              setIsModalOpen(true);
            }} className="h-8">
              <Plus className="h-4 w-4 mr-1" /> Add Ingredient
            </Button>
          </div>
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

          {/* Filtering bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="flex h-9 appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none min-w-[160px]"
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ingredients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Table display */}
          {isLoading ? (
            <Loader label="Mapping stock ledger..." />
          ) : filteredIngredients.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded bg-muted/5">
              No ingredients created inside this branch yet.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                    <th className="p-3 font-medium">Ingredient Name</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium text-center">Unit</th>
                    <th className="p-3 font-medium text-center">Current Stock</th>
                    <th className="p-3 font-medium text-center">Reorder limit</th>
                    <th className="p-3 font-medium text-right">Cost Price (₹)</th>
                    <th className="p-3 font-medium">Default Supplier</th>
                    <th className="p-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIngredients.map((ing) => {
                    const isOutOfStock = ing.currentStock <= 0;
                    const isLowStock = ing.currentStock <= ing.reorderLevel && !isOutOfStock;
                    return (
                      <tr key={ing._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                        <td className="p-3 font-semibold text-foreground">{ing.ingredientName}</td>
                        <td className="p-3 text-muted-foreground">{ing.category}</td>
                        <td className="p-3 text-center font-mono text-muted-foreground">{ing.unit}</td>
                        <td className="p-3 text-center">
                          <span className={`font-mono font-bold mr-2 ${
                            isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-foreground'
                          }`}>
                            {ing.currentStock}
                          </span>
                          {isOutOfStock && (
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[8px] font-bold uppercase bg-rose-100 text-rose-800">
                              <BadgeAlert className="h-2.5 w-2.5" /> Out
                            </span>
                          )}
                          {isLowStock && (
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[8px] font-bold uppercase bg-amber-100 text-amber-800">
                              <ShieldAlert className="h-2.5 w-2.5" /> Low
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-muted-foreground">{ing.reorderLevel}</td>
                        <td className="p-3 text-right font-mono font-medium text-foreground">
                          ₹{ing.purchasePrice?.toFixed(2) || 0}
                        </td>
                        <td className="p-3 text-muted-foreground truncate max-w-[130px]">
                          {ing.supplier?.supplierName || 'N/A'}
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 text-[10px] px-2.5"
                            onClick={() => setActiveAdjustItem(ing)}
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => {
                              setActiveEditData(ing);
                              setIsModalOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteIngredient(ing._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
          branchId={selectedBranch}
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

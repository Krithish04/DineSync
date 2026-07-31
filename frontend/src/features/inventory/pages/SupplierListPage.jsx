import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import SupplierForm from '../components/SupplierForm';
import useAuthStore from '@/features/auth/store/auth.store';
import * as inventoryApi from '../api/inventory.api';

export default function SupplierListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEditData, setActiveEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load suppliers list
  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await inventoryApi.listSuppliers(restaurantId);
      setSuppliers(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load suppliers.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadSuppliers();
    }
  }, [restaurantId, loadSuppliers]);

  // CRUD mutations callbacks
  const handleFormSubmit = async (formPayload) => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      if (activeEditData) {
        await inventoryApi.updateSupplier(restaurantId, activeEditData._id, formPayload);
        setSuccess('Supplier updated successfully.');
      } else {
        await inventoryApi.createSupplier(restaurantId, formPayload);
        setSuccess('Supplier created successfully.');
      }
      setIsModalOpen(false);
      setActiveEditData(null);
      loadSuppliers();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await inventoryApi.deleteSupplier(restaurantId, supplierId);
      setSuccess('Supplier deleted successfully.');
      loadSuppliers();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete supplier.');
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) =>
      s.supplierName.toLowerCase().includes(search.toLowerCase())
    );
  }, [suppliers, search]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Procurement supplier contacts and active invoice details."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Suppliers Directory</CardTitle>
            <CardDescription>Manage your wholesale vendor contact lists.</CardDescription>
          </div>
          <Button size="xs" onClick={() => {
            setActiveEditData(null);
            setIsModalOpen(true);
          }} className="h-8">
            <Plus className="h-4 w-4 mr-1" /> Add Supplier
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

          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs border-b border-border/40 pb-4">
            <Search className="absolute left-3 top-1/3 h-4 w-4 -translate-y-1/3 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Supplier logs table */}
          {isLoading ? (
            <Loader label="Loading suppliers..." />
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded bg-muted/5">
              No supplier contacts created yet.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                    <th className="p-3 font-medium">Supplier Name</th>
                    <th className="p-3 font-medium">Contact Person</th>
                    <th className="p-3 font-medium"><span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 shrink-0" /> Phone</span></th>
                    <th className="p-3 font-medium"><span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 shrink-0" /> Email</span></th>
                    <th className="p-3 font-medium text-center">GSTIN</th>
                    <th className="p-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((s) => (
                    <tr key={s._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                      <td className="p-3 font-semibold text-foreground">{s.supplierName}</td>
                      <td className="p-3 text-muted-foreground">{s.contactPerson || '-'}</td>
                      <td className="p-3 text-muted-foreground font-mono">{s.phone}</td>
                      <td className="p-3 text-muted-foreground select-all">{s.email || '-'}</td>
                      <td className="p-3 text-center font-mono text-muted-foreground">{s.gstNumber || '-'}</td>
                      <td className="p-3 text-center flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => {
                            setActiveEditData(s);
                            setIsModalOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(s._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg shadow-xl w-full max-w-md overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-bold text-sm text-foreground mb-4">
              {activeEditData ? 'Edit Supplier Details' : 'Add New Supplier'}
            </h4>
            <SupplierForm
              initialData={activeEditData}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsModalOpen(false);
                setActiveEditData(null);
              }}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as tableApi from '../api/table.api';
import * as branchApi from '@/features/branch/api/branch.api';

const TABLE_TYPES = [
  { value: 'Indoor', label: 'Indoor' },
  { value: 'Outdoor', label: 'Outdoor' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Private', label: 'Private' },
];

const emptyForm = {
  branch: '',
  tableNumber: '',
  tableName: '',
  capacity: 4,
  type: 'Indoor',
  notes: '',
  isActive: true,
};

export default function TableFormPage() {
  const { tableId } = useParams();
  const isEditMode = !!tableId;
  const navigate = useNavigate();

  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [form, setForm] = useState(emptyForm);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pageTitle = useMemo(() => (isEditMode ? 'Edit table' : 'Add table'), [isEditMode]);

  // Load branches list
  const loadBranches = useCallback(async () => {
    try {
      const result = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(result.items || []);
      // If adding a new table, preselect the first branch if available
      if (!isEditMode && result.items?.length > 0) {
        setForm((prev) => ({ ...prev, branch: result.items[0]._id }));
      }
    } catch {
      // Non-fatal
    }
  }, [restaurantId, isEditMode]);

  // Load table details on edit mode
  const loadTable = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const table = await tableApi.getTable(restaurantId, tableId);
      setForm({
        branch: table.branch?._id || table.branch || '',
        tableNumber: table.tableNumber || '',
        tableName: table.tableName || '',
        capacity: table.capacity || 4,
        type: table.type || 'Indoor',
        notes: table.notes || '',
        isActive: table.isActive !== undefined ? table.isActive : true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load table details.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, tableId]);

  useEffect(() => {
    if (!restaurantId) return;
    loadBranches();
    if (isEditMode) loadTable();
  }, [restaurantId, isEditMode, loadBranches, loadTable]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value, 10) || 1 : value,
    }));
  };

  const handleSwitchChange = (checked) => {
    setForm((prev) => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validations
    if (!form.branch) {
      setError('Branch selection is required.');
      return;
    }
    if (!form.tableNumber.trim()) {
      setError('Table number is required.');
      return;
    }
    if (form.capacity < 1) {
      setError('Capacity must be at least 1 seat.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await tableApi.updateTable(restaurantId, tableId, form);
        setSuccess('Table details updated successfully.');
      } else {
        await tableApi.createTable(restaurantId, form);
        setSuccess('Table created successfully.');
        // Redirect back to list after short delay
        setTimeout(() => navigate('/restaurant/tables'), 1500);
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to save table.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Create and adjust configurations for individual branch dining tables."
    >
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Update table number, seating capacity, notes, or active status.'
              : 'Add a new physical dining table to a specific branch location.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader label="Loading table..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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

              {/* Branch Select */}
              <div className="space-y-2">
                <Label htmlFor="branch">Select Branch *</Label>
                <select
                  id="branch"
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  disabled={isEditMode} // Cannot move branch for existing table
                  className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                >
                  <option value="" disabled>Select a branch...</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                {isEditMode && (
                  <p className="text-[10px] text-muted-foreground">
                    Branch location cannot be modified after table creation.
                  </p>
                )}
              </div>

              {/* Table Number & Table Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tableNumber">Table Number *</Label>
                  <Input
                    id="tableNumber"
                    name="tableNumber"
                    value={form.tableNumber}
                    onChange={handleChange}
                    placeholder="e.g. 5, T-12, A-3"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tableName">Custom Name</Label>
                  <Input
                    id="tableName"
                    name="tableName"
                    value={form.tableName}
                    onChange={handleChange}
                    placeholder="e.g. Window Booth, Corner Table"
                  />
                </div>
              </div>

              {/* Seating Capacity & Seating Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity (Seats) *</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Table Type</Label>
                  <select
                    id="type"
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {TABLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes / Special Instructions</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="e.g. Needs extra legroom, near server station..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
                />
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between rounded-md border border-border p-4 bg-muted/10">
                <div>
                  <p className="text-sm font-medium text-foreground">Table Active Status</p>
                  <p className="text-[11px] text-muted-foreground">
                    Inactive tables won't accept ordering or waitlist assignments.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={handleSwitchChange}
                  />
                </div>
              </div>

              {/* Action Triggers */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" isLoading={isSaving}>
                  {isEditMode ? 'Save changes' : 'Create Table'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/restaurant/tables')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </RestaurantLayout>
  );
}

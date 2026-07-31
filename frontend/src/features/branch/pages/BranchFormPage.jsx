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
import WeeklyScheduleEditor, {
  buildDefaultSchedule,
  normalizeSchedule,
  validateSchedule,
} from '@/components/common/WeeklyScheduleEditor';
import useAuthStore from '@/features/auth/store/auth.store';
import * as branchApi from '@/features/branch/api/branch.api';

const emptyAddress = { line1: '', line2: '', landmark: '', city: '', state: '', postalCode: '', country: 'India' };
const emptyContact = { phone: '', alternatePhone: '', email: '' };

export default function BranchFormPage() {
  const { branchId } = useParams();
  const isEditMode = !!branchId;

  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const canManageCritical = useAuthStore((state) =>
    ['super_admin', 'owner'].includes(state.user?.role)
  );
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState(emptyAddress);
  const [contact, setContact] = useState(emptyContact);
  const [operatingHours, setOperatingHours] = useState(buildDefaultSchedule);
  const [managerId, setManagerId] = useState('');
  const [status, setStatus] = useState('active');
  const [managers, setManagers] = useState([]);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pageTitle = useMemo(() => (isEditMode ? 'Edit branch' : 'Add branch'), [isEditMode]);

  const loadManagers = useCallback(async () => {
    try {
      const result = await branchApi.listEligibleManagers(restaurantId);
      setManagers(result);
    } catch {
      // Non-fatal: manager assignment is optional, form still works without the list.
    }
  }, [restaurantId]);

  const loadBranch = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const branch = await branchApi.getBranch(restaurantId, branchId);
      setName(branch.name);
      setCode(branch.code || '');
      setAddress({ ...emptyAddress, ...branch.address });
      setContact({ ...emptyContact, ...branch.contact });
      setOperatingHours(normalizeSchedule(branch.operatingHours));
      setManagerId(branch.manager?._id || '');
      setStatus(branch.status);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load branch.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, branchId]);

  useEffect(() => {
    if (!restaurantId) return;
    loadManagers();
    if (isEditMode) loadBranch();
  }, [restaurantId, isEditMode, loadManagers, loadBranch]);

  const handleAddressChange = (e) => {
    const { name: field, value } = e.target;
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (e) => {
    const { name: field, value } = e.target;
    setContact((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const hoursError = validateSchedule(operatingHours);
    if (hoursError) {
      setError(hoursError);
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await branchApi.updateBranch(restaurantId, branchId, { name, code });
        await branchApi.updateBranchAddress(restaurantId, branchId, address);
        await branchApi.updateBranchContact(restaurantId, branchId, contact);
        await branchApi.updateBranchOperatingHours(restaurantId, branchId, operatingHours);
        if (canManageCritical) {
          await branchApi.assignBranchManager(restaurantId, branchId, managerId || null);
          await branchApi.updateBranchStatus(restaurantId, branchId, status);
        }
        setSuccess('Branch updated successfully.');
      } else {
        const created = await branchApi.createBranch(restaurantId, {
          name,
          code: code || undefined,
          address,
          contact,
          operatingHours,
          managerId: managerId || undefined,
        });
        navigate(`/restaurant/branches/${created._id}/edit`, { replace: true });
        return;
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to save branch.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Manage how your restaurant appears across DineSync AI."
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Update this branch\'s details, hours, manager, and status.'
              : 'Add a new physical location for your restaurant.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader label="Loading branch..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground">Basic details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Branch name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Koramangala Outlet"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Branch code</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Auto-generated if left blank"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-md border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Branch address</p>
                <div className="space-y-2">
                  <Label htmlFor="line1">Address line 1</Label>
                  <Input id="line1" name="line1" value={address.line1} onChange={handleAddressChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line2">Address line 2</Label>
                  <Input id="line2" name="line2" value={address.line2} onChange={handleAddressChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input id="landmark" name="landmark" value={address.landmark} onChange={handleAddressChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" value={address.city} onChange={handleAddressChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" value={address.state} onChange={handleAddressChange} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal code</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={address.postalCode}
                      onChange={handleAddressChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" name="country" value={address.country} onChange={handleAddressChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-md border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Contact details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" value={contact.phone} onChange={handleContactChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alternatePhone">Alternate phone</Label>
                    <Input
                      id="alternatePhone"
                      name="alternatePhone"
                      value={contact.alternatePhone}
                      onChange={handleContactChange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    name="email"
                    type="email"
                    value={contact.email}
                    onChange={handleContactChange}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Operating hours</p>
                <WeeklyScheduleEditor value={operatingHours} onChange={setOperatingHours} />
              </div>

              <div className="space-y-4 rounded-md border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Branch manager</p>
                <div className="space-y-2">
                  <Label htmlFor="managerId">Assign manager</Label>
                  <Select
                    id="managerId"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    disabled={isEditMode && !canManageCritical}
                  >
                    <option value="">Unassigned</option>
                    {managers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </Select>
                  {isEditMode && !canManageCritical && (
                    <p className="text-xs text-muted-foreground">
                      Only owners and platform admins can reassign a branch manager.
                    </p>
                  )}
                </div>
              </div>

              {isEditMode && (
                <div className="flex items-center justify-between rounded-md border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Branch status</p>
                    <p className="text-xs text-muted-foreground">
                      Inactive branches are hidden from customers and staff ordering flows.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs capitalize text-muted-foreground">{status}</span>
                    <Switch
                      checked={status === 'active'}
                      disabled={!canManageCritical}
                      onCheckedChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" isLoading={isSaving}>
                  {isEditMode ? 'Save changes' : 'Create branch'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/restaurant/branches')}
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

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  DollarSign,
  Clock,
  Hash,
  ShoppingBag,
  Calendar,
  Percent,
  Receipt,
  Save,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Utensils,
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as restaurantApi from '@/features/restaurant/api/restaurant.api';
import ReservationQrCard from '../components/ReservationQrCard';

const emptyForm = {
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  orderPrefix: 'ORD',
  allowOnlineOrders: true,
  allowTableReservations: true,
  minOrderAmount: 0,
  serviceChargePercent: 0,
  taxEnabled: true,
  staffCanEditMenu: false,
};

export default function RestaurantSettingsPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const updateRestaurantSettings = useAuthStore((state) => state.updateRestaurantSettings);

  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const settings = await restaurantApi.getSettings(restaurantId);
      setForm({ ...emptyForm, ...settings });
      if (updateRestaurantSettings && settings) {
        updateRestaurantSettings(settings);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load restaurant settings.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, updateRestaurantSettings]);

  useEffect(() => {
    if (restaurantId) loadSettings();
  }, [restaurantId, loadSettings]);

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  };

  const handleToggle = (name, checked) => {
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const updatedSettings = await restaurantApi.updateSettings(restaurantId, {
        ...form,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        serviceChargePercent: Number(form.serviceChargePercent) || 0,
      });
      if (updateRestaurantSettings) {
        updateRestaurantSettings(updatedSettings || form);
      }
      setSuccess('Settings updated successfully.');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Settings"
      description="Configure operational rules, order prefixes, financial rules, and feature switches."
    >
      {isLoading ? (
        <Loader label="Loading operational settings..." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Status Feedback Banners */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-primary" />
              <span>{success}</span>
            </div>
          )}

          {/* Section 1: Regional & System Defaults */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Settings size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Regional & System Configuration</CardTitle>
                  <CardDescription className="text-xs">Currency formats, timezone, and order numbering schema.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency" className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-muted-foreground" />
                    <span>Currency (ISO code)</span>
                  </Label>
                  <Input
                    id="currency"
                    name="currency"
                    maxLength={3}
                    value={form.currency}
                    onChange={handleTextChange}
                    placeholder="INR, USD, EUR"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="flex items-center gap-1.5">
                    <Clock size={14} className="text-muted-foreground" />
                    <span>System Timezone</span>
                  </Label>
                  <Input
                    id="timezone"
                    name="timezone"
                    value={form.timezone}
                    onChange={handleTextChange}
                    placeholder="Asia/Kolkata"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderPrefix" className="flex items-center gap-1.5">
                  <Hash size={14} className="text-muted-foreground" />
                  <span>Order Number Prefix</span>
                </Label>
                <Input
                  id="orderPrefix"
                  name="orderPrefix"
                  maxLength={8}
                  value={form.orderPrefix}
                  onChange={handleTextChange}
                  placeholder="ORD"
                />
                <p className="text-xs text-muted-foreground">
                  With prefix "<strong>{form.orderPrefix || 'ORD'}</strong>", order numbers are formatted as{' '}
                  <span className="font-mono font-bold text-foreground">{form.orderPrefix || 'ORD'}-1042</span>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Order Rules & Service Charges */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Percent size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Order Rules & Charges</CardTitle>
                  <CardDescription className="text-xs">Set minimum checkout thresholds and service charge percentages.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minOrderAmount">Minimum Order Amount (₹)</Label>
                <Input
                  id="minOrderAmount"
                  name="minOrderAmount"
                  type="number"
                  min="0"
                  value={form.minOrderAmount}
                  onChange={handleNumberChange}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceChargePercent">Service Charge (%)</Label>
                <Input
                  id="serviceChargePercent"
                  name="serviceChargePercent"
                  type="number"
                  min="0"
                  max="100"
                  value={form.serviceChargePercent}
                  onChange={handleNumberChange}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Operational Feature Switches */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <Sliders size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Operational Feature Switches</CardTitle>
                  <CardDescription className="text-xs">Enable or disable specific digital storefront features.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-border">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Online & Digital Ordering</p>
                    <p className="text-xs text-muted-foreground">Allow customers to browse digital menus and place orders.</p>
                  </div>
                </div>
                <Switch
                  id="allowOnlineOrders"
                  checked={form.allowOnlineOrders}
                  onCheckedChange={(checked) => handleToggle('allowOnlineOrders', checked)}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Table Reservations</p>
                    <p className="text-xs text-muted-foreground">Allow customers to book dining tables online.</p>
                  </div>
                </div>
                <Switch
                  id="allowTableReservations"
                  checked={form.allowTableReservations}
                  onCheckedChange={(checked) => handleToggle('allowTableReservations', checked)}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tax / GST Calculation</p>
                    <p className="text-xs text-muted-foreground">Apply applicable GST / tax rates to customer checkout bills.</p>
                  </div>
                </div>
                <Switch
                  id="taxEnabled"
                  checked={form.taxEnabled}
                  onCheckedChange={(checked) => handleToggle('taxEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <Utensils size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Staff Menu Editing Permission</p>
                    <p className="text-xs text-muted-foreground">Allow staff members to view and edit categories and menu items.</p>
                  </div>
                </div>
                <Switch
                  id="staffCanEditMenu"
                  checked={form.staffCanEditMenu}
                  onCheckedChange={(checked) => handleToggle('staffCanEditMenu', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Shareable Reservation QR Code */}
          <ReservationQrCard restaurantId={restaurantId} />

          {/* Submit Action Bar */}
          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" disabled={isSaving} className="gap-2 px-6 font-semibold">
              <Save size={16} />
              <span>{isSaving ? 'Saving Settings...' : 'Save Settings Changes'}</span>
            </Button>
          </div>
        </form>
      )}
    </RestaurantLayout>
  );
}

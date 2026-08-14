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
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
  AlertTriangle,
  Layers,
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
  kitchenStations: ['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Beverage'],
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

  const [newStationInput, setNewStationInput] = useState('');
  const [editingStationIdx, setEditingStationIdx] = useState(null);
  const [editingStationText, setEditingStationText] = useState('');

  const handleAddStation = () => {
    const trimmed = newStationInput.trim();
    if (!trimmed) return;
    if (form.kitchenStations?.includes(trimmed)) {
      setError(`Kitchen station "${trimmed}" already exists.`);
      return;
    }
    setForm((prev) => ({
      ...prev,
      kitchenStations: [...(prev.kitchenStations || []), trimmed],
    }));
    setNewStationInput('');
  };

  const handleRemoveStation = (index) => {
    if ((form.kitchenStations?.length || 0) <= 1) {
      setError('At least one kitchen station must be configured.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      kitchenStations: prev.kitchenStations.filter((_, idx) => idx !== index),
    }));
  };

  const handleMoveStation = (index, direction) => {
    const stations = [...(form.kitchenStations || [])];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= stations.length) return;
    const temp = stations[index];
    stations[index] = stations[targetIdx];
    stations[targetIdx] = temp;
    setForm((prev) => ({ ...prev, kitchenStations: stations }));
  };

  const handleStartRenameStation = (index, name) => {
    setEditingStationIdx(index);
    setEditingStationText(name);
  };

  const handleSaveRenameStation = (index) => {
    const trimmed = editingStationText.trim();
    if (!trimmed) return;
    const stations = [...(form.kitchenStations || [])];
    stations[index] = trimmed;
    setForm((prev) => ({ ...prev, kitchenStations: stations }));
    setEditingStationIdx(null);
    setEditingStationText('');
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
      let msg = 'Settings updated successfully.';
      if (updatedSettings?.reassignedCount) {
        msg += ` Reassigned ${updatedSettings.reassignedCount} menu item(s) to '${updatedSettings.fallbackStation}'.`;
      }
      setSuccess(msg);
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

          {/* Section 3.5: Configurable Kitchen Stations */}
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-foreground font-bold font-display">
                <Layers className="h-4 w-4 text-primary" />
                <span>Kitchen Display Stations</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure kitchen stations (e.g. Main Kitchen, Grill, Bar, Tandoor) matching your physical restaurant layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Station List */}
              <div className="space-y-2">
                {(form.kitchenStations || []).map((station, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      {editingStationIdx === idx ? (
                        <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                          <Input
                            value={editingStationText}
                            onChange={(e) => setEditingStationText(e.target.value)}
                            className="h-8 text-xs font-semibold"
                            autoFocus
                          />
                          <Button type="button" size="xs" onClick={() => handleSaveRenameStation(idx)} className="h-8 px-2">
                            <Check size={14} />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-foreground font-bold">{station}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {editingStationIdx !== idx && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => handleStartRenameStation(idx, station)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Rename Station"
                        >
                          <Pencil size={13} />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleMoveStation(idx, -1)}
                        disabled={idx === 0}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp size={13} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleMoveStation(idx, 1)}
                        disabled={idx === (form.kitchenStations?.length || 0) - 1}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown size={13} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemoveStation(idx)}
                        disabled={(form.kitchenStations?.length || 0) <= 1}
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-30"
                        title="Remove Station"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Station Input */}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Enter new station name (e.g. Bakery, Pizza Station)..."
                  value={newStationInput}
                  onChange={(e) => setNewStationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStation();
                    }
                  }}
                  className="text-xs h-9"
                />
                <Button type="button" size="sm" onClick={handleAddStation} className="h-9 gap-1 text-xs font-bold shrink-0">
                  <Plus size={14} />
                  <span>Add Station</span>
                </Button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> Removing a station reassigns any existing dishes assigned to it to the default station (the first station in your list).
                </span>
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

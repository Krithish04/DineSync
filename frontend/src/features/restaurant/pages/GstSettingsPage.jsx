import { useState, useEffect, useCallback } from 'react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as restaurantApi from '@/features/restaurant/api/restaurant.api';

const emptyForm = {
  gstRegistered: false,
  gstin: '',
  legalBusinessName: '',
  placeOfSupply: '',
  gstCertificateUrl: '',
};

export default function GstSettingsPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadGst = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const gst = await restaurantApi.getGst(restaurantId);
      setForm({
        gstRegistered: !!gst.gstRegistered,
        gstin: gst.gstin || '',
        legalBusinessName: gst.legalBusinessName || '',
        placeOfSupply: gst.placeOfSupply || '',
        gstCertificateUrl: gst.gstCertificateUrl || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load GST details.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadGst();
  }, [restaurantId, loadGst]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'gstin' ? value.toUpperCase() : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await restaurantApi.updateGst(restaurantId, form);
      setSuccess('GST details updated successfully.');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to update GST details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Manage how your restaurant appears across DineSync AI."
    >
      <Card>
        <CardHeader>
          <CardTitle>GST</CardTitle>
          <CardDescription>Tax registration details used on invoices and receipts.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader label="Loading GST details..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="flex items-center justify-between rounded-md border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">GST registered</p>
                  <p className="text-xs text-muted-foreground">
                    Turn on if your restaurant is registered for GST.
                  </p>
                </div>
                <Switch
                  id="gstRegistered"
                  checked={form.gstRegistered}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, gstRegistered: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  name="gstin"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  value={form.gstin}
                  onChange={handleChange}
                  disabled={!form.gstRegistered}
                />
                <p className="text-xs text-muted-foreground">
                  15-character GST Identification Number, required when GST registered is on.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legalBusinessName">Legal business name</Label>
                <Input
                  id="legalBusinessName"
                  name="legalBusinessName"
                  value={form.legalBusinessName}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="placeOfSupply">Place of supply (state)</Label>
                <Input
                  id="placeOfSupply"
                  name="placeOfSupply"
                  placeholder="e.g. Karnataka"
                  value={form.placeOfSupply}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstCertificateUrl">GST certificate URL</Label>
                <Input
                  id="gstCertificateUrl"
                  name="gstCertificateUrl"
                  placeholder="https://"
                  value={form.gstCertificateUrl}
                  onChange={handleChange}
                />
              </div>

              <Button type="submit" isLoading={isSaving}>
                Save GST details
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </RestaurantLayout>
  );
}

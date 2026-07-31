import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SupplierForm({
  initialData = null,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const isEditMode = !!initialData;
  const [form, setForm] = useState({
    supplierName: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm({
        supplierName: initialData.supplierName || '',
        contactPerson: initialData.contactPerson || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        gstNumber: initialData.gstNumber || '',
        address: initialData.address || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.supplierName.trim()) return setError('Supplier name is required.');
    if (!form.phone.trim()) return setError('Phone number is required.');

    onSubmit(form);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="supplierName">Supplier Name *</Label>
        <Input
          id="supplierName"
          name="supplierName"
          value={form.supplierName}
          onChange={handleChange}
          placeholder="e.g. Metro Wholesale Distributors"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input
            id="contactPerson"
            name="contactPerson"
            value={form.contactPerson}
            onChange={handleChange}
            placeholder="e.g. Mr. Sharma"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="e.g. +91 99887 76655"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="info@metro.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gstNumber">GST Number (GSTIN)</Label>
          <Input
            id="gstNumber"
            name="gstNumber"
            value={form.gstNumber}
            onChange={handleChange}
            placeholder="e.g. 07AAAAA1111A1Z1"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <textarea
          id="address"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="e.g. Site IV, Industrial Area, New Delhi"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[60px]"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={isSaving}>
          {isEditMode ? 'Save Changes' : 'Create Supplier'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

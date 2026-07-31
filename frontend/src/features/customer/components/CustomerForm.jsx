import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CustomerForm({
  branches = [],
  initialData = null,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const isEditMode = !!initialData;
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    preferredBranch: '',
    dietaryPreference: 'Non Veg',
    referredByCode: '',
    marketingConsent: false,
    notes: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm({
        fullName: initialData.fullName || '',
        phoneNumber: initialData.phoneNumber || '',
        email: initialData.email || '',
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().slice(0, 10) : '',
        gender: initialData.gender || '',
        address: initialData.address || '',
        preferredBranch: initialData.preferredBranch?._id || initialData.preferredBranch || '',
        dietaryPreference: initialData.dietaryPreference || 'Non Veg',
        referredByCode: '', // referralCode is read-only for existing users
        marketingConsent: !!initialData.marketingConsent,
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim()) return setError('Customer full name is required.');
    if (!form.phoneNumber.trim()) return setError('Phone number is required.');

    onSubmit(form);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
      {error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="e.g. Aarav Mehta"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">Phone Number *</Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder="e.g. 9988776655"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="aarav@mehta.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dietaryPreference">Dietary Type</Label>
          <select
            id="dietaryPreference"
            name="dietaryPreference"
            value={form.dietaryPreference}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
          >
            <option value="Non Veg">Non Veg</option>
            <option value="Veg">Veg</option>
            <option value="Vegan">Vegan</option>
            <option value="Jain">Jain</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preferredBranch">Preferred Branch</Label>
          <select
            id="preferredBranch"
            name="preferredBranch"
            value={form.preferredBranch}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Select branch...</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isEditMode && (
        <div className="space-y-1.5">
          <Label htmlFor="referredByCode">Referral Code (Optional)</Label>
          <Input
            id="referredByCode"
            name="referredByCode"
            value={form.referredByCode}
            onChange={handleChange}
            placeholder="e.g. ISHAA1234"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="e.g. Sector 15, Dwarka, New Delhi"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Internal Notes</Label>
        <textarea
          id="notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="e.g. VIP client, prefers corner table..."
          rows={2}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[50px]"
        />
      </div>

      <div className="flex items-center gap-2 pt-1.5">
        <input
          id="marketingConsent"
          name="marketingConsent"
          type="checkbox"
          checked={form.marketingConsent}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="marketingConsent" className="text-xs font-normal text-muted-foreground select-none">
          Consent to receive promotional SMS & Emails.
        </Label>
      </div>

      <div className="flex gap-3 pt-3 border-t border-border mt-4">
        <Button type="submit" isLoading={isSaving} className="text-xs h-9">
          {isEditMode ? 'Save Changes' : 'Register Customer'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="text-xs h-9">
          Cancel
        </Button>
      </div>
    </form>
  );
}

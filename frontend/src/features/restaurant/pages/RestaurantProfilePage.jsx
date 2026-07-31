import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Utensils,
  Image as ImageIcon,
  Share2,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as restaurantApi from '@/features/restaurant/api/restaurant.api';

const emptyForm = {
  name: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  cuisine: '',
  logoUrl: '',
  coverImageUrl: '',
  socialLinks: { facebook: '', instagram: '', twitter: '' },
};

export default function RestaurantProfilePage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const profile = await restaurantApi.getProfile(restaurantId);
      setForm({
        name: profile.name || '',
        description: profile.description || '',
        address: profile.address || '',
        phone: profile.phone || '',
        email: profile.email || '',
        website: profile.website || '',
        cuisine: (profile.cuisine || []).join(', '),
        logoUrl: profile.logoUrl || '',
        coverImageUrl: profile.coverImageUrl || '',
        socialLinks: {
          facebook: profile.socialLinks?.facebook || '',
          instagram: profile.socialLinks?.instagram || '',
          twitter: profile.socialLinks?.twitter || '',
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load restaurant profile.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadProfile();
  }, [restaurantId, loadProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (platform, value) => {
    setForm((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [platform]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        cuisine: form.cuisine
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      };
      await restaurantApi.updateProfile(restaurantId, payload);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Profile"
      description="Manage public details, branding assets, and contact information for your restaurant."
    >
      {isLoading ? (
        <Loader label="Loading restaurant profile..." />
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

          {/* Section 1: Basic Information */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                  <CardDescription className="text-xs">Primary branding and cuisine classification.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name *</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Grand Bistro & Bar" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Public Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Tell customers what makes your dining experience special..."
                  value={form.description}
                  onChange={handleChange}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cuisine" className="flex items-center gap-1.5">
                  <Utensils size={14} className="text-muted-foreground" />
                  <span>Cuisine Categories (comma separated)</span>
                </Label>
                <Input
                  id="cuisine"
                  name="cuisine"
                  placeholder="Italian, Continental, Desserts, Fine Dining"
                  value={form.cuisine}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Contact & Location */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Contact & Location</CardTitle>
                  <CardDescription className="text-xs">Address and contact options shown to customers.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Physical Address</Label>
                <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Full street address, city, state & postal code" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone size={14} className="text-muted-foreground" />
                    <span>Phone Number</span>
                  </Label>
                  <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1.5">
                    <Mail size={14} className="text-muted-foreground" />
                    <span>Public Email</span>
                  </Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="contact@restaurant.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-1.5">
                  <Globe size={14} className="text-muted-foreground" />
                  <span>Website URL</span>
                </Label>
                <Input id="website" name="website" placeholder="https://www.restaurant.com" value={form.website} onChange={handleChange} />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Media & Branding Assets */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Branding & Media</CardTitle>
                  <CardDescription className="text-xs">Logo and cover images displayed on digital menus and QR portals.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo Image URL</Label>
                  <Input id="logoUrl" name="logoUrl" value={form.logoUrl} onChange={handleChange} placeholder="https://domain.com/logo.jpg" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverImageUrl">Cover Banner URL</Label>
                  <Input id="coverImageUrl" name="coverImageUrl" value={form.coverImageUrl} onChange={handleChange} placeholder="https://domain.com/cover.jpg" />
                </div>
              </div>

              {/* Live Preview Card */}
              {(form.logoUrl || form.coverImageUrl) && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" /> Branding Live Preview
                  </p>
                  <div className="relative rounded-xl overflow-hidden border border-border h-32 bg-muted flex items-center justify-center">
                    {form.coverImageUrl ? (
                      <img src={form.coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No Cover Image</span>
                    )}
                    {form.logoUrl && (
                      <img src={form.logoUrl} alt="Logo Preview" className="absolute bottom-2 left-3 h-12 w-12 rounded-lg border-2 border-white shadow-md bg-white object-cover" />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Social Profiles */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <Share2 size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Social Profiles</CardTitle>
                  <CardDescription className="text-xs">Social media handles connected to customer receipts and digital menu.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook Handle / Page</Label>
                <Input id="facebook" value={form.socialLinks.facebook} onChange={(e) => handleSocialChange('facebook', e.target.value)} placeholder="facebook.com/restaurant" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Handle</Label>
                <Input id="instagram" value={form.socialLinks.instagram} onChange={(e) => handleSocialChange('instagram', e.target.value)} placeholder="@restaurant" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter / X Handle</Label>
                <Input id="twitter" value={form.socialLinks.twitter} onChange={(e) => handleSocialChange('twitter', e.target.value)} placeholder="@restaurant" />
              </div>
            </CardContent>
          </Card>

          {/* Submit Action Bar */}
          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" disabled={isSaving} className="gap-2 px-6 font-semibold">
              <Save size={16} />
              <span>{isSaving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </Button>
          </div>
        </form>
      )}
    </RestaurantLayout>
  );
}

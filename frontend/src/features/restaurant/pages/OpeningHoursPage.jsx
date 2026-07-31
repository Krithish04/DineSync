import { useState, useEffect, useCallback } from 'react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import WeeklyScheduleEditor, {
  buildDefaultSchedule,
  normalizeSchedule,
  validateSchedule,
} from '@/components/common/WeeklyScheduleEditor';
import useAuthStore from '@/features/auth/store/auth.store';
import * as restaurantApi from '@/features/restaurant/api/restaurant.api';

export default function OpeningHoursPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [hours, setHours] = useState(buildDefaultSchedule);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadHours = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const openingHours = await restaurantApi.getOpeningHours(restaurantId);
      setHours(normalizeSchedule(openingHours));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load opening hours.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadHours();
  }, [restaurantId, loadHours]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateSchedule(hours);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await restaurantApi.updateOpeningHours(restaurantId, hours);
      setSuccess('Opening hours updated successfully.');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(
        apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to update opening hours.'
      );
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
          <CardTitle>Opening Hours</CardTitle>
          <CardDescription>Set your weekly schedule, with support for split shifts.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader label="Loading opening hours..." />
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

              <WeeklyScheduleEditor value={hours} onChange={setHours} />

              <Button type="submit" isLoading={isSaving}>
                Save opening hours
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </RestaurantLayout>
  );
}

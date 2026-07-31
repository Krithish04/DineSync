import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Loader from '@/components/common/Loader';
import ReservationForm from '../components/ReservationForm';
import useAuthStore from '@/features/auth/store/auth.store';
import * as reservationApi from '../api/reservation.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function ReservationFormPage() {
  const { reservationId } = useParams();
  const isEditMode = !!reservationId;
  const navigate = useNavigate();

  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [reservation, setReservation] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pageTitle = useMemo(() => (isEditMode ? 'Edit reservation' : 'Add reservation'), [isEditMode]);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const result = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(result.items || []);
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load reservation details if editing
  const loadReservation = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await reservationApi.getReservation(restaurantId, reservationId);
      setReservation(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservation details.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, reservationId]);

  useEffect(() => {
    if (!restaurantId) return;
    loadBranches();
    if (isEditMode) loadReservation();
  }, [restaurantId, isEditMode, loadBranches, loadReservation]);

  const handleSubmit = async (formPayload) => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      if (isEditMode) {
        await reservationApi.updateReservation(restaurantId, reservationId, formPayload);
        setSuccess('Reservation updated successfully.');
        // Redirect back to dashboard/list after brief delay
        setTimeout(() => navigate('/restaurant/reservations/list'), 1500);
      } else {
        await reservationApi.createReservation(restaurantId, formPayload);
        setSuccess('Reservation created successfully.');
        setTimeout(() => navigate('/restaurant/reservations/list'), 1500);
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to save reservation.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Create or edit seat bookings and check table overlaps."
    >
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Update customer requests, seating details, or reservation time.'
              : 'Add a new reservation. Seating capacity, overlap, and branch hours are validated automatically.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader label="Loading details..." />
          ) : (
            <div className="space-y-4">
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

              <ReservationForm
                restaurantId={restaurantId}
                branches={branches}
                initialData={reservation}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/restaurant/reservations/list')}
                isSaving={isSaving}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </RestaurantLayout>
  );
}

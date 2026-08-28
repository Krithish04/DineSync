import { useEffect, useState, useCallback } from 'react';
import { MapPin, AlertCircle, CheckCircle2, RefreshCw, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore, { calculateDistanceInMeters } from '../store/cart.store';

/**
 * Geolocation Safety Verification Component.
 * Checks diner's GPS location against restaurant bounds to prevent remote/fraudulent ordering.
 */
export default function LocationVerifier({ tableNumber }) {
  const {
    userLocation,
    restaurantCoords,
    allowedRadiusMeters,
    setLocationStatus,
  } = useCartStore();

  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  const checkLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('GPS location is not supported by your browser.');
      setLocationStatus({ lat: null, lng: null, isOutside: true, distanceMeters: null });
      return;
    }

    setIsChecking(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistanceInMeters(
          latitude,
          longitude,
          restaurantCoords.lat,
          restaurantCoords.lng
        );

        const isOutside = distance > allowedRadiusMeters;
        setLocationStatus({
          lat: latitude,
          lng: longitude,
          isOutside,
          distanceMeters: distance,
        });
        setIsChecking(false);
      },
      (err) => {
        setIsChecking(false);
        setErrorMsg('Location permission denied or unavailable.');
        // Set outside/view-only for safety
        setLocationStatus({ lat: null, lng: null, isOutside: true, distanceMeters: null });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [restaurantCoords, allowedRadiusMeters, setLocationStatus]);

  useEffect(() => {
    if (!userLocation.isVerified) {
      checkLocation();
    }
  }, [userLocation.isVerified, checkLocation]);

  // Dev bypass button to simulate in-restaurant location for testing
  const handleSimulateInRestaurant = () => {
    setLocationStatus({
      lat: restaurantCoords.lat,
      lng: restaurantCoords.lng,
      isOutside: false,
      distanceMeters: 15, // 15 meters away
    });
  };

  if (isDismissed) return null;

  return (
    <div className="space-y-2">
      {userLocation.isOutside ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <MapPin size={16} className="text-rose-500 shrink-0" />
              <span>Outside Restaurant Location Bounds</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={checkLocation}
              disabled={isChecking}
              className="h-6 text-[10px] px-2 text-rose-600 border-rose-500/30"
            >
              <RefreshCw size={11} className={isChecking ? 'animate-spin mr-1' : 'mr-1'} />
              Retry GPS
            </Button>
          </div>

          <p className="text-[11px] leading-relaxed">
            {userLocation.distanceMeters !== null
              ? `You are currently ~${(userLocation.distanceMeters / 1000).toFixed(1)} km away from the restaurant. For safety, table ordering is restricted to diners inside the restaurant area.`
              : 'Location permission is required to place table orders. You can browse the menu in View-Only mode.'}
          </p>

          {/* Dev/Testing Helper Button */}
          <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-rose-500/20">
            <span>Testing Mode:</span>
            <button
              onClick={handleSimulateInRestaurant}
              className="text-primary font-bold hover:underline flex items-center gap-1"
            >
              <Navigation size={11} /> Simulate Inside Restaurant GPS
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 overflow-hidden shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <div className="min-w-0 truncate">
              <span className="font-bold text-foreground inline-block truncate">
                Welcome to Table #{tableNumber || 1}
              </span>
              <span className="text-[11px] text-muted-foreground ml-1.5 font-medium truncate">
                • Verified Inside (~{userLocation.distanceMeters || 15}m)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-muted-foreground hover:text-foreground font-bold text-xs p-1 ml-1 shrink-0 touch-manipulation min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label="Dismiss status banner"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Utensils, AlertTriangle, ArrowRight, Table as TableIcon, Lock, CheckCircle2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';

export default function QrLandingPage() {
  const routeParams = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSessionContext = useCartStore((s) => s.setSessionContext);
  const tableHost = useCartStore((s) => s.tableHost);

  // Support both short URL route parameter (/t/:tableId) and query params (?restaurantId=...&tableId=...)
  const tableIdFromPath = routeParams.tableId;
  const queryRestaurantId = searchParams.get('restaurantId');
  const queryBranchId = searchParams.get('branchId');
  const queryTableId = searchParams.get('tableId');
  const type = searchParams.get('type') || 'Dine-In';

  const tableId = tableIdFromPath || queryTableId;
  const restaurantId = queryRestaurantId;

  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const resolve = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (!restaurantId && !tableId) {
          // Fallback default preview context if no parameters provided
          setSessionContext({ orderType: 'Dine-In' });
          navigate('/menu/browse');
          return;
        }

        const res = await customerApi.resolveQrCode(restaurantId, { branchId: queryBranchId, tableId, type });
        setSession(res);

        const isInactive = res.isInactive || res.tableStatus === 'Inactive' || res.table?.isActive === false;
        const tableStatus = isInactive ? 'Inactive' : (res.table?.status || res.tableStatus || 'Available');

        setSessionContext({
          restaurantId: res.restaurantId,
          branchId: res.branchId || res.branch?._id || queryBranchId,
          tableId: res.tableId || res.table?._id || tableId,
          tableNumber: res.tableNumber || res.table?.tableNumber || null,
          tableStatus,
          isInactive,
          currentHostName: res.currentHostName || res.table?.currentHostName,
          currentHostPhone: res.currentHostPhone || res.table?.currentHostPhone,
          orderType: res.type || 'Dine-In',
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired Table QR code.');
      } finally {
        setIsLoading(false);
      }
    };

    resolve();
  }, [restaurantId, queryBranchId, tableId, type, setSessionContext, navigate]);

  const isTableInactive = session?.isInactive || session?.tableStatus === 'Inactive' || session?.table?.isActive === false;
  const isTableOccupied = !isTableInactive && (session?.table?.status === 'Occupied' || session?.tableStatus === 'Occupied');
  const isCurrentHost = tableHost && isTableOccupied;

  const handleStartOrdering = () => {
    if (isTableInactive) {
      navigate('/menu/browse');
    } else if (isTableOccupied && !isCurrentHost) {
      // Navigate to digital menu in View-Only mode
      navigate('/menu/browse');
    } else {
      // Navigate to digital menu and trigger OTP login modal
      navigate('/menu/browse?promptAuth=true');
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5">
        {isLoading && (
          <div className="py-8 space-y-3">
            <Loader />
            <p className="text-xs text-muted-foreground">Validating Table QR Code &amp; Status...</p>
          </div>
        )}

        {error && (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-foreground">QR Code Unavailable</h3>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={() => navigate('/menu/browse')} className="w-full text-xs">
              Browse General Digital Menu
            </Button>
          </div>
        )}

        {!isLoading && !error && session && (
          <div className="space-y-5 py-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Utensils size={32} />
            </div>

            <div>
              <h2 className="text-xl font-bold font-display text-primary">
                {session.restaurant?.name || 'Welcome to DineSync AI'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {session.branch ? `${session.branch.name} Branch` : 'Digital Menu'}
              </p>
            </div>

            {(session.table || session.tableNumber) && (
              <div className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
                  <TableIcon size={16} className="text-primary" />
                  <span>Table #{session.table?.tableNumber || session.tableNumber} ({session.table?.tableName || 'Dining Table'})</span>
                </div>

                {isTableInactive ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-lg p-2.5 text-xs text-left space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>Table Inactive</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Ordering for Table #{session.table?.tableNumber || session.tableNumber} is currently turned off. You can browse our digital menu and explore items.
                    </p>
                  </div>
                ) : isTableOccupied && !isCurrentHost ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg p-2 text-[11px] font-semibold flex items-center justify-center gap-1.5">
                    <Lock size={13} />
                    <span>Table Occupied — View-Only Mode Active</span>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg p-2 text-[11px] font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={13} />
                    <span>Table Vacant &amp; Ready for Ordering</span>
                  </div>
                )}
              </div>
            )}

            {isTableInactive ? (
              <Button onClick={handleStartOrdering} className="w-full gap-2 text-sm font-semibold">
                <Utensils size={16} />
                <span>Browse Digital Menu &amp; Add Items</span>
                <ArrowRight size={16} />
              </Button>
            ) : isTableOccupied && !isCurrentHost ? (
              <Button onClick={handleStartOrdering} variant="secondary" className="w-full gap-2 text-xs font-semibold">
                <Eye size={15} />
                <span>Browse Menu (View Only)</span>
              </Button>
            ) : (
              <Button onClick={handleStartOrdering} className="w-full gap-2 text-sm font-semibold">
                <span>Start Table Ordering</span>
                <ArrowRight size={16} />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => navigate('/menu/reservations')}
              className="w-full text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
            >
              <span>Book Table in Advance</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

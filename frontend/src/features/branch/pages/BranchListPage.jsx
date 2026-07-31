import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as branchApi from '@/features/branch/api/branch.api';

const StatusBadge = ({ status }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
      status === 'active'
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground'
    )}
  >
    {status}
  </span>
);

export default function BranchListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const canDelete = useAuthStore((state) => ['super_admin', 'owner'].includes(state.user?.role));
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(result.items);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load branches.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadBranches();
  }, [restaurantId, loadBranches]);

  const handleDelete = async (branchId, branchName) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete branch "${branchName}"? This cannot be undone.`)) return;

    setDeletingId(branchId);
    try {
      await branchApi.deleteBranch(restaurantId, branchId);
      setBranches((prev) => prev.filter((b) => b._id !== branchId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete branch.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Manage how your restaurant appears across DineSync AI."
    >
      <Card className="max-w-4xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Branches</CardTitle>
            <CardDescription>All physical locations under this restaurant.</CardDescription>
          </div>
          <Button size="sm" onClick={() => navigate('/restaurant/branches/new')}>
            <Plus className="mr-1.5 h-4 w-4" /> Add branch
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <Loader label="Loading branches..." />
          ) : branches.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No branches yet. Add your first location to get started.
              </p>
              <Button size="sm" onClick={() => navigate('/restaurant/branches/new')}>
                <Plus className="mr-1.5 h-4 w-4" /> Add branch
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Branch</th>
                    <th className="pb-2 pr-4 font-medium">City</th>
                    <th className="pb-2 pr-4 font-medium">Manager</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch._id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{branch.name}</p>
                        <p className="text-xs text-muted-foreground">{branch.code}</p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{branch.address?.city}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {branch.manager?.name || <span className="italic">Unassigned</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={branch.status} />
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${branch.name}`}
                            onClick={() => navigate(`/restaurant/branches/${branch._id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${branch.name}`}
                              isLoading={deletingId === branch._id}
                              onClick={() => handleDelete(branch._id, branch.name)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </RestaurantLayout>
  );
}

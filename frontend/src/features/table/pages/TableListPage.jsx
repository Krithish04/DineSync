import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Grid } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import TableCard from '../components/TableCard';
import QrCodeModal from '../components/QrCodeModal';
import useAuthStore from '@/features/auth/store/auth.store';
import useSocketStore from '@/store/socket.store';
import * as tableApi from '../api/table.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function TableListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const connectSocket = useSocketStore((state) => state.connect);
  const socket = useSocketStore((state) => state.socket);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 12; // 3 or 4 columns of cards

  // QR Modal state
  const [selectedQrTable, setSelectedQrTable] = useState(null);

  // Auto-connect to Socket.IO restaurant room
  useEffect(() => {
    if (restaurantId) {
      connectSocket(restaurantId);
    }
  }, [restaurantId, connectSocket]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load branches (for filtering)
  const loadBranches = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load tables
  const loadTables = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search: searchDebounced,
      };

      if (selectedBranchFilter !== 'all') params.branch = selectedBranchFilter;
      if (selectedStatusFilter !== 'all') params.status = selectedStatusFilter;

      const res = await tableApi.listTables(restaurantId, params);
      setTables(res.items || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load restaurant tables.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, page, searchDebounced, selectedBranchFilter, selectedStatusFilter]);

  useEffect(() => {
    if (restaurantId) {
      loadBranches();
      loadTables();
    }
  }, [restaurantId, loadBranches, loadTables]);

  // Real-time Socket.IO listener for table claims, releases, and status changes
  useEffect(() => {
    if (!socket) return;

    const handleTableUpdate = (data) => {
      if (!data?.tableId) return;
      const targetId = String(data.tableId);
      const newStatus = data.status || 'Available';

      setTables((prev) =>
        prev.map((t) => (String(t._id) === targetId ? { ...t, status: newStatus } : t))
      );

      // Re-fetch tables to sync pagination and status filters immediately
      loadTables();
    };

    socket.on('table:updated', handleTableUpdate);
    return () => socket.off('table:updated', handleTableUpdate);
  }, [socket, loadTables]);

  // Handle Quick status change
  const handleStatusChange = async (tableId, newStatus) => {
    try {
      const updated = await tableApi.updateTableStatus(restaurantId, tableId, newStatus);
      setTables((prev) => prev.map((t) => (String(t._id) === String(tableId) ? updated : t)));
      setSuccess('Table status updated.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update table status.');
    }
  };

  // Handle soft delete
  const handleDelete = async (table) => {
    if (!window.confirm(`Are you sure you want to delete Table ${table.tableNumber}?`)) return;

    try {
      await tableApi.deleteTable(restaurantId, table._id);
      setSuccess(`Table ${table.tableNumber} deleted successfully.`);
      loadTables();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete table.');
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Manage your physical tables, layouts, occupancy statuses, and scan QR codes."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Tables &amp; QR Codes</CardTitle>
            <CardDescription>Setup and monitor dining seating, status, and download QR codes.</CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => navigate('/restaurant/tables/new')}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Table
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Notifications */}
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {success}
            </div>
          )}

          {/* Search, Filter bar */}
          <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by table number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="relative">
              <select
                value={selectedBranchFilter}
                onChange={(e) => {
                  setSelectedBranchFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="relative">
              <select
                value={selectedStatusFilter}
                onChange={(e) => {
                  setSelectedStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Maintenance">Maintenance</option>
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Tables Card Grid */}
          {isLoading ? (
            <Loader label="Loading tables..." />
          ) : tables.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
              <Grid className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchDebounced || selectedBranchFilter !== 'all' || selectedStatusFilter !== 'all'
                  ? 'No tables match your search filters.'
                  : 'No dining tables configured yet.'}
              </p>
              {canManage && !searchDebounced && (
                <Button size="sm" onClick={() => navigate('/restaurant/tables/new')}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Table
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tables.map((table) => (
                  <TableCard
                    key={table._id}
                    table={table}
                    onEdit={(t) => navigate(`/restaurant/tables/${t._id}/edit`)}
                    onDelete={handleDelete}
                    onQrClick={(t) => setSelectedQrTable(t)}
                    onStatusChange={handleStatusChange}
                    canManage={canManage}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} tables)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code display Modal */}
      {selectedQrTable && (
        <QrCodeModal
          table={selectedQrTable}
          onClose={() => setSelectedQrTable(null)}
        />
      )}
    </RestaurantLayout>
  );
}

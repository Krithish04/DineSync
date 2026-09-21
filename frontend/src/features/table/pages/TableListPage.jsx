import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Grid, Map, LayoutGrid, Layers, CheckSquare, X, RefreshCw } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import TableCard from '../components/TableCard';
import ArchitecturalFloorPlan from '../components/ArchitecturalFloorPlan';
import QrCodeModal from '../components/QrCodeModal';
import TableOrderDetailModal from '../components/TableOrderDetailModal';
import MergeTablesModal from '../components/MergeTablesModal';
import useAuthStore from '@/features/auth/store/auth.store';
import useSocketStore from '@/store/socket.store';
import * as tableApi from '../api/table.api';

const ZONES_LIST = ['Main Hall', 'Patio/Outdoor', 'VIP Lounge', 'Private Dining', 'Bar Area'];

export default function TableListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const connectSocket = useSocketStore((state) => state.connect);
  const socket = useSocketStore((state) => state.socket);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 12;

  // View mode state: 'floorplan' (Interactive 2D Floor Architecture) vs 'grid' (Card Grid)
  const [viewMode, setViewMode] = useState('floorplan');
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  // Bulk actions state
  const [selectedTableIds, setSelectedTableIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // QR Modal, Order Detail Modal & Merge Modal state
  const [selectedQrTable, setSelectedQrTable] = useState(null);
  const [selectedOrderTable, setSelectedOrderTable] = useState(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

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

  // Load tables (supports silent background fetch to avoid component unmount/loader flashes)
  const loadTables = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: viewMode === 'floorplan' ? 1000 : limit,
        search: searchDebounced,
      };

      if (selectedStatusFilter !== 'all') params.status = selectedStatusFilter;

      const res = await tableApi.listTables(restaurantId, params);
      let items = res.items || [];

      // Merge cached floor positions if available
      try {
        const savedStr = localStorage.getItem('dinesync_saved_table_positions');
        if (savedStr) {
          const map = JSON.parse(savedStr);
          items = items.map((t) => {
            const tId = String(t._id || t.id);
            const saved = map[tId];
            if (saved) {
              return {
                ...t,
                positionX: saved.positionX ?? t.positionX,
                positionY: saved.positionY ?? t.positionY,
                zone: saved.zone || t.zone,
                shape: saved.shape || t.shape,
              };
            }
            return t;
          });
        }
      } catch {
        // Ignore cache merge error
      }

      setTables(items);
      setPagination(res.pagination || null);
    } catch (err) {
      if (!isSilent) setError(err.response?.data?.message || 'Failed to load restaurant tables.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [restaurantId, page, limit, searchDebounced, selectedStatusFilter, viewMode]);

  useEffect(() => {
    if (restaurantId) {
      loadTables();
    }
  }, [restaurantId, loadTables]);

  // Real-time Socket.IO listener for table claims, releases, status changes, and layout updates
  useEffect(() => {
    if (!socket) return;

    const handleTableUpdate = (data) => {
      if (data?.tableId) {
        const targetId = String(data.tableId);
        const newStatus = data.status || 'Available';
        setTables((prev) =>
          prev.map((t) => (String(t._id) === targetId ? { ...t, status: newStatus } : t))
        );
      }
      loadTables(true);
    };

    const handleLayoutUpdate = () => {
      loadTables(true); // Silent update — preserves canvas mount & prevents snap-back/loader flash!
    };

    const handleCleaningRequired = (data) => {
      loadTables(true);
    };

    socket.on('table:updated', handleTableUpdate);
    socket.on('tables:layout_updated', handleLayoutUpdate);
    socket.on('table:claimed', handleTableUpdate);
    socket.on('table:released', handleTableUpdate);
    socket.on('order:placed', handleTableUpdate);
    socket.on('session:updated', handleTableUpdate);
    socket.on('staff:cleaning-required', handleCleaningRequired);

    return () => {
      socket.off('table:updated', handleTableUpdate);
      socket.off('tables:layout_updated', handleLayoutUpdate);
      socket.off('table:claimed', handleTableUpdate);
      socket.off('table:released', handleTableUpdate);
      socket.off('order:placed', handleTableUpdate);
      socket.off('session:updated', handleTableUpdate);
      socket.off('staff:cleaning-required', handleCleaningRequired);
    };
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

  // Bulk Selection Handlers
  const handleToggleSelect = (tableId) => {
    setSelectedTableIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTableIds.length === tables.length) {
      setSelectedTableIds([]);
    } else {
      setSelectedTableIds(tables.map((t) => t._id));
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (!newStatus || selectedTableIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        selectedTableIds.map((id) => tableApi.updateTableStatus(restaurantId, id, newStatus))
      );
      setSuccess(`Updated status of ${selectedTableIds.length} tables to ${newStatus}.`);
      setSelectedTableIds([]);
      loadTables();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk status update failed.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkZoneChange = async (newZone) => {
    if (!newZone || selectedTableIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const layoutItems = selectedTableIds.map((id) => {
        const existing = tables.find((t) => t._id === id);
        return {
          _id: id,
          zone: newZone,
          positionX: existing?.positionX || 100,
          positionY: existing?.positionY || 100,
        };
      });
      await tableApi.bulkUpdateTableLayout(restaurantId, layoutItems);
      setSuccess(`Reassigned ${selectedTableIds.length} tables to ${newZone}.`);
      setSelectedTableIds([]);
      loadTables();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk zone reassign failed.');
    } finally {
      setIsBulkUpdating(false);
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

  // Handle Unmerge
  const handleUnmerge = async (table) => {
    if (!window.confirm(`Are you sure you want to unmerge Table #${table.tableNumber} seating group?`)) return;

    try {
      await tableApi.unmergeTables(restaurantId, table._id);
      setSuccess(`Table #${table.tableNumber} seating group unmerged successfully.`);
      loadTables();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to unmerge tables.';
      if (msg.includes('active orders') || msg.includes('ongoing diner session')) {
        if (window.confirm(`${msg}\n\nDo you want to FORCE unmerge this table group anyway?`)) {
          try {
            await tableApi.unmergeTables(restaurantId, table._id, true);
            setSuccess(`Table #${table.tableNumber} force unmerged successfully.`);
            loadTables();
            setTimeout(() => setSuccess(''), 3000);
          } catch (forceErr) {
            setError(forceErr.response?.data?.message || 'Force unmerge failed.');
          }
        }
      }
    }
  };

  // Save bulk layout positions from drag-and-drop architectural editor
  const handleSaveLayout = async (layoutItems, isBackground = false) => {
    if (!isBackground) setIsSavingLayout(true);

    // Optimistically update parent tables state immediately to prevent snap-back
    setTables((prev) =>
      prev.map((t) => {
        const tId = String(t._id || t.id);
        const updated = layoutItems.find((item) => String(item._id || item.id) === tId);
        return updated ? { ...t, ...updated } : t;
      })
    );

    try {
      console.log('[PARENT_SAVE_START] Sending bulkUpdateTableLayout API call...');
      const res = await tableApi.bulkUpdateTableLayout(restaurantId, layoutItems);
      console.log('[PARENT_SAVE_RESPONSE] Backend API response:', res);
      if (!isBackground) {
        setSuccess('Floor plan layout saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      if (!isBackground) setError(err.response?.data?.message || 'Failed to save floor plan layout.');
      loadTables(true); // Re-fetch silently on error to revert state
    } finally {
      if (!isBackground) setIsSavingLayout(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader label="Loading architectural layout..." />;
    }
    if (tables.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
          <Grid className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchDebounced || selectedStatusFilter !== 'all'
              ? 'No tables match your search filters.'
              : 'No dining tables configured yet.'}
          </p>
          {canManage && !searchDebounced && (
            <Button size="sm" onClick={() => navigate('/restaurant/tables/new')}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Table
            </Button>
          )}
        </div>
      );
    }
    if (viewMode === 'floorplan') {
      return (
        <ArchitecturalFloorPlan
          tables={tables}
          canManage={canManage}
          onStatusChange={handleStatusChange}
          onViewOrder={(t) => setSelectedOrderTable(t)}
          onQrClick={(t) => setSelectedQrTable(t)}
          onEditTable={(t) => navigate(`/restaurant/tables/${t._id}/edit`)}
          onSaveLayout={handleSaveLayout}
          isSavingLayout={isSavingLayout}
        />
      );
    }
    return (
      <div className="space-y-6">
        {/* Bulk Action Toolbar */}
        {selectedTableIds.length > 0 && canManage && (
          <div className="bg-primary/10 border border-primary/30 p-3 rounded-2xl flex items-center justify-between gap-3 flex-wrap animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-extrabold text-primary">
              <CheckSquare size={16} />
              <span>{selectedTableIds.length} Tables Selected</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Status Select */}
              <select
                onChange={(e) => {
                  handleBulkStatusChange(e.target.value);
                  e.target.value = '';
                }}
                disabled={isBulkUpdating}
                className="h-8 text-xs font-bold bg-background border border-border rounded-xl px-2 text-foreground"
              >
                <option value="">Bulk Update Status...</option>
                <option value="Available">Available (Empty)</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* Bulk Zone Select */}
              <select
                onChange={(e) => {
                  handleBulkZoneChange(e.target.value);
                  e.target.value = '';
                }}
                disabled={isBulkUpdating}
                className="h-8 text-xs font-bold bg-background border border-border rounded-xl px-2 text-foreground"
              >
                <option value="">Bulk Reassign Zone...</option>
                {ZONES_LIST.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTableIds([])}
                className="h-8 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground"
              >
                <X size={14} /> Clear Selection
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <TableCard
              key={table._id}
              table={table}
              isSelected={selectedTableIds.includes(table._id)}
              onToggleSelect={handleToggleSelect}
              isSelectionMode={selectedTableIds.length > 0}
              onEdit={(t) => navigate(`/restaurant/tables/${t._id}/edit`)}
              onDelete={handleDelete}
              onQrClick={(t) => setSelectedQrTable(t)}
              onStatusChange={handleStatusChange}
              onViewOrder={(t) => setSelectedOrderTable(t)}
              onUnmerge={handleUnmerge}
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
    );
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Manage your physical tables, floor architecture layouts, occupancy statuses, and scan QR codes."
    >
      <>
        <Card className="w-full">
          <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Tables &amp; Architectural Floor Plan</CardTitle>
              <CardDescription>Design restaurant floor layout, monitor dining seating in real-time, and download QR codes.</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              {/* Layout View Toggle Mode */}
              <div className="flex items-center h-10 bg-muted/70 p-1 rounded-2xl border border-border/60 shrink-0">
                <Button
                  variant={viewMode === 'floorplan' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('floorplan')}
                  className="h-8 text-xs font-bold rounded-xl gap-1.5 px-3.5"
                >
                  <Map size={14} /> Architectural Map
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 text-xs font-bold rounded-xl gap-1.5 px-3.5"
                >
                  <LayoutGrid size={14} /> Cards Grid
                </Button>
              </div>

              {canManage && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsMergeModalOpen(true)}
                    className="h-10 text-xs gap-1.5 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold rounded-2xl px-4 hover:bg-purple-500/10"
                  >
                    <Layers className="h-4 w-4 text-purple-500" /> Merge Tables
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/restaurant/tables/new')}
                    className="h-10 text-xs gap-1.5 font-bold rounded-2xl px-4 shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Table
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notifications */}
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

            {/* Search & Filter bar (Grid view mode & Global Filter) */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                  value={selectedStatusFilter}
                  onChange={(e) => {
                    setSelectedStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="Available">Available (Empty)</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Needs Attention">Needs Attention 🛎️</option>
                  <option value="Bill Requested">Bill Requested 💳</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* Main Layout Display View */}
            {renderContent()}
          </CardContent>
        </Card>

        {/* QR Code display Modal */}
        {selectedQrTable && (
          <QrCodeModal
            table={selectedQrTable}
            onClose={() => setSelectedQrTable(null)}
          />
        )}

        {/* Table Active Session Order Detail Modal */}
        {selectedOrderTable && (
          <TableOrderDetailModal
            isOpen={!!selectedOrderTable}
            onClose={() => setSelectedOrderTable(null)}
            table={selectedOrderTable}
            restaurantId={restaurantId}
          />
        )}

        {/* Merge Tables Modal */}
        <MergeTablesModal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          tables={tables}
          restaurantId={restaurantId}
          onSuccess={loadTables}
        />
      </>
    </RestaurantLayout>
  );
}

import { useState } from 'react';
import { Clock, Play, CheckSquare, AlertOctagon, Volume2, VolumeX, BellRing, Filter, Zap, Package, Flame } from 'lucide-react';

import KdsShell from '../components/KdsShell';
import KitchenQueue from '../components/KitchenQueue';
import KitchenTicketCard from '../components/KitchenTicketCard';
import KitchenTicketDetailModal from '../components/KitchenTicketDetailModal';
import KitchenStockDrawer from '../components/KitchenStockDrawer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import { useKitchenTickets } from '../hooks/useKitchenTickets';
import { playKitchenAlertSound } from '@/utils/soundAlert.util';

import BatchCookingSummary from '../components/BatchCookingSummary';

/**
 * KdsPage — Dedicated standalone Kitchen Display System (KDS) for Chefs.
 * Rendered inside KdsShell (without admin sidebar) and powered by useKitchenTickets hook.
 */
export default function KdsPage() {
  const {
    stations,
    selectedStation,
    setSelectedStation,
    stats,
    lanes,
    isLoading,
    error,
    socketConnected,
    isFullscreen,
    toggleFullscreen,
    handleStatusChange,
    handleTicketDrop,
    handleItemStatusChange,
    isMuted,
    toggleMute,
    hasVisualFlashSignal,
    isPeakMode,
    isPeakModeAuto,
    manualPeakOverride,
    togglePeakMode,
    atRiskCount,
    lateCount,
    restaurantId,
  } = useKitchenTickets();

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'preparing' | 'ready' | 'delayed'
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState(null);
  const [isStockDrawerOpen, setIsStockDrawerOpen] = useState(false);

  // Filtered tickets based on active status filter
  const filteredPreparingLanes = statusFilter === 'ready' ? [] : lanes.preparing.filter((t) => {
    if (statusFilter === 'delayed') {
      const start = new Date(t.createdAt);
      const diffMins = Math.floor((Date.now() - start.getTime()) / 60000);
      return t.status === 'Delayed' || t.priorityFlag === 'late' || t.priorityFlag === 'at-risk' || diffMins >= 15;
    }
    if (statusFilter === 'preparing') {
      return t.status === 'Preparing' || t.status === 'Pending';
    }
    return true;
  });

  const filteredReadyLanes = (statusFilter === 'preparing' || statusFilter === 'delayed') ? [] : lanes.ready;

  // Identify the single #1 most urgent ticket for Phase 1 One-Glance dominance
  const findLeadTicket = () => {
    if (filteredPreparingLanes.length === 0) return null;
    const late = filteredPreparingLanes.filter((t) => t.priorityFlag === 'late' || t.status === 'Delayed');
    if (late.length > 0) return late.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
    const atRisk = filteredPreparingLanes.filter((t) => t.priorityFlag === 'at-risk');
    if (atRisk.length > 0) return atRisk.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
    return filteredPreparingLanes[0];
  };

  const leadTicket = findLeadTicket();

  return (
    <KdsShell
      socketConnected={socketConnected}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    >
      <div className="space-y-4 select-none">
        {/* Hearing-Impaired Accessibility Visual Flash Alert Banner */}
        {hasVisualFlashSignal && (
          <div className="bg-amber-500 text-slate-950 px-6 py-3 rounded-2xl border-4 border-amber-300 flex items-center justify-between shadow-2xl animate-bounce">
            <div className="flex items-center gap-3 font-extrabold text-base sm:text-lg">
              <BellRing className="w-7 h-7 text-slate-950 animate-pulse shrink-0" />
              <span>🔔 NEW ORDER ARRIVED AT KITCHEN STATION!</span>
            </div>
            <span className="text-xs bg-slate-950 text-amber-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              Visual Alert Signal
            </span>
          </div>
        )}

        {/* Peak Mode Alert Banner */}
        {isPeakMode && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 font-extrabold text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <Zap className="h-5 w-5 text-amber-600 animate-pulse shrink-0" />
              <span>⚡ PEAK HOUR MODE ACTIVE — Ticket card density simplified & focus queue enabled for high scannability.</span>
            </div>
            <span className="text-[10px] font-mono font-extrabold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase">
              {isPeakModeAuto ? 'Auto Detected' : 'Manual Mode'}
            </span>
          </div>
        )}

        {/* Station, SLA & Control Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3.5 sm:p-4 rounded-2xl border border-border/80 shadow-xs">
          {/* Station Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full">
            {(stations || []).map((station) => (
              <button
                key={station}
                onClick={() => setSelectedStation(station)}
                className={`h-10 px-4 text-xs sm:text-sm font-bold rounded-xl shrink-0 transition-all touch-manipulation flex items-center justify-center border ${
                  selectedStation === station
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs font-extrabold'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border/80'
                }`}
              >
                {station}
              </button>
            ))}
          </div>

          {/* SLA Badges & Toggles */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Stock Tracking Drawer Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsStockDrawerOpen(true)}
              className="h-10 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 touch-manipulation cursor-pointer"
              title="Kitchen Stock Tracking & Auto-86 Controls"
            >
              <Package className="h-4 w-4" /> Stock & Auto-86
            </Button>

            {/* SLA Priority Summary Badges */}
            <div className="h-10 px-3.5 text-xs font-bold rounded-xl border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 flex items-center justify-center gap-1.5 shrink-0">
              ✓ SLA Active
            </div>
            {atRiskCount > 0 && (
              <div className="h-10 px-3.5 text-xs font-bold rounded-xl border border-amber-500/40 text-amber-900 dark:text-amber-100 bg-amber-500/20 flex items-center justify-center gap-1.5 shrink-0">
                ⚠️ {atRiskCount} At Risk
              </div>
            )}
            {lateCount > 0 && (
              <div className="h-10 px-3.5 text-xs font-bold rounded-xl border border-rose-500/40 text-rose-900 dark:text-rose-100 bg-rose-500/20 animate-pulse flex items-center justify-center gap-1.5 shrink-0">
                🚨 {lateCount} Late
              </div>
            )}

            {/* Peak Mode Toggle */}
            <Button
              size="sm"
              variant={isPeakMode ? 'default' : 'outline'}
              onClick={togglePeakMode}
              className={`h-10 px-3.5 text-xs font-bold gap-1.5 rounded-xl touch-manipulation cursor-pointer ${
                isPeakMode ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs border-amber-600' : 'border-border bg-card hover:bg-muted text-foreground'
              }`}
              title="Click to toggle Peak Mode between Auto detection and Manual override"
            >
              <Zap className="h-4 w-4" /> Peak Mode {manualPeakOverride === null ? `Auto (${isPeakMode ? 'ON' : 'OFF'})` : `Manual (${isPeakMode ? 'ON' : 'OFF'})`}
            </Button>

            {/* Sound Mute Toggle */}
            <Button
              size="sm"
              variant={isMuted ? 'destructive' : 'outline'}
              onClick={toggleMute}
              className={`h-10 px-3.5 text-xs font-bold gap-1.5 rounded-xl touch-manipulation cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 hover:bg-rose-500/25'
                  : 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
              title={isMuted ? 'Chime Muted (Visual Alerts Active)' : 'Chime Unmuted (Sound Alert Active)'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-600" /> : <Volume2 className="h-4 w-4 text-emerald-600" />}
              <span>{isMuted ? 'Muted' : 'Chime'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => playKitchenAlertSound()}
              className="h-10 px-3.5 text-xs font-bold gap-1.5 border-amber-500/30 text-amber-800 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl touch-manipulation cursor-pointer"
              title="Test Kitchen Order Bell Sound"
            >
              <BellRing className="h-4 w-4 text-amber-600" /> Bell
            </Button>
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 shrink-0 mr-1">
            <Filter size={15} /> Filter Tickets:
          </span>
          {[
            { id: 'all', label: 'All Tickets' },
            { id: 'preparing', label: 'Preparing / Cooking' },
            { id: 'ready', label: 'Ready for Service' },
            { id: 'delayed', label: 'Delayed / SLA At-Risk ⚠️' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`h-10 px-4 text-xs sm:text-sm font-extrabold rounded-xl shrink-0 transition-all border touch-manipulation ${
                statusFilter === filter.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border/80'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-bold text-destructive">
            {error}
          </div>
        )}

        {/* Top KPI Metrics Bar */}
        {!isLoading && stats && (
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <Card className="border border-border/80 border-l-4 border-l-amber-500 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-2.5 sm:p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Preparing Tickets
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-sans text-foreground tracking-tight mt-0.5">{stats.preparingTickets || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                  <Play className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 border-l-4 border-l-purple-500 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-2.5 sm:p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Ready For Pickup
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-sans text-foreground tracking-tight mt-0.5">{stats.readyTickets || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
                  <CheckSquare className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 border-l-4 border-l-rose-500 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-2.5 sm:p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Delayed / Overdue
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-sans text-foreground tracking-tight mt-0.5">{stats.delayedTickets || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertOctagon className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 border-l-4 border-l-blue-500 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-2.5 sm:p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Avg Prep Duration
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-sans text-foreground tracking-tight mt-0.5">
                    {stats.averagePrepTimeMinutes ? `${stats.averagePrepTimeMinutes}m` : '0m'}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Smart Batch Preparation Console */}
        {!isLoading && (
          <BatchCookingSummary
            stationName={selectedStation}
            tickets={lanes.preparing}
            onItemStatusChange={handleItemStatusChange}
          />
        )}

        {/* Drag-and-Drop Ticket Queue Lanes (2-Lane Workflow: Preparing -> Ready for Service) */}
        {isLoading ? (
          <Loader label="Opening KDS display console..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KitchenQueue
              title="Preparing (Cooking)"
              status="Preparing"
              tickets={filteredPreparingLanes}
              onTicketDrop={handleTicketDrop}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
              onSelectTicket={(t) => setSelectedTicketForDetail(t)}
              isPeakMode={isPeakMode}
            />

            <KitchenQueue
              title="Ready for Service"
              status="Ready"
              tickets={filteredReadyLanes}
              onTicketDrop={handleTicketDrop}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
              onSelectTicket={(t) => setSelectedTicketForDetail(t)}
              isPeakMode={isPeakMode}
            />
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      <KitchenTicketDetailModal
        ticket={selectedTicketForDetail}
        isOpen={Boolean(selectedTicketForDetail)}
        onClose={() => setSelectedTicketForDetail(null)}
        onStatusChange={handleStatusChange}
        onItemStatusChange={handleItemStatusChange}
        elapsed="Live"
      />

      {/* Kitchen Stock Drawer */}
      <KitchenStockDrawer
        isOpen={isStockDrawerOpen}
        onClose={() => setIsStockDrawerOpen(false)}
        restaurantId={restaurantId}
      />
    </KdsShell>
  );
}

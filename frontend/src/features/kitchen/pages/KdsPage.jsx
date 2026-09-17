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
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 sm:p-5 rounded-3xl border-2 border-border shadow-md">
          {/* Station Tabs */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
            {(stations || []).map((station) => (
              <button
                key={station}
                onClick={() => setSelectedStation(station)}
                className={`px-5 py-2.5 text-base font-black rounded-2xl shrink-0 transition-all min-h-[48px] touch-manipulation flex items-center justify-center border-2 ${
                  selectedStation === station
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
                }`}
              >
                {station}
              </button>
            ))}
          </div>

          {/* SLA Badges & Toggles */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Stock Tracking Drawer Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsStockDrawerOpen(true)}
              className="h-12 px-4 text-sm font-black gap-2 rounded-2xl border-2 border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 touch-manipulation min-h-[48px]"
              title="Kitchen Stock Tracking & Auto-86 Controls"
            >
              <Package className="h-5 w-5" /> Stock & Auto-86
            </Button>

            {/* SLA Priority Summary Badges */}
            <div className="flex items-center gap-2 bg-muted p-1.5 rounded-2xl border-2 border-border">
              <span className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-200 px-3 py-1.5 bg-emerald-500/20 rounded-xl border border-emerald-500/40">
                ✓ SLA Active
              </span>
              {atRiskCount > 0 && (
                <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-100 px-3 py-1.5 bg-amber-500/25 rounded-xl border border-amber-500/50">
                  ⚠️ {atRiskCount} At Risk
                </span>
              )}
              {lateCount > 0 && (
                <span className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-100 px-3 py-1.5 bg-rose-500/25 rounded-xl border border-rose-500/50 animate-pulse">
                  🚨 {lateCount} Late
                </span>
              )}
            </div>

            {/* Peak Mode Toggle */}
            <Button
              size="sm"
              variant={isPeakMode ? 'default' : 'outline'}
              onClick={togglePeakMode}
              className={`h-12 px-4 text-sm font-black gap-2 rounded-2xl touch-manipulation min-h-[48px] ${
                isPeakMode ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md' : 'border-2 border-border'
              }`}
            >
              <Zap className="h-5 w-5" /> Peak Mode {isPeakMode ? 'ON' : 'OFF'}
            </Button>

            {/* Sound Mute Toggle */}
            <Button
              size="sm"
              variant={isMuted ? 'destructive' : 'outline'}
              onClick={toggleMute}
              className={`h-12 px-4 text-sm font-black gap-2 rounded-2xl border-2 touch-manipulation min-h-[48px] ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-600 border-rose-500/50 hover:bg-rose-500/30'
                  : 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
              title={isMuted ? 'Chime Muted (Visual Alerts Active)' : 'Chime Unmuted (Sound Alert Active)'}
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-rose-600" /> : <Volume2 className="h-5 w-5 text-emerald-600" />}
              <span>{isMuted ? 'Muted' : 'Chime'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => playKitchenAlertSound()}
              className="h-12 px-4 text-sm gap-2 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 font-black rounded-2xl touch-manipulation min-h-[48px]"
              title="Test Kitchen Order Bell Sound"
            >
              <BellRing className="h-5 w-5 text-amber-600" /> Bell
            </Button>
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs sm:text-sm font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 shrink-0 mr-1">
            <Filter size={16} /> Filter Tickets:
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
              className={`px-4 py-2.5 text-sm font-black rounded-2xl shrink-0 transition-all border-2 min-h-[48px] touch-manipulation ${
                statusFilter === filter.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-md font-black scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
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
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-8 border-l-amber-500 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Preparing Tickets
                  </span>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground mt-0.5">{stats.preparingTickets || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Play className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-8 border-l-purple-500 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Ready For Pickup
                  </span>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground mt-0.5">{stats.readyTickets || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
                  <CheckSquare className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-8 border-l-rose-500 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Delayed / Overdue
                  </span>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground mt-0.5">{stats.delayedTickets || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
                  <AlertOctagon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-8 border-l-blue-500 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Avg Prep Duration
                  </span>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground mt-0.5">
                    {stats.averagePrepTimeMinutes ? `${stats.averagePrepTimeMinutes}m` : '0m'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Phase 1 One-Glance Lead Ticket Hero Section */}
        {!isLoading && leadTicket && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm uppercase tracking-wider pl-1">
              <Flame className="h-5 w-5 animate-pulse" />
              <span>1-Second Glance Priority Focus (Lead Ticket)</span>
            </div>
            <KitchenTicketCard
              ticket={leadTicket}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
              onSelectTicket={(t) => setSelectedTicketForDetail(t)}
              isLeadTicket={true}
              isPeakMode={isPeakMode}
            />
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

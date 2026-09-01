import { useState } from 'react';
import { Clock, Play, CheckSquare, AlertOctagon, Volume2, VolumeX, BellRing, Filter, Eye } from 'lucide-react';
import KdsShell from '../components/KdsShell';
import KitchenQueue from '../components/KitchenQueue';
import KitchenTicketDetailModal from '../components/KitchenTicketDetailModal';
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
  } = useKitchenTickets();

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'preparing' | 'ready' | 'delayed'
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState(null);

  // Filtered tickets based on active status filter
  const filteredPreparingLanes = statusFilter === 'ready' ? [] : lanes.preparing.filter((t) => {
    if (statusFilter === 'delayed') {
      const start = new Date(t.createdAt);
      const diffMins = Math.floor((Date.now() - start.getTime()) / 60000);
      return t.status === 'Delayed' || diffMins >= 15;
    }
    if (statusFilter === 'preparing') {
      return t.status === 'Preparing' || t.status === 'Pending';
    }
    return true;
  });

  const filteredReadyLanes = (statusFilter === 'preparing' || statusFilter === 'delayed') ? [] : lanes.ready;

  return (
    <KdsShell
      socketConnected={socketConnected}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    >
      <div className="space-y-5 select-none">
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

        {/* Station & Sound Controls Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
          {/* Station Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
            {(stations || []).map((station) => (
              <button
                key={station}
                onClick={() => setSelectedStation(station)}
                className={`px-4 py-2 text-sm font-extrabold rounded-xl shrink-0 transition-all min-h-[44px] touch-manipulation flex items-center justify-center ${
                  selectedStation === station
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {station}
              </button>
            ))}
          </div>

          {/* Sound Mute Toggle & Bell Test Control */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={isMuted ? 'destructive' : 'outline'}
              onClick={toggleMute}
              className={`h-11 px-4 text-xs sm:text-sm font-bold gap-2 rounded-xl border touch-manipulation min-h-[44px] ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-600 border-rose-500/40 hover:bg-rose-500/30'
                  : 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
              title={isMuted ? 'Chime Muted (Visual Alerts Active)' : 'Chime Unmuted (Sound Alert Active)'}
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-rose-600" /> : <Volume2 className="h-5 w-5 text-emerald-600" />}
              <span>{isMuted ? 'Muted' : 'Chime Active'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => playKitchenAlertSound()}
              className="h-11 px-4 text-xs sm:text-sm gap-2 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 font-bold rounded-xl touch-manipulation min-h-[44px]"
              title="Test Kitchen Order Bell Sound"
            >
              <BellRing className="h-5 w-5 text-amber-600" /> Test Bell
            </Button>
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter size={14} /> Filter Tickets:
          </span>
          {[
            { id: 'all', label: 'All Tickets' },
            { id: 'preparing', label: 'Preparing / Cooking' },
            { id: 'ready', label: 'Ready for Service' },
            { id: 'delayed', label: 'Delayed / Overdue ⚠️' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl shrink-0 transition-all border min-h-[40px] touch-manipulation ${
                statusFilter === filter.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs font-extrabold'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
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

        {/* KDS Stats Widget Counters */}
        {!isLoading && stats && (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-8 border-l-orange-500 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Preparing Tickets
                  </span>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground mt-0.5">{stats.preparingTickets || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
                  <Play className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-8 border-l-purple-500 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Ready Tickets
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
                    Delayed Tickets
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
            />

            <KitchenQueue
              title="Ready for Service"
              status="Ready"
              tickets={filteredReadyLanes}
              onTicketDrop={handleTicketDrop}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
              onSelectTicket={(t) => setSelectedTicketForDetail(t)}
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
    </KdsShell>
  );
}

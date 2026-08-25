import { Clock, Play, CheckSquare, AlertOctagon, Volume2 } from 'lucide-react';
import KdsShell from '../components/KdsShell';
import KitchenQueue from '../components/KitchenQueue';
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
  } = useKitchenTickets();

  return (
    <KdsShell
      socketConnected={socketConnected}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    >
      <div className="space-y-5">
        {/* Station Controls Header Bar */}
        <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
          {/* Station Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(stations || []).map((station) => (
              <button
                key={station}
                onClick={() => setSelectedStation(station)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                  selectedStation === station
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {station}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => playKitchenAlertSound()}
            className="text-xs gap-1.5 border-amber-500/30 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 shrink-0 font-semibold"
            title="Test Kitchen Order Bell Sound"
          >
            <Volume2 className="h-4 w-4 text-amber-600" /> Test Bell Sound
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* KDS Stats Widget Counters */}
        {!isLoading && stats && (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-orange-500 shadow-xs">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Preparing Tickets
                  </span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.preparingTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center">
                  <Play className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-xs">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Ready Tickets
                  </span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.readyTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-purple-500/15 text-purple-600 flex items-center justify-center">
                  <CheckSquare className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500 shadow-xs">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Delayed Tickets
                  </span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.delayedTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center">
                  <AlertOctagon className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-xs">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Avg Prep Duration
                  </span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                    {stats.averagePrepTimeMinutes ? `${stats.averagePrepTimeMinutes}m` : '0m'}
                  </p>
                </div>
                <div className="h-7 w-7 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <KitchenQueue
              title="Preparing (Cooking)"
              status="Preparing"
              tickets={lanes.preparing}
              onTicketDrop={handleTicketDrop}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
            />

            <KitchenQueue
              title="Ready for Service"
              status="Ready"
              tickets={lanes.ready}
              onTicketDrop={handleTicketDrop}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
            />
          </div>
        )}
      </div>
    </KdsShell>
  );
}

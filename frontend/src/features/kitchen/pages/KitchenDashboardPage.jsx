import { ChefHat, Maximize, Minimize, Clock, Play, CheckSquare, AlertOctagon } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import KitchenQueue from '../components/KitchenQueue';
import { useKitchenTickets, STATIONS } from '../hooks/useKitchenTickets';

export default function KitchenDashboardPage() {
  const {
    selectedStation,
    setSelectedStation,
    stats,
    lanes,
    isLoading,
    error,
    socketConnected,
    isFullscreen,
    toggleFullscreen,
  } = useKitchenTickets();

  return (
    <RestaurantLayout
      title="Kitchen Live Monitor"
      description="Live, read-only view of active kitchen tickets across cooking stations."
    >
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs font-semibold text-muted-foreground">
              {socketConnected ? 'Kitchen Monitor Online (Read-Only)' : 'Offline'}
            </span>
          </div>

          <Button size="xs" variant="outline" onClick={toggleFullscreen} className="h-8 gap-1">
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            Fullscreen Monitor
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* KDS Stats widgets */}
        {!isLoading && stats && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Pending Tickets</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.pendingTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ChefHat className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Preparing Tickets</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.preparingTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center">
                  <Play className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Ready Tickets</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.readyTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">
                  <CheckSquare className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Delayed Tickets</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.delayedTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center">
                  <AlertOctagon className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 col-span-2 lg:col-span-1">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Avg Prep Duration</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                    {stats.averagePrepTimeMinutes ? `${stats.averagePrepTimeMinutes}m` : '0m'}
                  </p>
                </div>
                <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Station Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/40">
          {STATIONS.map((station) => (
            <button
              key={station}
              onClick={() => setSelectedStation(station)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg shrink-0 border-b-2 transition-all ${
                selectedStation === station
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {station}
            </button>
          ))}
        </div>

        {/* Drag-and-Drop Columns Board */}
        {isLoading ? (
          <Loader label="Opening Kitchen Monitor..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KitchenQueue
              title="Pending Confirmation"
              status="Pending"
              tickets={lanes.pending}
              isReadOnly={true}
            />

            <KitchenQueue
              title="Preparing (Cooking)"
              status="Preparing"
              tickets={lanes.preparing}
              isReadOnly={true}
            />

            <KitchenQueue
              title="Ready for Service"
              status="Ready"
              tickets={lanes.ready}
              isReadOnly={true}
            />
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}

import { useNavigate } from 'react-router-dom';
import { ChefHat, Maximize, Minimize, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import * as authApi from '@/features/auth/api/auth.api';

/**
 * KdsShell — A minimal, dedicated full-screen shell for Kitchen Display System (KDS).
 * Does not render the main admin sidebar. Displays a slim top bar with logo,
 * real-time socket status indicator, fullscreen toggle, chef info, and logout action.
 */
export default function KdsShell({ socketConnected, isFullscreen, onToggleFullscreen, children }) {
  const navigate = useNavigate();
  const { user, restaurant, clearSession } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans select-none">
      {/* Persistent Socket Reconnecting Strip */}
      {!socketConnected && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md animate-pulse sticky top-0 z-50">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping shrink-0" />
          <span>Reconnecting to Kitchen Socket Server... Visual display stays active.</span>
        </div>
      )}

      {/* Slim Top Bar Header */}
      <header className="h-16 border-b border-border bg-card sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
              DineSync <span className="text-foreground">AI</span>
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1.5">
              <ChefHat className="h-4 w-4" /> Chef KDS
            </span>
          </div>

          {restaurant && (
            <span className="hidden md:inline-block text-sm font-bold text-muted-foreground border-l border-border pl-3">
              {restaurant.name}
            </span>
          )}
        </div>

        {/* Center Persistent Live Socket Connection Badge */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border font-bold text-xs ${
          socketConnected
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
            : 'bg-amber-500/15 text-amber-600 border-amber-500/40 animate-pulse'
        }`}>
          <span className={`inline-flex h-3 w-3 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
          <span>
            {socketConnected ? 'KDS Live Online' : 'Reconnecting...'}
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {user && (
            <span className="hidden lg:inline-block text-xs text-muted-foreground mr-1">
              Chef: <strong className="text-foreground font-bold">{user.name}</strong>
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onToggleFullscreen}
            className="h-10 px-3 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted touch-manipulation min-h-[40px]"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleLogout}
            className="h-10 px-3 text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5 rounded-xl touch-manipulation min-h-[40px]"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>

      {/* Main KDS Workspace Body */}
      <main className="flex-1 p-4 sm:p-6 max-w-[1800px] w-full mx-auto">
        {children}
      </main>
    </div>
  );
}

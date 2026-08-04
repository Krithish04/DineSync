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
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans">
      {/* Slim Top Bar Header */}
      <header className="h-14 border-b border-border bg-card sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 shadow-xs select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-primary tracking-tight">
              DineSync <span className="text-foreground">AI</span>
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1">
              <ChefHat className="h-3 w-3" /> Chef KDS
            </span>
          </div>

          {restaurant && (
            <span className="hidden md:inline-block text-xs font-semibold text-muted-foreground border-l border-border pl-3">
              {restaurant.name}
            </span>
          )}
        </div>

        {/* Center Live Socket Connection Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-xs font-semibold text-muted-foreground">
            {socketConnected ? 'KDS Live Online' : 'Offline'}
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {user && (
            <span className="hidden lg:inline-block text-xs text-muted-foreground mr-1">
              Chef: <strong className="text-foreground font-semibold">{user.name}</strong>
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onToggleFullscreen}
            className="h-8 text-xs gap-1.5"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleLogout}
            className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
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

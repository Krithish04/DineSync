import { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('dinesync_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('dinesync_cookie_consent', JSON.stringify({ choice: 'all', timestamp: new Date().toISOString() }));
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('dinesync_cookie_consent', JSON.stringify({ choice: 'essential', timestamp: new Date().toISOString() }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-slide-up">
      <div className="bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-2xl space-y-4 text-foreground">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="space-y-1 pr-4">
            <h4 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
              Cookie & Privacy Notice <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use essential cookies and session storage to remember your table context, maintain active orders, and provide AI recommendations.
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 justify-end pt-1 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDecline}
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            Essential Only
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleAccept}
            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Check className="h-3.5 w-3.5" /> Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}

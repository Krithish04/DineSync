import { useState } from 'react';
import { QrCode, ExternalLink, Download, Copy, Check, Info, Sparkles, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ReservationQrCard({ restaurantId, restaurantName }) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const effectiveId = restaurantId || '';
  
  // Table-independent reservation booking URL
  const bookingUrl = `${window.location.origin}/book/${effectiveId}`;

  // High-density QR code source URL from api.qrserver.com
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
    bookingUrl
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `restaurant-reservation-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.open(qrImageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="border border-purple-500/20 bg-gradient-to-br from-card via-card to-purple-500/5 shadow-xs overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar size={22} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>Shareable Reservation QR Code</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  Restaurant-Wide
                </span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Share on your website, Instagram, Google Maps, or signage to allow diners to book tables in advance.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Purpose Clarity Alert */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-100">
            <Info size={15} className="shrink-0 text-blue-600" />
            <span>How is this different from Table QR Codes?</span>
          </div>
          <p className="text-[11px] text-blue-700/90 dark:text-blue-300/90 leading-relaxed">
            • <strong>Reservation QR Code (This Code):</strong> Table-independent. Diners scan from social media or flyers to reserve a table before visiting.
            <br />
            • <strong>Table QR Codes (Floor Plan / Tables):</strong> Specific to individual physical tables (e.g. Table #4). Printed and placed on tables for instant menu ordering.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-border shadow-xs max-w-[200px] mx-auto sm:mx-0">
            <img
              src={qrImageUrl}
              alt={`Reservation QR Code for ${restaurantName || 'Restaurant'}`}
              className="w-40 h-40 object-contain"
            />
            <span className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">Scan to Reserve</span>
          </div>

          {/* Details & Actions */}
          <div className="sm:col-span-2 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Sparkles size={13} className="text-purple-500" /> Direct Booking Link
              </label>
              <div className="rounded-lg border border-border bg-muted/40 p-2.5 flex items-center justify-between gap-2 text-xs font-mono text-foreground break-all">
                <span className="truncate select-all text-purple-600 dark:text-purple-400 font-semibold">{bookingUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1 rounded text-muted-foreground hover:text-primary transition-colors shrink-0"
                  title="Copy Direct URL"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleDownload}
                isLoading={isDownloading}
                className="text-xs gap-1.5 font-bold"
              >
                <Download className="h-3.5 w-3.5" /> Download QR Code
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs gap-1.5 font-semibold"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(bookingUrl, '_blank')}
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Test Link
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

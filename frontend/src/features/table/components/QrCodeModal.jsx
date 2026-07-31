import { useState } from 'react';
import { X, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QrCodeModal({ table, onClose }) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!table) return null;

  // Short QR code URL format (/t/:tableId)
  const shortQrUrl = `${window.location.origin}/t/${table._id}`;

  // Generate high-density QR Code image source URL (350x350px, PNG)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
    shortQrUrl
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shortQrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Fetch the image as a blob to allow direct download
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-${table.tableNumber}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: Open in new tab if CORS or other issues block fetch
      window.open(qrImageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl animate-scale-up text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="font-display text-lg font-bold text-foreground">
          Table {table.tableNumber} QR Code
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customers can scan this code to access digital ordering.
        </p>

        {/* QR Code Frame */}
        <div className="my-6 mx-auto flex h-52 w-52 items-center justify-center rounded-lg border border-border bg-white p-3 shadow-inner">
          <img
            src={qrImageUrl}
            alt={`QR Code for Table ${table.tableNumber}`}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Short URL display */}
        <div className="rounded border border-border bg-muted/20 p-2.5 mb-5 text-left text-xs font-mono text-muted-foreground break-all flex items-center justify-between gap-2">
          <span className="truncate select-all font-bold text-primary">{shortQrUrl}</span>
          <button
            onClick={handleCopyLink}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            title="Copy URL"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(shortQrUrl, '_blank')}
            className="flex-1 text-xs gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Test Link
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
            isLoading={isDownloading}
            className="flex-1 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Download QR
          </Button>
        </div>
      </div>
    </div>
  );
}

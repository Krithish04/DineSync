import { useState, useEffect } from 'react';
import { Mail, MessageSquare, PhoneCall, Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import * as notificationApi from '../api/notification.api';

export default function NotificationPreferences() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [prefs, setPrefs] = useState({
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
    criticalAlertsOnly: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!restaurantId) return;
      try {
        const data = await notificationApi.getPreferences(restaurantId);
        if (data) setPrefs(data);
      } catch { /* non-fatal */ }
    };
    load();
  }, [restaurantId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    try {
      await notificationApi.updatePreferences(restaurantId, prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* non-fatal */ } finally {
      setIsSaving(false);
    }
  };

  const toggle = (key) => setPrefs({ ...prefs, [key]: !prefs[key] });

  return (
    <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold font-display text-foreground">Multi-Channel Delivery Preferences</h3>

      <div className="space-y-3 text-xs">
        {[
          { key: 'emailEnabled', label: 'Email Notifications', desc: 'Daily digests, reservation confirmations, invoice PDFs', icon: Mail },
          { key: 'smsEnabled', label: 'SMS Alerts', desc: 'Order status updates & OTP verification messages', icon: PhoneCall },
          { key: 'whatsappEnabled', label: 'WhatsApp Messaging', desc: 'Bills, reservation reminders, and order receipts', icon: MessageSquare },
          { key: 'pushEnabled', label: 'Web Push Notifications', desc: 'Browser desktop notifications for new orders & kitchen tickets', icon: Bell },
          { key: 'inAppEnabled', label: 'In-App Dashboard Alerts', desc: 'Real-time header bell badges & alert center logs', icon: Bell },
        ].map((ch) => {
          const Icon = ch.icon;
          return (
            <label
              key={ch.key}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-primary" />
                <div>
                  <p className="font-semibold text-foreground">{ch.label}</p>
                  <p className="text-[10px] text-muted-foreground">{ch.desc}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs[ch.key]}
                onChange={() => toggle(ch.key)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        {saved && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check size={14} /> Preferences Saved!</span>}
        <Button type="submit" disabled={isSaving} size="sm" className="ml-auto text-xs">
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </form>
  );
}

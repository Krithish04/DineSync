import { useState, useEffect } from 'react';
import { Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import useAuthStore from '@/features/auth/store/auth.store';
import * as notificationApi from '../api/notification.api';

export default function ScheduledJobsMonitor() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadJobs = async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const data = await notificationApi.getJobLogs(restaurantId);
      setJobs(data || []);
    } catch { /* non-fatal */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, [restaurantId]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="text-primary" size={18} />
          <h3 className="text-sm font-bold font-display text-foreground">Background Cron Jobs Runner</h3>
        </div>
        <button onClick={loadJobs} title="Refresh Jobs Status" className="text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {jobs.map((job) => (
          <div key={job.id} className="border border-border rounded-xl p-3 bg-muted/20 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-foreground">{job.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {job.status}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Cron: <code className="font-mono">{job.schedule}</code></p>
            <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
              <span>Next: {job.nextRun}</span>
              <span>Last: {new Date(job.lastRun).toLocaleTimeString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

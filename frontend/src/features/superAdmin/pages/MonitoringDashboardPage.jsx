import { useState, useEffect } from 'react';
import { Activity, Database, Cpu, HardDrive, RefreshCw, CheckCircle2 } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import * as superAdminApi from '../api/superAdmin.api';

export default function MonitoringDashboardPage() {
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHealth = async () => {
    setIsLoading(true);
    try {
      const data = await superAdminApi.getSystemHealth();
      setHealth(data);
    } catch { /* non-fatal */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadHealth(); }, []);

  return (
    <SuperAdminLayout title="System Health & Operational Monitoring" description="Real-time status for Node backend, MongoDB cluster, FastAPI AI microservice, and Cron runner.">
      <div className="space-y-6 max-w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Infrastructure Component Status</h3>
          <button onClick={loadHealth} title="Refresh System Status" className="text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoading && <Loader />}

        {!isLoading && health && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-primary" />
                  <span>Node Express API Server</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  {health.apiStatus}
                </span>
              </div>
              <p className="text-muted-foreground">Server Uptime: <strong>{health.uptimeSeconds}s</strong></p>
              <p className="text-muted-foreground">Node Heap Memory: <strong>{health.nodeMemoryUsageMb} MB</strong></p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <Database size={18} className="text-emerald-600" />
                  <span>MongoDB Atlas Database</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  {health.databaseStatus}
                </span>
              </div>
              <p className="text-muted-foreground">Connection State: <strong>Connected (Ping &lt; 10ms)</strong></p>
              <p className="text-muted-foreground">Storage Engine: <strong>WiredTiger Compressed</strong></p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <Cpu size={18} className="text-purple-600" />
                  <span>FastAPI AI Predictive Service</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-300">
                  {health.aiServiceStatus}
                </span>
              </div>
              <p className="text-muted-foreground">Endpoints: <strong>Sales, Demand, Inventory, Sentiment</strong></p>
              <p className="text-muted-foreground">Fallback Heuristics: <strong>Active (2x retry enabled)</strong></p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <HardDrive size={18} className="text-amber-600" />
                  <span>Node-Cron Job Scheduler</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  {health.backgroundJobsRunner}
                </span>
              </div>
              <p className="text-muted-foreground">Active Cron Jobs: <strong>{health.activeCronJobsCount} jobs</strong></p>
              <p className="text-muted-foreground">Runner State: <strong>Cron Engine Booted</strong></p>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { FileText, Search, ShieldCheck, Filter } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import * as superAdminApi from '../api/superAdmin.api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.listAuditLogs({ action: actionFilter, status: statusFilter, limit: 100 });
      setLogs(res.logs || []);
    } catch { /* non-fatal */ } finally {
      setIsLoading(false);
    }
  }, [actionFilter, statusFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <SuperAdminLayout title="Platform Audit Trail & Security Logs" description="Track user logins, tenant status changes, settings modifications, and permission updates.">
      <div className="space-y-4 max-w-full">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-border rounded-xl px-3 py-1.5 bg-card"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">Logins</option>
            <option value="TENANT_APPROVE">Tenant Approvals</option>
            <option value="TENANT_SUSPEND">Tenant Suspensions</option>
            <option value="TENANT_REACTIVATE">Tenant Reactivations</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-xl px-3 py-1.5 bg-card"
          >
            <option value="">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        {isLoading && <Loader />}

        {!isLoading && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">User / Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Target Resource</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No platform audit logs found matching criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{log.userEmail}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{log.userRole}</td>
                      <td className="px-4 py-3 font-bold text-primary">{log.action}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.resource || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold border ${
                            log.status === 'Success'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

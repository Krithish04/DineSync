import React from 'react';
import { Building2, MapPin, Layers } from 'lucide-react';
import useBranchStore from '@/store/branch.store';
import useAuthStore from '@/features/auth/store/auth.store';

export default function BranchContextBadge({ className = '' }) {
  const { selectedBranchId, setSelectedBranchId, branches } = useBranchStore();
  const { user } = useAuthStore();
  const role = user?.role || 'manager';
  const isAdmin = ['owner', 'super_admin'].includes(role);

  const userBranchId = user?.branch?._id || user?.branch || user?.assignedBranch;
  const effectiveBranchId = !isAdmin
    ? (userBranchId || (selectedBranchId !== 'all' ? selectedBranchId : (Array.isArray(branches) && branches.length > 0 ? branches[0]._id : undefined)))
    : selectedBranchId;

  const currentBranch = Array.isArray(branches)
    ? branches.find((b) => String(b._id) === String(effectiveBranchId))
    : null;

  const isAll = isAdmin && (!selectedBranchId || selectedBranchId === 'all');

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-2xs ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {isAll ? <Building2 size={16} /> : <MapPin size={16} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isAdmin ? 'Branch Scope' : 'Assigned Branch'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Layers size={10} />
              {isAll ? 'Chain Aggregate' : currentBranch?.branchCode || currentBranch?.code || 'Single Branch'}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {isAll ? 'All Branches (Overall Chain Performance)' : currentBranch?.branchName || currentBranch?.name || 'Assigned Branch'}
          </p>
        </div>
      </div>

      {isAdmin && Array.isArray(branches) && branches.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="branch-badge-select" className="text-xs font-medium text-muted-foreground hidden sm:inline">
            Filter Branch:
          </label>
          <select
            id="branch-badge-select"
            value={selectedBranchId || 'all'}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="text-xs font-semibold bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
          >
            <option value="all">🏢 All Branches (Chain View)</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                📍 {b.branchName || b.name} ({b.branchCode || b.code || 'Branch'})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

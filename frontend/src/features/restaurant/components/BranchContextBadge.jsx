import React from 'react';
import { Building2, MapPin, Layers } from 'lucide-react';
import useBranchStore from '@/store/branch.store';

export default function BranchContextBadge({ className = '' }) {
  const { selectedBranchId, setSelectedBranchId, branches } = useBranchStore();

  const currentBranch = Array.isArray(branches)
    ? branches.find((b) => b._id === selectedBranchId)
    : null;

  const isAll = !selectedBranchId || selectedBranchId === 'all';

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-2xs ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {isAll ? <Building2 size={16} /> : <MapPin size={16} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch Scope</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Layers size={10} />
              {isAll ? 'Chain Aggregate' : currentBranch?.branchCode || 'Single Branch'}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {isAll ? 'All Branches (Overall Chain Performance)' : currentBranch?.branchName || currentBranch?.name || 'Selected Branch'}
          </p>
        </div>
      </div>

      {Array.isArray(branches) && branches.length > 0 && (
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
                📍 {b.branchName || b.name} ({b.branchCode || 'Branch'})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

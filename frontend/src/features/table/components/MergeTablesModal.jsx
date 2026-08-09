import { useState, useEffect } from 'react';
import { X, Layers, Users, CheckCircle2, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import * as tableApi from '../api/table.api';

export default function MergeTablesModal({ isOpen, onClose, tables = [], restaurantId, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [primaryId, setPrimaryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Available candidate tables for merging (not already secondary tables mergedInto somewhere else)
  const candidateTables = tables.filter((t) => !t.mergedInto && t.status !== 'Inactive');

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setPrimaryId('');
      setError('');
    }
  }, [isOpen]);

  // Auto-set default Primary Table to the table with highest capacity among selected
  useEffect(() => {
    if (selectedIds.length > 0) {
      const selectedObjList = candidateTables.filter((t) => selectedIds.includes(t._id));
      if (selectedObjList.length > 0) {
        // Find table with highest capacity
        const highestCapTable = selectedObjList.reduce((max, t) => (t.capacity > max.capacity ? t : max), selectedObjList[0]);
        if (!selectedIds.includes(primaryId)) {
          setPrimaryId(highestCapTable._id);
        }
      }
    } else {
      setPrimaryId('');
    }
  }, [selectedIds, candidateTables, primaryId]);

  if (!isOpen) return null;

  const toggleTableSelection = (tableId) => {
    setSelectedIds((prev) => {
      if (prev.includes(tableId)) {
        const next = prev.filter((id) => id !== tableId);
        if (primaryId === tableId) {
          setPrimaryId(next[0] || '');
        }
        return next;
      } else {
        return [...prev, tableId];
      }
    });
  };

  const selectedTables = candidateTables.filter((t) => selectedIds.includes(t._id));
  const combinedCapacity = selectedTables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const secondaryIds = selectedIds.filter((id) => id !== primaryId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length < 2) {
      setError('Please select at least 2 tables to merge into a seating group.');
      return;
    }
    if (!primaryId) {
      setError('Please select a Primary Table for this seating group.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await tableApi.mergeTables(restaurantId, primaryId, secondaryIds);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to merge tables.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Layers size={22} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Merge Tables into Seating Group</h3>
            <p className="text-xs text-muted-foreground">Combine multiple physical tables for large dining parties.</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Operational Guidance */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-purple-800 dark:text-purple-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert size={14} className="text-purple-600" />
            <span>Primary &amp; Secondary Table Setup</span>
          </div>
          <p className="text-[11px] text-purple-700/90 dark:text-purple-300/90 leading-relaxed">
            All orders, sessions, and billing will map directly to the <strong>Primary Table</strong>. Scanning any secondary table's QR code automatically redirects diners to the primary table's session.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Table Selection Grid */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">1. Select Tables to Combine (Choose 2+)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 border border-border rounded-xl">
              {candidateTables.map((t) => {
                const isSelected = selectedIds.includes(t._id);
                return (
                  <div
                    key={t._id}
                    onClick={() => toggleTableSelection(t._id)}
                    className={`cursor-pointer rounded-xl p-2.5 border text-xs transition-all flex flex-col justify-between space-y-1 select-none ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/10 font-bold text-foreground shadow-xs'
                        : 'border-border bg-muted/20 hover:border-primary/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Table #{t.tableNumber}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded accent-purple-600 h-3.5 w-3.5"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-normal text-muted-foreground">
                      <span>Cap: {t.capacity}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                        t.status === 'Available' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combined Capacity Banner */}
          {selectedIds.length > 0 && (
            <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Users size={16} className="text-purple-600" />
                <span>Combined Group Capacity:</span>
              </div>
              <span className="font-mono font-bold text-base text-purple-600 dark:text-purple-400">
                {combinedCapacity} Guests ({selectedIds.length} Tables)
              </span>
            </div>
          )}

          {/* Designation of Primary Table */}
          {selectedIds.length >= 2 && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="primaryTable" className="text-xs font-semibold">
                2. Designate Primary Table (Defaulted to highest capacity)
              </Label>
              <select
                id="primaryTable"
                value={primaryId}
                onChange={(e) => setPrimaryId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {selectedTables.map((t) => (
                  <option key={t._id} value={t._id}>
                    Table #{t.tableNumber} (Capacity: {t.capacity} • {t.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedIds.length < 2 || isSubmitting}
              isLoading={isSubmitting}
              className="flex-1 text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Layers size={14} />
              <span>Confirm Table Merge</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

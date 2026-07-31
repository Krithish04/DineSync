import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LeaveForm({ onSubmit, onCancel, isSaving = false }) {
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!startDate) return setError('Start date is required.');
    if (!endDate) return setError('End date is required.');
    if (!reason.trim()) return setError('Please provide a reason for the leave.');

    if (new Date(startDate) > new Date(endDate)) {
      return setError('Start date cannot be after end date.');
    }

    onSubmit({
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="leaveType">Leave Type</Label>
        <select
          id="leaveType"
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
          className="flex h-10 w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none"
        >
          <option value="Casual Leave">Casual Leave</option>
          <option value="Sick Leave">Sick Leave</option>
          <option value="Paid Leave">Paid Leave</option>
          <option value="Unpaid Leave">Unpaid Leave</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="leave-reason">Reason notes *</Label>
        <textarea
          id="leave-reason"
          placeholder="Please explain the reason for leave..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="flex w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[70px]"
          required
        />
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="text-xs h-9">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSaving} className="text-xs h-9">
          Submit Leave Request
        </Button>
      </div>
    </form>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as tableApi from '@/features/table/api/table.api';
import * as reservationApi from '@/features/reservation/api/reservation.api';

const OCCASIONS = ['Other', 'Birthday', 'Anniversary', 'Business', 'Family'];
const BOOKING_SOURCES = ['Phone', 'Walk In', 'Website', 'QR'];
const STATUSES = ['Pending', 'Confirmed', 'Seated', 'Completed', 'Cancelled', 'No Show'];
const DURATIONS = [
  { value: 30, label: '30 mins' },
  { value: 45, label: '45 mins' },
  { value: 60, label: '60 mins' },
  { value: 90, label: '90 mins' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' },
];

export default function ReservationForm({
  restaurantId,
  initialData = null,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const isEditMode = !!initialData;

  const [form, setForm] = useState({
    table: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    numberOfGuests: 2,
    reservationDate: new Date().toISOString().slice(0, 10),
    reservationTime: '19:00',
    duration: 90,
    occasion: 'Other',
    bookingSource: 'Phone',
    reservationStatus: 'Pending',
    specialRequest: '',
    notes: '',
  });

  const [tables, setTables] = useState([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [error, setError] = useState('');

  // AI Assistant states
  const [aiQuery, setAiQuery] = useState('');
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [recommendedSlots, setRecommendedSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setForm({
        table: initialData.table?._id || initialData.table || '',
        customerName: initialData.customerName || '',
        customerPhone: initialData.customerPhone || '',
        customerEmail: initialData.customerEmail || '',
        numberOfGuests: initialData.numberOfGuests || 2,
        reservationDate: initialData.reservationDate || '',
        reservationTime: initialData.reservationTime || '',
        duration: initialData.duration || 90,
        occasion: initialData.occasion || 'Other',
        bookingSource: initialData.bookingSource || 'Phone',
        reservationStatus: initialData.reservationStatus || 'Pending',
        specialRequest: initialData.specialRequest || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  // Load all active tables
  const loadTables = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoadingTables(true);
    try {
      const result = await tableApi.listTables(restaurantId, { limit: 100 });
      setTables(result.items || []);
    } catch {
      setTables([]);
    } finally {
      setIsLoadingTables(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // Load AI recommended time slots when date or guest count changes
  const loadRecommendedSlots = useCallback(async () => {
    if (!restaurantId || !form.reservationDate) return;
    setIsLoadingSlots(true);
    try {
      const data = await reservationApi.getRecommendedTimeSlots(restaurantId, {
        date: form.reservationDate,
        partySize: form.numberOfGuests,
      });
      setRecommendedSlots(data.recommended_slots || []);
    } catch {
      setRecommendedSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [restaurantId, form.reservationDate, form.numberOfGuests]);

  useEffect(() => {
    loadRecommendedSlots();
  }, [loadRecommendedSlots]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        ['numberOfGuests', 'duration'].includes(name)
          ? parseInt(value, 10) || 0
          : value,
    }));
  };

  // AI Natural Language Booking Auto-Fill
  const handleParseAiQuery = async () => {
    if (!aiQuery.trim() || !restaurantId) return;
    setIsParsingAi(true);
    setAiMessage('');
    try {
      const data = await reservationApi.parseAiBookingQuery(restaurantId, aiQuery);
      if (data && data.parsedSlots) {
        const { reservationDate, reservationTime, numberOfGuests, specialRequests } = data.parsedSlots;
        setForm((prev) => ({
          ...prev,
          reservationDate: reservationDate || prev.reservationDate,
          reservationTime: reservationTime || prev.reservationTime,
          numberOfGuests: numberOfGuests || prev.numberOfGuests,
          specialRequest: specialRequests || prev.specialRequest,
          table: data.suggestedTable?.tableId || prev.table,
        }));
        setAiMessage(
          `✨ Auto-filled: ${data.parsedSlots.numberOfGuests} guests on ${data.parsedSlots.reservationDate} at ${data.parsedSlots.reservationTime}` +
            (data.suggestedTable ? ` (Matched Table ${data.suggestedTable.tableNumber})` : '')
        );
      }
    } catch {
      setAiMessage('Could not parse query. Please fill form manually.');
    } finally {
      setIsParsingAi(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!form.table && ['Confirmed', 'Seated'].includes(form.reservationStatus)) {
      return setError('Table selection is required to confirm or seat a reservation.');
    }
    if (!form.customerName.trim()) return setError('Customer name is required.');
    if (!form.customerPhone.trim()) return setError('Customer phone number is required.');
    if (form.numberOfGuests < 1) return setError('At least 1 guest is required.');
    if (!form.reservationDate) return setError('Reservation date is required.');
    if (!form.reservationTime) return setError('Reservation time is required.');

    onSubmit(form);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-in">
          {error}
        </div>
      )}

      {/* AI Smart Assistant Input Bar */}
      {!isEditMode && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
              ✨ AI Smart Reservation Assistant
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="e.g. 'Book a table for 4 guests tomorrow at 8pm, window seat'"
              className="bg-background text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleParseAiQuery();
                }
              }}
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleParseAiQuery}
              isLoading={isParsingAi}
            >
              Parse & Auto-Fill
            </Button>
          </div>
          {aiMessage && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{aiMessage}</p>}
        </div>
      )}

      {/* Table Select */}
      <div className="space-y-2">
        <Label htmlFor="table">
          Select Table {['Confirmed', 'Seated'].includes(form.reservationStatus) ? '*' : '(Optional for Pending)'}
        </Label>
        <select
          id="table"
          name="table"
          value={form.table}
          onChange={handleChange}
          className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={isLoadingTables}
        >
          <option value="">
            {isLoadingTables ? 'Loading tables...' : '-- Unassigned / Select Table --'}
          </option>
          {tables.map((t) => (
            <option key={t._id} value={t._id}>
              Table {t.tableNumber} (Cap: {t.capacity} • {t.type} • {t.status})
            </option>
          ))}
        </select>
      </div>

      {/* Customer Info */}
      <div className="space-y-4 rounded-md border border-border p-4">
        <p className="text-xs font-semibold text-foreground tracking-wide uppercase">Customer details</p>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customerName">Full Name *</Label>
            <Input
              id="customerName"
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              placeholder="e.g. Jordan Lee"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email Address</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                value={form.customerEmail}
                onChange={handleChange}
                placeholder="jordan@example.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Booking Date, Time, Duration & Guests */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="reservationDate">Booking Date *</Label>
          <Input
            id="reservationDate"
            name="reservationDate"
            type="date"
            value={form.reservationDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="reservationTime">Booking Time *</Label>
          <Input
            id="reservationTime"
            name="reservationTime"
            type="time"
            value={form.reservationTime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <select
            id="duration"
            name="duration"
            value={form.duration}
            onChange={handleChange}
            className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {DURATIONS.map((dur) => (
              <option key={dur.value} value={dur.value}>
                {dur.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numberOfGuests">Guest Count *</Label>
          <Input
            id="numberOfGuests"
            name="numberOfGuests"
            type="number"
            min="1"
            value={form.numberOfGuests}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* AI Recommended Optimal Time Slots */}
      {recommendedSlots.length > 0 && (
        <div className="space-y-2 rounded-md border border-border p-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              💡 Chef Recommended Optimal Time Slots
            </Label>
            {isLoadingSlots && <span className="text-xs text-muted-foreground">Updating...</span>}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {recommendedSlots.map((slot) => {
              const isSelected = form.reservationTime === slot.time;
              const isQuiet = slot.availability_status === 'High Availability';
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, reservationTime: slot.time }))}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                      : isQuiet
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  }`}
                  title={`${slot.recommendation_tag || slot.availability_status} (${slot.congestion_percentage}% Congestion)`}
                >
                  {slot.time} {isQuiet ? '🌱' : '🔥'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Occasion, Booking Source, Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="occasion">Occasion</Label>
          <select
            id="occasion"
            name="occasion"
            value={form.occasion}
            onChange={handleChange}
            className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground focus:outline-none focus:ring-1"
          >
            {OCCASIONS.map((occ) => (
              <option key={occ} value={occ}>
                {occ}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bookingSource">Booking Source</Label>
          <select
            id="bookingSource"
            name="bookingSource"
            value={form.bookingSource}
            onChange={handleChange}
            className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground focus:outline-none focus:ring-1"
          >
            {BOOKING_SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservationStatus">Booking Status</Label>
          <select
            id="reservationStatus"
            name="reservationStatus"
            value={form.reservationStatus}
            onChange={handleChange}
            className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground focus:outline-none focus:ring-1"
          >
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Special Request & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="specialRequest">Special Requests</Label>
          <textarea
            id="specialRequest"
            name="specialRequest"
            value={form.specialRequest}
            onChange={handleChange}
            placeholder="e.g. Near window, high chair for baby..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Staff Notes (Internal)</Label>
          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="e.g. VIP guest, preferred server..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[80px]"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={isSaving}>
          {isEditMode ? 'Save changes' : 'Book Table'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

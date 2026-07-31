import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const WEEK_DAYS = Object.keys(DAY_LABELS);

/**
 * Builds a default Mon-Sun schedule (all open, defaultOpen-defaultClose).
 */
export const buildDefaultSchedule = (defaultOpen = '09:00', defaultClose = '22:00') =>
  WEEK_DAYS.map((day) => ({ day, isOpen: true, slots: [{ open: defaultOpen, close: defaultClose }] }));

/**
 * Ensures a schedule array has exactly the 7 canonical days, in order,
 * filling in any missing days as closed. Useful when hydrating a schedule
 * fetched from the API that may be incomplete or unordered.
 */
export const normalizeSchedule = (schedule = []) => {
  const byDay = Object.fromEntries(schedule.map((d) => [d.day, d]));
  return WEEK_DAYS.map(
    (day) => byDay[day] || { day, isOpen: false, slots: [{ open: '09:00', close: '22:00' }] }
  );
}

/**
 * Validates a schedule and returns a human-readable error message, or ''
 * if valid. Shared across every page that edits a weekly schedule so the
 * validation rules stay consistent.
 */
export const validateSchedule = (schedule) => {
  const invalidOpenDay = schedule.find((d) => d.isOpen && d.slots.length === 0);
  if (invalidOpenDay) {
    return `${DAY_LABELS[invalidOpenDay.day]} is marked open but has no time slots.`;
  }
  const invalidSlot = schedule
    .flatMap((d) => d.slots.map((s) => ({ day: d.day, ...s })))
    .find((s) => s.open >= s.close);
  if (invalidSlot) {
    return `${DAY_LABELS[invalidSlot.day]}: opening time must be before closing time.`;
  }
  return '';
};

/**
 * Reusable weekly schedule editor: per-day open/closed toggle plus one or
 * more time slots (to support split shifts like lunch/dinner). Used for
 * both the restaurant's opening hours and each branch's operating hours.
 *
 * @param {{ value: Array, onChange: (next: Array) => void }} props
 */
export default function WeeklyScheduleEditor({ value, onChange }) {
  const toggleDay = (day, isOpen) => {
    onChange(value.map((d) => (d.day === day ? { ...d, isOpen } : d)));
  };

  const updateSlot = (day, slotIndex, field, fieldValue) => {
    onChange(
      value.map((d) =>
        d.day === day
          ? {
              ...d,
              slots: d.slots.map((slot, i) =>
                i === slotIndex ? { ...slot, [field]: fieldValue } : slot
              ),
            }
          : d
      )
    );
  };

  const addSlot = (day) => {
    onChange(
      value.map((d) =>
        d.day === day ? { ...d, slots: [...d.slots, { open: '11:00', close: '15:00' }] } : d
      )
    );
  };

  const removeSlot = (day, slotIndex) => {
    onChange(
      value.map((d) =>
        d.day === day ? { ...d, slots: d.slots.filter((_, i) => i !== slotIndex) } : d
      )
    );
  };

  const copyMondayToAll = () => {
    const monday = value.find((d) => d.day === 'monday');
    if (!monday) return;
    onChange(
      value.map((d) =>
        d.day === 'monday'
          ? d
          : { ...d, isOpen: monday.isOpen, slots: monday.slots.map((s) => ({ ...s })) }
      )
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={copyMondayToAll}>
          Copy Monday to all days
        </Button>
      </div>

      {value.map((day) => (
        <div key={day.day} className="rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{DAY_LABELS[day.day]}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{day.isOpen ? 'Open' : 'Closed'}</span>
              <Switch checked={day.isOpen} onCheckedChange={(checked) => toggleDay(day.day, checked)} />
            </div>
          </div>

          {day.isOpen && (
            <div className="mt-3 space-y-2">
              {day.slots.map((slot, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={slot.open}
                    onChange={(e) => updateSlot(day.day, index, 'open', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={slot.close}
                    onChange={(e) => updateSlot(day.day, index, 'close', e.target.value)}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSlot(day.day, index)}
                    disabled={day.slots.length === 1}
                    aria-label={`Remove slot ${index + 1} for ${DAY_LABELS[day.day]}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addSlot(day.day)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add split shift
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

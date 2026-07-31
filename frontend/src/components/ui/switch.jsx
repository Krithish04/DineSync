import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Accessible toggle switch. Implemented as a styled checkbox to keep the
 * component dependency-free (no @radix-ui/react-switch required).
 */
const Switch = React.forwardRef(({ className, checked, onCheckedChange, disabled, id, ...props }, ref) => {
  return (
    <label
      htmlFor={id}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-[22px]'
        )}
      />
    </label>
  );
});
Switch.displayName = 'Switch';

export { Switch };

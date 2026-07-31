import { cn } from '@/lib/utils';

/**
 * Reusable loading indicator.
 * @param {{ fullScreen?: boolean, label?: string, className?: string }} props
 */
export default function Loader({ fullScreen = false, label = 'Loading...', className }) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <svg
        className="h-8 w-8 animate-spin text-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );

  if (!fullScreen) return spinner;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      {spinner}
    </div>
  );
}

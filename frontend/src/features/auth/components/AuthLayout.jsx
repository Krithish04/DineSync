import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Shared visual shell for authentication pages (login / register).
 * @param {{ title: string, description?: string, children: React.ReactNode, footer?: React.ReactNode, maxWidth?: string }} props
 */
export default function AuthLayout({ title, description, children, footer, maxWidth = 'max-w-md' }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 overflow-hidden selection:bg-primary/20">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/10 via-primary/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className={`relative w-full ${maxWidth} transition-all duration-300`}>
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center space-x-1">
            <span className="font-display text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 bg-clip-text text-transparent">
              DineSync
            </span>
            <span className="font-display text-3xl font-extrabold text-foreground">AI</span>
          </div>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground/80">
            Intelligent Restaurant Ecosystem
          </p>
        </div>

        {/* Glassmorphism Outer Card */}
        <Card className="border-border/60 bg-card/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-foreground font-display">{title}</CardTitle>
            {description && <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>}
          </CardHeader>
          <CardContent className="pt-2">{children}</CardContent>
        </Card>

        {footer && <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

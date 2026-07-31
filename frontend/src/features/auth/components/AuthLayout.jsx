import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Shared visual shell for authentication pages (login / register).
 * @param {{ title: string, description?: string, children: React.ReactNode, footer?: React.ReactNode }} props
 */
export default function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="font-display text-3xl font-semibold tracking-tight text-primary">
            DineSync <span className="text-foreground">AI</span>
          </span>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Intelligent Restaurant Ecosystem
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

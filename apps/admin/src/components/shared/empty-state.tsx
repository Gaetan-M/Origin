import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)]">
        <Icon className="h-6 w-6 text-[var(--muted-foreground)]" />
      </div>
      <p className="text-sm font-medium text-charcoal">{title}</p>
      {description && <p className="max-w-md text-xs text-[var(--muted-foreground)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

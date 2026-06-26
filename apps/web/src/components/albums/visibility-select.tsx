'use client';

import { VisibilityScope } from '@origin/shared-types';
import { Globe, Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useLmT } from '@/lib/living-memory-i18n';

interface VisibilitySelectProps {
  value: VisibilityScope;
  onChange: (value: VisibilityScope) => void;
  /** Hide the field label (e.g. when embedded inline). */
  hideLabel?: boolean;
  className?: string;
}

const OPTIONS: { scope: VisibilityScope; icon: typeof Lock; key: string }[] = [
  { scope: VisibilityScope.PRIVATE_SELF, icon: Lock, key: 'visibility.PRIVATE_SELF' },
  { scope: VisibilityScope.FAMILY, icon: Users, key: 'visibility.FAMILY' },
  { scope: VisibilityScope.PUBLIC, icon: Globe, key: 'visibility.PUBLIC' },
];

export function VisibilitySelect({
  value,
  onChange,
  hideLabel,
  className,
}: VisibilitySelectProps) {
  const t = useLmT();

  return (
    <div className={cn('space-y-2', className)}>
      {!hideLabel && <Label>{t('visibility.label')}</Label>}
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ scope, icon: Icon, key }) => {
          const active = value === scope;
          return (
            <button
              key={scope}
              type="button"
              onClick={() => onChange(scope)}
              aria-pressed={active}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors',
                active
                  ? 'border-forest bg-forest/10 text-forest'
                  : 'border-[var(--input)] text-charcoal/60 hover:bg-sand',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-center leading-tight">{t(key)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

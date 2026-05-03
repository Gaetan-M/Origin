'use client';

import { ShieldCheck, Shield, ShieldAlert, User } from 'lucide-react';
import { AccountRole } from '@origin/shared-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

const VARIANTS: Record<AccountRole, { className: string; Icon: typeof Shield }> = {
  USER: { className: 'bg-sand text-charcoal/80 border-transparent', Icon: User },
  MODERATOR: { className: 'bg-info-light text-deep-blue border-transparent', Icon: Shield },
  ADMIN: { className: 'bg-warning-light text-warning-dark border-transparent', Icon: ShieldCheck },
  SUPER_ADMIN: { className: 'bg-error-light text-error border-transparent', Icon: ShieldAlert },
};

export function RoleBadge({ role, className, withIcon = true }: { role: AccountRole; className?: string; withIcon?: boolean }) {
  const t = useT();
  const variant = VARIANTS[role];
  const Icon = variant.Icon;
  return (
    <Badge className={cn('gap-1', variant.className, className)}>
      {withIcon && <Icon className="h-3 w-3" />}
      <span>{t(`admin.roles.${role}`)}</span>
    </Badge>
  );
}

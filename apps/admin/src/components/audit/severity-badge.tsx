'use client';

import type { AdminActionSeverity } from '@origin/shared-types';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n';

const VARIANTS: Record<AdminActionSeverity, 'secondary' | 'info' | 'warning' | 'destructive'> = {
  INFO: 'secondary',
  NOTICE: 'info',
  WARNING: 'warning',
  CRITICAL: 'destructive',
};

export function SeverityBadge({ severity }: { severity: AdminActionSeverity }) {
  const t = useT();
  return <Badge variant={VARIANTS[severity]}>{t(`admin.severity.${severity}`)}</Badge>;
}

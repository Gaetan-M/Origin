'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueueCounts } from '@/lib/hooks/use-admin-moderation';
import { useT } from '@/i18n';
import { GitMerge, ShieldCheck, FileText, ScrollText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChipProps {
  label: string;
  count: number;
  Icon: LucideIcon;
  accent: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, count, Icon, accent, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all',
        active ? 'border-deep-blue bg-deep-blue/5 ring-1 ring-deep-blue/20' : 'border-charcoal/10 bg-white hover:bg-off-white',
      )}
    >
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-md', accent)}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal/60">{label}</p>
        <p className="text-xl font-semibold text-charcoal tabular-nums">{count}</p>
      </div>
    </button>
  );
}

export function QueueCounters({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const t = useT();
  const { data, isLoading } = useQueueCounts();

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  const claimsTotal = data.claims.pending + data.claims.disputed;
  const verifsTotal = data.verifications.pending + data.verifications.inReview;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Chip
        label={t('admin.moderation.tabs.claims')}
        count={claimsTotal}
        Icon={ScrollText}
        accent="bg-deep-blue/10 text-deep-blue"
        active={activeTab === 'claims'}
        onClick={() => onTabChange('claims')}
      />
      <Chip
        label={t('admin.moderation.tabs.merges')}
        count={data.merges.pending}
        Icon={GitMerge}
        accent="bg-forest/10 text-forest"
        active={activeTab === 'merges'}
        onClick={() => onTabChange('merges')}
      />
      <Chip
        label={t('admin.moderation.tabs.verifications')}
        count={verifsTotal}
        Icon={ShieldCheck}
        accent="bg-ochre/10 text-ochre"
        active={activeTab === 'verifications'}
        onClick={() => onTabChange('verifications')}
      />
      <Chip
        label={t('admin.moderation.tabs.documents')}
        count={data.identityDocuments.pendingReview}
        Icon={FileText}
        accent="bg-terracotta/10 text-terracotta"
        active={activeTab === 'documents'}
        onClick={() => onTabChange('documents')}
      />
    </div>
  );
}

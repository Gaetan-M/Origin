'use client';

import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

type Json = Record<string, unknown> | null;

function diffKeys(before: Json, after: Json): string[] {
  const keys = new Set<string>();
  if (before) Object.keys(before).forEach((k) => keys.add(k));
  if (after) Object.keys(after).forEach((k) => keys.add(k));
  return Array.from(keys).sort();
}

function fmt(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Shallow side-by-side diff. Good enough for the audit detail page —
 * deep diffs would need a tree viewer that we can add later if/when
 * before/after payloads become nested.
 */
export function AuditDiffView({ before, after }: { before: Json; after: Json }) {
  const t = useT();
  if (!before && !after) {
    return <p className="text-sm text-charcoal/60">{t('admin.common.empty')}</p>;
  }

  const keys = diffKeys(before, after);

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-xs font-mono">
        <thead className="bg-[var(--muted)] text-charcoal/70">
          <tr>
            <th className="p-2 text-left">Champ</th>
            <th className="p-2 text-left">{t('admin.audit.detail.before')}</th>
            <th className="p-2 text-left">{t('admin.audit.detail.after')}</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const b = before?.[k];
            const a = after?.[k];
            const inBefore = before && k in before;
            const inAfter = after && k in after;
            const bStr = fmt(b);
            const aStr = fmt(a);
            const status = !inBefore ? 'added' : !inAfter ? 'removed' : bStr === aStr ? 'unchanged' : 'changed';
            return (
              <tr key={k} className="border-t">
                <td className="p-2 align-top text-charcoal">{k}</td>
                <td className={cn('p-2 align-top break-all', status === 'removed' && 'bg-error-light text-error', status === 'changed' && 'text-error/80 line-through')}>
                  {inBefore ? bStr : <span className="text-charcoal/40">—</span>}
                </td>
                <td className={cn('p-2 align-top break-all', status === 'added' && 'bg-success-light text-success', status === 'changed' && 'bg-info-light text-deep-blue')}>
                  {inAfter ? aStr : <span className="text-charcoal/40">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

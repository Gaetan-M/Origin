'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n';
import { isRoleAtLeast, AccountRole } from '@origin/shared-types';
import { useAuthStore } from '@/stores/auth-store';
import type { DuplicateGroup } from '@/lib/api/admin-persons';
import { ForceMergeDialog } from './force-merge-dialog';

export function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  const t = useT();
  const { account } = useAuthStore();
  const [open, setOpen] = useState(false);
  const isSuperAdmin = isRoleAtLeast((account?.role as AccountRole) ?? AccountRole.USER, AccountRole.SUPER_ADMIN);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{group.key.normalizedName}</CardTitle>
            <p className="mt-1 text-xs text-charcoal/60">
              {group.key.year ? `${group.key.year} · ` : ''}
              <Badge variant="info" className="ml-1">{group.count} doublons</Badge>
            </p>
          </div>
          {isSuperAdmin && (
            <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
              {t('admin.persons.forceMerge.title')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {group.persons.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/persons/${p.id}`} className="text-deep-blue hover:underline">
                  {p.displayName}
                </Link>
                <span className="text-xs text-charcoal/60">
                  {p.gender ?? '—'} · {p.birthYearApproximate ?? '—'} · {p.villageOrigin ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {isSuperAdmin && (
        <ForceMergeDialog
          candidates={group.persons.map((p) => ({ id: p.id, displayName: p.displayName }))}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}

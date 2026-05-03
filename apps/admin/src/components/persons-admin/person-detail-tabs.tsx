'use client';

import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/ui-store';
import { useT } from '@/i18n';
import { EmptyState } from '@/components/shared/empty-state';
import type { AdminPersonDetail } from '@/lib/api/admin-persons';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs uppercase tracking-wide text-charcoal/50">{label}</span>
      <span className="text-sm text-charcoal text-right">{value}</span>
    </div>
  );
}

export function PersonDetailTabs({ detail }: { detail: AdminPersonDetail }) {
  const t = useT();
  const locale = useUiStore((s) => s.locale);
  const p = detail.person;

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">{t('admin.persons.tabs.profile')}</TabsTrigger>
        <TabsTrigger value="names">{t('admin.persons.tabs.names')}</TabsTrigger>
        <TabsTrigger value="documents">{t('admin.persons.tabs.documents')}</TabsTrigger>
        <TabsTrigger value="family">{t('admin.persons.tabs.family')}</TabsTrigger>
        <TabsTrigger value="contributions">{t('admin.persons.tabs.contributions')}</TabsTrigger>
        <TabsTrigger value="audit">{t('admin.persons.tabs.audit')}</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.persons.tabs.profile')}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <Row label="Nom" value={p.displayName} />
            <Row label="Genre" value={p.gender ?? '—'} />
            <Row label={t('admin.persons.columns.lifeStatus')} value={t(`admin.persons.lifeStatus.${p.lifeStatus}`)} />
            <Row label="Naissance" value={p.birthYearApproximate ?? '—'} />
            {p.deceasedYearApproximate && <Row label="Décès" value={p.deceasedYearApproximate} />}
            <Row label="Village" value={p.villageOrigin ?? '—'} />
            <Row label="Région" value={p.birthRegion ?? '—'} />
            <Row label="Pays" value={p.birthCountry ?? '—'} />
            <Row label="Métier" value={p.occupation ?? '—'} />
            <Row label="Vérification" value={<Badge variant="info">{p.verificationLevel}</Badge>} />
            <Row label="Public" value={p.isPublic ? t('admin.common.yes') : t('admin.common.no')} />
            <Row label="Niveau de vie privée" value={p.privacyLevel} />
            <Row label={t('admin.common.createdAt')} value={formatDate(p.createdAt)} />
            <Row label={t('admin.common.updatedAt')} value={formatDate(p.updatedAt)} />
          </CardContent>
        </Card>
        {p.biography && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Biographie</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-charcoal/80">{p.biography}</pre>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="names" className="mt-6">
        {detail.names.length === 0 ? (
          <EmptyState title={t('admin.common.empty')} />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {detail.names.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{n.fullName}</p>
                    <p className="text-xs text-charcoal/60">
                      {n.firstName ?? ''} {n.lastName ?? ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.isPrimary && <Badge variant="info">Principal</Badge>}
                    <Badge variant="outline">{n.nameType}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="documents" className="mt-6">
        {detail.identityDocuments.length === 0 ? (
          <EmptyState title={t('admin.common.empty')} />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {detail.identityDocuments.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{d.documentType}</p>
                    <p className="text-xs text-charcoal/60">
                      {d.issuingAuthority ?? '—'} {d.issueDate ? `· ${formatDate(d.issueDate)}` : ''}
                      {d.documentNumberLast4 ? ` · ••••${d.documentNumberLast4}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline">{d.verificationStatus}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="family" className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parents</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.parents.length === 0 ? (
              <p className="text-sm text-charcoal/60">{t('admin.common.empty')}</p>
            ) : (
              <ul className="divide-y">
                {detail.parents.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/persons/${p.parent.id}`} className="text-deep-blue hover:underline">
                      {p.parent.displayName}
                    </Link>
                    <Badge variant="outline">{p.relationshipType}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enfants</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.children.length === 0 ? (
              <p className="text-sm text-charcoal/60">{t('admin.common.empty')}</p>
            ) : (
              <ul className="divide-y">
                {detail.children.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/persons/${c.child.id}`} className="text-deep-blue hover:underline">
                      {c.child.displayName}
                    </Link>
                    <Badge variant="outline">{c.relationshipType}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contributions" className="mt-6">
        {detail.recentContributions.length === 0 ? (
          <EmptyState title={t('admin.common.empty')} />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {detail.recentContributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{c.action}</span>{' '}
                    <span className="text-charcoal/60">· {c.entityType}</span>
                    {c.fieldName && <span className="text-charcoal/40"> · {c.fieldName}</span>}
                  </span>
                  <span className="text-xs text-charcoal/50">{formatDateTime(c.createdAt, locale)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="audit" className="mt-6">
        {detail.recentAuditTrail.length === 0 ? (
          <EmptyState title={t('admin.common.empty')} />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {detail.recentAuditTrail.map((a) => (
                <div key={a.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{a.action}</span>
                    <Badge variant="outline">{a.severity}</Badge>
                  </div>
                  {a.reason && <p className="mt-1 text-xs text-charcoal/60">{a.reason}</p>}
                  <p className="mt-1 text-xs text-charcoal/50">{formatDateTime(a.createdAt, locale)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

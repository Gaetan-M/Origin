'use client';

import {
  Users,
  Heart,
  Camera,
  Phone,
  CalendarDays,
  Send,
  KeyRound,
  Bell,
  TreePine,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  DonutChart,
  DonutLegend,
  type DonutSegment,
} from '@/components/dashboard/charts/donut-chart';
import { BarList } from '@/components/dashboard/charts/bar-list';
import { Sparkbar } from '@/components/dashboard/charts/sparkbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyStats } from '@/lib/hooks/use-stats';
import { useT } from '@/i18n';

const MONTH_LABELS_FR = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(yyyymm: string): string {
  const [, mm] = yyyymm.split('-');
  const idx = Math.max(0, Math.min(11, parseInt(mm ?? '1', 10) - 1));
  return MONTH_LABELS_FR[idx];
}

export default function DashboardPage() {
  const { account } = useAuthStore();
  const t = useT();
  const { data: stats, isLoading } = useMyStats();
  const name = account?.phoneNumber;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">
          {name ? t('dashboard.greeting', { name }) : t('dashboard.greetingDefault')}
        </h1>
        <p className="text-charcoal/60">Voici un apercu de ton arbre familial.</p>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          {t('dashboard.quickActions')}
        </h2>
        <QuickActions />
      </section>

      {/* Stats grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">En chiffres</h2>

        {isLoading || !stats ? (
          <StatsLoadingState />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Users}
                label="Personnes"
                value={stats.persons.total}
                hint={
                  stats.persons.generationSpan
                    ? `${stats.persons.generationSpan} generation${stats.persons.generationSpan > 1 ? 's' : ''} couverte${stats.persons.generationSpan > 1 ? 's' : ''}`
                    : 'Ajoute des proches'
                }
                iconClass="bg-forest/10 text-forest"
              />
              <StatCard
                icon={Heart}
                label="En vie"
                value={stats.persons.alive}
                hint={`${stats.persons.deceased} disparu${stats.persons.deceased > 1 ? 's' : ''}`}
                iconClass="bg-terracotta/10 text-terracotta"
              />
              <StatCard
                icon={Send}
                label="Invitations"
                value={stats.invitations.consumed}
                hint={`${stats.invitations.pending} en attente`}
                iconClass="bg-ochre/15 text-ochre"
              />
              <StatCard
                icon={KeyRound}
                label="Codes famille"
                value={stats.familyCodes.totalRedemptions}
                hint={`${stats.familyCodes.active} actif${stats.familyCodes.active > 1 ? 's' : ''}`}
                iconClass="bg-forest/10 text-forest"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Camera}
                label="Avec photo"
                value={stats.persons.withPhoto}
                hint={pct(stats.persons.withPhoto, stats.persons.total)}
                iconClass="bg-sand text-charcoal/70"
              />
              <StatCard
                icon={Phone}
                label="Avec telephone"
                value={stats.persons.withPhone}
                hint={pct(stats.persons.withPhone, stats.persons.total)}
                iconClass="bg-sand text-charcoal/70"
              />
              <StatCard
                icon={CalendarDays}
                label="Date de naissance"
                value={stats.persons.withBirth}
                hint={pct(stats.persons.withBirth, stats.persons.total)}
                iconClass="bg-sand text-charcoal/70"
              />
              <StatCard
                icon={Bell}
                label="Notifications"
                value={stats.notifications.unread}
                hint="non lues"
                iconClass="bg-ochre/15 text-ochre"
              />
            </div>
          </>
        )}
      </section>

      {/* Charts */}
      {!isLoading && stats && stats.persons.total > 0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statut de vie</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
              <DonutChart
                segments={lifeStatusSegments(stats)}
                centerLabel={String(stats.persons.total)}
                centerSubLabel="personnes"
              />
              <DonutLegend segments={lifeStatusSegments(stats)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repartition par genre</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
              <DonutChart
                segments={genderSegments(stats)}
                centerLabel={String(
                  stats.persons.male + stats.persons.female + stats.persons.other,
                )}
                centerSubLabel="genres connus"
              />
              <DonutLegend segments={genderSegments(stats)} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Ajouts des 6 derniers mois</CardTitle>
            </CardHeader>
            <CardContent>
              <Sparkbar
                data={stats.additionsByMonth.map((m) => ({
                  label: m.month,
                  value: m.count,
                }))}
                formatTick={monthLabel}
                height={120}
              />
            </CardContent>
          </Card>

          {stats.topVillages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Villages d&apos;origine</CardTitle>
              </CardHeader>
              <CardContent>
                <BarList
                  data={stats.topVillages.map((v) => ({
                    label: v.village,
                    value: v.count,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {stats.tree && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TreePine className="h-4 w-4 text-forest" />
                  Mon noyau familial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-charcoal/85">
                  <Sparkles className="h-4 w-4 text-ochre" />
                  <span>
                    Profil revendique :{' '}
                    <span className="font-semibold">{stats.tree.claimedPersonName}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <CoreStat label="Parents" value={stats.tree.parentsCount} />
                  <CoreStat label="Unions" value={stats.tree.unionsCount} />
                  <CoreStat label="Enfants" value={stats.tree.childrenCount} />
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

function pct(part: number, total: number): string {
  if (total === 0) return '0 %';
  return `${Math.round((part / total) * 100)} %`;
}

function lifeStatusSegments(stats: NonNullable<ReturnType<typeof useMyStats>['data']>): DonutSegment[] {
  return [
    { label: 'En vie', value: stats.persons.alive, colorClass: 'text-forest' },
    { label: 'Disparu', value: stats.persons.deceased, colorClass: 'text-terracotta' },
    { label: 'Inconnu', value: stats.persons.unknown, colorClass: 'text-charcoal/30' },
  ];
}

function genderSegments(stats: NonNullable<ReturnType<typeof useMyStats>['data']>): DonutSegment[] {
  return [
    { label: 'Hommes', value: stats.persons.male, colorClass: 'text-forest' },
    { label: 'Femmes', value: stats.persons.female, colorClass: 'text-terracotta' },
    { label: 'Autre / inconnu', value: stats.persons.other, colorClass: 'text-charcoal/30' },
  ];
}

function CoreStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-sand/50 p-2">
      <p className="text-xl font-bold tabular-nums text-charcoal">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-charcoal/55">{label}</p>
    </div>
  );
}

function StatsLoadingState() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-3 h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

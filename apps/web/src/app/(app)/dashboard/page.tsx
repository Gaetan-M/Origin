'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Send,
  KeyRound,
  Search,
  CheckCircle2,
  X as XIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useMyStats } from '@/lib/hooks/use-stats';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OriginMark, AdinkraRosette } from '@/components/dashboard/origin-mark';
import { RecentActivity } from '@/components/dashboard/recent-activity';

const FR_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const FR_MONTHS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

function todayLabel(): string {
  const d = new Date();
  return `${FR_DAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
}

function greetingFor(d = new Date()): 'Bonjour' | 'Bon apres-midi' | 'Bonsoir' {
  const h = d.getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon apres-midi';
  return 'Bonsoir';
}

export default function DashboardPage() {
  const { account } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useMyStats();

  const firstName = useMemo(() => {
    if (!account) return null;
    const p = account.phoneNumber;
    return p ? `${p.substring(0, 7)}***` : null;
  }, [account]);

  const nextGesture = computeNextGesture(stats);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Greeting bar */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-forest">
            {todayLabel()}
          </p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-charcoal">
            {greetingFor()},{' '}
            <span className="text-forest-dark">{firstName ?? 'toi'}</span>.
          </h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Voici ce qui pousse dans ton arbre cette semaine.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/persons/new">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un proche
          </Link>
        </Button>
      </header>

      {/* HERO ROW: Living Tree + Next Gesture */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {statsLoading ? (
          <Skeleton className="h-60 rounded-2xl" />
        ) : (
          <LivingTreeCard stats={stats} />
        )}
        <NextGestureCard gesture={nextGesture} />
      </div>

      {/* SECONDARY ROW: Activity / Pending / Kinship */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Cette semaine" subtitle="Activite de ta famille">
          <RecentActivityCompact />
        </SectionCard>

        <SectionCard
          title="A resoudre"
          subtitle={pendingSubtitle(stats)}
          accent="var(--color-ochre)"
        >
          <PendingPanel />
        </SectionCard>

        <SectionCard
          title="Qui es-tu pour moi ?"
          subtitle="Sonde de parente"
          accent="var(--color-deep-blue)"
        >
          <KinshipTeaser />
        </SectionCard>
      </div>

      {/* Quick actions strip */}
      <Card className="border-sand-dark">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-semibold text-charcoal">
              L'arbre est plus vivant a plusieurs.
            </p>
            <p className="mt-0.5 text-xs text-charcoal/55">
              Invite ton frere, ta tante, ton cousin — un code suffit.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/connect?tab=invite">
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Inviter par telephone
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/connect?tab=code">
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Code famille
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function LivingTreeCard({
  stats,
}: {
  stats: ReturnType<typeof useMyStats>['data'];
}) {
  const total = stats?.persons.total ?? 0;
  const generations = stats?.persons.generationSpan ?? 0;
  const completeness = total === 0 ? 0 : Math.min(1, total / 30);
  const tree = stats?.tree;
  // Branch fullness: rough heuristic from claimed-person relations. The real
  // model would walk the parent_child graph; for the dashboard hero we lean
  // on aggregate signals so we don't fire 4 extra queries per render.
  const paternal = tree ? Math.min(1, tree.parentsCount / 4) : 0;
  const maternal = tree ? Math.min(1, tree.unionsCount / 2) : 0;
  const own = tree ? Math.min(1, tree.childrenCount / 4) : 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-sand-dark p-6"
      style={{
        background:
          'linear-gradient(160deg, var(--color-sand) 0%, #FAF5E8 60%, var(--color-sand-dark) 100%)',
        minHeight: 240,
      }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8">
        <AdinkraRosette size={220} opacity={0.18} />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-forest-dark">
            Ton arbre
          </p>
          <p className="mt-1 flex items-baseline gap-2 leading-none">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight text-charcoal">
              {total}
            </span>
            <span className="text-base font-medium text-charcoal/50">
              personne{total > 1 ? 's' : ''}
            </span>
          </p>
          <p className="mt-1.5 text-sm text-charcoal/60">
            <span className="tabular-nums font-semibold">{generations}</span> generation
            {generations > 1 ? 's' : ''} ·{' '}
            <span className="tabular-nums font-semibold">
              {Math.round(completeness * 100)}%
            </span>{' '}
            complet
          </p>
        </div>
        <div className="shrink-0 [animation:origin-float_6s_ease-in-out_infinite]">
          <OriginMark size={64} />
        </div>
      </div>

      <div className="relative mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/55">
          Branches
        </p>
        <div className="space-y-2">
          <BranchBar label="Branche paternelle" pct={paternal} color="var(--color-forest)" />
          <BranchBar label="Branche maternelle" pct={maternal} color="var(--color-terracotta)" />
          <BranchBar label="Tes enfants" pct={own} color="var(--color-ochre)" />
        </div>
      </div>
    </div>
  );
}

function BranchBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-charcoal/70">{label}</span>
        <span className="tabular-nums text-charcoal/50">{Math.round(pct * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

interface NextGesture {
  title: string;
  why: string;
  cta: string;
  href: string;
  accent: string;
}

function computeNextGesture(stats: ReturnType<typeof useMyStats>['data']): NextGesture {
  if (!stats || stats.persons.total === 0) {
    return {
      title: 'Plante la graine de ton arbre',
      why: 'Ajoute-toi en premier — tu pourras ensuite construire les branches autour de toi.',
      cta: 'Commencer',
      href: '/persons/new',
      accent: 'var(--color-forest)',
    };
  }
  if (!stats.tree || stats.tree.parentsCount < 2) {
    return {
      title: 'Ajoute tes parents',
      why:
        "C'est le geste qui fera grandir l'arbre le plus vite. Sans eux, les autres branches restent invisibles.",
      cta: 'Ajouter un parent',
      href: '/persons/new',
      accent: 'var(--color-terracotta)',
    };
  }
  if (stats.tree.unionsCount === 0 && stats.tree.childrenCount === 0) {
    return {
      title: 'Ajoute tes grands-parents',
      why:
        'Avec deux generations au-dessus, le moteur de match peut commencer a relier ta famille elargie.',
      cta: 'Ajouter un grand-parent',
      href: '/persons/new',
      accent: 'var(--color-terracotta)',
    };
  }
  return {
    title: "Invite quelqu'un a rejoindre",
    why:
      "L'arbre est plus vivant a plusieurs. Un proche qui rejoint, ce sont 10 nouvelles connexions potentielles.",
    cta: 'Envoyer une invitation',
    href: '/connect?tab=invite',
    accent: 'var(--color-ochre)',
  };
}

function NextGestureCard({ gesture }: { gesture: NextGesture }) {
  return (
    <div
      className="flex flex-col rounded-2xl border border-sand-dark bg-white p-6"
      style={{ borderLeft: `4px solid ${gesture.accent}`, minHeight: 240 }}
    >
      <span
        className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
        style={{
          background: 'rgba(200,102,59,0.10)',
          color: 'var(--color-terracotta-dark)',
        }}
      >
        <Sparkles className="h-3 w-3" />
        Geste suggere
      </span>

      <h2 className="mt-4 text-xl font-bold leading-tight tracking-tight text-charcoal">
        {gesture.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{gesture.why}</p>

      {/* Visual preview — empty branch ghosts */}
      <div className="mt-auto flex items-center gap-2 rounded-xl bg-sand p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
          Toi
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-charcoal/40" />
        <GhostDot accent={gesture.accent} />
        <GhostDot accent={gesture.accent} />
        <span className="ml-auto text-[11px] text-charcoal/55">tes proches</span>
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild>
          <Link href={gesture.href}>{gesture.cta}</Link>
        </Button>
        <Button variant="ghost" size="sm" disabled>
          Plus tard
        </Button>
      </div>
    </div>
  );
}

function GhostDot({ accent }: { accent: string }) {
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full text-sm"
      style={{ border: `1.5px dashed ${accent}`, color: accent }}
    >
      ?
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-sand-dark bg-white p-5">
      <div className="flex items-center gap-2">
        {accent && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: accent }}
            aria-hidden
          />
        )}
        <p className="text-sm font-bold text-charcoal">{title}</p>
      </div>
      <p className="mb-3 mt-0.5 text-[11px] uppercase tracking-[0.06em] text-charcoal/50">
        {subtitle}
      </p>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function RecentActivityCompact() {
  // RecentActivity already does its own data fetching + skeleton — we render
  // it without a wrapping Card so it can sit inside our SectionCard.
  return (
    <div className="-mx-2 -my-1">
      <RecentActivity compact />
    </div>
  );
}

function PendingPanel() {
  const { data } = useNotifications(1);
  const items = (data?.data ?? []).filter((n) => !n.isRead).slice(0, 2);

  if (items.length === 0) {
    return (
      <p className="text-xs text-charcoal/55">
        Tout est a jour. Reviens plus tard pour valider de nouvelles propositions.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <div
          key={n.id}
          className="rounded-lg border border-ochre/25 bg-ochre/[0.08] p-2.5"
        >
          <p className="line-clamp-1 text-[13px] font-semibold text-charcoal">
            {n.title}
          </p>
          {n.body && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-charcoal/55">{n.body}</p>
          )}
          <div className="mt-2 flex gap-1.5">
            <Button asChild size="sm" className="h-7 gap-1 px-2 text-xs">
              <Link href={n.actionUrl ?? '/notifications'}>
                <CheckCircle2 className="h-3 w-3" />
                Voir
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled>
              <XIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function KinshipTeaser() {
  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-charcoal/65">
        Tu rencontres quelqu'un qui pourrait etre de la famille ? Lance une sonde — on cherche un
        ancetre commun, sans reveler ton arbre.
      </p>
      <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-dashed border-sand-dark bg-off-white px-3 py-2.5 text-sm text-charcoal/55">
        <Search className="h-3.5 w-3.5" />
        <span>Numero ou nom...</span>
      </div>
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href="/connect?tab=probe">Lancer une sonde</Link>
      </Button>
    </div>
  );
}

function pendingSubtitle(stats: ReturnType<typeof useMyStats>['data']): string {
  const n = stats?.notifications.unread ?? 0;
  if (n === 0) return 'Rien en attente';
  return `${n} chose${n > 1 ? 's' : ''} qui t'attend${n > 1 ? 'ent' : ''}`;
}

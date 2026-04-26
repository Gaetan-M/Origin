'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookHeart, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  KenteBorder,
  AdinkraMotif,
  FloatingLeaves,
  OriginLogo,
  TreeEnergyAura,
} from '@/components/branding/origin-decor';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const t = useT();

  return (
    <main className="flex min-h-screen flex-col overflow-hidden">
      <KenteBorder />

      {/* ========== HERO ========== */}
      <section className="relative isolate bg-sand">
        {/* Decorative adinkra rosettes behind the content */}
        <AdinkraMotif
          className="absolute -left-10 top-10 hidden h-64 w-64 text-forest opacity-[0.06] sm:block"
          color="currentColor"
        />
        <AdinkraMotif
          className="absolute -right-12 bottom-12 hidden h-80 w-80 rotate-[22deg] text-terracotta opacity-[0.07] sm:block"
          color="currentColor"
        />

        {/* Drifting leaves */}
        <FloatingLeaves />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:gap-14 md:py-24 lg:py-28">
          {/* Left column: copy + CTA */}
          <div className="anim-fade-up order-2 text-center md:order-1 md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-forest shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-forest anim-pulse-soft" />
              Plateforme genealogique
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-charcoal md:text-5xl lg:text-6xl">
              {t('landing.hero')}
            </h1>
            <p className="mt-5 max-w-md text-base text-charcoal/70 md:text-lg md:leading-relaxed">
              {t('landing.subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link href="/auth/login">
                <Button
                  size="lg"
                  className="group relative overflow-hidden px-7 text-base shadow-lg shadow-forest/20 transition hover:shadow-xl hover:shadow-forest/30"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {t('landing.cta')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="origin-shimmer-bg absolute inset-0" />
                </Button>
              </Link>
              <Link
                href="#about"
                className="text-sm font-medium text-charcoal/60 underline-offset-4 hover:text-forest hover:underline"
              >
                En savoir plus
              </Link>
            </div>

            {/* Small trust row */}
            <div className="mt-10 flex items-center justify-center gap-6 text-xs text-charcoal/50 md:justify-start">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-forest" />
                Confidentiel
              </span>
              <span className="h-4 w-px bg-charcoal/15" />
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-terracotta" />
                Collaboratif
              </span>
              <span className="h-4 w-px bg-charcoal/15" />
              <span className="flex items-center gap-1.5">
                <BookHeart className="h-3.5 w-3.5 text-ochre" />
                Heritage
              </span>
            </div>
          </div>

          {/* Right column: big logo with grow + float and an energy aura
              of rippling rings and curved flows emanating into the roots */}
          <div className="anim-grow order-1 flex justify-center md:order-2">
            <div className="relative flex items-center justify-center">
              {/* Soft diffuse glow */}
              <div
                className="absolute inset-0 -z-20 rounded-full bg-gradient-to-br from-ochre/25 via-terracotta/15 to-forest/20 blur-3xl anim-pulse-soft"
                aria-hidden
              />
              {/* Rings + curved energy lines toward the roots */}
              <TreeEnergyAura className="-z-10 scale-110" />
              <Image
                src="/origin-logo.png"
                alt="Origin"
                width={320}
                height={500}
                priority
                className="anim-float relative w-56 md:w-72 lg:w-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Thin woven band separating hero from values */}
      <div
        className="h-3 w-full bg-sand/40 origin-kente-bg opacity-30 anim-kente"
        aria-hidden
      />

      {/* ========== VALUE PROPS ========== */}
      <section
        id="about"
        className="relative bg-off-white px-6 py-20 md:py-24"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center anim-fade-up">
            <h2 className="text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
              Trois gestes pour une histoire
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-charcoal/60">
              Documenter, relier, transmettre — Origin te donne les outils pour
              faire vivre ta genealogie sans la figer.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <ValueCard
              delay="anim-delay-100"
              icon={<BookHeart className="h-6 w-6" />}
              accent="forest"
              title={t('landing.value1Title')}
              desc={t('landing.value1Desc')}
            />
            <ValueCard
              delay="anim-delay-200"
              icon={<Users className="h-6 w-6" />}
              accent="terracotta"
              title={t('landing.value2Title')}
              desc={t('landing.value2Desc')}
            />
            <ValueCard
              delay="anim-delay-300"
              icon={<ShieldCheck className="h-6 w-6" />}
              accent="ochre"
              title={t('landing.value3Title')}
              desc={t('landing.value3Desc')}
            />
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="relative bg-charcoal px-6 py-10 text-white/70">
        <AdinkraMotif
          className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 text-white opacity-[0.05]"
          color="currentColor"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
          <OriginLogo size={40} withText={false} />
          <p className="text-sm font-semibold tracking-wide text-white">Origin</p>
          <p className="max-w-md text-xs leading-relaxed text-white/55">
            Enracine ta famille. Documente ton arbre. Transmets ton histoire.
          </p>
        </div>
      </footer>

      <KenteBorder />
    </main>
  );
}

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: 'forest' | 'terracotta' | 'ochre';
  delay: string;
}

function ValueCard({ icon, title, desc, accent, delay }: ValueCardProps) {
  const accentMap = {
    forest:     { bg: 'bg-forest/10',     text: 'text-forest',     ring: 'hover:border-forest/40' },
    terracotta: { bg: 'bg-terracotta/10', text: 'text-terracotta', ring: 'hover:border-terracotta/40' },
    ochre:      { bg: 'bg-ochre/15',      text: 'text-[var(--color-ochre-dark)]', ring: 'hover:border-ochre/50' },
  }[accent];

  return (
    <div
      className={cn(
        'anim-fade-up group relative rounded-2xl border border-sand-dark/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        accentMap.ring,
        delay,
      )}
    >
      <div
        className={cn(
          'mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
          accentMap.bg,
          accentMap.text,
        )}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{desc}</p>
    </div>
  );
}

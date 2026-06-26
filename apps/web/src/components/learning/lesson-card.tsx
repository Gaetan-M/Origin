'use client';

import Link from 'next/link';
import { BadgeCheck, GraduationCap, Languages, Lock, CheckCircle2 } from 'lucide-react';
import type { LearningLessonSummary } from '@/lib/api/learning';
import { cn } from '@/lib/utils';
import { useLearningT, useLevelLabel } from './learning-i18n';

interface LessonCardProps {
  lesson: LearningLessonSummary;
}

export function LessonCard({ lesson }: LessonCardProps) {
  const t = useLearningT();
  const levelLabel = useLevelLabel();

  const isVerified = lesson.isFromVerifiedAuthority || (lesson.authority?.verified ?? false);
  const bylineName = lesson.authority?.displayName ?? lesson.author.displayName;
  const progress = lesson.enrollment?.progressPercent ?? null;
  const isCompleted = Boolean(lesson.enrollment?.completedAt);

  return (
    <Link
      href={`/learn/${lesson.id}`}
      className="block rounded-xl border border-sand bg-white p-4 shadow-card transition-colors hover:border-forest/40"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
          {lesson.languageCode ? (
            <Languages className="h-5 w-5" />
          ) : (
            <GraduationCap className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 text-base font-bold leading-snug text-charcoal">
              {lesson.title}
            </h2>
            <span className="inline-flex shrink-0 items-center rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-charcoal/60">
              {levelLabel(lesson.level)}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-charcoal/50">
            <span className="truncate">
              {t('by')} {bylineName}
            </span>
            {isVerified && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest"
                title={t('verifiedAuthority')}
              >
                <BadgeCheck className="h-3 w-3" />
                {t('verified')}
              </span>
            )}
            {lesson.isTicketed && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-ochre/15 px-1.5 py-0.5 text-[10px] font-semibold text-ochre"
                title={t('ticketed')}
              >
                <Lock className="h-3 w-3" />
                {t('ticketed')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {lesson.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-charcoal/70">
          {lesson.description}
        </p>
      )}

      {/* Facets */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {lesson.languageCode && (
          <span className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-charcoal/60">
            {lesson.languageCode}
          </span>
        )}
        {lesson.ethnicGroup && (
          <span className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-charcoal/60">
            {lesson.ethnicGroup}
          </span>
        )}
      </div>

      {/* Enrollment progress, when enrolled */}
      {progress !== null && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-charcoal/50">
            <span className="inline-flex items-center gap-1">
              {isCompleted && <CheckCircle2 className="h-3 w-3 text-forest" />}
              {isCompleted ? t('completed') : t('progress')}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
            <div
              className={cn('h-full rounded-full', isCompleted ? 'bg-forest' : 'bg-ochre')}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

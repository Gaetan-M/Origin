'use client';

import Link from 'next/link';
import {
  AlertCircle,
  BadgeCheck,
  Languages,
  Lock,
  Radio,
} from 'lucide-react';
import { useLesson } from '@/lib/hooks/use-learning';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { EnrollPanel } from './enroll-panel';
import { LessonReader } from './lesson-reader';
import {
  useLearningT,
  useLearningLocale,
  useLevelLabel,
} from './learning-i18n';

interface LessonViewProps {
  lessonId: string;
}

function LessonViewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export function LessonView({ lessonId }: LessonViewProps) {
  const t = useLearningT();
  const levelLabel = useLevelLabel();
  const locale = useLearningLocale();
  const { data: lesson, isLoading, isError, refetch } = useLesson(lessonId);

  if (isLoading) return <LessonViewSkeleton />;

  if (isError || !lesson) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('notFound')}
        actionLabel={t('retry')}
        onAction={() => refetch()}
      />
    );
  }

  const isVerified = lesson.isFromVerifiedAuthority || (lesson.authority?.verified ?? false);
  const bylineName = lesson.authority?.displayName ?? lesson.author.displayName;

  const createdAt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(lesson.createdAt));

  return (
    <div className="space-y-4">
      {/* Title + meta */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-charcoal/60">
            {levelLabel(lesson.level)}
          </span>
          {lesson.languageCode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-medium text-forest">
              <Languages className="h-3 w-3" />
              {lesson.languageCode}
            </span>
          )}
          {lesson.isTicketed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ochre/15 px-2 py-0.5 text-[11px] font-semibold text-ochre">
              <Lock className="h-3 w-3" />
              {t('ticketed')}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-tight text-charcoal">{lesson.title}</h1>

        <div className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
          <span>
            {t('by')} {bylineName}
          </span>
          {isVerified && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest"
              title={t('verifiedAuthority')}
            >
              <BadgeCheck className="h-3 w-3" />
              {t('verified')}
            </span>
          )}
          <span className="text-charcoal/30">·</span>
          <span>{createdAt}</span>
        </div>

        {lesson.description && (
          <p className="text-sm leading-relaxed text-charcoal/70">{lesson.description}</p>
        )}
      </header>

      {/* Ticketed / live note */}
      {lesson.isTicketed && (
        <div className="flex items-start gap-2 rounded-lg border border-ochre/30 bg-ochre/5 p-3 text-xs text-charcoal/70">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ochre" />
          <div className="space-y-2">
            <p>{t('ticketedNote')}</p>
            {lesson.liveSessionId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/lives/${lesson.liveSessionId}`}>
                  <Radio className="h-4 w-4" />
                  {t('joinLive')}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Enroll + progress */}
      <EnrollPanel lesson={lesson} />

      {/* Mini-lesson reader */}
      <LessonReader content={lesson.content} />
    </div>
  );
}

'use client';

import { CheckCircle2, GraduationCap } from 'lucide-react';
import type { LearningLessonDetail } from '@/lib/api/learning';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEnrollInLesson, useUpdateLessonProgress } from '@/lib/hooks/use-learning';
import { useLearningT } from './learning-i18n';

interface EnrollPanelProps {
  lesson: LearningLessonDetail;
}

/** Discrete progress steps the learner can mark, keeping the mini-lesson simple. */
const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

export function EnrollPanel({ lesson }: EnrollPanelProps) {
  const t = useLearningT();
  const enroll = useEnrollInLesson(lesson.id);
  const updateProgress = useUpdateLessonProgress(lesson.id);

  const enrollment = lesson.enrollment ?? null;
  const progress = enrollment?.progressPercent ?? 0;
  const isCompleted = Boolean(enrollment?.completedAt);

  if (!enrollment) {
    return (
      <div className="rounded-xl border border-sand bg-white p-4 shadow-card">
        <p className="mb-3 text-sm text-charcoal/70">{t('enrollPrompt')}</p>
        <Button
          className="w-full"
          onClick={() => enroll.mutate()}
          disabled={enroll.isPending}
        >
          <GraduationCap className="h-4 w-4" />
          {enroll.isPending ? t('enrolling') : t('enroll')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sand bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal">
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-forest" />
              {t('completed')}
            </>
          ) : (
            <>
              <GraduationCap className="h-4 w-4 text-forest" />
              {t('enrolled')}
            </>
          )}
        </span>
        <span className="text-sm font-semibold text-charcoal/60">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-sand">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isCompleted ? 'bg-forest' : 'bg-ochre',
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <p className="mb-1.5 text-xs font-medium text-charcoal/50">{t('yourProgress')}</p>
      <div className="flex flex-wrap gap-1.5">
        {PROGRESS_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => updateProgress.mutate(step)}
            disabled={updateProgress.isPending || progress === step}
            className={cn(
              'flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed',
              progress >= step
                ? 'border-forest bg-forest/10 text-forest'
                : 'border-sand bg-white text-charcoal/60 hover:bg-sand',
            )}
          >
            {step}%
          </button>
        ))}
      </div>

      {!isCompleted && (
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() => updateProgress.mutate(100)}
          disabled={updateProgress.isPending}
        >
          {updateProgress.isPending ? t('updating') : t('markComplete')}
        </Button>
      )}
    </div>
  );
}

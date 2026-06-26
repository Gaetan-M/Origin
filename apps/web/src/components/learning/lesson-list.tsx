'use client';

import { useState } from 'react';
import { GraduationCap, AlertCircle } from 'lucide-react';
import type { LearningLevel } from '@/lib/api/learning';
import { LEARNING_LEVELS } from '@/lib/api/learning';
import { useLessons } from '@/lib/hooks/use-learning';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import { LessonCard } from './lesson-card';
import { useLearningT, useLevelLabel } from './learning-i18n';

function LessonListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-sand bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function LevelChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-forest bg-forest text-white'
          : 'border-sand bg-white text-charcoal/70 hover:bg-sand',
      )}
    >
      {label}
    </button>
  );
}

export function LessonList() {
  const t = useLearningT();
  const levelLabel = useLevelLabel();

  const [level, setLevel] = useState<LearningLevel | null>(null);
  const [languageInput, setLanguageInput] = useState('');

  const languageCode = languageInput.trim() || null;

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLessons({ languageCode, level });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="space-y-2">
        <Input
          value={languageInput}
          onChange={(e) => setLanguageInput(e.target.value)}
          placeholder={t('filterLanguagePlaceholder')}
          className="sm:max-w-xs"
        />
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <LevelChip
            active={level === null}
            onClick={() => setLevel(null)}
            label={t('filterAllLevels')}
          />
          {LEARNING_LEVELS.map((lvl) => (
            <LevelChip
              key={lvl}
              active={level === lvl}
              onClick={() => setLevel(lvl)}
              label={levelLabel(lvl)}
            />
          ))}
        </div>
      </div>

      {isLoading ? (
        <LessonListSkeleton />
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title={t('error')}
          actionLabel={t('retry')}
          onAction={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={GraduationCap} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <>
          {items.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? t('loadingMore') : t('loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

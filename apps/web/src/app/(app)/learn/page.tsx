'use client';

import { LessonList } from '@/components/learning/lesson-list';
import { useLearningT } from '@/components/learning/learning-i18n';

export default function LearnPage() {
  const t = useLearningT();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-charcoal">{t('title')}</h1>
        <p className="text-sm text-charcoal/60">{t('subtitle')}</p>
      </header>

      <LessonList />
    </div>
  );
}

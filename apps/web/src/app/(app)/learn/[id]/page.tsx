'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { LessonView } from '@/components/learning/lesson-view';
import { useLearningT } from '@/components/learning/learning-i18n';

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const t = useLearningT();
  const id = params.id;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('backToLessons')} showBack />
      <LessonView lessonId={id} />
    </div>
  );
}

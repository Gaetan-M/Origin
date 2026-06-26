'use client';

import { BookOpen } from 'lucide-react';
import { useLearningT } from './learning-i18n';

interface LessonReaderProps {
  content?: string | null;
}

/**
 * Simple, low-data mini-lesson reader. Renders the lesson body as readable
 * paragraphs (plain text — no HTML injection). Splits on blank lines to keep
 * spacing pleasant on small screens.
 */
export function LessonReader({ content }: LessonReaderProps) {
  const t = useLearningT();

  const trimmed = content?.trim() ?? '';

  if (!trimmed) {
    return (
      <div className="rounded-xl border border-dashed border-sand bg-sand/30 p-6 text-center text-sm text-charcoal/50">
        {t('noContent')}
      </div>
    );
  }

  const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <section className="rounded-xl border border-sand bg-white p-5 shadow-card">
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-charcoal/70">
        <BookOpen className="h-4 w-4 text-forest" />
        {t('lessonContent')}
      </h2>
      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <p
            key={i}
            className="whitespace-pre-wrap break-words text-sm leading-relaxed text-charcoal/80"
          >
            {para}
          </p>
        ))}
      </div>
    </section>
  );
}

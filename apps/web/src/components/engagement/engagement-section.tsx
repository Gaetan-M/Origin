'use client';

import { useState } from 'react';
import { PencilLine } from 'lucide-react';
import type { EngagementTarget } from '@/lib/api/engagement';
import { ReactionBar } from './reaction-bar';
import { StarRating } from './star-rating';
import { PhotoGallery } from './photo-gallery';
import { CommentThread } from './comment-thread';
import { SuggestEditDialog } from './suggest-edit-dialog';
import { useEngagementT } from './engagement-i18n';

interface EngagementSectionProps {
  target: EngagementTarget;
  id: string;
  /** Show the interactive star rating (tourism places only). */
  showRating?: boolean;
}

/**
 * Composes the full engagement experience for one (target, id): reactions,
 * an optional star rating, contributed photos, the comment thread, and a
 * "suggest an edit" affordance. Rendered below the static detail content.
 */
export function EngagementSection({ target, id, showRating = false }: EngagementSectionProps) {
  const t = useEngagementT();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <section className="space-y-5 rounded-xl border border-sand bg-white p-5">
      <ReactionBar target={target} id={id} />

      {showRating && (
        <>
          <hr className="border-sand" />
          <StarRating target={target} id={id} />
        </>
      )}

      <hr className="border-sand" />
      <PhotoGallery target={target} id={id} />

      <hr className="border-sand" />
      <CommentThread target={target} id={id} />

      <div className="border-t border-sand pt-3">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline"
        >
          <PencilLine className="h-3.5 w-3.5" />
          {t('suggestEdit')}
        </button>
      </div>

      <SuggestEditDialog target={target} id={id} open={editOpen} onOpenChange={setEditOpen} />
    </section>
  );
}

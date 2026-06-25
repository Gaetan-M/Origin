'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Baby, HeartHandshake, Flower2, Megaphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LifeStatus } from '@origin/shared-types';
import type { FeedPost } from '@/lib/api/family-feed';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { cn } from '@/lib/utils';
import { ReactionBar } from './reaction-bar';
import { CommentList } from './comment-list';
import { useFeedT, useFeedLocale, type FeedStringKey } from './feed-i18n';

interface FeedPostCardProps {
  post: FeedPost;
}

/** Maps a post/event to a badge icon + label key + accent classes. */
function getEventMeta(post: FeedPost): {
  icon: LucideIcon;
  labelKey: FeedStringKey;
  accent: string;
} {
  const kind = post.lifeEvent?.kind ?? post.postType.toLowerCase();
  switch (kind) {
    case 'birth':
    case 'BIRTH':
      return { icon: Baby, labelKey: 'eventBirth', accent: 'bg-forest/10 text-forest' };
    case 'union':
    case 'UNION':
      return { icon: HeartHandshake, labelKey: 'eventUnion', accent: 'bg-ochre/15 text-ochre' };
    case 'death':
    case 'DEATH':
      return { icon: Flower2, labelKey: 'eventDeath', accent: 'bg-charcoal/5 text-charcoal/60' };
    default:
      return { icon: Megaphone, labelKey: 'announcement', accent: 'bg-sand text-charcoal/60' };
  }
}

function coerceLifeStatus(value: string | undefined): LifeStatus {
  switch (value) {
    case 'ALIVE':
      return LifeStatus.ALIVE;
    case 'DECEASED':
      return LifeStatus.DECEASED;
    default:
      return LifeStatus.UNKNOWN;
  }
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const t = useFeedT();
  const locale = useFeedLocale();
  const [showComments, setShowComments] = useState(false);

  const { icon: EventIcon, labelKey, accent } = getEventMeta(post);
  const subject = post.subjectPerson;

  function formatRelative(dateStr: string): string {
    const date = new Date(dateStr);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return locale === 'en' ? 'now' : "a l'instant";
    if (diffMins < 60) return `${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return locale === 'en' ? `${diffDays}d` : `${diffDays}j`;
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
  }

  return (
    <article className="rounded-xl border border-sand bg-white p-4 shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3">
        {subject ? (
          <Link href={`/persons/${subject.id}`} className="shrink-0">
            <PersonAvatar
              id={subject.id}
              displayName={subject.displayName}
              lifeStatus={coerceLifeStatus(subject.lifeStatus)}
              photoUrl={subject.photoUrl}
              size="sm"
            />
          </Link>
        ) : (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', accent)}>
            <EventIcon className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {subject ? (
                <Link
                  href={`/persons/${subject.id}`}
                  className="block truncate text-sm font-semibold text-charcoal hover:underline"
                >
                  {subject.displayName}
                </Link>
              ) : (
                <span className="block truncate text-sm font-semibold text-charcoal">
                  {post.author.displayName}
                </span>
              )}
              <span className="text-xs text-charcoal/40">{formatRelative(post.createdAt)}</span>
            </div>

            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                accent,
              )}
            >
              <EventIcon className="h-3 w-3" />
              {t(labelKey)}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      {post.body && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-charcoal/80">
          {post.body}
        </p>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <ReactionBar postId={post.id} reactions={post.reactions} />
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-charcoal/60 transition-colors hover:bg-sand"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount > 0 ? post.commentCount : t('comment')}
        </button>
      </div>

      <CommentList postId={post.id} expanded={showComments} />
    </article>
  );
}

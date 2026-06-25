'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { usePostComments, useAddComment } from '@/lib/hooks/use-family-feed';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, getAvatarColor } from '@/lib/utils/format-name';
import { useFeedT, useFeedLocale } from './feed-i18n';

interface CommentListProps {
  postId: string;
  /** When false, the thread is collapsed and not fetched. */
  expanded: boolean;
}

export function CommentList({ postId, expanded }: CommentListProps) {
  const t = useFeedT();
  const locale = useFeedLocale();
  const { data: comments, isLoading } = usePostComments(postId, expanded);
  const addComment = useAddComment(postId);
  const [draft, setDraft] = useState('');

  if (!expanded) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    addComment.mutate(body, { onSuccess: () => setDraft('') });
  }

  function formatTime(dateStr: string): string {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  }

  return (
    <div className="mt-3 space-y-3 border-t border-sand pt-3">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <Avatar className="h-7 w-7 shrink-0 text-[10px]">
                <AvatarFallback
                  style={{ backgroundColor: getAvatarColor(c.accountId), color: 'white' }}
                >
                  {getInitials(c.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-lg bg-sand px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-charcoal">
                    {c.authorName}
                  </span>
                  <span className="shrink-0 text-[10px] text-charcoal/40">
                    {formatTime(c.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-charcoal/80">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-charcoal/50">{t('noComments')}</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('writeComment')}
          maxLength={2000}
          className="h-9 flex-1 rounded-full border border-[var(--input)] bg-[var(--background)] px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          disabled={addComment.isPending || draft.trim().length === 0}
          aria-label={t('send')}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

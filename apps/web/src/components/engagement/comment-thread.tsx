'use client';

import { useMemo, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAddComment,
  useComments,
  useDeleteComment,
} from '@/lib/hooks/use-engagement';
import type { EngagementTarget } from '@/lib/api/engagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, getAvatarColor } from '@/lib/utils/format-name';
import { useEngagementT, useEngagementLocale } from './engagement-i18n';

interface CommentThreadProps {
  target: EngagementTarget;
  id: string;
}

export function CommentThread({ target, id }: CommentThreadProps) {
  const t = useEngagementT();
  const locale = useEngagementLocale();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useComments(target, id);
  const addComment = useAddComment(target, id);
  const deleteComment = useDeleteComment(target, id);
  const [draft, setDraft] = useState('');

  const comments = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    addComment.mutate(body, {
      onSuccess: () => setDraft(''),
      onError: () => toast.error(t('commentError')),
    });
  }

  function handleDelete(commentId: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    deleteComment.mutate(commentId);
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
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal/50">
        {t('commentsTitle')}
        {comments.length > 0 && <span className="ml-1.5 text-charcoal/40">({comments.length})</span>}
      </h3>

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

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <>
          <ul className="space-y-2.5">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <Avatar className="h-7 w-7 shrink-0 text-[10px]">
                  <AvatarFallback
                    style={{ backgroundColor: getAvatarColor(c.accountId), color: 'white' }}
                  >
                    {getInitials(c.authorDisplayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-lg bg-sand px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-charcoal">
                      {c.authorDisplayName}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] text-charcoal/40">{formatTime(c.createdAt)}</span>
                      {c.mine && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          disabled={deleteComment.isPending}
                          aria-label={t('delete')}
                          title={t('delete')}
                          className="text-charcoal/30 transition-colors hover:text-terracotta disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-charcoal/80">
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {hasNextPage && (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? t('loadingMore') : t('seeMore')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-charcoal/50">{t('noComments')}</p>
      )}
    </div>
  );
}

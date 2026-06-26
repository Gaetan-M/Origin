'use client';

import { useMemo } from 'react';
import { useParticipants } from '@livekit/components-react';
import { Hand, Volume2, X } from 'lucide-react';
import { getAvatarColor, getInitials } from '@/lib/utils/format-name';
import type { HostParticipantAction } from '@/lib/api/live';
import { useLivesT } from './lives-i18n';

interface LiveHostPanelProps {
  open: boolean;
  onClose: () => void;
  raisedHands: ReadonlySet<string>;
  onHostAction: (identity: string, action: HostParticipantAction) => void;
}

/**
 * Host-only side panel: a live queue of raised hands with one-tap "invite to
 * speak". Resolves identities to names from the room roster so the host always
 * sees who is asking, in order.
 */
export function LiveHostPanel({
  open,
  onClose,
  raisedHands,
  onHostAction,
}: LiveHostPanelProps) {
  const t = useLivesT();
  const participants = useParticipants();

  const queue = useMemo(
    () => participants.filter((p) => raisedHands.has(p.identity)),
    [participants, raisedHands],
  );

  if (!open) return null;

  return (
    <aside className="absolute inset-y-0 left-0 z-40 flex w-full max-w-xs flex-col border-r border-white/10 bg-charcoal/95 backdrop-blur-sm sm:w-72">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Hand className="h-4 w-4 text-ochre" />
          {t('raisedHands')}
          {queue.length > 0 && (
            <span className="rounded-full bg-ochre px-1.5 text-xs font-bold text-charcoal">
              {queue.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {queue.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/40">
            {t('noRaisedHands')}
          </p>
        ) : (
          <ul className="space-y-2">
            {queue.map((p) => {
              const name = p.name || p.identity || '—';
              return (
                <li
                  key={p.identity}
                  className="flex items-center gap-2 rounded-xl bg-white/5 p-2"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: getAvatarColor(p.identity) }}
                  >
                    {getInitials(name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-white/90">
                    {name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onHostAction(p.identity, 'promote')}
                    className="flex items-center gap-1 rounded-full bg-ochre px-2.5 py-1 text-xs font-semibold text-charcoal hover:bg-ochre/90"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {t('promote')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

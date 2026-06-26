'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataChannel, useLocalParticipant } from '@livekit/components-react';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LIVE_TOPICS,
  createId,
  decodePayload,
  encodePayload,
  type ChatMessage,
} from './live-realtime';
import { useLivesLocale, useLivesT } from './lives-i18n';

interface LiveChatProps {
  open: boolean;
  onClose: () => void;
  /** The live's title — used as the chat (group) name, like a WhatsApp group. */
  title?: string;
}

/**
 * Collapsible live chat over a LiveKit data channel. Slides in from the right on
 * desktop and fills the sheet on mobile. Messages are ephemeral (not persisted)
 * — a lightweight back-channel for a live audience.
 */
export function LiveChat({ open, onClose, title }: LiveChatProps) {
  const t = useLivesT();
  const locale = useLivesLocale();
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const onMessage = useCallback((msg: { payload: Uint8Array }) => {
    const data = decodePayload<ChatMessage>(msg.payload);
    if (data && typeof data.text === 'string' && data.text.length > 0) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data].slice(-200),
      );
    }
  }, []);

  const { send } = useDataChannel(LIVE_TOPICS.chat, onMessage);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text) return;
      const message: ChatMessage = {
        id: createId(),
        from: localParticipant.name || localParticipant.identity || t('you'),
        text: text.slice(0, 500),
        at: Date.now(),
      };
      setMessages((prev) => [...prev, message].slice(-200));
      void send(encodePayload(message), { reliable: true });
      setDraft('');
    },
    [draft, localParticipant.identity, localParticipant.name, send, t],
  );

  const time = (at: number) =>
    new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
      new Date(at),
    );

  // Stays mounted while collapsed so the data channel keeps receiving messages
  // (history is preserved when the panel is reopened).
  return (
    <aside
      className={cn(
        'absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-white/10 bg-charcoal/95 backdrop-blur-sm sm:w-80',
        !open && 'hidden',
      )}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">
            {title?.trim() || t('chatTitle')}
          </h3>
          {title?.trim() && (
            <p className="truncate text-[11px] text-white/45">{t('chatTitle')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('chatClosed')}
          className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/40">{t('chatEmpty')}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-xs font-semibold text-ochre">
                  {m.from}
                </span>
                <span className="text-[10px] text-white/40">{time(m.at)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-white/85">
                {m.text}
              </p>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-white/10 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('chatPlaceholder')}
          maxLength={500}
          className="h-10 flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-ochre/60"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={t('chatSend')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ochre text-charcoal transition-opacity disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </aside>
  );
}

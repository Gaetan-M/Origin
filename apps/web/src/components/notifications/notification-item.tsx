'use client';

import { useRouter } from 'next/navigation';
import type { Notification } from '@origin/shared-types';
import { NotificationType } from '@origin/shared-types';
import {
  Bell,
  UserPlus,
  CheckCircle,
  GitMerge,
  Pencil,
  Users,
  Heart,
  Calendar,
  FileCheck,
  AlertCircle,
  UserSearch,
  Sparkles,
  KeyRound,
  TreePine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function getIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.INVITATION_RECEIVED:
      return UserPlus;
    case NotificationType.CLAIM_REQUEST:
      return AlertCircle;
    case NotificationType.CLAIM_VALIDATED:
      return CheckCircle;
    case NotificationType.MERGE_PROPOSAL:
      return GitMerge;
    case NotificationType.MODIFICATION_SUGGESTED:
      return Pencil;
    case NotificationType.NEW_FAMILY_MEMBER:
      return Users;
    case NotificationType.DECEASE_REPORTED:
      return Heart;
    case NotificationType.BIRTHDAY_REMINDER:
    case NotificationType.MEMORIAL_REMINDER:
      return Calendar;
    case NotificationType.DOCUMENT_VERIFIED:
      return FileCheck;
    case NotificationType.MATCH_FOUND_FOR_USER:
      return TreePine;
    case NotificationType.POTENTIAL_MATCH_FOR_INVITER:
      return Sparkles;
    case NotificationType.KINSHIP_PROBE_RECEIVED:
      return UserSearch;
    case NotificationType.FAMILY_CODE_REDEEMED:
      return KeyRound;
    default:
      return Bell;
  }
}

function getAccentClass(type: NotificationType): string {
  switch (type) {
    case NotificationType.MATCH_FOUND_FOR_USER:
    case NotificationType.FAMILY_CODE_REDEEMED:
      return 'bg-forest/10 text-forest';
    case NotificationType.POTENTIAL_MATCH_FOR_INVITER:
    case NotificationType.KINSHIP_PROBE_RECEIVED:
      return 'bg-ochre/15 text-ochre';
    default:
      return 'bg-sand text-charcoal/60';
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}j`;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const router = useRouter();
  const Icon = getIcon(notification.notificationType);
  const accent = getAccentClass(notification.notificationType);

  function handleClick() {
    onClick?.();
    if (notification.actionUrl) {
      // Use router for in-app paths, window for external/absolute URLs.
      if (notification.actionUrl.startsWith('/')) {
        router.push(notification.actionUrl);
      } else {
        window.location.href = notification.actionUrl;
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-sand',
        !notification.isRead && 'bg-forest/5',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          accent,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm text-charcoal', !notification.isRead && 'font-medium')}>
            {notification.title}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-xs text-charcoal/40">{formatTime(notification.createdAt)}</span>
            {!notification.isRead && <span className="h-2 w-2 rounded-full bg-forest" />}
          </div>
        </div>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-charcoal/60">{notification.body}</p>
        )}
      </div>
    </button>
  );
}

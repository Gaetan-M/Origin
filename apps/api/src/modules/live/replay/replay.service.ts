import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CulturalContentType,
  LiveSessionStatus,
  ModerationStatus,
  NotificationType,
  Prisma,
  VisibilityScope,
} from '@prisma/client';
import type { DomainEvent } from '@origin/shared-types';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventPublisher } from '../../../eventing/event-publisher';
import { NotificationsService } from '../../notifications/notifications.service';
import type {
  LiveKitWebhookEvent,
  LiveKitFileResult,
} from './livekit-webhook.types';

const LIVE_REPLAY_PUBLISHED_VERSION = 1;

/** Default bucket for live recordings when the egress payload omits one. */
const DEFAULT_RECORDING_BUCKET = 'genealogie-recordings';

/** Media.fileType discriminator for a LIVE session replay recording. */
const RECORDING_FILE_TYPE = 'live_recording';

/** FeedPost.postType discriminator for a FAMILY replay surfaced to the feed. */
const REPLAY_POST_TYPE = 'live_replay';

/** Number of nanoseconds in one second (LiveKit reports egress duration in ns). */
const NANOS_PER_SECOND = 1_000_000_000;

/**
 * LiveKit webhook events that signal a finished recording. 'egress_ended' is the
 * current event; 'recording_finished' is accepted for forward/backward tolerance.
 */
const RECORDING_FINISHED_EVENTS = new Set(['egress_ended', 'recording_finished']);

/**
 * Normalised recording reference extracted from a LiveKit egress payload (or
 * supplied by a manual trigger). Everything is optional except the storage key
 * because that is the minimum needed to address the recording later.
 */
export interface RecordingInfo {
  s3Key: string;
  s3Bucket?: string | null;
  cdnUrl?: string | null;
  mimeType?: string | null;
  durationSeconds?: number | null;
  fileSizeBytes?: bigint | null;
}

/** Which surface a replay was published to. */
export type ReplaySurface = 'public_discovery' | 'family_feed';

/** Outcome of publishing (or re-publishing) a session's replay. */
export interface PublishReplayResult {
  liveSessionId: string;
  recordingMediaId: string | null;
  replayPublished: boolean;
  /** True when the session's replay was already published (idempotent no-op). */
  alreadyPublished: boolean;
  surface: ReplaySurface | null;
  /** Id of the CulturalContent (public) or FeedPost (family) carrying the replay. */
  surfaceEntityId: string | null;
}

/**
 * Domain-event payload announcing a replay has been surfaced. Carries only ids
 * + visibility metadata so downstream consumers (search indexing, the surface
 * services) can join without re-deriving anything. Never carries graph edges.
 */
export interface LiveReplayPublishedPayload {
  liveSessionId: string;
  visibilityScope: VisibilityScope;
  recordingMediaId: string;
  surface: ReplaySurface;
  surfaceEntityId: string;
  hostAccountId: string;
}

export type LiveReplayPublishedEvent = DomainEvent<
  'live.replay-published',
  LiveReplayPublishedPayload
>;

/**
 * Recording -> replay -> feed pipeline.
 *
 * Turns an ended LIVE session's recording into discoverable content: PUBLIC
 * lives become a CulturalContent (type OTHER) in the public discovery surface,
 * while FAMILY/PRIVATE lives become a degree-bounded family FeedPost. The replay
 * inherits the session's visibility, so the feed/discovery access gates already
 * enforce the same audience the live had.
 *
 * Both entry points (the LiveKit webhook and the manual {@link publishReplay}
 * trigger) converge on the same idempotent publish, keyed on
 * `replay_published`, so at-least-once webhook delivery never double-publishes.
 * Every publish writes a Contribution audit row and emits a
 * `live.replay-published` domain event.
 */
@Injectable()
export class ReplayService {
  private readonly logger = new Logger(ReplayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisher,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Entry point for an already-verified LiveKit webhook event. Ignores anything
   * that is not a finished recording, resolves the owning session by room name,
   * and delegates to the idempotent {@link publishReplay}.
   *
   * Best-effort: an unmatched room or missing recording is logged and swallowed
   * (a webhook must still be acknowledged), never thrown back to the transport.
   */
  async handleWebhookEvent(event: LiveKitWebhookEvent): Promise<void> {
    if (!event.event || !RECORDING_FINISHED_EVENTS.has(event.event)) {
      return;
    }

    const roomName = this.extractRoomName(event);
    if (!roomName) {
      this.logger.warn(
        `LiveKit ${event.event} webhook had no room name; ignoring`,
      );
      return;
    }

    const session = await this.prisma.liveSession.findFirst({
      where: { roomName, deletedAt: null },
      select: { id: true },
    });
    if (!session) {
      this.logger.warn(
        `No live session for LiveKit room '${roomName}'; ignoring ${event.event}`,
      );
      return;
    }

    const recording = this.extractRecording(event);
    await this.publishReplay(session.id, recording);
  }

  /**
   * Idempotently attaches the recording and surfaces the replay for a session.
   *
   * - Already published -> returns immediately (no writes, no event).
   * - PUBLIC session -> creates a CulturalContent (type OTHER, auto-approved,
   *   verified flag mirrors the host authority) referencing the recording.
   * - FAMILY/PRIVATE session -> creates a FeedPost (postType 'live_replay')
   *   anchored on the session's subject person so the existing degree gate
   *   governs who sees it.
   *
   * Reuses an already-attached `recording_media_id`; otherwise requires
   * {@link RecordingInfo} to create the Media reference. Writes a Contribution
   * audit row and emits `live.replay-published`.
   */
  async publishReplay(
    sessionId: string,
    recording?: RecordingInfo | null,
  ): Promise<PublishReplayResult> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: {
        id: true,
        hostAccountId: true,
        hostAuthorityId: true,
        title: true,
        description: true,
        visibilityScope: true,
        visibleMaxDegree: true,
        subjectPersonId: true,
        status: true,
        endedAt: true,
        recordingMediaId: true,
        replayPublished: true,
      },
    });
    if (!session) {
      throw new NotFoundException(
        'Live session not found / Session live introuvable',
      );
    }

    // Idempotent: a replay is published at most once. Safe under at-least-once
    // webhook delivery and against a manual re-trigger racing the webhook.
    if (session.replayPublished) {
      return {
        liveSessionId: session.id,
        recordingMediaId: session.recordingMediaId,
        replayPublished: true,
        alreadyPublished: true,
        surface: null,
        surfaceEntityId: null,
      };
    }

    if (session.status === LiveSessionStatus.CANCELLED) {
      throw new BadRequestException(
        'A cancelled live session has no replay / Une session annulée n’a pas de rediffusion',
      );
    }

    if (!session.recordingMediaId && !recording) {
      throw new BadRequestException(
        'No recording available to publish for this session / Aucun enregistrement disponible pour cette session',
      );
    }

    const isPublic = session.visibilityScope === VisibilityScope.PUBLIC;

    const { recordingMediaId, surface, surfaceEntityId } =
      await this.prisma.$transaction(async (tx) => {
        // Attach (or reuse) the recording Media reference.
        let mediaId = session.recordingMediaId;
        if (!mediaId && recording) {
          const media = await tx.media.create({
            data: {
              fileType: RECORDING_FILE_TYPE,
              mimeType: recording.mimeType ?? 'video/mp4',
              fileSizeBytes: recording.fileSizeBytes ?? null,
              s3Bucket: recording.s3Bucket ?? this.defaultRecordingBucket(),
              s3Key: recording.s3Key,
              cdnUrl: recording.cdnUrl ?? null,
              durationSeconds: recording.durationSeconds ?? null,
              uploadedByAccountId: session.hostAccountId,
              visibilityScope: session.visibilityScope,
              visibleMaxDegree: session.visibleMaxDegree,
            },
            select: { id: true },
          });
          mediaId = media.id;
        }

        // mediaId is guaranteed non-null here: either it pre-existed or we just
        // created it (the earlier guard rejects the neither case).
        const resolvedMediaId = mediaId as string;

        let publishedSurface: ReplaySurface;
        let entityId: string;

        if (isPublic) {
          // PUBLIC replays land in the public discovery surface as cultural
          // content. Auto-approved: hosting a public live is already gated on
          // the host (or a verified authority), so the replay is trusted.
          const content = await tx.culturalContent.create({
            data: {
              authorAccountId: session.hostAccountId,
              authorityId: session.hostAuthorityId,
              contentType: CulturalContentType.OTHER,
              title: session.title,
              body: session.description,
              mediaId: resolvedMediaId,
              visibilityScope: VisibilityScope.PUBLIC,
              moderationStatus: ModerationStatus.APPROVED,
              isFromVerifiedAuthority: session.hostAuthorityId !== null,
            },
            select: { id: true },
          });
          publishedSurface = 'public_discovery';
          entityId = content.id;
        } else {
          // FAMILY/PRIVATE replays become a FeedPost anchored on the subject
          // person, so the family feed's degree gate decides who can see it.
          const post = await tx.feedPost.create({
            data: {
              authorAccountId: session.hostAccountId,
              subjectPersonId: session.subjectPersonId,
              postType: REPLAY_POST_TYPE,
              body: session.title,
              visibilityScope: session.visibilityScope,
              visibleMaxDegree: session.visibleMaxDegree,
            },
            select: { id: true },
          });
          publishedSurface = 'family_feed';
          entityId = post.id;
        }

        await tx.liveSession.update({
          where: { id: session.id },
          data: {
            recordingMediaId: resolvedMediaId,
            replayPublished: true,
            // Surfacing a replay implies the live is over; only advance a
            // still-open session, never overwrite an explicit terminal state.
            ...(session.status === LiveSessionStatus.ENDED
              ? {}
              : { status: LiveSessionStatus.ENDED }),
            endedAt: session.endedAt ?? new Date(),
          },
        });

        await tx.contribution.create({
          data: {
            accountId: session.hostAccountId,
            entityType: 'live_session',
            entityId: session.id,
            action: 'PUBLISH_REPLAY',
            newValue: {
              recordingMediaId: resolvedMediaId,
              surface: publishedSurface,
              surfaceEntityId: entityId,
              visibilityScope: session.visibilityScope,
            } as unknown as Prisma.JsonObject,
          },
        });

        return {
          recordingMediaId: resolvedMediaId,
          surface: publishedSurface,
          surfaceEntityId: entityId,
        };
      });

    await this.emitReplayPublished({
      liveSessionId: session.id,
      visibilityScope: session.visibilityScope,
      recordingMediaId,
      surface,
      surfaceEntityId,
      hostAccountId: session.hostAccountId,
    });

    await this.notifyHost(session.hostAccountId, session.id, session.title);

    return {
      liveSessionId: session.id,
      recordingMediaId,
      replayPublished: true,
      alreadyPublished: false,
      surface,
      surfaceEntityId,
    };
  }

  // --- internals -----------------------------------------------------------

  /** Resolves the LiveKit room name from an egress webhook event. */
  private extractRoomName(event: LiveKitWebhookEvent): string | null {
    return event.egressInfo?.roomName ?? event.room?.name ?? null;
  }

  /**
   * Extracts a recording reference from a LiveKit egress payload, preferring
   * the structured `fileResults[0]` and falling back to the legacy `file`.
   * Returns null when the egress produced no addressable file.
   */
  private extractRecording(event: LiveKitWebhookEvent): RecordingInfo | null {
    const egress = event.egressInfo;
    if (!egress) {
      return null;
    }
    const file = egress.fileResults?.[0] ?? egress.file;
    if (!file) {
      return null;
    }
    const s3Key = file.filename ?? file.location;
    if (!s3Key) {
      return null;
    }
    return {
      s3Key,
      cdnUrl: this.asUrl(file.location),
      durationSeconds: this.nanosToSeconds(file.duration),
      fileSizeBytes: this.toBigInt(file.size),
    };
  }

  /** Treats a value as a CDN URL only when it looks like one (http/https). */
  private asUrl(value: LiveKitFileResult['location']): string | null {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return value;
    }
    return null;
  }

  /** LiveKit reports egress duration in nanoseconds; convert to whole seconds. */
  private nanosToSeconds(value: LiveKitFileResult['duration']): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    const nanos = Number(value);
    if (!Number.isFinite(nanos) || nanos <= 0) {
      return null;
    }
    return Math.round(nanos / NANOS_PER_SECOND);
  }

  private toBigInt(value: LiveKitFileResult['size']): bigint | null {
    if (value === undefined || value === null) {
      return null;
    }
    try {
      const asNumber = Number(value);
      if (!Number.isFinite(asNumber) || asNumber < 0) {
        return null;
      }
      return BigInt(Math.trunc(asNumber));
    } catch {
      return null;
    }
  }

  private defaultRecordingBucket(): string {
    return (
      process.env.LIVEKIT_RECORDING_BUCKET ??
      process.env.S3_BUCKET_PHOTOS ??
      DEFAULT_RECORDING_BUCKET
    );
  }

  private async emitReplayPublished(
    payload: LiveReplayPublishedPayload,
  ): Promise<void> {
    const event: LiveReplayPublishedEvent = {
      type: 'live.replay-published',
      version: LIVE_REPLAY_PUBLISHED_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: payload.hostAccountId,
      correlationId: randomUUID(),
      payload,
    };
    try {
      await this.eventPublisher.publish(event);
    } catch (err) {
      // The replay already committed; a publish failure must not surface as an
      // error. The eventing layer owns retry/outbox semantics.
      this.logger.error(
        `Failed to publish live.replay-published for ${payload.liveSessionId}: ${
          (err as Error).message
        }`,
      );
    }
  }

  /** Best-effort "your replay is ready" notification to the host. */
  private async notifyHost(
    hostAccountId: string,
    liveSessionId: string,
    title: string,
  ): Promise<void> {
    try {
      await this.notifications.createNotification({
        accountId: hostAccountId,
        notificationType: NotificationType.OTHER,
        title: 'Replay published / Rediffusion publiée',
        body: `Your live "${title}" is now available as a replay. / Votre live « ${title} » est désormais disponible en rediffusion.`,
        relatedEntityType: 'live_session',
        relatedEntityId: liveSessionId,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to notify host ${hostAccountId} of replay for ${liveSessionId}: ${
          (err as Error).message
        }`,
      );
    }
  }
}

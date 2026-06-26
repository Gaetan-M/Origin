import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CulturalContentType,
  LiveSessionStatus,
  ModerationStatus,
  VisibilityScope,
} from '@prisma/client';
import { ReplayService } from './replay.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventPublisher } from '../../../eventing/event-publisher';
import { NotificationsService } from '../../notifications/notifications.service';
import type { LiveKitWebhookEvent } from './livekit-webhook.types';

const HOST_ACCOUNT_ID = 'host-account-1';
const SESSION_ID = 'session-1';

interface SessionRow {
  id: string;
  hostAccountId: string;
  hostAuthorityId: string | null;
  title: string;
  description: string | null;
  visibilityScope: VisibilityScope;
  visibleMaxDegree: number | null;
  subjectPersonId: string | null;
  status: LiveSessionStatus;
  endedAt: Date | null;
  recordingMediaId: string | null;
  replayPublished: boolean;
}

function makeSession(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: SESSION_ID,
    hostAccountId: HOST_ACCOUNT_ID,
    hostAuthorityId: null,
    title: 'Funérailles de Grand-Père',
    description: 'Cérémonie diffusée à la diaspora',
    visibilityScope: VisibilityScope.FAMILY,
    visibleMaxDegree: 4,
    subjectPersonId: 'person-subject-1',
    status: LiveSessionStatus.LIVE,
    endedAt: null,
    recordingMediaId: null,
    replayPublished: false,
    ...overrides,
  };
}

const recording = {
  s3Key: 'recordings/2026/session-1.mp4',
  cdnUrl: 'https://cdn.example.com/recordings/session-1.mp4',
  durationSeconds: 3600,
  fileSizeBytes: 1024n,
};

describe('ReplayService', () => {
  let service: ReplayService;

  const tx = {
    media: { create: jest.fn() },
    culturalContent: { create: jest.fn() },
    feedPost: { create: jest.fn() },
    liveSession: { update: jest.fn() },
    contribution: { create: jest.fn() },
  };

  const mockPrisma = {
    liveSession: { findFirst: jest.fn() },
    $transaction: jest.fn(
      async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
    ),
  };

  const mockEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
  };

  const mockNotifications = {
    createNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tx.media.create.mockResolvedValue({ id: 'media-1' });
    tx.culturalContent.create.mockResolvedValue({ id: 'content-1' });
    tx.feedPost.create.mockResolvedValue({ id: 'post-1' });
    tx.liveSession.update.mockResolvedValue({ id: SESSION_ID });
    tx.contribution.create.mockResolvedValue({ id: 'contrib-1' });

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ReplayService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = moduleRef.get(ReplayService);
  });

  describe('publishReplay', () => {
    it('publishes a FAMILY replay as a degree-bounded FeedPost', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(makeSession());

      const result = await service.publishReplay(SESSION_ID, recording);

      expect(tx.media.create).toHaveBeenCalledTimes(1);
      expect(tx.media.create.mock.calls[0][0].data).toMatchObject({
        fileType: 'live_recording',
        s3Key: recording.s3Key,
        visibilityScope: VisibilityScope.FAMILY,
        visibleMaxDegree: 4,
        uploadedByAccountId: HOST_ACCOUNT_ID,
      });

      expect(tx.feedPost.create).toHaveBeenCalledTimes(1);
      const post = tx.feedPost.create.mock.calls[0][0].data;
      expect(post.postType).toBe('live_replay');
      expect(post.subjectPersonId).toBe('person-subject-1');
      expect(post.visibilityScope).toBe(VisibilityScope.FAMILY);
      expect(post.visibleMaxDegree).toBe(4);
      expect(tx.culturalContent.create).not.toHaveBeenCalled();

      expect(tx.liveSession.update.mock.calls[0][0].data).toMatchObject({
        recordingMediaId: 'media-1',
        replayPublished: true,
        status: LiveSessionStatus.ENDED,
      });

      expect(result).toMatchObject({
        liveSessionId: SESSION_ID,
        recordingMediaId: 'media-1',
        replayPublished: true,
        alreadyPublished: false,
        surface: 'family_feed',
        surfaceEntityId: 'post-1',
      });
    });

    it('publishes a PUBLIC replay as an auto-approved CulturalContent (type OTHER)', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({
          visibilityScope: VisibilityScope.PUBLIC,
          hostAuthorityId: 'authority-1',
        }),
      );

      const result = await service.publishReplay(SESSION_ID, recording);

      expect(tx.culturalContent.create).toHaveBeenCalledTimes(1);
      const content = tx.culturalContent.create.mock.calls[0][0].data;
      expect(content.contentType).toBe(CulturalContentType.OTHER);
      expect(content.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(content.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(content.isFromVerifiedAuthority).toBe(true);
      expect(content.mediaId).toBe('media-1');
      expect(content.authorityId).toBe('authority-1');
      expect(tx.feedPost.create).not.toHaveBeenCalled();

      expect(result.surface).toBe('public_discovery');
      expect(result.surfaceEntityId).toBe('content-1');
    });

    it('writes a Contribution audit row and emits live.replay-published', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(makeSession());

      await service.publishReplay(SESSION_ID, recording);

      expect(tx.contribution.create).toHaveBeenCalledTimes(1);
      const audit = tx.contribution.create.mock.calls[0][0].data;
      expect(audit.entityType).toBe('live_session');
      expect(audit.entityId).toBe(SESSION_ID);
      expect(audit.action).toBe('PUBLISH_REPLAY');

      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
      const event = mockEventPublisher.publish.mock.calls[0][0];
      expect(event.type).toBe('live.replay-published');
      expect(event.actorId).toBe(HOST_ACCOUNT_ID);
      expect(event.payload).toMatchObject({
        liveSessionId: SESSION_ID,
        recordingMediaId: 'media-1',
        surface: 'family_feed',
        surfaceEntityId: 'post-1',
      });
    });

    it('is idempotent: an already-published replay does nothing', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ replayPublished: true, recordingMediaId: 'media-x' }),
      );

      const result = await service.publishReplay(SESSION_ID, recording);

      expect(result.alreadyPublished).toBe(true);
      expect(result.recordingMediaId).toBe('media-x');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('reuses an already-attached recording without creating new Media', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ recordingMediaId: 'media-existing' }),
      );

      const result = await service.publishReplay(SESSION_ID);

      expect(tx.media.create).not.toHaveBeenCalled();
      expect(result.recordingMediaId).toBe('media-existing');
      expect(tx.feedPost.create.mock.calls[0][0].data).toBeDefined();
    });

    it('throws NotFound when the session does not exist', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(null);

      await expect(service.publishReplay(SESSION_ID, recording)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects publishing a CANCELLED session', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.CANCELLED }),
      );

      await expect(service.publishReplay(SESSION_ID, recording)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects when no recording is available and none is attached', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(makeSession());

      await expect(service.publishReplay(SESSION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleWebhookEvent', () => {
    it('ignores events that are not a finished recording', async () => {
      await service.handleWebhookEvent({ event: 'egress_started' });
      expect(mockPrisma.liveSession.findFirst).not.toHaveBeenCalled();
    });

    it('resolves the session by room name and publishes on egress_ended', async () => {
      mockPrisma.liveSession.findFirst
        .mockResolvedValueOnce({ id: SESSION_ID })
        .mockResolvedValueOnce(makeSession());

      const event: LiveKitWebhookEvent = {
        event: 'egress_ended',
        egressInfo: {
          roomName: 'room-abc',
          fileResults: [
            {
              filename: 'recordings/room-abc.mp4',
              location: 'https://cdn.example.com/room-abc.mp4',
              size: '2048',
              duration: '60000000000',
            },
          ],
        },
      };

      await service.handleWebhookEvent(event);

      expect(mockPrisma.liveSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { roomName: 'room-abc', deletedAt: null } }),
      );
      const media = tx.media.create.mock.calls[0][0].data;
      expect(media.s3Key).toBe('recordings/room-abc.mp4');
      // 60s reported as 60_000_000_000 ns -> 60 seconds.
      expect(media.durationSeconds).toBe(60);
      expect(media.fileSizeBytes).toBe(2048n);
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
    });

    it('ignores an egress with no matching session', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(null);

      await service.handleWebhookEvent({
        event: 'egress_ended',
        egressInfo: { roomName: 'unknown-room' },
      });

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

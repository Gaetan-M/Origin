import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LiveSessionKind,
  LiveSessionStatus,
  VisibilityScope,
} from '@prisma/client';
import { LiveService } from './live.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { GraphDegreeService } from '../authorization/graph-degree.service';
import { LivekitTokenService } from './livekit-token.service';

type AnyRecord = Record<string, unknown>;

function makeSession(overrides: AnyRecord = {}): AnyRecord {
  return {
    id: 'session-1',
    hostAccountId: 'host-1',
    hostAuthorityId: null,
    title: 'Veillée',
    description: null,
    kind: LiveSessionKind.CEREMONY,
    visibilityScope: VisibilityScope.FAMILY,
    visibleMaxDegree: null,
    subjectPersonId: 'subject-1',
    roomName: 'live-room-1',
    status: LiveSessionStatus.SCHEDULED,
    scheduledAt: null,
    startedAt: null,
    endedAt: null,
    recordingMediaId: null,
    replayPublished: false,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('LiveService', () => {
  let service: LiveService;

  const mockPrisma = {
    liveSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    liveParticipant: { upsert: jest.fn() },
    culturalAuthority: { findFirst: jest.fn() },
    claim: { findFirst: jest.fn() },
    contribution: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const mockGraphDegree = { computeDegree: jest.fn() };
  const mockConfig = { get: jest.fn() };
  const mockEvents = { publish: jest.fn() };
  const mockToken = { mint: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
    );
    mockConfig.get.mockImplementation((_key: string, def?: unknown) => def);
    mockEvents.publish.mockResolvedValue(undefined);
    mockPrisma.claim.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GraphDegreeService, useValue: mockGraphDegree },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EventPublisher, useValue: mockEvents },
        { provide: LivekitTokenService, useValue: mockToken },
      ],
    }).compile();

    service = module.get(LiveService);
  });

  describe('createSession', () => {
    it('rejects a PUBLIC lesson when the host is not a verified authority', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);

      await expect(
        service.createSession('host-1', {
          title: 'Cours de Duala',
          kind: LiveSessionKind.LESSON,
          visibilityScope: VisibilityScope.PUBLIC,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.liveSession.create).not.toHaveBeenCalled();
    });

    it('creates a PUBLIC masterclass for a verified authority, assigns a room + audit', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue({ id: 'auth-1' });
      mockPrisma.liveSession.create.mockResolvedValue(
        makeSession({
          kind: LiveSessionKind.MASTERCLASS,
          visibilityScope: VisibilityScope.PUBLIC,
          hostAuthorityId: 'auth-1',
        }),
      );

      await service.createSession('host-1', {
        title: 'Masterclass ndolè',
        kind: LiveSessionKind.MASTERCLASS,
        visibilityScope: VisibilityScope.PUBLIC,
      });

      const data = mockPrisma.liveSession.create.mock.calls[0][0].data;
      expect(data.hostAuthorityId).toBe('auth-1');
      expect(data.status).toBe(LiveSessionStatus.SCHEDULED);
      expect(data.roomName).toMatch(/^live-/);
      expect(mockPrisma.contribution.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.contribution.create.mock.calls[0][0].data).toMatchObject(
        { entityType: 'live_session', action: 'CREATE', accountId: 'host-1' },
      );
      expect(mockEvents.publish).toHaveBeenCalledTimes(1);
      expect(mockEvents.publish.mock.calls[0][0].type).toBe(
        'live-session.created',
      );
    });

    it('defaults visibility to FAMILY and needs no authority for a ceremony', async () => {
      mockPrisma.liveSession.create.mockResolvedValue(makeSession());

      await service.createSession('host-1', {
        title: 'Funérailles',
        kind: LiveSessionKind.CEREMONY,
      });

      const data = mockPrisma.liveSession.create.mock.calls[0][0].data;
      expect(data.visibilityScope).toBe(VisibilityScope.FAMILY);
      expect(mockPrisma.culturalAuthority.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('startSession / endSession', () => {
    it('forbids a non-host from starting', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ hostAccountId: 'someone-else' }),
      );
      await expect(
        service.startSession('session-1', 'host-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects starting a session that is not SCHEDULED', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.LIVE }),
      );
      await expect(
        service.startSession('session-1', 'host-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('transitions SCHEDULED -> LIVE and stamps started_at', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(makeSession());
      mockPrisma.liveSession.update.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.LIVE }),
      );

      await service.startSession('session-1', 'host-1');

      const data = mockPrisma.liveSession.update.mock.calls[0][0].data;
      expect(data.status).toBe(LiveSessionStatus.LIVE);
      expect(data.startedAt).toBeInstanceOf(Date);
      expect(mockEvents.publish.mock.calls[0][0].type).toBe(
        'live-session.started',
      );
    });

    it('rejects ending a session that is not LIVE', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(makeSession());
      await expect(
        service.endSession('session-1', 'host-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('transitions LIVE -> ENDED and stamps ended_at', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.LIVE }),
      );
      mockPrisma.liveSession.update.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.ENDED }),
      );

      await service.endSession('session-1', 'host-1');

      const data = mockPrisma.liveSession.update.mock.calls[0][0].data;
      expect(data.status).toBe(LiveSessionStatus.ENDED);
      expect(data.endedAt).toBeInstanceOf(Date);
    });
  });

  describe('listSessions (visibility enforced)', () => {
    it('includes PUBLIC, gates FAMILY by degree, and always shows own hosted', async () => {
      mockConfig.get.mockReturnValue(5);
      mockPrisma.claim.findFirst.mockResolvedValue({ personId: 'me' });
      mockPrisma.liveSession.findMany.mockResolvedValue([
        makeSession({ id: 'pub', visibilityScope: VisibilityScope.PUBLIC, hostAccountId: 'x' }),
        makeSession({ id: 'near', visibilityScope: VisibilityScope.FAMILY, subjectPersonId: 'p-near', hostAccountId: 'x' }),
        makeSession({ id: 'far', visibilityScope: VisibilityScope.FAMILY, subjectPersonId: 'p-far', hostAccountId: 'x' }),
        makeSession({ id: 'own', visibilityScope: VisibilityScope.FAMILY, subjectPersonId: 'p-far', hostAccountId: 'me-account' }),
      ]);
      mockGraphDegree.computeDegree.mockImplementation(
        async (_from: string, to: string) => (to === 'p-near' ? 2 : null),
      );

      const result = await service.listSessions('me-account', {});

      expect(result.map((s) => s.id)).toEqual(['pub', 'near', 'own']);
    });
  });

  describe('getJoinToken', () => {
    it('throws NotFound for a missing session', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(null);
      await expect(
        service.getJoinToken('nope', 'account-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects joining an ENDED session', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.ENDED }),
      );
      await expect(
        service.getJoinToken('session-1', 'host-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-host joining before the session is LIVE', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.SCHEDULED }),
      );
      await expect(
        service.getJoinToken('session-1', 'viewer-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forbids a too-distant viewer and never mints a token', async () => {
      mockConfig.get.mockReturnValue(5);
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.LIVE, subjectPersonId: 'p-far' }),
      );
      mockPrisma.claim.findFirst.mockResolvedValue({ personId: 'me' });
      mockGraphDegree.computeDegree.mockResolvedValue(null);

      await expect(
        service.getJoinToken('session-1', 'viewer-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockToken.mint).not.toHaveBeenCalled();
      expect(mockPrisma.liveParticipant.upsert).not.toHaveBeenCalled();
    });

    it('mints a host token with publish rights and records the participant', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({ status: LiveSessionStatus.LIVE }),
      );
      mockToken.mint.mockResolvedValue({
        token: 'jwt.token.value',
        url: 'wss://x',
        roomName: 'live-room-1',
        identity: 'host-1',
      });

      const result = await service.getJoinToken('session-1', 'host-1');

      expect(mockToken.mint).toHaveBeenCalledWith(
        'live-room-1',
        'host-1',
        expect.objectContaining({ canPublish: true, canSubscribe: true }),
      );
      expect(result.role).toBe('host');
      expect(result.token).toBe('jwt.token.value');
      expect(mockPrisma.liveParticipant.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.contribution.create.mock.calls[0][0].data).toMatchObject(
        { entityType: 'live_session', action: 'JOIN' },
      );
    });

    it('mints a viewer (subscribe-only) token for a PUBLIC attendee', async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(
        makeSession({
          status: LiveSessionStatus.LIVE,
          visibilityScope: VisibilityScope.PUBLIC,
          hostAccountId: 'host-1',
        }),
      );
      mockToken.mint.mockResolvedValue({
        token: 'jwt.viewer.value',
        url: 'wss://x',
        roomName: 'live-room-1',
        identity: 'viewer-1',
      });

      const result = await service.getJoinToken('session-1', 'viewer-1', {
        requestSpeaker: true,
      });

      // requestSpeaker is ignored on PUBLIC sessions -> viewer, no publish.
      expect(result.role).toBe('viewer');
      expect(mockToken.mint).toHaveBeenCalledWith(
        'live-room-1',
        'viewer-1',
        expect.objectContaining({ canPublish: false, canSubscribe: true }),
      );
    });
  });
});

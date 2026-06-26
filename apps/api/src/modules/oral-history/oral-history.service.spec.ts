import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VisibilityScope } from '@prisma/client';
import { OralHistoryService } from './oral-history.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { VisibilityGuard } from '../authorization/visibility.guard';
import { TestimonyKind } from './dto/create-testimony.dto';

const AUTHOR_ID = 'account-author';
const PERSON_ID = '11111111-1111-1111-1111-111111111111';
const MEDIA_ID = '22222222-2222-2222-2222-222222222222';

describe('OralHistoryService', () => {
  let service: OralHistoryService;

  const tx = {
    source: { create: jest.fn() },
    contribution: { create: jest.fn() },
  };

  const mockPrisma = {
    person: { findFirst: jest.fn() },
    union: { findFirst: jest.fn() },
    media: { findFirst: jest.fn() },
    source: { create: jest.fn(), findMany: jest.fn() },
    claim: { findFirst: jest.fn() },
    contribution: { create: jest.fn() },
    $transaction: jest.fn(
      async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
    ),
  };

  const mockEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
  };

  const mockVisibilityGuard = {
    evaluate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tx.source.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'source-1',
        visibleMaxDegree: null,
        ...data,
      }),
    );
    mockPrisma.person.findFirst.mockResolvedValue({ id: PERSON_ID });
    mockPrisma.union.findFirst.mockResolvedValue({ id: 'union-1' });
    mockPrisma.media.findFirst.mockResolvedValue({ id: MEDIA_ID });

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OralHistoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: VisibilityGuard, useValue: mockVisibilityGuard },
      ],
    }).compile();

    service = moduleRef.get(OralHistoryService);
  });

  describe('recordTestimony', () => {
    it('persists onto the Source model, mapping testimony fields and writing an audit Contribution', async () => {
      await service.recordTestimony(AUTHOR_ID, {
        personId: PERSON_ID,
        mediaId: MEDIA_ID,
        transcript: 'Le grand-père racontait la migration...',
        title: 'Migration du clan',
        sourceType: TestimonyKind.STORY,
      });

      expect(tx.source.create).toHaveBeenCalledWith({
        data: {
          personId: PERSON_ID,
          unionId: null,
          mediaFileId: MEDIA_ID,
          audioTranscript: 'Le grand-père racontait la migration...',
          title: 'Migration du clan',
          sourceType: TestimonyKind.STORY,
          addedByAccountId: AUTHOR_ID,
          visibilityScope: VisibilityScope.PRIVATE_SELF,
        },
      });
      expect(tx.contribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'source',
            entityId: 'source-1',
            action: 'CREATE',
          }),
        }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'oral-history.testimony-recorded' }),
      );
    });

    it('defaults sourceType to ORAL_TESTIMONY when omitted', async () => {
      await service.recordTestimony(AUTHOR_ID, {
        personId: PERSON_ID,
        mediaId: MEDIA_ID,
      });

      expect(tx.source.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: TestimonyKind.ORAL_TESTIMONY,
            audioTranscript: null,
          }),
        }),
      );
    });

    it('rejects a testimony with neither person nor union', async () => {
      await expect(
        service.recordTestimony(AUTHOR_ID, { mediaId: MEDIA_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.source.create).not.toHaveBeenCalled();
    });

    it('rejects when the media does not exist', async () => {
      mockPrisma.media.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.recordTestimony(AUTHOR_ID, {
          personId: PERSON_ID,
          mediaId: MEDIA_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.source.create).not.toHaveBeenCalled();
    });

    it('rejects when the referenced person does not exist', async () => {
      mockPrisma.person.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.recordTestimony(AUTHOR_ID, {
          personId: PERSON_ID,
          mediaId: MEDIA_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listForPerson', () => {
    it('always returns the requester’s own recordings without a visibility check', async () => {
      mockPrisma.source.findMany.mockResolvedValueOnce([
        {
          id: 's-own',
          personId: PERSON_ID,
          addedByAccountId: AUTHOR_ID,
          visibilityScope: VisibilityScope.PRIVATE_SELF,
          visibleMaxDegree: null,
        },
      ]);
      mockPrisma.claim.findFirst.mockResolvedValueOnce(null);

      const result = await service.listForPerson(PERSON_ID, AUTHOR_ID);

      expect(result).toHaveLength(1);
      expect(mockVisibilityGuard.evaluate).not.toHaveBeenCalled();
    });

    it('filters out testimonies the requester is not allowed to see', async () => {
      mockPrisma.source.findMany.mockResolvedValueOnce([
        {
          id: 's-public',
          personId: PERSON_ID,
          addedByAccountId: 'someone-else',
          visibilityScope: VisibilityScope.PUBLIC,
          visibleMaxDegree: null,
        },
        {
          id: 's-private',
          personId: PERSON_ID,
          addedByAccountId: 'someone-else',
          visibilityScope: VisibilityScope.PRIVATE_SELF,
          visibleMaxDegree: null,
        },
      ]);
      mockPrisma.claim.findFirst.mockResolvedValueOnce({
        personId: 'requester-person',
      });
      mockVisibilityGuard.evaluate
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.listForPerson(PERSON_ID, 'requester-account');

      expect(result.map((s) => s.id)).toEqual(['s-public']);
      expect(mockVisibilityGuard.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: PERSON_ID }),
        'requester-person',
      );
    });

    it('returns an empty array when the person has no testimonies', async () => {
      mockPrisma.source.findMany.mockResolvedValueOnce([]);

      const result = await service.listForPerson(PERSON_ID, AUTHOR_ID);

      expect(result).toEqual([]);
      expect(mockPrisma.claim.findFirst).not.toHaveBeenCalled();
    });
  });
});

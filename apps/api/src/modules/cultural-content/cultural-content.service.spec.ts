import { Test, TestingModule } from '@nestjs/testing';
import {
  CulturalAuthorityKind,
  CulturalContentType,
  ModerationStatus,
  VisibilityScope,
} from '@prisma/client';
import { CulturalContentService } from './cultural-content.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { CreateCulturalContentDto } from './dto/create-cultural-content.dto';

const ACCOUNT_ID = 'account-author';

function makeDto(
  overrides: Partial<CreateCulturalContentDto> = {},
): CreateCulturalContentDto {
  return {
    contentType: overrides.contentType ?? CulturalContentType.PROVERB,
    title: overrides.title ?? 'Un proverbe bassa',
    body: overrides.body,
    languageCode: overrides.languageCode,
    region: overrides.region,
    ethnicGroup: overrides.ethnicGroup,
    mediaId: overrides.mediaId,
    authorityId: overrides.authorityId,
  };
}

describe('CulturalContentService', () => {
  let service: CulturalContentService;

  const tx = {
    culturalContent: { create: jest.fn() },
    culturalAuthority: { create: jest.fn() },
    contribution: { create: jest.fn() },
  };

  const mockPrisma = {
    culturalAuthority: { findFirst: jest.fn() },
    culturalContent: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    contribution: { create: jest.fn() },
    $transaction: jest.fn(
      async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
    ),
  };

  const mockEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Default: the created row echoes back the data passed to create().
    tx.culturalContent.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'content-1',
        ...data,
      }),
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CulturalContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = moduleRef.get(CulturalContentService);
  });

  describe('createContent', () => {
    it('auto-approves content from a VERIFIED authority and flags it', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue({
        id: 'authority-1',
        accountId: ACCOUNT_ID,
        verified: true,
      });

      const result = await service.createContent(makeDto(), ACCOUNT_ID);

      expect(tx.culturalContent.create).toHaveBeenCalledTimes(1);
      const created = tx.culturalContent.create.mock.calls[0][0].data;
      expect(created.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(created.isFromVerifiedAuthority).toBe(true);
      expect(created.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(created.authorityId).toBe('authority-1');
      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
    });

    it('leaves content from a normal author PENDING and unflagged', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);

      const result = await service.createContent(makeDto(), ACCOUNT_ID);

      const created = tx.culturalContent.create.mock.calls[0][0].data;
      expect(created.moderationStatus).toBe(ModerationStatus.PENDING);
      expect(created.isFromVerifiedAuthority).toBe(false);
      expect(created.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(result.moderationStatus).toBe(ModerationStatus.PENDING);
    });

    it('writes a Contribution audit row', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);

      await service.createContent(makeDto(), ACCOUNT_ID);

      expect(tx.contribution.create).toHaveBeenCalledTimes(1);
      const audit = tx.contribution.create.mock.calls[0][0].data;
      expect(audit.accountId).toBe(ACCOUNT_ID);
      expect(audit.entityType).toBe('cultural_content');
      expect(audit.entityId).toBe('content-1');
      expect(audit.action).toBe('CREATE');
    });

    it('publishes a cultural-content.published event', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);

      await service.createContent(makeDto(), ACCOUNT_ID);

      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
      const event = mockEventPublisher.publish.mock.calls[0][0];
      expect(event.type).toBe('cultural-content.published');
      expect(event.actorId).toBe(ACCOUNT_ID);
      expect(event.payload).toMatchObject({
        culturalContentId: 'content-1',
        authorAccountId: ACCOUNT_ID,
        moderationStatus: ModerationStatus.PENDING,
      });
    });

    it('rejects publishing under an authority the account does not own', async () => {
      // First lookup (verified authority for the account) returns null,
      // ownership lookup also returns null -> forbidden.
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);

      await expect(
        service.createContent(makeDto({ authorityId: 'other-authority' }), ACCOUNT_ID),
      ).rejects.toThrow();
      expect(tx.culturalContent.create).not.toHaveBeenCalled();
    });
  });

  describe('registerAsAuthority', () => {
    it('creates an UNVERIFIED authority and audits it', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);
      tx.culturalAuthority.create.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'authority-1',
          ...data,
        }),
      );

      const result = await service.registerAsAuthority(
        {
          kind: CulturalAuthorityKind.EXPERT,
          displayName: 'Dr Mbarga',
          region: 'Centre',
          ethnicGroup: 'Ewondo',
        },
        ACCOUNT_ID,
      );

      const created = tx.culturalAuthority.create.mock.calls[0][0].data;
      expect(created.verified).toBe(false);
      expect(created.accountId).toBe(ACCOUNT_ID);
      expect(result.verified).toBe(false);
      expect(tx.contribution.create).toHaveBeenCalledTimes(1);
      expect(tx.contribution.create.mock.calls[0][0].data.entityType).toBe(
        'cultural_authority',
      );
    });
  });
});

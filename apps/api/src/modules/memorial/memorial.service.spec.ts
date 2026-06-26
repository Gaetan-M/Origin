import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  LifeStatus,
  MemorialTributeKind,
  VisibilityScope,
} from '@prisma/client';
import { MemorialService } from './memorial.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityGuard } from '../authorization/visibility.guard';
import { CreateTributeDto } from './dto/create-tribute.dto';

interface TxMock {
  memorialTribute: { create: jest.Mock; update: jest.Mock };
  contribution: { create: jest.Mock };
}

function makeTx(): TxMock {
  return {
    memorialTribute: {
      create: jest.fn().mockResolvedValue({ id: 'tribute-1' }),
      update: jest.fn().mockResolvedValue({ id: 'tribute-1' }),
    },
    contribution: { create: jest.fn().mockResolvedValue({ id: 'contrib-1' }) },
  };
}

describe('MemorialService', () => {
  let service: MemorialService;
  let tx: TxMock;
  let prisma: {
    $transaction: jest.Mock;
    person: { findFirst: jest.Mock };
    media: { findFirst: jest.Mock };
    claim: { findFirst: jest.Mock };
    memorialTribute: { findMany: jest.Mock; findFirst: jest.Mock };
  };
  let visibility: { evaluate: jest.Mock };

  const authorAccountId = 'account-1';
  const personId = 'person-1';

  beforeEach(async () => {
    tx = makeTx();
    prisma = {
      $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
      person: { findFirst: jest.fn() },
      media: { findFirst: jest.fn().mockResolvedValue({ id: 'media-1' }) },
      claim: { findFirst: jest.fn().mockResolvedValue(null) },
      memorialTribute: { findMany: jest.fn(), findFirst: jest.fn() },
    };
    visibility = { evaluate: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemorialService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: VisibilityGuard,
          useValue: visibility as unknown as VisibilityGuard,
        },
      ],
    }).compile();

    service = module.get(MemorialService);
  });

  describe('addTribute', () => {
    it('is blocked when the person is ALIVE', async () => {
      prisma.person.findFirst.mockResolvedValue({
        id: personId,
        lifeStatus: LifeStatus.ALIVE,
      });
      const dto: CreateTributeDto = { kind: MemorialTributeKind.CANDLE };

      await expect(
        service.addTribute(authorAccountId, personId, dto),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.memorialTribute.create).not.toHaveBeenCalled();
    });

    it('throws NotFound when the person does not exist', async () => {
      prisma.person.findFirst.mockResolvedValue(null);
      await expect(
        service.addTribute(authorAccountId, personId, {
          kind: MemorialTributeKind.CANDLE,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows a CANDLE on a DECEASED person and writes a Contribution', async () => {
      prisma.person.findFirst.mockResolvedValue({
        id: personId,
        lifeStatus: LifeStatus.DECEASED,
      });
      const dto: CreateTributeDto = { kind: MemorialTributeKind.CANDLE };

      const result = await service.addTribute(authorAccountId, personId, dto);

      expect(result).toEqual({ id: 'tribute-1' });
      expect(tx.memorialTribute.create).toHaveBeenCalledTimes(1);
      const createArg = tx.memorialTribute.create.mock.calls[0][0];
      expect(createArg.data.personId).toBe(personId);
      expect(createArg.data.authorAccountId).toBe(authorAccountId);
      // Defaults to FAMILY visibility.
      expect(createArg.data.visibilityScope).toBe(VisibilityScope.FAMILY);
      expect(tx.contribution.create).toHaveBeenCalledTimes(1);
      expect(tx.contribution.create.mock.calls[0][0].data.entityType).toBe(
        'memorial_tribute',
      );
    });

    it('requires a message for a MESSAGE tribute', async () => {
      prisma.person.findFirst.mockResolvedValue({
        id: personId,
        lifeStatus: LifeStatus.DECEASED,
      });
      await expect(
        service.addTribute(authorAccountId, personId, {
          kind: MemorialTributeKind.MESSAGE,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires a mediaId for a PHOTO tribute', async () => {
      prisma.person.findFirst.mockResolvedValue({
        id: personId,
        lifeStatus: LifeStatus.DECEASED,
      });
      await expect(
        service.addTribute(authorAccountId, personId, {
          kind: MemorialTributeKind.PHOTO,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listTributes', () => {
    it('returns only tributes the requester may see (visibility enforced)', async () => {
      prisma.person.findFirst.mockResolvedValue({ id: personId });
      prisma.claim.findFirst.mockResolvedValue({ personId: 'requester-person' });
      prisma.memorialTribute.findMany.mockResolvedValue([
        {
          id: 't-public',
          personId,
          visibilityScope: VisibilityScope.PUBLIC,
          visibleMaxDegree: null,
        },
        {
          id: 't-private',
          personId,
          visibilityScope: VisibilityScope.PRIVATE_SELF,
          visibleMaxDegree: null,
        },
      ]);
      visibility.evaluate
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.listTributes(personId, authorAccountId);

      expect(result.map((t) => t.id)).toEqual(['t-public']);
      expect(visibility.evaluate).toHaveBeenCalledTimes(2);
      // Owner node for degree computation is the deceased person.
      expect(visibility.evaluate.mock.calls[0][0].ownerId).toBe(personId);
      expect(visibility.evaluate.mock.calls[0][1]).toBe('requester-person');
    });

    it('throws NotFound when the person does not exist', async () => {
      prisma.person.findFirst.mockResolvedValue(null);
      await expect(
        service.listTributes(personId, authorAccountId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeTribute', () => {
    it('soft-deletes when the requester is the author', async () => {
      prisma.memorialTribute.findFirst.mockResolvedValue({
        id: 'tribute-1',
        authorAccountId,
        personId,
      });

      await service.removeTribute('tribute-1', authorAccountId);

      expect(tx.memorialTribute.update).toHaveBeenCalledTimes(1);
      const updateArg = tx.memorialTribute.update.mock.calls[0][0];
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
      expect(tx.contribution.create).toHaveBeenCalledTimes(1);
      expect(tx.contribution.create.mock.calls[0][0].data.action).toBe('DELETE');
    });

    it('forbids removal by a non-author', async () => {
      prisma.memorialTribute.findFirst.mockResolvedValue({
        id: 'tribute-1',
        authorAccountId: 'someone-else',
        personId,
      });

      await expect(
        service.removeTribute('tribute-1', authorAccountId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.memorialTribute.update).not.toHaveBeenCalled();
    });

    it('throws NotFound when the tribute is absent or already withdrawn', async () => {
      prisma.memorialTribute.findFirst.mockResolvedValue(null);
      await expect(
        service.removeTribute('tribute-1', authorAccountId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

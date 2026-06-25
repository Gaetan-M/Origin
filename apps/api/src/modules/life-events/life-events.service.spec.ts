import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LifeStatus, LifeEventKind } from '@prisma/client';
import { LifeEventsService } from './life-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EVENT_PUBLISHER, type EventPublisher } from './event-publisher.interface';
import { RecordBirthDto } from './dto/record-birth.dto';
import { RecordDeathDto } from './dto/record-death.dto';
import { RecordUnionDto } from './dto/record-union.dto';

/**
 * Transaction-client mock. The service calls `prisma.$transaction(cb)` with a
 * callback; we invoke it with this object so per-entity creates are observable.
 */
interface TxMock {
  person: { create: jest.Mock; update: jest.Mock };
  parentChild: { create: jest.Mock };
  union: { create: jest.Mock };
  unionPartner: { create: jest.Mock };
  lifeEvent: { create: jest.Mock };
  contribution: { create: jest.Mock };
}

function makeTx(): TxMock {
  return {
    person: {
      create: jest.fn().mockResolvedValue({ id: 'child-1', lifeStatus: LifeStatus.ALIVE }),
      update: jest
        .fn()
        .mockResolvedValue({ id: 'person-1', lifeStatus: LifeStatus.DECEASED }),
    },
    parentChild: { create: jest.fn().mockResolvedValue({ id: 'edge' }) },
    union: { create: jest.fn().mockResolvedValue({ id: 'union-1', unionType: 'CUSTOMARY' }) },
    unionPartner: { create: jest.fn().mockResolvedValue({ id: 'up' }) },
    lifeEvent: { create: jest.fn().mockResolvedValue({ id: 'le-1' }) },
    contribution: { create: jest.fn().mockResolvedValue({ id: 'contrib' }) },
  };
}

describe('LifeEventsService', () => {
  let service: LifeEventsService;
  let tx: TxMock;
  let prisma: {
    $transaction: jest.Mock;
    person: { findMany: jest.Mock; findFirst: jest.Mock };
  };
  let publisher: { publish: jest.Mock };

  const accountId = 'account-1';

  beforeEach(async () => {
    tx = makeTx();
    prisma = {
      $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
      person: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifeEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EVENT_PUBLISHER, useValue: publisher as unknown as EventPublisher },
      ],
    }).compile();

    service = module.get(LifeEventsService);
  });

  describe('recordBirth', () => {
    it('creates an ALIVE person, parent edges, a BIRTH event and publishes', async () => {
      prisma.person.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      const dto: RecordBirthDto = {
        displayName: 'Baby Mbarga',
        parentPersonIds: ['p1', 'p2'],
      };

      const result = await service.recordBirth(dto, accountId);

      expect(tx.person.create).toHaveBeenCalledTimes(1);
      expect(tx.person.create.mock.calls[0][0].data.lifeStatus).toBe(LifeStatus.ALIVE);
      // one ParentChild edge per parent — never father_id/mother_id on Person
      expect(tx.parentChild.create).toHaveBeenCalledTimes(2);
      expect(tx.lifeEvent.create).toHaveBeenCalledTimes(1);
      expect(tx.lifeEvent.create.mock.calls[0][0].data.kind).toBe(LifeEventKind.BIRTH);
      // audit rows for person + life event
      expect(tx.contribution.create).toHaveBeenCalledTimes(2);
      // domain event published
      expect(publisher.publish).toHaveBeenCalledTimes(1);
      const event = publisher.publish.mock.calls[0][0];
      expect(event.type).toBe('life-event.recorded');
      expect(event.payload.kind).toBe('birth');
      expect(event.payload.personIds).toEqual(
        expect.arrayContaining(['child-1', 'p1', 'p2']),
      );
      expect(result.person.id).toBe('child-1');
    });

    it('rejects when a referenced parent does not exist', async () => {
      prisma.person.findMany.mockResolvedValue([{ id: 'p1' }]); // p2 missing
      const dto: RecordBirthDto = {
        displayName: 'Orphaned ref',
        parentPersonIds: ['p1', 'p2'],
      };
      await expect(service.recordBirth(dto, accountId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(tx.person.create).not.toHaveBeenCalled();
    });
  });

  describe('recordDeath', () => {
    it('flips life_status to DECEASED, records a DEATH event and publishes', async () => {
      prisma.person.findFirst.mockResolvedValue({
        id: 'person-1',
        lifeStatus: LifeStatus.ALIVE,
        deletedAt: null,
      });
      const dto: RecordDeathDto = { personId: 'person-1', deceasedDate: '2020-01-01' };

      await service.recordDeath(dto, accountId);

      expect(tx.person.update).toHaveBeenCalledTimes(1);
      expect(tx.person.update.mock.calls[0][0].data.lifeStatus).toBe(LifeStatus.DECEASED);
      // edges are preserved — no parent_child mutation happens
      expect(tx.parentChild.create).not.toHaveBeenCalled();
      expect(tx.lifeEvent.create.mock.calls[0][0].data.kind).toBe(LifeEventKind.DEATH);
      const event = publisher.publish.mock.calls[0][0];
      expect(event.payload.kind).toBe('death');
      expect(event.payload.personIds).toEqual(['person-1']);
    });

    it('throws NotFound when the person does not exist', async () => {
      prisma.person.findFirst.mockResolvedValue(null);
      await expect(
        service.recordDeath({ personId: 'missing' }, accountId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('recordUnion', () => {
    it('creates a union, one partner per person, a UNION event and publishes', async () => {
      prisma.person.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      const dto: RecordUnionDto = {
        partners: [
          { personId: 'a', role: 'husband' },
          { personId: 'b', role: 'wife', wifeRank: 1 },
        ],
      };

      const result = await service.recordUnion(dto, accountId);

      expect(tx.union.create).toHaveBeenCalledTimes(1);
      expect(tx.unionPartner.create).toHaveBeenCalledTimes(2);
      expect(tx.lifeEvent.create.mock.calls[0][0].data.kind).toBe(LifeEventKind.UNION);
      expect(tx.lifeEvent.create.mock.calls[0][0].data.unionId).toBe('union-1');
      const event = publisher.publish.mock.calls[0][0];
      expect(event.payload.kind).toBe('union');
      expect(event.payload.personIds).toEqual(['a', 'b']);
      expect(result.union.id).toBe('union-1');
    });

    it('rejects a union with fewer than two distinct partners', async () => {
      const dto: RecordUnionDto = {
        partners: [
          { personId: 'a' },
          { personId: 'a' },
        ],
      };
      await expect(service.recordUnion(dto, accountId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

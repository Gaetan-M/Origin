import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LifeStatus } from '@prisma/client';
import { MatchOnSignupService } from '../matching/match-on-signup.service';
import { MessagingService } from '../messaging/messaging.service';
import { ConfigService } from '@nestjs/config';

const mockPrisma = {
  person: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  account: { findUnique: jest.fn() },
  invitationToken: { findFirst: jest.fn(), create: jest.fn() },
  contribution: { create: jest.fn() },
  $queryRaw: jest.fn(),
};

const mockMatchOnSignup = {
  runPhoneMatchAtSignup: jest.fn().mockResolvedValue(undefined),
  runSimilarityMatchForSelf: jest.fn().mockResolvedValue(undefined),
};

const mockMessaging = {
  sendInvitation: jest.fn().mockResolvedValue(true),
  send: jest.fn().mockResolvedValue(true),
};

const mockConfig = {
  get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? ''),
};

describe('PersonsService', () => {
  let service: PersonsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MatchOnSignupService, useValue: mockMatchOnSignup },
        { provide: MessagingService, useValue: mockMessaging },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PersonsService>(PersonsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a person with ALIVE status', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ normalized: 'jean-paul mbarga' }]);
      mockPrisma.person.create.mockResolvedValue({
        id: 'person-id',
        displayName: 'Jean-Paul Mbarga',
        lifeStatus: 'ALIVE',
      });
      mockPrisma.contribution.create.mockResolvedValue({});

      const result = await service.create(
        { displayName: 'Jean-Paul Mbarga', lifeStatus: LifeStatus.ALIVE },
        'account-id',
      );

      expect(result.displayName).toBe('Jean-Paul Mbarga');
      expect(mockPrisma.contribution.create).toHaveBeenCalled();
    });

    it('should create a person with DECEASED status and date', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ normalized: 'therese ngoue' }]);
      mockPrisma.person.create.mockResolvedValue({
        id: 'person-id',
        displayName: 'Thérèse Ngoue',
        lifeStatus: 'DECEASED',
      });
      mockPrisma.contribution.create.mockResolvedValue({});

      const result = await service.create(
        {
          displayName: 'Thérèse Ngoue',
          lifeStatus: LifeStatus.DECEASED,
          deceasedYearApproximate: 2010,
        },
        'account-id',
      );

      expect(result.lifeStatus).toBe('DECEASED');
    });

    it('should accept DECEASED with deceased_assumed=true', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ normalized: 'ancestor' }]);
      mockPrisma.person.create.mockResolvedValue({
        id: 'id',
        lifeStatus: 'DECEASED',
        deceasedAssumed: true,
      });
      mockPrisma.contribution.create.mockResolvedValue({});

      await expect(
        service.create(
          { displayName: 'Old Ancestor', lifeStatus: LifeStatus.DECEASED, deceasedAssumed: true },
          'account-id',
        ),
      ).resolves.toBeDefined();
    });

    it('should reject DECEASED without any deceased info', async () => {
      await expect(
        service.create(
          { displayName: 'Test', lifeStatus: LifeStatus.DECEASED },
          'account-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept UNKNOWN status', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ normalized: 'unknown person' }]);
      mockPrisma.person.create.mockResolvedValue({
        id: 'id',
        lifeStatus: 'UNKNOWN',
      });
      mockPrisma.contribution.create.mockResolvedValue({});

      await expect(
        service.create(
          { displayName: 'Unknown Person', lifeStatus: LifeStatus.UNKNOWN },
          'account-id',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a person with relations', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({
        id: 'person-id',
        displayName: 'Test',
        deletedAt: null,
        names: [],
        parentsOf: [],
        childrenOf: [],
        unionPartners: [],
      });

      const result = await service.findOne('person-id');
      expect(result.id).toBe('person-id');
    });

    it('should throw NotFoundException for deleted person', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({
        id: 'person-id',
        deletedAt: new Date(),
      });

      await expect(service.findOne('person-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete if creator', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({
        id: 'person-id',
        createdByAccountId: 'account-id',
        deletedAt: null,
      });
      mockPrisma.person.update.mockResolvedValue({});
      mockPrisma.contribution.create.mockResolvedValue({});

      const result = await service.softDelete('person-id', 'account-id');
      expect(result.message).toBe('Person deleted');
    });

    it('should reject if not creator', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({
        id: 'person-id',
        createdByAccountId: 'other-account',
        deletedAt: null,
      });

      await expect(service.softDelete('person-id', 'account-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

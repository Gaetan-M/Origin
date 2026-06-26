import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { KinshipCheckStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GraphDegreeService } from '../authorization/graph-degree.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { RelationshipLabelService } from './relationship-label.service';
import { KinshipNotifyHelper } from './kinship-notify.helper';
import { KinshipCheckService } from './kinship-check.service';

/**
 * Forbidden fields: nothing that could leak the graph may ever appear in a
 * payload returned to a user. We assert their absence structurally.
 */
const FORBIDDEN_KEYS = [
  'personId',
  'personIds',
  'requesterPersonId',
  'targetPersonId',
  'path',
  'ancestors',
  'names',
  'displayName',
  'phone',
  'phoneNumber',
  'targetPhone',
  'requesterAccountId',
  'targetAccountId',
];

function assertNoLeak(value: unknown): void {
  const seen = JSON.stringify(value, (key, val) => {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new Error(`PRIVACY LEAK: forbidden key "${key}" present in payload`);
    }
    return val;
  });
  expect(seen).toBeDefined();
}

const REQUESTER = 'acc-requester';
const TARGET = 'acc-target';

interface KinshipCheckRow {
  id: string;
  requesterAccountId: string;
  targetAccountId: string | null;
  targetPhone: string | null;
  status: KinshipCheckStatus;
  requesterConsent: boolean;
  targetConsent: boolean;
  resultDegree: number | null;
  resultRelated: boolean | null;
  resultLabelFr: string | null;
  resultLabelEn: string | null;
  computedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

function baseCheck(overrides: Partial<KinshipCheckRow> = {}): KinshipCheckRow {
  return {
    id: 'check-1',
    requesterAccountId: REQUESTER,
    targetAccountId: TARGET,
    targetPhone: null,
    status: KinshipCheckStatus.PENDING_CONSENT,
    requesterConsent: true,
    targetConsent: false,
    resultDegree: null,
    resultRelated: null,
    resultLabelFr: null,
    resultLabelEn: null,
    computedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('KinshipCheckService', () => {
  let service: KinshipCheckService;
  let prisma: {
    kinshipCheck: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    account: { findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock };
    claim: { findFirst: jest.Mock };
    familyCode: { findUnique: jest.Mock };
    contribution: { create: jest.Mock };
  };
  let graphDegree: { computeDegree: jest.Mock };
  let notifications: { createNotification: jest.Mock };
  let events: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      kinshipCheck: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      account: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      claim: { findFirst: jest.fn() },
      familyCode: { findUnique: jest.fn() },
      contribution: { create: jest.fn().mockResolvedValue({}) },
    };
    graphDegree = { computeDegree: jest.fn() };
    notifications = { createNotification: jest.fn().mockResolvedValue({}) };
    events = { publish: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        KinshipCheckService,
        RelationshipLabelService,
        // Real notify helper, backed by the mocked NotificationsService, so we
        // exercise the actual notification routing while asserting on the
        // underlying createNotification calls.
        KinshipNotifyHelper,
        { provide: PrismaService, useValue: prisma },
        { provide: GraphDegreeService, useValue: graphDegree },
        { provide: NotificationsService, useValue: notifications },
        { provide: EventPublisher, useValue: events },
      ],
    }).compile();

    service = moduleRef.get(KinshipCheckService);
  });

  // --- initiate ------------------------------------------------------------

  describe('initiate', () => {
    it('rejects when zero or multiple targets are provided', async () => {
      await expect(service.initiate(REQUESTER, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.initiate(REQUESTER, {
          targetAccountId: TARGET,
          targetPhone: '+237690000000',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a PENDING_CONSENT check, notifies the target, resolves the counterparty name, and never leaks ids', async () => {
      prisma.account.findFirst.mockResolvedValue({ id: TARGET });
      prisma.account.findMany.mockResolvedValue([{ id: TARGET, fullName: 'Awa Mballa' }]);
      const created = baseCheck();
      prisma.kinshipCheck.create.mockResolvedValue(created);

      const view = await service.initiate(REQUESTER, { targetAccountId: TARGET });

      expect(prisma.kinshipCheck.create).toHaveBeenCalledTimes(1);
      const createArg = prisma.kinshipCheck.create.mock.calls[0][0].data;
      expect(createArg.status).toBe(KinshipCheckStatus.PENDING_CONSENT);
      expect(createArg.requesterConsent).toBe(true);
      expect(createArg.targetConsent).toBe(false);

      expect(notifications.createNotification).toHaveBeenCalledTimes(1);
      // No computation may happen at initiation.
      expect(graphDegree.computeDegree).not.toHaveBeenCalled();

      expect(view.status).toBe(KinshipCheckStatus.PENDING_CONSENT);
      expect(view.direction).toBe('outgoing');
      // Display name surfaced for informed consent — never a phone/person id.
      expect(view.counterpartyName).toBe('Awa Mballa');
      expect(view.invitedByPhone).toBe(false);
      expect(view.result).toBeNull();
      assertNoLeak(view);
    });

    it('marks invitedByPhone and null name for an unresolved phone invite', async () => {
      prisma.account.findUnique.mockResolvedValue({ phoneNumber: '+237699999999' });
      prisma.account.findFirst.mockResolvedValue(null); // phone not yet on Origin
      prisma.kinshipCheck.create.mockResolvedValue(
        baseCheck({ targetAccountId: null, targetPhone: '+237690000000' }),
      );

      const view = await service.initiate(REQUESTER, { targetPhone: '+237690000000' });

      expect(view.invitedByPhone).toBe(true);
      expect(view.counterpartyName).toBeNull();
      assertNoLeak(view);
    });

    it('rejects a self-check by phone', async () => {
      prisma.account.findUnique.mockResolvedValue({ phoneNumber: '+237690000000' });
      await expect(
        service.initiate(REQUESTER, { targetPhone: '+237690000000' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // --- consent gating ------------------------------------------------------

  describe('respond — consent gating', () => {
    it('does NOT compute while the target has not consented (decline path)', async () => {
      prisma.kinshipCheck.findFirst.mockResolvedValue(baseCheck());
      prisma.kinshipCheck.update.mockResolvedValue(
        baseCheck({ status: KinshipCheckStatus.DECLINED, targetConsent: false }),
      );

      const view = await service.respond('check-1', TARGET, false);

      expect(graphDegree.computeDegree).not.toHaveBeenCalled();
      expect(view.status).toBe(KinshipCheckStatus.DECLINED);
      expect(view.result).toBeNull();
      const updateArg = prisma.kinshipCheck.update.mock.calls[0][0].data;
      expect(updateArg.status).toBe(KinshipCheckStatus.DECLINED);
      assertNoLeak(view);
    });

    it('rejects a responder who is not the target', async () => {
      prisma.kinshipCheck.findFirst.mockResolvedValue(baseCheck());
      await expect(
        service.respond('check-1', 'someone-else', true),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(graphDegree.computeDegree).not.toHaveBeenCalled();
    });

    it('rejects the requester responding to their own check', async () => {
      prisma.kinshipCheck.findFirst.mockResolvedValue(baseCheck());
      await expect(
        service.respond('check-1', REQUESTER, true),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('computes once BOTH parties consent and stores only the aggregate result', async () => {
      prisma.kinshipCheck.findFirst.mockResolvedValue(baseCheck());
      const consented = baseCheck({
        status: KinshipCheckStatus.CONSENTED,
        targetConsent: true,
      });
      const computed = baseCheck({
        status: KinshipCheckStatus.COMPUTED,
        targetConsent: true,
        resultDegree: 3,
        resultRelated: true,
        resultLabelFr: 'Cousin ou parent au 3e degré (oncle/tante, neveu/nièce...)',
        resultLabelEn: 'Cousin or third-degree relative (uncle/aunt, nephew/niece...)',
        computedAt: new Date(),
      });
      prisma.kinshipCheck.update
        .mockResolvedValueOnce(consented) // consent update
        .mockResolvedValueOnce(computed); // compute update

      prisma.claim.findFirst
        .mockResolvedValueOnce({ personId: 'person-A' })
        .mockResolvedValueOnce({ personId: 'person-B' });
      graphDegree.computeDegree.mockResolvedValue(3);

      const view = await service.respond('check-1', TARGET, true);

      expect(graphDegree.computeDegree).toHaveBeenCalledWith('person-A', 'person-B', 8);

      // The persisted result holds ONLY the aggregate — no person ids.
      const computeData = prisma.kinshipCheck.update.mock.calls[1][0].data;
      expect(computeData).toEqual(
        expect.objectContaining({
          status: KinshipCheckStatus.COMPUTED,
          resultDegree: 3,
          resultRelated: true,
        }),
      );
      expect(JSON.stringify(computeData)).not.toContain('person-A');
      expect(JSON.stringify(computeData)).not.toContain('person-B');

      // Audit row carries only related/degree, never person ids.
      const computeAudit = prisma.contribution.create.mock.calls.find(
        (c) => c[0].data.action === 'COMPUTE',
      );
      expect(computeAudit).toBeDefined();
      expect(JSON.stringify(computeAudit?.[0].data.newValue)).not.toContain('person');

      expect(view.status).toBe(KinshipCheckStatus.COMPUTED);
      expect(view.result).toEqual({
        related: true,
        degree: 3,
        labelFr: expect.any(String),
        labelEn: expect.any(String),
      });
      assertNoLeak(view);
    });

    it('treats a missing VERIFIED claim as not-related without leaking which side', async () => {
      prisma.kinshipCheck.findFirst.mockResolvedValue(baseCheck());
      const consented = baseCheck({
        status: KinshipCheckStatus.CONSENTED,
        targetConsent: true,
      });
      const computed = baseCheck({
        status: KinshipCheckStatus.COMPUTED,
        targetConsent: true,
        resultDegree: null,
        resultRelated: false,
        resultLabelFr: 'Aucun lien de parenté trouvé',
        resultLabelEn: 'No family link found',
        computedAt: new Date(),
      });
      prisma.kinshipCheck.update
        .mockResolvedValueOnce(consented)
        .mockResolvedValueOnce(computed);

      // Requester has a claim, target has none.
      prisma.claim.findFirst
        .mockResolvedValueOnce({ personId: 'person-A' })
        .mockResolvedValueOnce(null);

      const view = await service.respond('check-1', TARGET, true);

      // No graph query when a node is missing.
      expect(graphDegree.computeDegree).not.toHaveBeenCalled();
      const computeData = prisma.kinshipCheck.update.mock.calls[1][0].data;
      expect(computeData.resultRelated).toBe(false);
      expect(computeData.resultDegree).toBeNull();
      expect(view.result?.related).toBe(false);
      assertNoLeak(view);
    });
  });

  // --- compute guard -------------------------------------------------------

  describe('compute', () => {
    it('refuses to compute before both parties consent', async () => {
      await expect(
        service.compute(baseCheck({ targetConsent: false }), TARGET),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(graphDegree.computeDegree).not.toHaveBeenCalled();
    });
  });

  // --- listMine ------------------------------------------------------------

  describe('listMine', () => {
    it('splits checks into incoming/outgoing privacy-safe views with no person/phone fields', async () => {
      prisma.account.findUnique.mockResolvedValue({ phoneNumber: '+237690000000' });
      prisma.account.findMany.mockResolvedValue([
        { id: TARGET, fullName: 'Awa Mballa' },
      ]);
      prisma.kinshipCheck.findMany.mockResolvedValue([
        // Outgoing: REQUESTER initiated against TARGET.
        baseCheck({
          status: KinshipCheckStatus.COMPUTED,
          resultDegree: 2,
          resultRelated: true,
          resultLabelFr: 'Parent au 2e degré',
          resultLabelEn: 'Second-degree relative',
          computedAt: new Date(),
        }),
        // Incoming: someone else initiated against REQUESTER.
        baseCheck({
          id: 'check-2',
          requesterAccountId: 'acc-other',
          targetAccountId: REQUESTER,
          status: KinshipCheckStatus.PENDING_CONSENT,
        }),
      ]);

      const overview = await service.listMine(REQUESTER);

      expect(overview.outgoing).toHaveLength(1);
      expect(overview.incoming).toHaveLength(1);
      expect(overview.outgoing[0].direction).toBe('outgoing');
      expect(overview.outgoing[0].counterpartyName).toBe('Awa Mballa');
      expect(overview.outgoing[0].result).toEqual({
        related: true,
        degree: 2,
        labelFr: 'Parent au 2e degré',
        labelEn: 'Second-degree relative',
      });
      // Pending incoming check exposes no result.
      expect(overview.incoming[0].direction).toBe('incoming');
      expect(overview.incoming[0].result).toBeNull();
      assertNoLeak(overview);
    });
  });

  // --- cancel --------------------------------------------------------------

  describe('cancel', () => {
    it('lets the requester cancel a pending check (status -> CANCELLED), audited', async () => {
      prisma.kinshipCheck.findFirst.mockResolvedValue(baseCheck());
      prisma.kinshipCheck.update.mockResolvedValue(
        baseCheck({ status: KinshipCheckStatus.CANCELLED }),
      );

      const view = await service.cancel('check-1', REQUESTER);

      const updateArg = prisma.kinshipCheck.update.mock.calls[0][0].data;
      expect(updateArg.status).toBe(KinshipCheckStatus.CANCELLED);
      expect(view.status).toBe(KinshipCheckStatus.CANCELLED);
      const cancelAudit = prisma.contribution.create.mock.calls.find(
        (c) => c[0].data.action === 'CANCEL',
      );
      expect(cancelAudit).toBeDefined();
      expect(graphDegree.computeDegree).not.toHaveBeenCalled();
      assertNoLeak(view);
    });

    it('forbids a non-requester from cancelling', async () => {
      prisma.kinshipCheck.findFirst.mockResolvedValue(baseCheck());
      await expect(service.cancel('check-1', TARGET)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.kinshipCheck.update).not.toHaveBeenCalled();
    });

    it('rejects cancelling a check that is no longer pending', async () => {
      prisma.kinshipCheck.findFirst.mockResolvedValue(
        baseCheck({ status: KinshipCheckStatus.COMPUTED }),
      );
      await expect(service.cancel('check-1', REQUESTER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});

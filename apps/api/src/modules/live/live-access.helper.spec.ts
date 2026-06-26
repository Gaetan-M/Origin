import { ForbiddenException } from '@nestjs/common';
import { VisibilityScope } from '@prisma/client';
import { LiveAccessHelper, LiveSessionAccessView } from './live-access.helper';
import { DEFAULT_MAX_DEGREE } from '../authorization/graph-degree.service';

const HOST = 'account-host';
const REQUESTER = 'account-requester';

function makeSession(
  overrides: Partial<LiveSessionAccessView> = {},
): LiveSessionAccessView {
  return {
    id: 'live-1',
    hostAccountId: HOST,
    hostAuthorityId: overrides.hostAuthorityId ?? null,
    visibilityScope: overrides.visibilityScope ?? VisibilityScope.FAMILY,
    visibleMaxDegree:
      overrides.visibleMaxDegree === undefined ? 2 : overrides.visibleMaxDegree,
    subjectPersonId:
      overrides.subjectPersonId === undefined
        ? 'person-subject'
        : overrides.subjectPersonId,
  };
}

describe('LiveAccessHelper', () => {
  let helper: LiveAccessHelper;
  const prisma = {
    culturalAuthority: { findFirst: jest.fn() },
    claim: { findFirst: jest.fn() },
  };
  const graphDegree = { computeDegree: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new LiveAccessHelper(
      prisma as never,
      graphDegree as never,
    );
  });

  describe('assertCanHostPublic', () => {
    it('returns the authority id when the account owns a verified authority', async () => {
      prisma.culturalAuthority.findFirst.mockResolvedValue({ id: 'auth-1' });
      await expect(helper.assertCanHostPublic(HOST)).resolves.toEqual({
        authorityId: 'auth-1',
      });
      expect(prisma.culturalAuthority.findFirst).toHaveBeenCalledWith({
        where: { accountId: HOST, verified: true, deletedAt: null },
        select: { id: true },
      });
    });

    it('throws when the account owns no verified authority', async () => {
      prisma.culturalAuthority.findFirst.mockResolvedValue(null);
      await expect(helper.assertCanHostPublic(HOST)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('canHostPublic mirrors the assertion as a boolean', async () => {
      prisma.culturalAuthority.findFirst.mockResolvedValue(null);
      await expect(helper.canHostPublic(HOST)).resolves.toBe(false);
      prisma.culturalAuthority.findFirst.mockResolvedValue({ id: 'auth-1' });
      await expect(helper.canHostPublic(HOST)).resolves.toBe(true);
    });
  });

  describe('canJoin', () => {
    it('always lets the host join their own room', async () => {
      const session = makeSession({
        visibilityScope: VisibilityScope.PRIVATE_SELF,
      });
      await expect(helper.canJoin(session, HOST)).resolves.toBe(true);
      expect(prisma.claim.findFirst).not.toHaveBeenCalled();
    });

    it('lets any authenticated user join a PUBLIC live', async () => {
      const session = makeSession({ visibilityScope: VisibilityScope.PUBLIC });
      await expect(helper.canJoin(session, REQUESTER)).resolves.toBe(true);
    });

    it('rejects non-hosts from a PRIVATE_SELF live', async () => {
      const session = makeSession({
        visibilityScope: VisibilityScope.PRIVATE_SELF,
      });
      await expect(helper.canJoin(session, REQUESTER)).resolves.toBe(false);
    });

    it('allows a FAMILY requester within the degree bound', async () => {
      const session = makeSession({ visibleMaxDegree: 2 });
      prisma.claim.findFirst.mockResolvedValue({ personId: 'person-req' });
      graphDegree.computeDegree.mockResolvedValue(2);

      await expect(helper.canJoin(session, REQUESTER)).resolves.toBe(true);
      expect(graphDegree.computeDegree).toHaveBeenCalledWith(
        'person-req',
        'person-subject',
        2,
      );
    });

    it('rejects a FAMILY requester beyond the degree bound (degree null)', async () => {
      const session = makeSession({ visibleMaxDegree: 2 });
      prisma.claim.findFirst.mockResolvedValue({ personId: 'person-req' });
      graphDegree.computeDegree.mockResolvedValue(null);

      await expect(helper.canJoin(session, REQUESTER)).resolves.toBe(false);
    });

    it('falls back to DEFAULT_MAX_DEGREE when visibleMaxDegree is null', async () => {
      const session = makeSession({ visibleMaxDegree: null });
      prisma.claim.findFirst.mockResolvedValue({ personId: 'person-req' });
      graphDegree.computeDegree.mockResolvedValue(DEFAULT_MAX_DEGREE);

      await expect(helper.canJoin(session, REQUESTER)).resolves.toBe(true);
      expect(graphDegree.computeDegree).toHaveBeenCalledWith(
        'person-req',
        'person-subject',
        DEFAULT_MAX_DEGREE,
      );
    });

    it('rejects a FAMILY requester with no verified-claim person', async () => {
      const session = makeSession();
      prisma.claim.findFirst.mockResolvedValue(null);

      await expect(helper.canJoin(session, REQUESTER)).resolves.toBe(false);
      expect(graphDegree.computeDegree).not.toHaveBeenCalled();
    });

    it('rejects a FAMILY live with no anchor person', async () => {
      const session = makeSession({ subjectPersonId: null });
      await expect(helper.canJoin(session, REQUESTER)).resolves.toBe(false);
      expect(prisma.claim.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('assertCanJoin', () => {
    it('resolves when access is allowed', async () => {
      const session = makeSession({ visibilityScope: VisibilityScope.PUBLIC });
      await expect(
        helper.assertCanJoin(session, REQUESTER),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when access is denied', async () => {
      const session = makeSession({
        visibilityScope: VisibilityScope.PRIVATE_SELF,
      });
      await expect(
        helper.assertCanJoin(session, REQUESTER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

import { NotificationType, VisibilityScope } from '@prisma/client';
import { LiveNotifyHelper, LiveSessionNotifyView } from './live-notify.helper';

const HOST = 'account-host';

function makeSession(
  overrides: Partial<LiveSessionNotifyView> = {},
): LiveSessionNotifyView {
  return {
    id: 'live-1',
    hostAccountId: HOST,
    hostAuthorityId: overrides.hostAuthorityId ?? null,
    title: overrides.title ?? 'Cours de bassa',
    visibilityScope: overrides.visibilityScope ?? VisibilityScope.FAMILY,
    visibleMaxDegree:
      overrides.visibleMaxDegree === undefined ? 2 : overrides.visibleMaxDegree,
    subjectPersonId:
      overrides.subjectPersonId === undefined
        ? 'person-subject'
        : overrides.subjectPersonId,
  };
}

describe('LiveNotifyHelper', () => {
  let helper: LiveNotifyHelper;

  const prisma = {
    parentChild: { findMany: jest.fn() },
    unionPartner: { findMany: jest.fn() },
    person: { findMany: jest.fn(), findFirst: jest.fn() },
    culturalAuthority: { findFirst: jest.fn() },
  };
  const notifications = { createNotification: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: empty graph traversal.
    prisma.parentChild.findMany.mockResolvedValue([]);
    prisma.unionPartner.findMany.mockResolvedValue([]);
    prisma.person.findFirst.mockResolvedValue(null);
    notifications.createNotification.mockResolvedValue({ id: 'notif-1' });
    helper = new LiveNotifyHelper(prisma as never, notifications as never);
  });

  it('does not fan out PUBLIC lives (no follow model yet)', async () => {
    const session = makeSession({ visibilityScope: VisibilityScope.PUBLIC });
    await expect(helper.notifyLive(session)).resolves.toBe(0);
    expect(notifications.createNotification).not.toHaveBeenCalled();
  });

  it('does not fan out PRIVATE_SELF lives', async () => {
    const session = makeSession({
      visibilityScope: VisibilityScope.PRIVATE_SELF,
    });
    await expect(helper.notifyScheduled(session)).resolves.toBe(0);
    expect(notifications.createNotification).not.toHaveBeenCalled();
  });

  it('does not fan out a FAMILY live with no anchor person', async () => {
    const session = makeSession({ subjectPersonId: null });
    await expect(helper.notifyLive(session)).resolves.toBe(0);
    expect(notifications.createNotification).not.toHaveBeenCalled();
  });

  it('notifies the degree-bounded family audience, excluding the host', async () => {
    const session = makeSession({ visibleMaxDegree: 2 });
    // subject -> child person-a (degree 1) -> grandchild person-b (degree 2).
    prisma.parentChild.findMany.mockImplementation(
      async ({ where }: { where: { parentId?: { in: string[] } } }) => {
        const parents = where.parentId?.in ?? [];
        if (parents.includes('person-subject')) {
          return [{ childId: 'person-a' }];
        }
        if (parents.includes('person-a')) {
          return [{ childId: 'person-b' }];
        }
        return [];
      },
    );
    // person-a is owned by the host; person-b by a distinct relative.
    prisma.person.findMany.mockResolvedValue([
      { claimedByAccountId: HOST },
      { claimedByAccountId: 'account-relative' },
    ]);

    const count = await helper.notifyLive(session);

    expect(count).toBe(1);
    expect(notifications.createNotification).toHaveBeenCalledTimes(1);
    const arg = notifications.createNotification.mock.calls[0][0];
    expect(arg.accountId).toBe('account-relative');
    expect(arg.notificationType).toBe(NotificationType.OTHER);
    expect(arg.relatedEntityType).toBe('live_session');
    expect(arg.relatedEntityId).toBe('live-1');
    expect(arg.actionUrl).toBe('/live/live-1');
    // Bilingual "is live now" copy.
    expect(arg.title).toContain('en direct');
    expect(arg.title).toContain('live now');
  });

  it('uses the verified authority display name as the host label', async () => {
    const session = makeSession({ hostAuthorityId: 'auth-1' });
    prisma.culturalAuthority.findFirst.mockResolvedValue({
      displayName: 'Chefferie Bandjoun',
    });
    prisma.person.findMany.mockResolvedValue([
      { claimedByAccountId: 'account-relative' },
    ]);

    await helper.notifyScheduled(session);

    const arg = notifications.createNotification.mock.calls[0][0];
    expect(arg.title).toContain('Chefferie Bandjoun');
  });

  it('swallows per-recipient delivery failures', async () => {
    const session = makeSession();
    prisma.person.findMany.mockResolvedValue([
      { claimedByAccountId: 'account-a' },
      { claimedByAccountId: 'account-b' },
    ]);
    notifications.createNotification
      .mockRejectedValueOnce(new Error('downstream down'))
      .mockResolvedValueOnce({ id: 'notif-2' });

    const count = await helper.notifyLive(session);
    // One failed, one succeeded => 1 counted, no throw.
    expect(count).toBe(1);
  });

  it('never leaks the host phone number in the label fallback', async () => {
    const session = makeSession();
    prisma.person.findMany.mockResolvedValue([
      { claimedByAccountId: 'account-relative' },
    ]);
    // No authority, no host person => generic fallback.
    prisma.person.findFirst.mockResolvedValue(null);

    await helper.notifyLive(session);

    const arg = notifications.createNotification.mock.calls[0][0];
    expect(arg.title).toContain('Un proche / A relative');
    expect(arg.title).not.toMatch(/\+\d/);
  });
});

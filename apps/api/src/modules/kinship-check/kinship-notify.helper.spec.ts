import { Test, TestingModule } from '@nestjs/testing';
import { KinshipNotifyHelper, KinshipResultLabel } from './kinship-notify.helper';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Concatenates every string field of every notification payload passed to the
 * mocked NotificationsService, so privacy assertions can scan the full surface.
 */
function flattenCalls(mock: jest.Mock): string {
  return mock.mock.calls
    .map(([params]) =>
      [params.title, params.body, params.actionUrl, params.relatedEntityId].join(' '),
    )
    .join(' || ');
}

describe('KinshipNotifyHelper', () => {
  let helper: KinshipNotifyHelper;
  let createNotification: jest.Mock;

  const label: KinshipResultLabel = {
    fr: 'cousin germain',
    en: 'first cousin',
  };

  beforeEach(async () => {
    createNotification = jest.fn().mockResolvedValue(undefined);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        KinshipNotifyHelper,
        {
          provide: NotificationsService,
          useValue: { createNotification },
        },
      ],
    }).compile();

    helper = moduleRef.get(KinshipNotifyHelper);
  });

  describe('notifyCheckInitiated', () => {
    it('notifies the target with bilingual copy and routes to the check', async () => {
      await helper.notifyCheckInitiated({
        targetAccountId: 'target-1',
        checkId: 'check-1',
      });

      expect(createNotification).toHaveBeenCalledTimes(1);
      const params = createNotification.mock.calls[0][0];
      expect(params.accountId).toBe('target-1');
      expect(params.notificationType).toBe('OTHER');
      expect(params.relatedEntityType).toBe('kinship_check');
      expect(params.relatedEntityId).toBe('check-1');
      expect(params.actionUrl).toBe('/kinship/respond?check=check-1');
      expect(params.pushExternal).toBe(true);
      expect(params.title).toContain('lien de parenté');
      expect(params.title).toContain('family link');
    });

    it('never discloses the requester identity', async () => {
      await helper.notifyCheckInitiated({
        targetAccountId: 'target-1',
        checkId: 'check-1',
      });

      const surface = flattenCalls(createNotification);
      // The requester account id is intentionally not provided to this method,
      // so it can never leak. Guard against accidental future leakage.
      expect(surface).not.toContain('requester');
      expect(surface).not.toMatch(/\+\d{6,}/); // no phone number
    });
  });

  describe('notifyConsentDecision', () => {
    it('tells the requester the target consented', async () => {
      await helper.notifyConsentDecision({
        requesterAccountId: 'req-1',
        checkId: 'check-1',
        consented: true,
      });

      const params = createNotification.mock.calls[0][0];
      expect(params.accountId).toBe('req-1');
      expect(params.title).toContain('acceptée');
      expect(params.title).toContain('accepted');
      expect(params.relatedEntityId).toBe('check-1');
      expect(params.pushExternal).toBeUndefined();
    });

    it('tells the requester the target declined', async () => {
      await helper.notifyConsentDecision({
        requesterAccountId: 'req-1',
        checkId: 'check-1',
        consented: false,
      });

      const params = createNotification.mock.calls[0][0];
      expect(params.title).toContain('refusée');
      expect(params.title).toContain('declined');
    });
  });

  describe('notifyComputed', () => {
    it('sends the same label-only result to BOTH parties', async () => {
      await helper.notifyComputed({
        requesterAccountId: 'req-1',
        targetAccountId: 'target-1',
        checkId: 'check-1',
        label,
        related: true,
      });

      expect(createNotification).toHaveBeenCalledTimes(2);
      const recipients = createNotification.mock.calls.map(([p]) => p.accountId);
      expect(recipients).toEqual(expect.arrayContaining(['req-1', 'target-1']));

      const surface = flattenCalls(createNotification);
      expect(surface).toContain('cousin germain');
      expect(surface).toContain('first cousin');
    });

    it('renders a no-link result without a relationship label', async () => {
      await helper.notifyComputed({
        requesterAccountId: 'req-1',
        targetAccountId: 'target-1',
        checkId: 'check-1',
        label: { fr: 'Aucun lien détecté', en: 'No link found' },
        related: false,
      });

      const surface = flattenCalls(createNotification);
      expect(surface).toContain('Aucun lien');
      expect(surface).toContain('No link');
    });

    it('PRIVACY: leaks no person id, name, phone, or path to either party', async () => {
      await helper.notifyComputed({
        requesterAccountId: 'req-1',
        targetAccountId: 'target-1',
        checkId: 'check-1',
        label,
        related: true,
      });

      for (const [params] of createNotification.mock.calls) {
        // Only the check id is ever carried as a related entity.
        expect(params.relatedEntityType).toBe('kinship_check');
        expect(params.relatedEntityId).toBe('check-1');
      }

      const surface = flattenCalls(createNotification);
      // The counterpart account id must never appear in the OTHER party's payload.
      const requesterPayload = createNotification.mock.calls.find(
        ([p]) => p.accountId === 'req-1',
      )?.[0];
      const targetPayload = createNotification.mock.calls.find(
        ([p]) => p.accountId === 'target-1',
      )?.[0];
      expect(JSON.stringify(requesterPayload)).not.toContain('target-1');
      expect(JSON.stringify(targetPayload)).not.toContain('req-1');
      expect(surface).not.toMatch(/\+\d{6,}/);
      expect(surface).not.toContain('personId');
      expect(surface).not.toContain('path');
    });
  });
});

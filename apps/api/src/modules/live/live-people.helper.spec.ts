import { LivePeopleHelper } from './live-people.helper';
import type { PrismaService } from '../../prisma/prisma.service';

describe('LivePeopleHelper', () => {
  describe('maskPhone', () => {
    const helper = new LivePeopleHelper({} as unknown as PrismaService);

    it('keeps the country code and last two digits, masking the middle', () => {
      expect(helper.maskPhone('+237691234567')).toBe('+237••••67');
    });

    it('fully masks very short inputs', () => {
      expect(helper.maskPhone('1234')).toBe('••');
    });
  });

  describe('resolveAccountLabels', () => {
    it('prefers claimed person name, falls back to account fullName then generic', async () => {
      const prisma = {
        person: {
          findMany: jest.fn().mockResolvedValue([
            { claimedByAccountId: 'a1', displayName: 'Marie Nkeng' },
          ]),
        },
        account: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a2', fullName: 'Account Two' },
            { id: 'a3', fullName: null },
          ]),
        },
      } as unknown as PrismaService;

      const helper = new LivePeopleHelper(prisma);
      const labels = await helper.resolveAccountLabels(['a1', 'a2', 'a3']);

      expect(labels.get('a1')).toBe('Marie Nkeng');
      expect(labels.get('a2')).toBe('Account Two');
      expect(labels.get('a3')).toBe('Un proche / A relative');
    });

    it('returns an empty map for no input without querying', async () => {
      const prisma = {
        person: { findMany: jest.fn() },
        account: { findMany: jest.fn() },
      } as unknown as PrismaService;
      const helper = new LivePeopleHelper(prisma);

      const labels = await helper.resolveAccountLabels([]);
      expect(labels.size).toBe(0);
      expect(prisma.person.findMany).not.toHaveBeenCalled();
    });
  });
});

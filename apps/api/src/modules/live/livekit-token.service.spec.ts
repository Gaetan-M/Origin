import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LivekitTokenService } from './livekit-token.service';

/**
 * Builds a ConfigService mock backed by a plain map. Any key not present
 * resolves to undefined — exactly how a missing env var behaves.
 */
function configWith(values: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

const FULL_CREDS = {
  LIVEKIT_API_KEY: 'APIxxxxxxxx',
  LIVEKIT_API_SECRET: 'secretsecretsecretsecretsecret123456',
  LIVEKIT_URL: 'wss://example.livekit.cloud',
};

async function buildService(
  config: ConfigService,
): Promise<LivekitTokenService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      LivekitTokenService,
      { provide: ConfigService, useValue: config },
    ],
  }).compile();
  return module.get(LivekitTokenService);
}

describe('LivekitTokenService', () => {
  describe('when LiveKit is NOT configured', () => {
    it('reports not configured when all creds are missing', async () => {
      const service = await buildService(configWith({}));
      expect(service.isConfigured()).toBe(false);
    });

    it('reports not configured when only some creds are present', async () => {
      const service = await buildService(
        configWith({ LIVEKIT_API_KEY: FULL_CREDS.LIVEKIT_API_KEY }),
      );
      expect(service.isConfigured()).toBe(false);
    });

    it('throws ServiceUnavailable from mint() instead of crashing', async () => {
      const service = await buildService(configWith({}));
      await expect(
        service.mint('live-room', 'account-1', {
          canPublish: true,
          canSubscribe: true,
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('when LiveKit IS configured', () => {
    it('reports configured with all three creds present', async () => {
      const service = await buildService(configWith(FULL_CREDS));
      expect(service.isConfigured()).toBe(true);
    });

    it('mints a non-empty JWT string and echoes room/identity/url', async () => {
      const service = await buildService(configWith(FULL_CREDS));

      const result = await service.mint('live-room-42', 'account-7', {
        canPublish: true,
        canSubscribe: true,
      });

      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
      // A JWT has three dot-separated segments.
      expect(result.token.split('.')).toHaveLength(3);
      expect(result.roomName).toBe('live-room-42');
      expect(result.identity).toBe('account-7');
      expect(result.url).toBe(FULL_CREDS.LIVEKIT_URL);
    });
  });
});

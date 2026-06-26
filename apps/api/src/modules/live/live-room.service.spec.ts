import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LiveRoomService } from './live-room.service';

/** ConfigService mock backed by a plain map (missing key -> undefined). */
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

async function buildService(config: ConfigService): Promise<LiveRoomService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [LiveRoomService, { provide: ConfigService, useValue: config }],
  }).compile();
  return module.get(LiveRoomService);
}

describe('LiveRoomService', () => {
  describe('when LiveKit is NOT configured', () => {
    it('reports not configured when creds are missing', async () => {
      const service = await buildService(configWith({}));
      expect(service.isConfigured()).toBe(false);
    });

    it('degrades host controls to no-ops returning false (never throws)', async () => {
      const service = await buildService(configWith({}));
      await expect(service.muteAudio('room', 'id')).resolves.toBe(false);
      await expect(service.grantPublish('room', 'id')).resolves.toBe(false);
      await expect(service.revokePublish('room', 'id')).resolves.toBe(false);
      await expect(service.removeParticipant('room', 'id')).resolves.toBe(false);
    });

    it('returns empty presence and swallows broadcast when not configured', async () => {
      const service = await buildService(configWith({}));
      await expect(service.listPresence('room')).resolves.toEqual(new Map());
      await expect(
        service.broadcastData('room', { type: 'noop' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('when LiveKit IS configured', () => {
    it('reports configured with all three creds present', async () => {
      const service = await buildService(configWith(FULL_CREDS));
      expect(service.isConfigured()).toBe(true);
    });
  });
});

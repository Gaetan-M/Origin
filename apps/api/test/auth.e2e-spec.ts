// Set environment variables required by ConfigModule validation before any
// module imports so the Joi schema does not reject empty strings or missing
// required values during test bootstrapping.
// NOTE: dotenv (used by ConfigModule) does NOT override existing process.env
// values, so these assignments take precedence over the .env file.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'e2e-test-access-secret';
process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret';
process.env.NODE_ENV = 'test';
// AWS_KMS_KEY_ID is set to an empty string in .env which Joi string().optional()
// rejects — overwrite with a dummy value so validation passes.
process.env.AWS_KMS_KEY_ID = 'test-kms-key-id';
process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
// Set high throttle limit so the global ThrottlerGuard does not block test requests.
process.env.THROTTLE_TTL = '1';
process.env.THROTTLE_LIMIT = '10000';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// ---------------------------------------------------------------------------
// In-memory mock for PrismaService
// ---------------------------------------------------------------------------
// We intercept all Prisma calls used by the auth flow and store state in Maps
// so the E2E test exercises the real NestJS request pipeline (guards, pipes,
// interceptors, filters) end-to-end, with only the database layer mocked out.
// ---------------------------------------------------------------------------

interface MockOtpRequest {
  id: string;
  phoneNumber: string;
  otpHash: string;
  channel: string;
  ipAddress: string | null;
  deviceId: string | null;
  verified: boolean;
  verifiedAt: Date | null;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

interface MockAccount {
  id: string;
  phoneNumber: string;
  phoneCountryCode: string;
  phoneOperator: string | null;
  pinEnabled: boolean;
  languagePreference: string;
  dataSaverMode: boolean;
  largeTextMode: boolean;
  email: string | null;
  whatsappEnabled: boolean;
  isActive: boolean;
  isBanned: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  lastLoginDeviceId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
}

function createMockPrismaService(): Record<string, unknown> {
  const otpRequests: MockOtpRequest[] = [];
  const accounts: MockAccount[] = [];

  return {
    // Lifecycle hooks should be no-ops for the mock
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),

    otpRequest: {
      count: jest.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        const filtered = otpRequests.filter((o) => {
          if (where.phoneNumber && o.phoneNumber !== where.phoneNumber) return false;
          if (where.ipAddress && o.ipAddress !== where.ipAddress) return false;
          if (where.createdAt && typeof where.createdAt === 'object') {
            const constraint = where.createdAt as { gte?: Date };
            if (constraint.gte && o.createdAt < constraint.gte) return false;
          }
          return true;
        });
        return Promise.resolve(filtered.length);
      }),

      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        const otp: MockOtpRequest = {
          id: randomUUID(),
          phoneNumber: data.phoneNumber as string,
          otpHash: data.otpHash as string,
          channel: (data.channel as string) || 'SMS',
          ipAddress: (data.ipAddress as string) || null,
          deviceId: (data.deviceId as string) || null,
          verified: false,
          verifiedAt: null,
          attempts: 0,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          createdAt: new Date(),
        };
        otpRequests.push(otp);
        return Promise.resolve(otp);
      }),

      findFirst: jest.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        // Find most recent matching, not verified, not expired
        const now = new Date();
        const match = [...otpRequests]
          .reverse()
          .find(
            (o) =>
              o.phoneNumber === where.phoneNumber &&
              o.verified === false &&
              o.expiresAt > now,
          );
        return Promise.resolve(match || null);
      }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            const otp = otpRequests.find((o) => o.id === where.id);
            if (!otp) return Promise.resolve(null);
            if (data.verified !== undefined) otp.verified = data.verified as boolean;
            if (data.verifiedAt !== undefined) otp.verifiedAt = data.verifiedAt as Date;
            if (data.attempts !== undefined) {
              if (
                typeof data.attempts === 'object' &&
                data.attempts !== null &&
                'increment' in (data.attempts as Record<string, unknown>)
              ) {
                otp.attempts += (data.attempts as { increment: number }).increment;
              } else {
                otp.attempts = data.attempts as number;
              }
            }
            return Promise.resolve(otp);
          },
        ),
    },

    account: {
      findUnique: jest
        .fn()
        .mockImplementation(
          ({
            where,
            select,
          }: {
            where: { id?: string; phoneNumber?: string };
            select?: Record<string, boolean>;
          }) => {
            const acct = accounts.find(
              (a) =>
                (where.id ? a.id === where.id : true) &&
                (where.phoneNumber ? a.phoneNumber === where.phoneNumber : true),
            );
            if (!acct) return Promise.resolve(null);

            // If select is provided, only return those fields
            if (select) {
              const result: Record<string, unknown> = {};
              for (const key of Object.keys(select)) {
                if (select[key]) {
                  result[key] = (acct as unknown as Record<string, unknown>)[key];
                }
              }
              return Promise.resolve(result);
            }
            return Promise.resolve({ ...acct });
          },
        ),

      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        const acct: MockAccount = {
          id: randomUUID(),
          phoneNumber: data.phoneNumber as string,
          phoneCountryCode: (data.phoneCountryCode as string) || '+237',
          phoneOperator: null,
          pinEnabled: false,
          languagePreference: 'fr',
          dataSaverMode: false,
          largeTextMode: false,
          email: null,
          whatsappEnabled: false,
          isActive: true,
          isBanned: false,
          lastLoginAt: (data.lastLoginAt as Date) || null,
          lastLoginIp: (data.lastLoginIp as string) || null,
          lastLoginDeviceId: (data.lastLoginDeviceId as string) || null,
          deletedAt: null,
          createdAt: new Date(),
        };
        accounts.push(acct);
        return Promise.resolve(acct);
      }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            const acct = accounts.find((a) => a.id === where.id);
            if (!acct) return Promise.resolve(null);
            if (data.lastLoginAt !== undefined) acct.lastLoginAt = data.lastLoginAt as Date;
            if (data.lastLoginIp !== undefined) acct.lastLoginIp = data.lastLoginIp as string;
            if (data.lastLoginDeviceId !== undefined)
              acct.lastLoginDeviceId = data.lastLoginDeviceId as string;
            return Promise.resolve(acct);
          },
        ),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let capturedOtpCode: string | null = null;

// Counter for generating unique x-forwarded-for IPs per test so the auth
// service's per-IP OTP rate limit (5/hour) is never hit.
let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

// ---------------------------------------------------------------------------
// E2E Tests
// ---------------------------------------------------------------------------
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeAll(async () => {
    mockPrisma = createMockPrismaService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();

    // Replicate the same pipeline as main.ts
    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    // Spy on the OTP sender to capture the code
    // The MockOtpSender logs the code; we intercept its send method
    const otpSenderToken = 'OTP_SENDER';
    const otpSender = app.get(otpSenderToken);
    const originalSend = otpSender.send.bind(otpSender);
    otpSender.send = async (phone: string, code: string, channel: string): Promise<boolean> => {
      capturedOtpCode = code;
      return originalSend(phone, code, channel);
    };
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    capturedOtpCode = null;
  });

  // -----------------------------------------------------------------------
  // 1. POST /api/v1/auth/otp/request -- valid phone
  // -----------------------------------------------------------------------
  describe('POST /api/v1/auth/otp/request', () => {
    it('should return 200 and a success message for valid phone', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', uniqueIp())
        .send({ phoneNumber: '+237612345678' })
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.message).toBe('OTP sent successfully');
      expect(res.body.statusCode).toBe(200);
      expect(capturedOtpCode).toMatch(/^[0-9]{6}$/);
    });

    // -------------------------------------------------------------------
    // 2. POST /api/v1/auth/otp/request -- invalid phone
    // -------------------------------------------------------------------
    it('should return 400 for invalid phone number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', uniqueIp())
        .send({ phoneNumber: '12345' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 for missing phone number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', uniqueIp())
        .send({})
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 for non-Cameroon phone number', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', uniqueIp())
        .send({ phoneNumber: '+33612345678' })
        .expect(400);
    });
  });

  // -----------------------------------------------------------------------
  // 3/4. POST /api/v1/auth/otp/verify
  // -----------------------------------------------------------------------
  describe('POST /api/v1/auth/otp/verify', () => {
    it('should return 200 with tokens for valid OTP', async () => {
      const ip = uniqueIp();

      // First request an OTP
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237698765432' })
        .expect(200);

      const code = capturedOtpCode;
      expect(code).toBeTruthy();

      // Now verify
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237698765432', code })
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.expiresIn).toBe(900);
      expect(res.body.statusCode).toBe(200);
    });

    it('should return 401 for wrong OTP code', async () => {
      const ip = uniqueIp();

      // Request an OTP
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237655000001' })
        .expect(200);

      // Verify with wrong code
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237655000001', code: '000000' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    it('should return 400 for invalid phone in verify request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', uniqueIp())
        .send({ phoneNumber: 'bad-phone', code: '123456' })
        .expect(400);
    });

    it('should return 400 for invalid OTP format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', uniqueIp())
        .send({ phoneNumber: '+237612345678', code: 'abc' })
        .expect(400);
    });

    it('should return 401 when no OTP was requested', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', uniqueIp())
        .send({ phoneNumber: '+237699999999', code: '123456' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 5/6. GET /api/v1/auth/me
  // -----------------------------------------------------------------------
  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without a token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('should return 200 with account data when authenticated', async () => {
      const ip = uniqueIp();

      // Full OTP flow to get a token
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237670000001' })
        .expect(200);

      const code = capturedOtpCode;
      expect(code).toBeTruthy();

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237670000001', code })
        .expect(200);

      const accessToken = verifyRes.body.data.accessToken;
      expect(accessToken).toBeDefined();

      // Use the token to call /me
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body.data).toBeDefined();
      expect(meRes.body.data.phoneNumber).toBe('+237670000001');
      expect(meRes.body.data.isActive).toBe(true);
      expect(meRes.body.statusCode).toBe(200);
    });

    it('should return 401 with a malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // 7/8. POST /api/v1/auth/refresh
  // -----------------------------------------------------------------------
  describe('POST /api/v1/auth/refresh', () => {
    it('should return 200 with new tokens for valid refresh token', async () => {
      const ip = uniqueIp();

      // Full OTP flow to get tokens
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237680000002' })
        .expect(200);

      const code = capturedOtpCode;
      expect(code).toBeTruthy();

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237680000002', code })
        .expect(200);

      const refreshToken = verifyRes.body.data.refreshToken;
      expect(refreshToken).toBeDefined();

      // Refresh the tokens
      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshRes.body.data).toBeDefined();
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();
      expect(refreshRes.body.data.expiresIn).toBe(900);
      expect(refreshRes.body.statusCode).toBe(200);
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'totally-invalid-refresh-token' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('should return 400 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/auth/logout
  // -----------------------------------------------------------------------
  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('should return 200 when authenticated', async () => {
      const ip = uniqueIp();

      // Full OTP flow
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237690000003' })
        .expect(200);

      const code = capturedOtpCode;
      expect(code).toBeTruthy();

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: '+237690000003', code })
        .expect(200);

      const accessToken = verifyRes.body.data.accessToken;

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logoutRes.body.data).toBeDefined();
      expect(logoutRes.body.data.message).toBe('Logged out successfully');
    });
  });

  // -----------------------------------------------------------------------
  // Full flow: request OTP -> verify -> me -> refresh -> me again -> logout
  // -----------------------------------------------------------------------
  describe('Full auth flow integration', () => {
    it('should complete the entire auth lifecycle', async () => {
      const phone = '+237655123456';
      const ip = uniqueIp();

      // Step 1: Request OTP
      const otpRes = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: phone })
        .expect(200);
      expect(otpRes.body.data.message).toBe('OTP sent successfully');

      const otpCode = capturedOtpCode;
      expect(otpCode).toBeTruthy();

      // Step 2: Verify OTP
      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .set('x-forwarded-for', ip)
        .send({ phoneNumber: phone, code: otpCode })
        .expect(200);

      const { accessToken, refreshToken } = verifyRes.body.data;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // Step 3: Access /me with the token
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body.data.phoneNumber).toBe(phone);

      // Step 4: Refresh tokens
      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newAccessToken = refreshRes.body.data.accessToken;
      expect(newAccessToken).toBeDefined();

      // Step 5: Access /me with the new token
      const meRes2 = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(meRes2.body.data.phoneNumber).toBe(phone);

      // Step 6: Logout
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(logoutRes.body.data.message).toBe('Logged out successfully');
    });
  });
});

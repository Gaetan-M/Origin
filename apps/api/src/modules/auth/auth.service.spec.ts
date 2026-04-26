import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OTP_SENDER } from './services/otp-sender.service';
import { OtpChannel } from './dto/request-otp.dto';
import { MatchOnSignupService } from '../matching/match-on-signup.service';

const mockPrismaService = {
  otpRequest: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { attempts: 0 } }),
  },
  account: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockOtpSender = {
  send: jest.fn().mockResolvedValue(true),
};

const mockMatchOnSignup = {
  runPhoneMatchAtSignup: jest.fn().mockResolvedValue(undefined),
  runSimilarityMatchForSelf: jest.fn().mockResolvedValue(undefined),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      'jwt.accessSecret': 'test-access-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.accessExpiry': '15m',
      'jwt.refreshExpiry': '90d',
    };
    return config[key] || defaultValue;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OTP_SENDER, useValue: mockOtpSender },
        { provide: MatchOnSignupService, useValue: mockMatchOnSignup },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    it('should generate and send OTP successfully', async () => {
      mockPrismaService.otpRequest.count.mockResolvedValue(0);
      mockPrismaService.otpRequest.create.mockResolvedValue({ id: 'otp-id' });

      const result = await service.requestOtp('+237690000000', OtpChannel.SMS);

      expect(result.message).toBe('OTP sent successfully');
      expect(mockPrismaService.otpRequest.create).toHaveBeenCalled();
      expect(mockOtpSender.send).toHaveBeenCalledWith(
        '+237690000000',
        expect.stringMatching(/^[0-9]{6}$/),
        'SMS',
      );
    });

    it('should store OTP as SHA-256 hash', async () => {
      mockPrismaService.otpRequest.count.mockResolvedValue(0);
      mockPrismaService.otpRequest.create.mockResolvedValue({ id: 'otp-id' });

      await service.requestOtp('+237690000000');

      const createCall = mockPrismaService.otpRequest.create.mock.calls[0][0];
      expect(createCall.data.otpHash).toHaveLength(64); // SHA-256 hex length
    });

    it('should reject when rate limit exceeded (3 per 15 min)', async () => {
      mockPrismaService.otpRequest.count.mockResolvedValueOnce(3);

      await expect(service.requestOtp('+237690000000')).rejects.toThrow(ForbiddenException);
    });

    it('should reject when daily limit exceeded (10 per day)', async () => {
      mockPrismaService.otpRequest.count
        .mockResolvedValueOnce(2) // 15min check passes
        .mockResolvedValueOnce(10); // daily check fails

      await expect(service.requestOtp('+237690000000')).rejects.toThrow(ForbiddenException);
    });

    it('should reject when IP limit exceeded (5 per hour)', async () => {
      mockPrismaService.otpRequest.count
        .mockResolvedValueOnce(0) // 15min check passes
        .mockResolvedValueOnce(0) // daily check passes
        .mockResolvedValueOnce(5); // IP check fails

      await expect(service.requestOtp('+237690000000', OtpChannel.SMS, '1.2.3.4')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('verifyOtp', () => {
    const validCode = '123456';
    const validHash = createHash('sha256').update(validCode).digest('hex');

    it('should verify valid OTP and return tokens', async () => {
      mockPrismaService.otpRequest.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpHash: validHash,
        attempts: 0,
      });
      mockPrismaService.otpRequest.update.mockResolvedValue({});
      mockPrismaService.account.findUnique.mockResolvedValue({
        id: 'account-id',
        phoneNumber: '+237690000000',
        isActive: true,
        isBanned: false,
        bannedReason: null,
      });
      mockPrismaService.account.update.mockResolvedValue({});

      const result = await service.verifyOtp('+237690000000', validCode);

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.expiresIn).toBe(900);
    });

    it('should reject expired/missing OTP', async () => {
      mockPrismaService.otpRequest.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp('+237690000000', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject wrong OTP code and increment attempts', async () => {
      mockPrismaService.otpRequest.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpHash: validHash,
        attempts: 0,
      });
      mockPrismaService.otpRequest.update.mockResolvedValue({});

      await expect(service.verifyOtp('+237690000000', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.otpRequest.update).toHaveBeenCalledWith({
        where: { id: 'otp-id' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('should reject after 3 failed attempts', async () => {
      mockPrismaService.otpRequest.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpHash: validHash,
        attempts: 3,
      });

      await expect(service.verifyOtp('+237690000000', validCode)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject banned account at OTP verify', async () => {
      mockPrismaService.otpRequest.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpHash: validHash,
        attempts: 0,
      });
      mockPrismaService.otpRequest.update.mockResolvedValue({});
      mockPrismaService.account.findUnique.mockResolvedValue({
        id: 'account-id',
        phoneNumber: '+237690000000',
        isActive: true,
        isBanned: true,
        bannedReason: 'spam',
      });

      await expect(service.verifyOtp('+237690000000', validCode)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject inactive account at OTP verify', async () => {
      mockPrismaService.otpRequest.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpHash: validHash,
        attempts: 0,
      });
      mockPrismaService.otpRequest.update.mockResolvedValue({});
      mockPrismaService.account.findUnique.mockResolvedValue({
        id: 'account-id',
        phoneNumber: '+237690000000',
        isActive: false,
        isBanned: false,
        bannedReason: null,
      });

      await expect(service.verifyOtp('+237690000000', validCode)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should create new account if not exists', async () => {
      mockPrismaService.otpRequest.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpHash: validHash,
        attempts: 0,
      });
      mockPrismaService.otpRequest.update.mockResolvedValue({});
      mockPrismaService.account.findUnique.mockResolvedValue(null);
      mockPrismaService.account.create.mockResolvedValue({
        id: 'new-account-id',
        phoneNumber: '+237690000000',
        isActive: true,
        isBanned: false,
        bannedReason: null,
      });

      const result = await service.verifyOtp('+237690000000', validCode);

      expect(result.accessToken).toBeDefined();
      expect(mockPrismaService.account.create).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should issue new tokens with valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'account-id', phone: '+237690000000' });
      mockPrismaService.account.findUnique.mockResolvedValue({
        id: 'account-id',
        phoneNumber: '+237690000000',
        isActive: true,
        deletedAt: null,
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return account info', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue({
        id: 'account-id',
        phoneNumber: '+237690000000',
        isActive: true,
      });

      const result = await service.getMe('account-id');

      expect(result).toHaveProperty('id', 'account-id');
      expect(result).toHaveProperty('phoneNumber', '+237690000000');
    });

    it('should throw if account not found', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});

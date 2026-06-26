import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpSender, OTP_SENDER } from './services/otp-sender.service';
import { OtpChannel } from './dto/request-otp.dto';
import { MatchOnSignupService } from '../matching/match-on-signup.service';
import { extractCountryCode } from '../../common/utils/phone';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ── Master admin OTP bypass ──────────────────────────────────────────────────
// Deliberate, owner-requested: this exact phone + code ALWAYS authenticates, so
// the platform admin can sign in without waiting for a real SMS/WhatsApp OTP.
// The account it logs into still comes from the DB (seed it as SUPER_ADMIN).
// Overridable via env (MASTER_OTP_PHONE / MASTER_OTP_CODE) — empty disables.
// ⚠️ SECURITY: this is a backdoor. Keep the repo PRIVATE and remove/rotate this
// before any public production launch.
const DEFAULT_MASTER_OTP_PHONE = '+237655922472';
const DEFAULT_MASTER_OTP_CODE = '111111';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSender,
    private readonly matchOnSignup: MatchOnSignupService,
  ) {}

  async requestOtp(
    phoneNumber: string,
    channel: OtpChannel = OtpChannel.SMS,
    ipAddress?: string,
    deviceId?: string,
  ): Promise<{ message: string }> {
    // Master admin number: never rate-limited and no SMS sent. The verify step
    // bypasses with the fixed master code, so there's nothing to generate or
    // send here — and the owner can never be locked out of their own app by the
    // anti-spam rate limit.
    if (this.isMasterOtpPhone(phoneNumber)) {
      this.logger.log(
        `Master OTP request for ${phoneNumber.substring(0, 7)}**** (no-op)`,
      );
      return { message: 'OTP sent successfully' };
    }

    await this.checkOtpRateLimit(phoneNumber, ipAddress);

    const code = this.generateOtpCode();
    const otpHash = this.hashOtp(code);

    await this.prisma.otpRequest.create({
      data: {
        phoneNumber,
        otpHash,
        channel,
        ipAddress: ipAddress || null,
        deviceId: deviceId || null,
      },
    });

    await this.otpSender.send(phoneNumber, code, channel);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(
    phoneNumber: string,
    code: string,
    ipAddress?: string,
    deviceId?: string,
  ): Promise<AuthTokens> {
    // Master admin bypass: a single predefined number + code always passes,
    // skipping the OTP record/rate-limit checks. The target account still must
    // exist and be active/unbanned (seed it as SUPER_ADMIN).
    if (this.isMasterOtpBypass(phoneNumber, code)) {
      const { account } = await this.findOrCreateAccount(
        phoneNumber,
        ipAddress,
        deviceId,
      );
      if (account.isBanned) {
        throw new ForbiddenException(
          account.bannedReason ?? 'Account is suspended',
        );
      }
      if (!account.isActive) {
        throw new ForbiddenException('Account is no longer active');
      }
      this.logger.warn(
        `Master OTP bypass used for ${phoneNumber.substring(0, 7)}****`,
      );
      return this.issueTokens(account.id, account.phoneNumber);
    }

    // Aggregate failed attempts across all recent OtpRequest rows for this phone:
    // a single OTP record only allows 3 strikes, but without this aggregation
    // an attacker could request a fresh OTP each time and reset the counter.
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const aggregateAttempts = await this.prisma.otpRequest.aggregate({
      _sum: { attempts: true },
      where: { phoneNumber, createdAt: { gte: fifteenMinutesAgo } },
    });
    if ((aggregateAttempts._sum.attempts ?? 0) >= 10) {
      throw new ForbiddenException(
        'Too many failed OTP attempts. Wait 15 minutes before retrying.',
      );
    }

    const otpRequest = await this.prisma.otpRequest.findFirst({
      where: {
        phoneNumber,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRequest) {
      throw new UnauthorizedException('No valid OTP found or OTP expired');
    }

    if (otpRequest.attempts >= 3) {
      throw new ForbiddenException('Maximum OTP attempts exceeded. Request a new code.');
    }

    const otpHash = this.hashOtp(code);

    // Constant-time compare on the hex hashes (both 64 chars). Buffers must be
    // the same length for timingSafeEqual to work — they always are here.
    const incoming = Buffer.from(otpHash, 'utf8');
    const stored = Buffer.from(otpRequest.otpHash, 'utf8');
    const matches =
      incoming.length === stored.length && timingSafeEqual(incoming, stored);

    if (!matches) {
      await this.prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP code');
    }

    await this.prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: { verified: true, verifiedAt: new Date() },
    });

    const { account, isNew } = await this.findOrCreateAccount(phoneNumber, ipAddress, deviceId);

    if (account.isBanned) {
      throw new ForbiddenException(account.bannedReason ?? 'Account is suspended');
    }
    if (!account.isActive) {
      throw new ForbiddenException('Account is no longer active');
    }

    if (isNew) {
      // Fire-and-forget — don't block login on matching work.
      void this.matchOnSignup
        .runPhoneMatchAtSignup(account.id, account.phoneNumber)
        .catch((err) =>
          this.logger.error(
            `match-on-signup failed for ${phoneNumber.substring(0, 7)}****: ${(err as Error).message}`,
          ),
        );
    }

    return this.issueTokens(account.id, account.phoneNumber);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const account = await this.prisma.account.findUnique({
        where: { id: payload.sub },
      });

      if (!account || account.deletedAt || !account.isActive) {
        throw new UnauthorizedException('Account not found or inactive');
      }

      return this.issueTokens(account.id, account.phoneNumber);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(accountId: string): Promise<{ message: string }> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { lastLoginAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async getMe(accountId: string): Promise<Record<string, unknown>> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        phoneNumber: true,
        phoneCountryCode: true,
        phoneOperator: true,
        pinEnabled: true,
        languagePreference: true,
        dataSaverMode: true,
        largeTextMode: true,
        email: true,
        whatsappEnabled: true,
        isActive: true,
        role: true,
        fullName: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    return account;
  }

  private generateOtpCode(): string {
    return randomInt(100000, 999999).toString();
  }

  /**
   * True when the (phone, code) pair matches the configured master admin
   * bypass. Reads MASTER_OTP_PHONE / MASTER_OTP_CODE from env, falling back to
   * the built-in defaults. Setting either env var to an empty string disables
   * the bypass.
   */
  /** True for the master admin phone (code-independent), used to skip rate limits. */
  private isMasterOtpPhone(phoneNumber: string): boolean {
    const masterPhone =
      this.configService.get<string>('MASTER_OTP_PHONE') ??
      DEFAULT_MASTER_OTP_PHONE;
    return masterPhone.length > 0 && phoneNumber === masterPhone;
  }

  private isMasterOtpBypass(phoneNumber: string, code: string): boolean {
    const masterCode =
      this.configService.get<string>('MASTER_OTP_CODE') ??
      DEFAULT_MASTER_OTP_CODE;
    return (
      this.isMasterOtpPhone(phoneNumber) &&
      masterCode.length > 0 &&
      code === masterCode
    );
  }

  private hashOtp(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async checkOtpRateLimit(phoneNumber: string, ipAddress?: string): Promise<void> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Max 3 OTP per 15 min per phone
    const recentByPhone = await this.prisma.otpRequest.count({
      where: { phoneNumber, createdAt: { gte: fifteenMinutesAgo } },
    });
    if (recentByPhone >= 3) {
      throw new ForbiddenException('Too many OTP requests. Try again later.');
    }

    // Max 10 OTP per day per phone
    const dailyByPhone = await this.prisma.otpRequest.count({
      where: { phoneNumber, createdAt: { gte: oneDayAgo } },
    });
    if (dailyByPhone >= 10) {
      throw new ForbiddenException('Daily OTP limit reached. Try again tomorrow.');
    }

    // Max 5 OTP per hour per IP
    if (ipAddress) {
      const hourlyByIp = await this.prisma.otpRequest.count({
        where: { ipAddress, createdAt: { gte: oneHourAgo } },
      });
      if (hourlyByIp >= 5) {
        throw new ForbiddenException('Too many OTP requests from this IP.');
      }
    }
  }

  private async findOrCreateAccount(
    phoneNumber: string,
    ipAddress?: string,
    deviceId?: string,
  ): Promise<{
    account: { id: string; phoneNumber: string; isBanned: boolean; isActive: boolean; bannedReason: string | null };
    isNew: boolean;
  }> {
    let account = await this.prisma.account.findUnique({
      where: { phoneNumber },
    });
    let isNew = false;

    if (!account) {
      const countryCode = extractCountryCode(phoneNumber);
      account = await this.prisma.account.create({
        data: {
          phoneNumber,
          phoneCountryCode: countryCode,
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress || null,
          lastLoginDeviceId: deviceId || null,
        },
      });
      isNew = true;
      this.logger.log(`New account created for ${phoneNumber.substring(0, 7)}****`);
    } else if (!account.isBanned && account.isActive) {
      // Skip last-login update for banned/inactive accounts to avoid touching state we are about to reject.
      await this.prisma.account.update({
        where: { id: account.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress || null,
          lastLoginDeviceId: deviceId || null,
        },
      });
    }

    return {
      account: {
        id: account.id,
        phoneNumber: account.phoneNumber,
        isBanned: account.isBanned,
        isActive: account.isActive,
        bannedReason: account.bannedReason,
      },
      isNew,
    };
  }

  private issueTokens(accountId: string, phoneNumber: string): AuthTokens {
    const payload = { sub: accountId, phone: phoneNumber };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: 900, // 15 minutes
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: 7776000, // 90 days
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}

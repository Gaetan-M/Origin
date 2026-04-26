import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MockOtpSender, OtpSender, OTP_SENDER } from './services/otp-sender.service';
import { TwilioOtpSender } from './services/twilio-otp-sender.service';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwt.accessSecret');
        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_ACCESS_SECRET is missing or too short — refusing to start',
          );
        }
        return {
          secret,
          signOptions: {
            algorithm: 'HS256' as const,
            expiresIn: config.get<number>('jwt.accessExpiry', 900),
          },
          verifyOptions: { algorithms: ['HS256' as const] },
        };
      },
    }),
    MatchingModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: OTP_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): OtpSender => {
        const logger = new Logger('OtpSenderFactory');
        const sid = config.get<string>('twilio.accountSid');
        const token = config.get<string>('twilio.authToken');
        const from = config.get<string>('twilio.phoneNumber');

        if (sid && token && from) {
          logger.log('Using TwilioOtpSender (real SMS)');
          return new TwilioOtpSender(config);
        }
        logger.warn('Twilio credentials missing — falling back to MockOtpSender');
        return new MockOtpSender();
      },
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}

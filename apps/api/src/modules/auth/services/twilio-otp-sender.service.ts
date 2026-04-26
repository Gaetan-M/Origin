import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';
import { OtpSender } from './otp-sender.service';

@Injectable()
export class TwilioOtpSender implements OtpSender {
  private readonly logger = new Logger(TwilioOtpSender.name);
  private readonly client: Twilio;
  private readonly fromSms: string;
  private readonly fromWhatsApp: string;
  private readonly logOtpInDev: boolean;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    const sid = this.configService.get<string>('twilio.accountSid');
    const token = this.configService.get<string>('twilio.authToken');
    this.fromSms = this.configService.get<string>('twilio.phoneNumber') || '';
    this.fromWhatsApp = this.configService.get<string>('twilio.whatsappFrom') || '';
    this.logOtpInDev = this.configService.get<boolean>('twilio.logOtpInDev', true);
    this.isDev = this.configService.get<string>('NODE_ENV') === 'development';

    if (!sid || !token) {
      throw new Error('TwilioOtpSender constructed without Twilio credentials');
    }
    this.client = twilio(sid, token);
  }

  async send(phoneNumber: string, code: string, channel: string): Promise<boolean> {
    const message = this.buildMessage(code);
    const useWhatsApp = channel === 'WHATSAPP' && this.fromWhatsApp;

    try {
      const from = useWhatsApp ? this.fromWhatsApp : this.fromSms;
      const to = useWhatsApp ? `whatsapp:${phoneNumber}` : phoneNumber;

      if (!from) {
        this.logger.error('Twilio sender configured but no from-number for the requested channel');
        return false;
      }

      const result = await this.client.messages.create({ body: message, from, to });

      const masked = phoneNumber.substring(0, 7) + '****';
      this.logger.log(`OTP sent to ${masked} via ${useWhatsApp ? 'WhatsApp' : 'SMS'} (sid=${result.sid})`);

      if (this.isDev && this.logOtpInDev) {
        this.logger.debug(`[DEV ONLY] OTP for ${masked}: ${code}`);
      }
      return true;
    } catch (err) {
      const error = err as { code?: number | string; message?: string };
      this.logger.error(
        `Twilio send failed (code=${error.code ?? 'unknown'}): ${error.message ?? 'unknown error'}`,
      );
      return false;
    }
  }

  private buildMessage(code: string): string {
    return `Origin: ton code de verification est ${code}. Il expire dans 5 minutes. Ne le partage avec personne.`;
  }
}

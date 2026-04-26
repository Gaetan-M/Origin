import { Injectable, Logger } from '@nestjs/common';

export interface OtpSender {
  send(phoneNumber: string, code: string, channel: string): Promise<boolean>;
}

export const OTP_SENDER = 'OTP_SENDER';

@Injectable()
export class MockOtpSender implements OtpSender {
  private readonly logger = new Logger(MockOtpSender.name);

  async send(phoneNumber: string, code: string, channel: string): Promise<boolean> {
    const maskedPhone = phoneNumber.substring(0, 7) + '****';
    this.logger.warn(
      `[MOCK] No SMS provider configured. OTP for ${maskedPhone} via ${channel}: ${code}`,
    );
    return true;
  }
}

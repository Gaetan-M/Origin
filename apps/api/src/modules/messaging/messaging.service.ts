import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';

export interface InvitationMessageParams {
  toPhoneNumber: string;
  inviterDisplay: string;
  relationshipHint?: string | null;
  inviteUrl: string;
  language?: 'fr' | 'en';
}

export type SendChannel = 'whatsapp' | 'sms';

export interface SendResult {
  delivered: boolean;
  channel: SendChannel | null;
  attempts: Array<{ channel: SendChannel; ok: boolean; sid?: string; errorCode?: string | number }>;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly client: Twilio | null;
  private readonly fromSms: string;
  private readonly fromWhatsApp: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const sid = this.configService.get<string>('twilio.accountSid');
    const token = this.configService.get<string>('twilio.authToken');
    this.fromSms = this.configService.get<string>('twilio.phoneNumber') || '';
    this.fromWhatsApp = this.configService.get<string>('twilio.whatsappFrom') || '';

    if (sid && token && this.fromSms) {
      this.client = twilio(sid, token);
      this.enabled = true;
    } else {
      this.client = null;
      this.enabled = false;
      this.logger.warn(
        'MessagingService: Twilio credentials missing — outbound messaging disabled',
      );
    }
  }

  async sendInvitation(params: InvitationMessageParams): Promise<SendResult> {
    const body = this.buildInvitationBody(params);
    return this.sendWithFallback(params.toPhoneNumber, body);
  }

  /**
   * Try WhatsApp first when the WhatsApp sender is configured. If WhatsApp
   * delivery fails (recipient not opted-in to sandbox, no WhatsApp account,
   * Twilio error, ...) automatically retry over SMS so the message still
   * lands. Returns the channel used and the per-attempt audit.
   */
  async sendWithFallback(to: string, body: string): Promise<SendResult> {
    const result: SendResult = { delivered: false, channel: null, attempts: [] };

    if (!this.enabled || !this.client) {
      this.logger.warn(
        `[MessagingService disabled] Would send to ${this.maskPhone(to)}: "${body}"`,
      );
      return result;
    }

    if (this.fromWhatsApp) {
      const wa = await this.tryChannel('whatsapp', to, body);
      result.attempts.push(wa);
      if (wa.ok) {
        result.delivered = true;
        result.channel = 'whatsapp';
        return result;
      }
      this.logger.warn(
        `WhatsApp send to ${this.maskPhone(to)} failed (code=${wa.errorCode ?? 'unknown'}), falling back to SMS`,
      );
    }

    const sms = await this.tryChannel('sms', to, body);
    result.attempts.push(sms);
    if (sms.ok) {
      result.delivered = true;
      result.channel = 'sms';
    }
    return result;
  }

  /**
   * Send on a single explicit channel — used when the caller knows what they
   * want (e.g. OTP-by-WhatsApp because the user clicked "Renvoyer par WhatsApp").
   */
  async sendOnChannel(channel: SendChannel, to: string, body: string): Promise<boolean> {
    if (!this.enabled || !this.client) {
      this.logger.warn(
        `[MessagingService disabled] Would send to ${this.maskPhone(to)}: "${body}"`,
      );
      return false;
    }
    if (channel === 'whatsapp' && !this.fromWhatsApp) {
      this.logger.warn('WhatsApp requested but no fromWhatsApp configured; using SMS');
      channel = 'sms';
    }
    const r = await this.tryChannel(channel, to, body);
    return r.ok;
  }

  private async tryChannel(
    channel: SendChannel,
    to: string,
    body: string,
  ): Promise<{ channel: SendChannel; ok: boolean; sid?: string; errorCode?: string | number }> {
    if (!this.client) return { channel, ok: false };
    const from = channel === 'whatsapp' ? this.fromWhatsApp : this.fromSms;
    const target = channel === 'whatsapp' ? `whatsapp:${to}` : to;
    try {
      const result = await this.client.messages.create({ body, from, to: target });
      this.logger.log(
        `Message sent to ${this.maskPhone(to)} via ${channel.toUpperCase()} (sid=${result.sid})`,
      );
      return { channel, ok: true, sid: result.sid };
    } catch (err) {
      const error = err as { code?: number | string; message?: string };
      this.logger.error(
        `Twilio send failed via ${channel.toUpperCase()} (code=${error.code ?? 'unknown'}): ${error.message ?? 'unknown error'}`,
      );
      return { channel, ok: false, errorCode: error.code };
    }
  }

  private buildInvitationBody(params: InvitationMessageParams): string {
    const { inviterDisplay, relationshipHint, inviteUrl, language } = params;
    const lang = language ?? 'fr';

    if (lang === 'en') {
      const rel = relationshipHint
        ? `your ${relationshipHint}, ${inviterDisplay}`
        : inviterDisplay;
      return `Origin: ${rel} added you to a family tree. Tap to join: ${inviteUrl}`;
    }

    const rel = relationshipHint
      ? `Ton/ta ${relationshipHint} ${inviterDisplay}`
      : inviterDisplay;
    return `Origin: ${rel} t'a ajoute(e) a un arbre familial. Clique pour rejoindre: ${inviteUrl}`;
  }

  private maskPhone(phone: string): string {
    if (phone.length < 7) return phone;
    return phone.substring(0, 7) + '****';
  }
}

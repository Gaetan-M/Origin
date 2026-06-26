import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

/**
 * Persistent object storage backed by Supabase Storage.
 *
 * GATED on env exactly like the LiveKit/Sentry pattern: when SUPABASE_URL or
 * SUPABASE_SERVICE_ROLE_KEY is unset the service is "not configured"
 * ({@link isConfigured} returns false) and the media module falls back to local
 * disk. So the app always builds and boots whether or not storage is wired.
 *
 * Server-side only — uses the SERVICE ROLE key, never exposed to clients.
 * Uploads go to a single bucket (SUPABASE_STORAGE_BUCKET, default "media");
 * make that bucket PUBLIC in Supabase so /media/:id/file can redirect to the
 * public CDN URL.
 */
@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private client: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  /** The bucket all media is stored in (also the marker stored on Media.s3Bucket). */
  get bucket(): string {
    return this.config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'media';
  }

  isConfigured(): boolean {
    return Boolean(this.url && this.serviceKey);
  }

  private get url(): string | undefined {
    return this.config.get<string>('SUPABASE_URL');
  }

  private get serviceKey(): string | undefined {
    return (
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
      this.config.get<string>('SUPABASE_SERVICE_KEY')
    );
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      this.client = createClient(this.url as string, this.serviceKey as string, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.client;
  }

  /** Upload raw bytes to the bucket at `key`. Throws on failure. */
  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await this.getClient()
      .storage.from(this.bucket)
      .upload(key, body, { contentType, upsert: true });
    if (error) {
      this.logger.error(`Supabase Storage upload failed for ${key}: ${error.message}`);
      throw error;
    }
  }

  /** Public CDN URL for an object (requires the bucket to be public). */
  getPublicUrl(key: string): string {
    return this.getClient().storage.from(this.bucket).getPublicUrl(key).data
      .publicUrl;
  }
}

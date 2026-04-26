import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Service for document number encryption/decryption.
 *
 * In development, uses a mock KMS implementation with AES-256-GCM
 * and a static key from environment variables.
 *
 * In production, this should be swapped for actual AWS KMS calls.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly hashSalt: string;
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    // Salt for SHA-256 hashing of document numbers
    this.hashSalt = this.configService.get<string>(
      'DOCUMENT_HASH_SALT_BASE',
      'dev-document-hash-salt-base-change-in-production',
    );

    // Derive a 32-byte key from KMS_KEY_ID for local AES-256-GCM encryption
    // In production, this would be replaced by actual AWS KMS Encrypt/Decrypt calls
    const kmsKeyId = this.configService.get<string>(
      'AWS_KMS_KEY_ID',
      'dev-local-kms-key-id-not-for-production',
    );
    this.encryptionKey = createHash('sha256').update(kmsKeyId).digest();

    this.logger.log('EncryptionService initialized (mock KMS mode)');
  }

  /**
   * Produces a SHA-256 hash of the document number with salt.
   * Used for duplicate detection without exposing the actual number.
   */
  hashDocumentNumber(documentNumber: string): string {
    const normalized = documentNumber.replace(/[\s-]/g, '').toUpperCase();
    return createHash('sha256')
      .update(`${this.hashSalt}:${normalized}`)
      .digest('hex');
  }

  /**
   * Encrypts a document number using AES-256-GCM.
   * Returns a base64 string containing IV + auth tag + ciphertext.
   */
  async encryptDocumentNumber(documentNumber: string): Promise<string> {
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(documentNumber, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Pack as: IV (12 bytes) + authTag (16 bytes) + ciphertext
    const packed = Buffer.concat([iv, authTag, encrypted]);
    return packed.toString('base64');
  }

  /**
   * Decrypts a document number from the base64 format produced by encryptDocumentNumber.
   */
  async decryptDocumentNumber(encryptedBase64: string): Promise<string> {
    const packed = Buffer.from(encryptedBase64, 'base64');

    // Extract IV (12 bytes), authTag (16 bytes), ciphertext (rest)
    const iv = packed.subarray(0, 12);
    const authTag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Extracts the last 4 characters of the document number for display purposes.
   * Returns fewer characters if the document number is shorter than 4 characters.
   */
  extractLast4(documentNumber: string): string {
    const normalized = documentNumber.replace(/[\s-]/g, '').toUpperCase();
    return normalized.slice(-4);
  }
}

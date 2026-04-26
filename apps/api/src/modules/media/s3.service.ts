import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const region =
      this.configService.get<string>('S3_REGION') ||
      this.configService.get<string>('aws.region', 'af-south-1');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );

    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region,
    };

    // In dev local, use LocalStack endpoint
    if (endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = true;
      this.logger.log(`S3 configured with custom endpoint: ${endpoint}`);
    }

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.s3Client = new S3Client(clientConfig);
    this.logger.log(`S3Service initialized (region=${region})`);
  }

  /**
   * Generate a presigned PUT URL for uploading an object to S3.
   */
  async getPresignedUploadUrl(
    bucket: string,
    key: string,
    mimeType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    this.logger.debug(
      `Presigned upload URL generated: bucket=${bucket}, key=${key}`,
    );
    return url;
  }

  /**
   * Generate a presigned GET URL for downloading an object from S3.
   */
  async getPresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    this.logger.debug(
      `Presigned download URL generated: bucket=${bucket}, key=${key}`,
    );
    return url;
  }

  /**
   * Delete an object from S3.
   */
  async deleteObject(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.log(`Object deleted: bucket=${bucket}, key=${key}`);
  }

  /**
   * Get object metadata (head) from S3.
   * Returns null if the object does not exist.
   */
  async headObject(
    bucket: string,
    key: string,
  ): Promise<HeadObjectCommandOutput | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      this.logger.debug(
        `HeadObject success: bucket=${bucket}, key=${key}, size=${response.ContentLength}`,
      );
      return response;
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotFound' || err.name === 'NoSuchKey') {
        this.logger.debug(
          `HeadObject not found: bucket=${bucket}, key=${key}`,
        );
        return null;
      }
      throw error;
    }
  }
}

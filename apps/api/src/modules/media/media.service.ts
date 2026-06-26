import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createReadStream, type ReadStream } from 'fs';
import { mkdir, writeFile, stat } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from './s3.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { RequestUploadUrlDto, MediaPurpose } from './dto/upload-media.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly bucketPhotos: string;
  private readonly bucketDocuments: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly supabaseStorage: SupabaseStorageService,
  ) {
    this.bucketPhotos = this.configService.get<string>(
      's3.bucketPhotos',
      'genealogie-photos-public',
    );
    this.bucketDocuments = this.configService.get<string>(
      's3.bucketDocuments',
      'genealogie-documents-private',
    );
  }

  /**
   * Generate a presigned upload URL and create a pending media record.
   */
  async requestUploadUrl(
    dto: RequestUploadUrlDto,
    accountId: string,
  ): Promise<{ uploadUrl: string; mediaId: string; s3Key: string }> {
    const mediaId = randomUUID();
    const bucket = this.determineBucket(dto.purpose);
    const fileType = this.determineFileType(dto.purpose);
    const extension = this.extractExtension(dto.fileName);
    const s3Key = this.generateS3Key(dto.purpose, mediaId, extension);

    // Create pending media record in DB
    await this.prisma.media.create({
      data: {
        id: mediaId,
        fileType,
        mimeType: dto.mimeType,
        s3Bucket: bucket,
        s3Key,
        isEncrypted: dto.purpose === MediaPurpose.DOCUMENT_SCAN,
        uploadedByAccountId: accountId,
      },
    });

    // Generate presigned upload URL
    const uploadUrl = await this.s3Service.getPresignedUploadUrl(
      bucket,
      s3Key,
      dto.mimeType,
      3600, // 1 hour
    );

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'media',
        entityId: mediaId,
        action: 'REQUEST_UPLOAD',
        newValue: {
          fileName: dto.fileName,
          mimeType: dto.mimeType,
          purpose: dto.purpose,
          s3Key,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Upload URL requested: mediaId=${mediaId}, purpose=${dto.purpose}, account=${accountId}`,
    );

    return { uploadUrl, mediaId, s3Key };
  }

  /**
   * Upload a file directly via multipart/form-data. Persists the bytes to
   * local disk (dev default) or S3 (when configured), creates the Media
   * record, and — when purpose is PROFILE_PHOTO and personId is supplied —
   * attaches it as the person's primary photo.
   *
   * This is the path used by the web UI because it avoids the CORS and
   * bucket-provisioning requirements of the presigned-URL flow.
   */
  async uploadDirect(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    purpose: MediaPurpose,
    personId: string | undefined,
    accountId: string,
    options?: { photoYear?: number; setAsPrimary?: boolean },
  ): Promise<{
    id: string;
    url: string;
    personId: string | null;
    photoYear: number | null;
    isPrimary: boolean;
  }> {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException('No file uploaded');
    }

    const mediaId = randomUUID();
    const fileType = this.determineFileType(purpose);
    const extension = this.extractExtension(file.originalname);
    const s3Key = this.generateS3Key(purpose, mediaId, extension);

    // Persist the bytes. Prefer Supabase Storage (durable object storage) when
    // configured; otherwise fall back to the local disk (dev / unconfigured).
    // The chosen bucket name is stored on the Media row so the serve path knows
    // where to read from. The on-disk layout mirrors s3Key either way.
    let bucket: string;
    if (this.supabaseStorage.isConfigured()) {
      bucket = this.supabaseStorage.bucket;
      await this.supabaseStorage.upload(s3Key, file.buffer, file.mimetype);
    } else {
      bucket = this.determineBucket(purpose);
      const diskPath = join(this.getStorageRoot(), s3Key);
      await mkdir(dirname(diskPath), { recursive: true });
      await writeFile(diskPath, file.buffer);
    }

    let attachedPersonId: string | null = null;
    if (personId) {
      const person = await this.prisma.person.findUnique({
        where: { id: personId },
        select: { id: true, deletedAt: true },
      });
      if (!person || person.deletedAt) {
        throw new NotFoundException('Person not found');
      }
      attachedPersonId = personId;
    }

    // If the caller did not specify when the photo was taken, default it
    // to the upload year — a safe guess that users can later correct.
    const resolvedPhotoYear =
      options?.photoYear ?? new Date().getFullYear();

    await this.prisma.media.create({
      data: {
        id: mediaId,
        fileType,
        mimeType: file.mimetype,
        fileSizeBytes: BigInt(file.size),
        s3Bucket: bucket,
        s3Key,
        isEncrypted: purpose === MediaPurpose.DOCUMENT_SCAN,
        uploadedByAccountId: accountId,
        personId: attachedPersonId,
        photoYear: resolvedPhotoYear,
      },
    });

    // For a profile photo, promote as primary unless the caller opts out.
    const shouldBePrimary =
      purpose === MediaPurpose.PROFILE_PHOTO &&
      !!attachedPersonId &&
      options?.setAsPrimary !== false;
    if (shouldBePrimary && attachedPersonId) {
      await this.prisma.person.update({
        where: { id: attachedPersonId },
        data: {
          primaryPhotoId: mediaId,
          hasPhoto: true,
          updatedByAccountId: accountId,
        },
      });
    }

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'media',
        entityId: mediaId,
        action: 'UPLOAD',
        newValue: {
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          purpose,
          personId: attachedPersonId,
          photoYear: resolvedPhotoYear,
          setAsPrimary: shouldBePrimary,
          s3Key,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Direct upload stored: mediaId=${mediaId}, purpose=${purpose}, size=${file.size}, account=${accountId}`,
    );

    return {
      id: mediaId,
      url: `/media/${mediaId}/file`,
      personId: attachedPersonId,
      photoYear: resolvedPhotoYear,
      isPrimary: shouldBePrimary,
    };
  }

  /**
   * List every photo attached to a person, newest first. Also marks which
   * one is currently the person's primary photo so the UI can highlight it.
   */
  async listForPerson(
    personId: string,
  ): Promise<
    Array<{
      id: string;
      url: string;
      photoYear: number | null;
      isPrimary: boolean;
      createdAt: Date;
    }>
  > {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, deletedAt: true, primaryPhotoId: true },
    });
    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }

    const rows = await this.prisma.media.findMany({
      where: {
        personId,
        deletedAt: null,
        fileType: 'profile_photo',
      },
      orderBy: [{ photoYear: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        photoYear: true,
        createdAt: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      url: `/media/${r.id}/file`,
      photoYear: r.photoYear,
      isPrimary: person.primaryPhotoId === r.id,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Update editable metadata on a media record. Currently supports the
   * photo year and promoting a photo as the owning person's primary.
   */
  async updateMetadata(
    mediaId: string,
    accountId: string,
    dto: { photoYear?: number | null; setAsPrimary?: boolean },
  ): Promise<{
    id: string;
    photoYear: number | null;
    isPrimary: boolean;
  }> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });
    if (!media || media.deletedAt) {
      throw new NotFoundException('Media not found');
    }
    if (media.uploadedByAccountId !== accountId) {
      throw new ForbiddenException('You can only edit your own media');
    }

    const updates: Prisma.MediaUpdateInput = {};
    if (dto.photoYear !== undefined) {
      updates.photoYear = dto.photoYear;
    }
    if (Object.keys(updates).length > 0) {
      await this.prisma.media.update({ where: { id: mediaId }, data: updates });
    }

    let isPrimary = false;
    if (dto.setAsPrimary && media.personId) {
      await this.prisma.person.update({
        where: { id: media.personId },
        data: {
          primaryPhotoId: mediaId,
          hasPhoto: true,
          updatedByAccountId: accountId,
        },
      });
      isPrimary = true;
    } else if (media.personId) {
      const person = await this.prisma.person.findUnique({
        where: { id: media.personId },
        select: { primaryPhotoId: true },
      });
      isPrimary = person?.primaryPhotoId === mediaId;
    }

    const latest = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: { photoYear: true },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'media',
        entityId: mediaId,
        action: 'UPDATE',
        newValue: {
          photoYear: latest?.photoYear ?? null,
          setAsPrimary: !!dto.setAsPrimary,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: mediaId,
      photoYear: latest?.photoYear ?? null,
      isPrimary,
    };
  }

  /**
   * Open a read stream to the stored media bytes. Used by the public
   * streaming endpoint to serve profile photos to <img> tags without the
   * browser needing an auth header.
   */
  async openFileStream(
    id: string,
  ): Promise<
    | { redirectUrl: string }
    | { stream: ReadStream; mimeType: string | null; size: number }
  > {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media || media.deletedAt) {
      throw new NotFoundException('Media not found');
    }

    // Stored in Supabase Storage -> redirect the caller to the public CDN URL.
    if (
      this.supabaseStorage.isConfigured() &&
      media.s3Bucket === this.supabaseStorage.bucket
    ) {
      return { redirectUrl: this.supabaseStorage.getPublicUrl(media.s3Key) };
    }

    // Otherwise stream from local disk.
    const diskPath = join(this.getStorageRoot(), media.s3Key);
    const info = await stat(diskPath).catch(() => null);
    if (!info) {
      throw new NotFoundException('File missing on disk');
    }

    return {
      stream: createReadStream(diskPath),
      mimeType: media.mimeType,
      size: info.size,
    };
  }

  /**
   * Root directory for local media storage. Resolved relative to the API
   * process cwd so it lives alongside the running service.
   */
  private getStorageRoot(): string {
    return resolve(process.cwd(), 'storage');
  }

  /**
   * Confirm that a file has been uploaded to S3 and update the media record.
   */
  async confirmUpload(
    mediaId: string,
    accountId: string,
  ): Promise<{ id: string; fileSizeBytes: bigint | null; confirmed: boolean }> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException('Media record not found');
    }

    if (media.uploadedByAccountId !== accountId) {
      throw new ForbiddenException(
        'You can only confirm uploads for your own media',
      );
    }

    // Verify the object exists in S3
    const headResult = await this.s3Service.headObject(
      media.s3Bucket,
      media.s3Key,
    );

    if (!headResult) {
      throw new BadRequestException(
        'File not found in storage. Please upload the file first.',
      );
    }

    const fileSizeBytes = headResult.ContentLength
      ? BigInt(headResult.ContentLength)
      : null;

    // Update media record with actual file size
    await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        fileSizeBytes,
      },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'media',
        entityId: mediaId,
        action: 'CONFIRM_UPLOAD',
        newValue: {
          fileSizeBytes: fileSizeBytes?.toString() ?? null,
          contentType: headResult.ContentType ?? null,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Future phases: trigger post-processing (resize, OCR, etc.)
    this.logger.log(
      `Upload confirmed: mediaId=${mediaId}, size=${fileSizeBytes}, account=${accountId}. Post-processing will be implemented in future phases.`,
    );

    return { id: mediaId, fileSizeBytes, confirmed: true };
  }

  /**
   * Get a media record by ID with a CDN or presigned download URL.
   */
  async findOne(
    id: string,
  ): Promise<{
    id: string;
    fileType: string;
    mimeType: string | null;
    fileSizeBytes: bigint | null;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    url: string;
    createdAt: Date;
  }> {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException('Media not found');
    }

    // Use CDN URL if available, otherwise generate a presigned download URL
    let url: string;
    if (media.cdnUrl) {
      url = media.cdnUrl;
    } else {
      url = await this.s3Service.getPresignedDownloadUrl(
        media.s3Bucket,
        media.s3Key,
        3600,
      );
    }

    return {
      id: media.id,
      fileType: media.fileType,
      mimeType: media.mimeType,
      fileSizeBytes: media.fileSizeBytes,
      width: media.width,
      height: media.height,
      durationSeconds: media.durationSeconds,
      url,
      createdAt: media.createdAt,
    };
  }

  /**
   * Get a private download URL for a document. Verifies ownership.
   */
  async getPrivateUrl(
    id: string,
    accountId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException('Media not found');
    }

    // For private documents, only the uploader can access
    if (media.uploadedByAccountId !== accountId) {
      throw new ForbiddenException(
        'You do not have permission to access this media',
      );
    }

    const expiresInSeconds = 900; // 15 minutes for private documents
    const url = await this.s3Service.getPresignedDownloadUrl(
      media.s3Bucket,
      media.s3Key,
      expiresInSeconds,
    );

    this.logger.debug(
      `Private URL generated: mediaId=${id}, account=${accountId}`,
    );

    return { url, expiresInSeconds };
  }

  /**
   * Soft delete a media record and schedule S3 cleanup.
   */
  async softDelete(
    id: string,
    accountId: string,
  ): Promise<{ message: string }> {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException('Media not found');
    }

    if (media.uploadedByAccountId !== accountId) {
      throw new ForbiddenException('You can only delete your own media');
    }

    // Soft delete the record
    await this.prisma.media.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'media',
        entityId: id,
        action: 'SOFT_DELETE',
        newValue: {
          s3Bucket: media.s3Bucket,
          s3Key: media.s3Key,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Schedule S3 cleanup (in a production system, this would be a background job)
    // For now, log the intent. Actual deletion from S3 should happen via a scheduled job
    // that processes soft-deleted media records after a retention period.
    this.logger.log(
      `Media soft-deleted: mediaId=${id}, account=${accountId}. S3 object at bucket=${media.s3Bucket}, key=${media.s3Key} scheduled for cleanup.`,
    );

    return { message: 'Media deleted successfully' };
  }

  /**
   * Determine the S3 bucket based on the media purpose.
   */
  private determineBucket(purpose: MediaPurpose): string {
    switch (purpose) {
      case MediaPurpose.PROFILE_PHOTO:
      case MediaPurpose.MEMORIAL_MEDIA:
        return this.bucketPhotos;
      case MediaPurpose.DOCUMENT_SCAN:
        return this.bucketDocuments;
      default:
        return this.bucketPhotos;
    }
  }

  /**
   * Determine the file type string from the media purpose.
   */
  private determineFileType(purpose: MediaPurpose): string {
    switch (purpose) {
      case MediaPurpose.PROFILE_PHOTO:
        return 'profile_photo';
      case MediaPurpose.DOCUMENT_SCAN:
        return 'document_scan';
      case MediaPurpose.MEMORIAL_MEDIA:
        return 'memorial_media';
      case MediaPurpose.ALBUM_MEDIA:
        return 'album_media';
      case MediaPurpose.CONTRIBUTED_MEDIA:
        return 'contributed_media';
      default:
        return 'other';
    }
  }

  /**
   * Extract the file extension from a filename.
   */
  private extractExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) {
      return '';
    }
    return fileName.substring(dotIndex).toLowerCase();
  }

  /**
   * Generate a structured S3 key for the media file.
   * Format: <purpose-folder>/<year>/<month>/<mediaId><extension>
   */
  private generateS3Key(
    purpose: MediaPurpose,
    mediaId: string,
    extension: string,
  ): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    let folder: string;
    switch (purpose) {
      case MediaPurpose.PROFILE_PHOTO:
        folder = 'profile-photos';
        break;
      case MediaPurpose.DOCUMENT_SCAN:
        folder = 'document-scans';
        break;
      case MediaPurpose.MEMORIAL_MEDIA:
        folder = 'memorial-media';
        break;
      case MediaPurpose.ALBUM_MEDIA:
        folder = 'album-media';
        break;
      case MediaPurpose.CONTRIBUTED_MEDIA:
        folder = 'contributed-media';
        break;
      default:
        folder = 'other';
    }

    return `${folder}/${year}/${month}/${mediaId}${extension}`;
  }
}

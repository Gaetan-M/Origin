import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  controllers: [MediaController],
  providers: [S3Service, SupabaseStorageService, MediaService],
  exports: [MediaService, S3Service],
})
export class MediaModule {}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { MediaService } from './media.service';
import {
  RequestUploadUrlDto,
  DirectUploadDto,
  UpdateMediaDto,
  MediaPurpose,
} from './dto/upload-media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';
import { Public } from '../../common/decorators/public.decorator';

type UploadedMulterFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB
const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a file directly (multipart/form-data).',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async uploadDirect(
    @UploadedFile() file: UploadedMulterFile,
    @Body() dto: DirectUploadDto,
    @CurrentAccount('id') accountId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided under field "file"');
    }
    if (
      dto.purpose === MediaPurpose.PROFILE_PHOTO &&
      !ALLOWED_IMAGE_MIME.has(file.mimetype)
    ) {
      throw new BadRequestException(
        'Profile photo must be JPEG, PNG, WebP, or GIF',
      );
    }
    return this.mediaService.uploadDirect(
      file,
      dto.purpose,
      dto.personId,
      accountId,
      { photoYear: dto.photoYear, setAsPrimary: dto.setAsPrimary },
    );
  }

  @Get('by-person/:personId')
  @ApiOperation({ summary: 'List every photo attached to a person.' })
  listForPerson(@Param('personId', ParseUUIDPipe) personId: string) {
    return this.mediaService.listForPerson(personId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update editable metadata on a media record.' })
  updateMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.mediaService.updateMetadata(id, accountId, dto);
  }

  @Get(':id/file')
  @Public()
  @ApiOperation({ summary: 'Stream the stored media bytes (public).' })
  async streamFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, size } = await this.mediaService.openFileStream(id);
    if (mimeType) res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', size.toString());
    res.setHeader('Cache-Control', 'public, max-age=300');
    // Helmet defaults Cross-Origin-Resource-Policy to same-origin, which
    // blocks the web app on localhost:3000 from embedding media served
    // from localhost:3001. Profile photos are meant to be public, so
    // override to cross-origin on this endpoint only.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    stream.pipe(res);
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Request a presigned URL for file upload' })
  requestUploadUrl(
    @Body() dto: RequestUploadUrlDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.mediaService.requestUploadUrl(dto, accountId);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm that a file has been uploaded to S3' })
  confirmUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.mediaService.confirmUpload(id, accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media info and download URL' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findOne(id);
  }

  @Get(':id/private')
  @ApiOperation({
    summary: 'Get a private download URL for a document (owner only)',
  })
  getPrivateUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.mediaService.getPrivateUrl(id, accountId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a media record' })
  softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.mediaService.softDelete(id, accountId);
  }
}

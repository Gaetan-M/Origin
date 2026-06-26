import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AlbumsService } from './albums.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AddAlbumItemDto } from './dto/add-album-item.dto';
import { SetAlbumVisibilityDto } from './dto/set-album-visibility.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * Albums REST surface (Phase 4 — Living Memory).
 *
 * All routes require authentication. Mutations are owner-only (enforced in the
 * service). Reads enforce the visibility model in the service: PRIVATE_SELF
 * owner-only, FAMILY degree-bounded against the subject person, PUBLIC open.
 */
@ApiTags('Albums')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Create an album (PRIVATE_SELF by default)' })
  createAlbum(
    @Body() dto: CreateAlbumDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.albumsService.createAlbum(accountId, dto);
  }

  @Get('person/:personId')
  @ApiOperation({ summary: 'List visible albums about a person' })
  @ApiParam({ name: 'personId', format: 'uuid' })
  listAlbumsForPerson(
    @Param('personId', new ParseUUIDPipe({ version: '4' })) personId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.albumsService.listAlbumsForPerson(personId, accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an album with its ordered timeline' })
  @ApiParam({ name: 'id', format: 'uuid' })
  getAlbum(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.albumsService.getAlbum(id, accountId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update album metadata (owner-only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  updateAlbum(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateAlbumDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.albumsService.updateAlbum(id, accountId, dto);
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: 'Opt-in publish: change album visibility (owner-only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  setVisibility(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: SetAlbumVisibilityDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.albumsService.setVisibility(id, accountId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an album (owner-only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async deleteAlbum(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentAccount('id') accountId: string,
  ): Promise<void> {
    await this.albumsService.deleteAlbum(id, accountId);
  }

  @Post(':id/items')
  @Throttle({ default: { limit: 120, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Append a media item to the album timeline (owner-only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  addItem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AddAlbumItemDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.albumsService.addItem(id, accountId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a timeline item (owner-only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  async removeItem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @CurrentAccount('id') accountId: string,
  ): Promise<void> {
    await this.albumsService.removeItem(id, itemId, accountId);
  }
}

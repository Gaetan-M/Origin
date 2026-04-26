import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';
import { PersonsService } from '../persons/persons.service';
import { CreateParentChildDto } from './dto/create-parent-child.dto';
import { CreateUnionDto } from './dto/create-union.dto';
import { UpdateUnionDto } from './dto/update-union.dto';
import { AddUnionPartnerDto } from './dto/add-union-partner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

@ApiTags('Relationships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relationships')
export class RelationshipsController {
  constructor(
    private readonly relationshipsService: RelationshipsService,
    private readonly personsService: PersonsService,
  ) {}

  @Post('parent-child')
  @ApiOperation({ summary: 'Create a parent-child relationship' })
  createParentChild(
    @Body() dto: CreateParentChildDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.relationshipsService.createParentChild(dto, accountId);
  }

  @Delete('parent-child/:id')
  @ApiOperation({ summary: 'Delete a parent-child relationship' })
  deleteParentChild(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.relationshipsService.deleteParentChild(id, accountId);
  }

  @Post('unions')
  @ApiOperation({ summary: 'Create a union' })
  createUnion(@Body() dto: CreateUnionDto, @CurrentAccount('id') accountId: string) {
    return this.relationshipsService.createUnion(dto, accountId);
  }

  @Delete('unions/:id')
  @ApiOperation({ summary: 'Delete a union' })
  deleteUnion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.relationshipsService.deleteUnion(id, accountId);
  }

  @Patch('unions/:id')
  @ApiOperation({ summary: 'Update union details' })
  updateUnion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnionDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.relationshipsService.updateUnion(id, dto, accountId);
  }

  @Post('unions/:id/partners')
  @ApiOperation({ summary: 'Add a partner to an existing union' })
  addPartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddUnionPartnerDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.relationshipsService.addPartner(id, dto, accountId);
  }

  @Delete('unions/:id/partners/:partnerId')
  @ApiOperation({ summary: 'Remove a partner from a union' })
  removePartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.relationshipsService.removePartner(id, partnerId, accountId);
  }

  @Get('all-unions/:personId')
  @ApiOperation({ summary: 'Get all unions for a person (past and present)' })
  async getAllUnions(
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    await this.assertViewable(personId, accountId);
    return this.relationshipsService.getAllUnions(personId);
  }

  @Get('parents/:personId')
  @ApiOperation({ summary: 'Get parents of a person' })
  async getParents(
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    await this.assertViewable(personId, accountId);
    return this.relationshipsService.getParents(personId);
  }

  @Get('children/:personId')
  @ApiOperation({ summary: 'Get children of a person' })
  async getChildren(
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    await this.assertViewable(personId, accountId);
    return this.relationshipsService.getChildren(personId);
  }

  @Get('siblings/:personId')
  @ApiOperation({ summary: 'Get siblings of a person' })
  async getSiblings(
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    await this.assertViewable(personId, accountId);
    return this.relationshipsService.getSiblings(personId);
  }

  @Get('spouses/:personId')
  @ApiOperation({ summary: 'Get spouses of a person' })
  async getSpouses(
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    await this.assertViewable(personId, accountId);
    return this.relationshipsService.getSpouses(personId);
  }

  /**
   * Reuses PersonsService.findOne which enforces the visibility policy. We
   * just need the side-effect (404 if not visible) — the returned object is
   * discarded.
   */
  private async assertViewable(personId: string, accountId: string): Promise<void> {
    await this.personsService.findOne(personId, accountId);
  }
}

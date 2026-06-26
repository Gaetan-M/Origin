import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LearningLevel, type LearningLesson, type LessonEnrollment } from '@prisma/client';
import {
  LearningService,
  type EnrichedLesson,
  type LearningLessonPage,
} from './learning.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * Authoring + enrollment API for the PUBLIC learning world (language/culture
 * mini-lessons).
 *
 * No endpoint here returns or accepts any family-graph data — the learning
 * world is fully isolated from the private family graph.
 */
@ApiTags('Learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning/lessons')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post()
  @ApiOperation({
    summary:
      'Author a lesson (auto-approved for verified authorities, otherwise PENDING moderation)',
  })
  createLesson(
    @CurrentAccount('id') accountId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<LearningLesson> {
    return this.learningService.createLesson(accountId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List APPROVED public lessons, optionally filtered by language and level',
  })
  @ApiQuery({ name: 'languageCode', required: false })
  @ApiQuery({ name: 'level', required: false, enum: LearningLevel })
  listLessons(
    @CurrentAccount('id') accountId: string,
    @Query('languageCode') languageCode?: string,
    @Query('level') level?: LearningLevel,
  ): Promise<LearningLessonPage> {
    return this.learningService.listLessons({ languageCode, level }, accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single lesson by id' })
  getLesson(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<EnrichedLesson> {
    return this.learningService.getLesson(id, accountId);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll the current account into a lesson (idempotent)' })
  enroll(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LessonEnrollment> {
    return this.learningService.enroll(id, accountId);
  }

  @Post(':id/progress')
  @Patch(':id/progress')
  @ApiOperation({
    summary: 'Update progress for an enrolled lesson (100% marks it completed)',
  })
  updateProgress(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<LessonEnrollment> {
    return this.learningService.updateProgress(id, accountId, dto.progressPercent);
  }
}

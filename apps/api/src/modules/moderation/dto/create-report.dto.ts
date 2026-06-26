import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationTargetType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Body for `POST /moderation/reports`.
 *
 * Any authenticated account may flag a piece of public content. The report
 * carries only the target coordinates and a free-text reason — it never
 * references family-graph data.
 */
export class CreateReportDto {
  @ApiProperty({
    enum: ModerationTargetType,
    description: 'Which kind of entity is being reported.',
  })
  @IsEnum(ModerationTargetType)
  targetType: ModerationTargetType;

  @ApiProperty({
    format: 'uuid',
    description: 'Identifier of the reported entity.',
  })
  @IsUUID()
  targetId: string;

  @ApiProperty({
    maxLength: 50,
    description: 'Short machine-friendly reason code (e.g. SPAM, HATE).',
  })
  @IsString()
  @MaxLength(50)
  reason: string;

  @ApiPropertyOptional({
    description: 'Optional free-text context supplied by the reporter.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}

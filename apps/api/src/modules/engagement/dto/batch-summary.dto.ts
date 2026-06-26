import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsUUID } from 'class-validator';
import { ENGAGEMENT_TARGET_PARAMS, EngagementTargetParam } from './target-type.util';

export class BatchSummaryDto {
  @ApiProperty({
    enum: ENGAGEMENT_TARGET_PARAMS,
    description: 'Target type / Type de cible',
    example: 'tourism-place',
  })
  @IsIn(ENGAGEMENT_TARGET_PARAMS)
  targetType!: EngagementTargetParam;

  @ApiProperty({
    description: 'Target ids (max 100) / Identifiants des cibles',
    type: [String],
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];
}

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemorialTributeKind, VisibilityScope } from '@prisma/client';

/**
 * Leave a tribute on a person who has passed away.
 *
 * Tributes are acts of remembrance — a lit candle, a written memory, a shared
 * photograph or video. They are only permitted on a Person whose
 * life_status = DECEASED (enforced in the service, not here).
 *
 * Validation rules layered on top of these constraints (enforced in the
 * service so the domain message stays respectful):
 *   - MESSAGE        -> `message` is required.
 *   - PHOTO / VIDEO  -> `mediaId` is required.
 *   - CANDLE         -> neither is required (a silent candle is valid).
 */
export class CreateTributeDto {
  @ApiProperty({
    enum: MemorialTributeKind,
    description: 'The form of remembrance: candle, message, photo or video',
  })
  @IsEnum(MemorialTributeKind)
  kind: MemorialTributeKind;

  @ApiPropertyOptional({
    description: 'A written memory or words of remembrance',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional({
    description: 'Id of an existing Media item (photo or video tribute)',
  })
  @IsOptional()
  @IsUUID('4')
  mediaId?: string;

  @ApiPropertyOptional({
    enum: VisibilityScope,
    default: VisibilityScope.FAMILY,
    description: 'Who may see this tribute. Defaults to FAMILY.',
  })
  @IsOptional()
  @IsEnum(VisibilityScope)
  visibilityScope?: VisibilityScope;

  @ApiPropertyOptional({
    description:
      'Max family-graph degree from the deceased when visibilityScope = FAMILY',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  visibleMaxDegree?: number;
}

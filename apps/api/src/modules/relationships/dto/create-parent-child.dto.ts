import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParentRelationshipType } from '@prisma/client';

export class CreateParentChildDto {
  @ApiProperty()
  @IsUUID()
  parentId: string;

  @ApiProperty()
  @IsUUID()
  childId: string;

  @ApiPropertyOptional({ enum: ParentRelationshipType })
  @IsOptional()
  @IsEnum(ParentRelationshipType)
  relationshipType?: ParentRelationshipType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

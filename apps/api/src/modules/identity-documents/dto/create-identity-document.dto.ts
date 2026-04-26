import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class CreateIdentityDocumentDto {
  @ApiProperty({ description: 'ID of the person this document belongs to' })
  @IsUUID()
  personId: string;

  @ApiProperty({ enum: DocumentType, description: 'Type of identity document' })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'Raw document number - will be hashed and encrypted' })
  @IsString()
  @MaxLength(50)
  documentNumber: string;

  @ApiPropertyOptional({ description: 'Authority that issued the document' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingAuthority?: string;

  @ApiPropertyOptional({ description: 'Place where the document was issued' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingPlace?: string;

  @ApiPropertyOptional({ description: 'Date the document was issued (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ description: 'Date the document expires (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

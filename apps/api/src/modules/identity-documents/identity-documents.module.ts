import { Module } from '@nestjs/common';
import { IdentityDocumentsController } from './identity-documents.controller';
import { IdentityDocumentsService } from './identity-documents.service';
import { EncryptionService } from './encryption.service';
import { DocumentValidatorService } from './document-validator.service';

@Module({
  controllers: [IdentityDocumentsController],
  providers: [
    IdentityDocumentsService,
    EncryptionService,
    DocumentValidatorService,
  ],
  exports: [IdentityDocumentsService, EncryptionService],
})
export class IdentityDocumentsModule {}

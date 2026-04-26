import { Injectable, BadRequestException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';

/**
 * Validates document number formats and date coherence for identity documents.
 */
@Injectable()
export class DocumentValidatorService {
  /**
   * Validates the document number format based on the document type.
   * Throws BadRequestException if the format is invalid.
   */
  validateDocumentNumber(documentType: DocumentType, documentNumber: string): void {
    const normalized = documentNumber.replace(/[\s-]/g, '');

    if (!normalized || normalized.length === 0) {
      throw new BadRequestException('Document number cannot be empty');
    }

    switch (documentType) {
      case DocumentType.CNI_CAMEROUN:
        this.validateCniCameroun(normalized);
        break;

      case DocumentType.PASSPORT_CAMEROUN:
        this.validatePassportCameroun(normalized);
        break;

      case DocumentType.PASSPORT_FOREIGN:
        this.validatePassportForeign(normalized);
        break;

      case DocumentType.ACTE_NAISSANCE:
      case DocumentType.CARTE_CONSULAIRE:
      case DocumentType.PERMIS_CONDUIRE:
      case DocumentType.CARTE_ELECTEUR:
      case DocumentType.CARTE_SCOLAIRE:
      case DocumentType.OTHER:
        // Basic non-empty validation (already checked above)
        this.validateGeneric(normalized);
        break;

      default:
        throw new BadRequestException(`Unknown document type: ${documentType as string}`);
    }
  }

  /**
   * Validates that issue date is before expiry date when both are provided.
   * Throws BadRequestException if dates are incoherent.
   */
  validateDateCoherence(issueDate?: string, expiryDate?: string): void {
    if (issueDate && expiryDate) {
      const issue = new Date(issueDate);
      const expiry = new Date(expiryDate);

      if (isNaN(issue.getTime())) {
        throw new BadRequestException('Invalid issue date format');
      }
      if (isNaN(expiry.getTime())) {
        throw new BadRequestException('Invalid expiry date format');
      }
      if (issue >= expiry) {
        throw new BadRequestException('Issue date must be before expiry date');
      }
    }
  }

  /**
   * CNI Cameroun: 9 to 10 digits only.
   */
  private validateCniCameroun(number: string): void {
    const cniPattern = /^\d{9,10}$/;
    if (!cniPattern.test(number)) {
      throw new BadRequestException(
        'CNI Cameroun must be 9 to 10 digits (e.g., 123456789 or 1234567890)',
      );
    }
  }

  /**
   * Passport Cameroun: alphanumeric, 8 to 9 characters.
   */
  private validatePassportCameroun(number: string): void {
    const passportPattern = /^[A-Za-z0-9]{8,9}$/;
    if (!passportPattern.test(number)) {
      throw new BadRequestException(
        'Passeport Cameroun must be 8 to 9 alphanumeric characters',
      );
    }
  }

  /**
   * Foreign passport: alphanumeric, 6 to 15 characters (broad range for international formats).
   */
  private validatePassportForeign(number: string): void {
    const foreignPassportPattern = /^[A-Za-z0-9]{6,15}$/;
    if (!foreignPassportPattern.test(number)) {
      throw new BadRequestException(
        'Foreign passport must be 6 to 15 alphanumeric characters',
      );
    }
  }

  /**
   * Generic validation for other document types: must be between 3 and 50 characters.
   */
  private validateGeneric(number: string): void {
    if (number.length < 3 || number.length > 50) {
      throw new BadRequestException(
        'Document number must be between 3 and 50 characters',
      );
    }
  }
}

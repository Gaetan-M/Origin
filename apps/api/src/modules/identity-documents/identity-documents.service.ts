import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  DocumentVerificationStatus,
  ClaimStatus,
  VerificationLevel,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { DocumentValidatorService } from './document-validator.service';
import { CreateIdentityDocumentDto } from './dto/create-identity-document.dto';

@Injectable()
export class IdentityDocumentsService {
  private readonly logger = new Logger(IdentityDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly documentValidator: DocumentValidatorService,
  ) {}

  /**
   * Creates a new identity document record.
   * Normalizes the document number, validates format, hashes it for duplicate detection,
   * encrypts it for secure storage, and creates an audit trail contribution.
   */
  async create(dto: CreateIdentityDocumentDto, accountId: string) {
    // Verify person exists and is not soft-deleted
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });
    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }

    // Validate document number format
    this.documentValidator.validateDocumentNumber(
      dto.documentType,
      dto.documentNumber,
    );

    // Validate date coherence
    this.documentValidator.validateDateCoherence(dto.issueDate, dto.expiryDate);

    // Hash document number for duplicate detection
    const documentNumberHash = this.encryptionService.hashDocumentNumber(
      dto.documentNumber,
    );

    // Check for duplicates by hash (same document type + same hash)
    const existingDocument = await this.prisma.identityDocument.findFirst({
      where: {
        documentNumberHash,
        documentType: dto.documentType,
        deletedAt: null,
      },
    });
    if (existingDocument) {
      throw new ConflictException(
        'A document with this number and type already exists in the system',
      );
    }

    // Encrypt document number for secure storage
    const documentNumberEncrypted =
      await this.encryptionService.encryptDocumentNumber(dto.documentNumber);

    // Extract last 4 characters for masked display
    const documentNumberLast4 = this.encryptionService.extractLast4(
      dto.documentNumber,
    );

    // Create the identity document record
    const identityDocument = await this.prisma.identityDocument.create({
      data: {
        personId: dto.personId,
        documentType: dto.documentType,
        documentNumberHash,
        documentNumberLast4,
        documentNumberEncrypted,
        issuingAuthority: dto.issuingAuthority ?? null,
        issuingPlace: dto.issuingPlace ?? null,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        verificationStatus: DocumentVerificationStatus.SELF_DECLARED,
        addedByAccountId: accountId,
      },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'identity_document',
        entityId: identityDocument.id,
        action: 'CREATE',
        newValue: {
          personId: dto.personId,
          documentType: dto.documentType,
          last4: documentNumberLast4,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Recalculate person verification level after adding a document
    await this.recalculatePersonVerificationLevel(dto.personId);

    this.logger.log(
      `Identity document created: id=${identityDocument.id}, person=${dto.personId}, type=${dto.documentType}`,
    );

    return {
      id: identityDocument.id,
      personId: identityDocument.personId,
      documentType: identityDocument.documentType,
      documentNumberLast4: identityDocument.documentNumberLast4,
      issuingAuthority: identityDocument.issuingAuthority,
      issuingPlace: identityDocument.issuingPlace,
      issueDate: identityDocument.issueDate,
      expiryDate: identityDocument.expiryDate,
      verificationStatus: identityDocument.verificationStatus,
      createdAt: identityDocument.createdAt,
    };
  }

  /**
   * Returns all identity documents for a given person with masked numbers.
   * Only shows document type, last 4 digits, and verification status.
   */
  async findByPerson(personId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });
    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }

    const documents = await this.prisma.identityDocument.findMany({
      where: {
        personId,
        deletedAt: null,
      },
      select: {
        id: true,
        personId: true,
        documentType: true,
        documentNumberLast4: true,
        issuingAuthority: true,
        issuingPlace: true,
        issueDate: true,
        expiryDate: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents;
  }

  /**
   * Reveals the full document number by decrypting it.
   * Only the owner of the claim on the person can reveal the number.
   * Logs the access in the contribution audit trail.
   */
  async reveal(id: string, accountId: string) {
    const document = await this.prisma.identityDocument.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            claimedByAccountId: true,
            createdByAccountId: true,
          },
        },
      },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException('Identity document not found');
    }

    // Authorization: only the claim owner or the person creator can reveal the number
    const isClaimOwner =
      document.person.claimedByAccountId === accountId;
    const isCreator =
      document.person.createdByAccountId === accountId;
    const isDocAdder = document.addedByAccountId === accountId;

    if (!isClaimOwner && !isCreator && !isDocAdder) {
      throw new ForbiddenException(
        'Only the claim owner, person creator, or document adder can reveal the document number',
      );
    }

    if (!document.documentNumberEncrypted) {
      throw new NotFoundException('No encrypted document number available');
    }

    const decryptedNumber = await this.encryptionService.decryptDocumentNumber(
      document.documentNumberEncrypted,
    );

    // Log access in audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'identity_document',
        entityId: id,
        action: 'REVEAL',
        newValue: {
          accessedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Document number revealed: docId=${id}, by account=${accountId}`,
    );

    return {
      id: document.id,
      personId: document.personId,
      documentType: document.documentType,
      documentNumber: decryptedNumber,
      documentNumberLast4: document.documentNumberLast4,
      issuingAuthority: document.issuingAuthority,
      issuingPlace: document.issuingPlace,
      issueDate: document.issueDate,
      expiryDate: document.expiryDate,
      verificationStatus: document.verificationStatus,
    };
  }

  /**
   * Admin verification: changes the document verification status to DOCUMENT_VERIFIED.
   * Recalculates the person's overall verification level afterwards.
   */
  async verify(id: string, accountId: string) {
    const document = await this.prisma.identityDocument.findUnique({
      where: { id },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException('Identity document not found');
    }

    if (
      document.verificationStatus ===
      DocumentVerificationStatus.DOCUMENT_VERIFIED
    ) {
      throw new ConflictException('Document is already verified');
    }

    if (
      document.verificationStatus ===
      DocumentVerificationStatus.ADMIN_VERIFIED
    ) {
      throw new ConflictException('Document is already admin-verified');
    }

    const previousStatus = document.verificationStatus;

    const updated = await this.prisma.identityDocument.update({
      where: { id },
      data: {
        verificationStatus: DocumentVerificationStatus.DOCUMENT_VERIFIED,
        verifiedByAccountId: accountId,
        verifiedAt: new Date(),
      },
      select: {
        id: true,
        personId: true,
        documentType: true,
        documentNumberLast4: true,
        verificationStatus: true,
        verifiedAt: true,
        issuingAuthority: true,
        issuingPlace: true,
        issueDate: true,
        expiryDate: true,
      },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'identity_document',
        entityId: id,
        action: 'VERIFY',
        oldValue: {
          verificationStatus: previousStatus,
        } as unknown as Prisma.InputJsonValue,
        newValue: {
          verificationStatus: DocumentVerificationStatus.DOCUMENT_VERIFIED,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Recalculate person verification level
    await this.recalculatePersonVerificationLevel(document.personId);

    this.logger.log(
      `Document verified: docId=${id}, person=${document.personId}, by account=${accountId}`,
    );

    return updated;
  }

  /**
   * Soft deletes an identity document by setting the deletedAt timestamp.
   * Never performs physical deletion.
   */
  async softDelete(id: string, accountId: string) {
    const document = await this.prisma.identityDocument.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            claimedByAccountId: true,
            createdByAccountId: true,
          },
        },
      },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException('Identity document not found');
    }

    // Authorization: only the claim owner, person creator, or document adder can delete
    const isClaimOwner =
      document.person.claimedByAccountId === accountId;
    const isCreator =
      document.person.createdByAccountId === accountId;
    const isDocAdder = document.addedByAccountId === accountId;

    if (!isClaimOwner && !isCreator && !isDocAdder) {
      throw new ForbiddenException(
        'Only the claim owner, person creator, or document adder can delete this document',
      );
    }

    await this.prisma.identityDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'identity_document',
        entityId: id,
        action: 'DELETE',
        oldValue: {
          documentType: document.documentType,
          personId: document.personId,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Recalculate person verification level after deleting a document
    await this.recalculatePersonVerificationLevel(document.personId);

    this.logger.log(
      `Document soft-deleted: docId=${id}, person=${document.personId}, by account=${accountId}`,
    );

    return { message: 'Identity document deleted' };
  }

  /**
   * Recalculates the verification level of a person based on their claims and documents.
   * This mirrors the logic in ClaimsService.recalculateVerificationLevel.
   */
  private async recalculatePersonVerificationLevel(
    personId: string,
  ): Promise<void> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        claims: { where: { status: ClaimStatus.VERIFIED } },
        identityDocuments: { where: { deletedAt: null } },
      },
    });

    if (!person) return;

    let level: VerificationLevel = VerificationLevel.UNVERIFIED;

    const hasVerifiedClaim = person.claims.length > 0;
    const hasVerifiedDoc = person.identityDocuments.some(
      (d) =>
        d.verificationStatus === 'DOCUMENT_VERIFIED' ||
        d.verificationStatus === 'ADMIN_VERIFIED',
    );
    const hasSelfDeclaredDoc = person.identityDocuments.some(
      (d) => d.verificationStatus === 'SELF_DECLARED',
    );
    const hasCommunityVerifiedDoc = person.identityDocuments.some(
      (d) => d.verificationStatus === 'COMMUNITY_VERIFIED',
    );

    if (hasVerifiedDoc) {
      level = VerificationLevel.DOCUMENT_VERIFIED;
    } else if (hasCommunityVerifiedDoc) {
      level = VerificationLevel.COMMUNITY_VERIFIED;
    } else if (hasSelfDeclaredDoc) {
      level = VerificationLevel.DOCUMENT_DECLARED;
    } else if (hasVerifiedClaim) {
      level = VerificationLevel.SELF_DECLARED;
    }

    await this.prisma.person.update({
      where: { id: personId },
      data: { verificationLevel: level },
    });

    this.logger.log(
      `Verification level recalculated for person=${personId}: ${level}`,
    );
  }
}

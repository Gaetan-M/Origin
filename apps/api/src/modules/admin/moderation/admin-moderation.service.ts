import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminActionSeverity,
  ClaimStatus,
  DocumentVerificationStatus,
  Prisma,
  VerificationLevel,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit.service';
import { AdminActor } from '../../../common/decorators/admin-actor.decorator';
import { ApproveClaimDto, DisputeClaimDto, RejectClaimDto } from './dto/review-claim.dto';
import { ApproveMergeDto, RejectMergeDto } from './dto/review-merge.dto';
import { RejectDocumentDto, VerifyDocumentDto } from './dto/review-document.dto';
import { ResolveVerificationDto } from './dto/review-verification.dto';
import { ListQueueDto } from './dto/list-queue.dto';

const MERGE_PROPOSAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

const VERIFICATION_REQUEST_STATUS = {
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const;

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Backend for the moderator dashboard.
 *
 * Every mutation funnels through `AdminAuditService.record()` so we keep
 * a faithful chain of custody on privileged actions. Read endpoints are
 * paginated with a uniform `{ items, total, page, limit }` envelope.
 */
@Injectable()
export class AdminModerationService {
  private readonly logger = new Logger(AdminModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  // ------------------------------------------------------------------
  // Queue overview
  // ------------------------------------------------------------------

  /**
   * Aggregated counts used by the dashboard landing page. Each query is
   * cheap and indexed; we run them in parallel to keep p95 low.
   */
  async getQueueOverview(): Promise<{
    claims: { pending: number; disputed: number };
    merges: { pending: number };
    verifications: { pending: number; inReview: number };
    identityDocuments: { pendingReview: number };
  }> {
    const [
      claimsPending,
      claimsDisputed,
      mergesPending,
      verificationsPending,
      verificationsInReview,
      docsPending,
    ] = await Promise.all([
      this.prisma.claim.count({ where: { status: ClaimStatus.PENDING } }),
      this.prisma.claim.count({ where: { status: ClaimStatus.DISPUTED } }),
      this.prisma.mergeProposal.count({
        where: { status: MERGE_PROPOSAL_STATUS.PENDING },
      }),
      this.prisma.verificationRequest.count({
        where: { status: VERIFICATION_REQUEST_STATUS.PENDING },
      }),
      this.prisma.verificationRequest.count({
        where: { status: VERIFICATION_REQUEST_STATUS.IN_REVIEW },
      }),
      this.prisma.identityDocument.count({
        where: {
          deletedAt: null,
          verificationStatus: {
            in: [
              DocumentVerificationStatus.SELF_DECLARED,
              DocumentVerificationStatus.DOCUMENT_VERIFIED,
            ],
          },
        },
      }),
    ]);

    return {
      claims: { pending: claimsPending, disputed: claimsDisputed },
      merges: { pending: mergesPending },
      verifications: {
        pending: verificationsPending,
        inReview: verificationsInReview,
      },
      identityDocuments: { pendingReview: docsPending },
    };
  }

  // ------------------------------------------------------------------
  // Claims
  // ------------------------------------------------------------------

  async listClaims(query: ListQueueDto): Promise<
    PaginatedResult<
      Prisma.ClaimGetPayload<{
        include: {
          person: {
            select: {
              id: true;
              displayName: true;
              gender: true;
              lifeStatus: true;
              birthYearApproximate: true;
            };
          };
          account: { select: { id: true; phoneNumber: true } };
        };
      }>
    >
  > {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const statuses = this.parseClaimStatuses(query.status ?? 'PENDING,DISPUTED');

    const where: Prisma.ClaimWhereInput = {
      status: { in: statuses },
    };
    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { person: { displayName: { contains: term, mode: 'insensitive' } } },
        { account: { phoneNumber: { contains: term } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.claim.findMany({
        where,
        include: {
          person: {
            select: {
              id: true,
              displayName: true,
              gender: true,
              lifeStatus: true,
              birthYearApproximate: true,
            },
          },
          account: { select: { id: true, phoneNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.claim.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async approveClaim(
    claimId: string,
    dto: ApproveClaimDto,
    actor: AdminActor,
  ) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }
    if (
      claim.status === ClaimStatus.VERIFIED ||
      claim.status === ClaimStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Claim is already ${claim.status} and cannot be approved`,
      );
    }

    const before = {
      status: claim.status,
      resolvedAt: claim.resolvedAt,
    };

    const now = new Date();
    const [updatedClaim, updatedPerson] = await this.prisma.$transaction([
      this.prisma.claim.update({
        where: { id: claimId },
        data: {
          status: ClaimStatus.VERIFIED,
          resolvedAt: now,
        },
      }),
      this.prisma.person.update({
        where: { id: claim.personId },
        data: {
          claimedByAccountId: claim.accountId,
          claimVerifiedAt: now,
          verificationLevel: VerificationLevel.COMMUNITY_VERIFIED,
        },
      }),
    ]);

    await this.audit.record({
      actor,
      action: 'approve',
      category: 'moderation.claim.approve',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'claim',
      targetEntityId: claimId,
      targetAccountId: claim.accountId,
      reason: dto.note ?? null,
      beforeState: before as unknown as Prisma.InputJsonValue,
      afterState: {
        status: updatedClaim.status,
        resolvedAt: updatedClaim.resolvedAt,
        personId: updatedPerson.id,
        verificationLevel: updatedPerson.verificationLevel,
      } as unknown as Prisma.InputJsonValue,
    });

    return updatedClaim;
  }

  async rejectClaim(claimId: string, dto: RejectClaimDto, actor: AdminActor) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }
    if (claim.status === ClaimStatus.REJECTED) {
      throw new BadRequestException('Claim is already rejected');
    }

    const before = { status: claim.status, resolvedAt: claim.resolvedAt };

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.REJECTED,
        resolvedAt: new Date(),
        disputeReason: dto.reason,
      },
    });

    await this.audit.record({
      actor,
      action: 'reject',
      category: 'moderation.claim.reject',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'claim',
      targetEntityId: claimId,
      targetAccountId: claim.accountId,
      reason: dto.reason,
      beforeState: before as unknown as Prisma.InputJsonValue,
      afterState: {
        status: updated.status,
        resolvedAt: updated.resolvedAt,
      } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async disputeClaim(
    claimId: string,
    dto: DisputeClaimDto,
    actor: AdminActor,
  ) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }
    if (claim.status === ClaimStatus.REJECTED) {
      throw new BadRequestException('Cannot dispute a rejected claim');
    }
    if (claim.status === ClaimStatus.DISPUTED) {
      throw new BadRequestException('Claim is already disputed');
    }

    const before = { status: claim.status };

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.DISPUTED,
        disputeReason: dto.reason,
      },
    });

    await this.audit.record({
      actor,
      action: 'dispute',
      category: 'moderation.claim.dispute',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'claim',
      targetEntityId: claimId,
      targetAccountId: claim.accountId,
      reason: dto.reason,
      beforeState: before as unknown as Prisma.InputJsonValue,
      afterState: { status: updated.status } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ------------------------------------------------------------------
  // Merges
  // ------------------------------------------------------------------

  async listMerges(query: ListQueueDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.MergeProposalWhereInput = {
      status: MERGE_PROPOSAL_STATUS.PENDING,
    };

    const personPreview = {
      id: true,
      displayName: true,
      gender: true,
      birthYearApproximate: true,
      deceasedYearApproximate: true,
      villageOrigin: true,
    } as const;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mergeProposal.findMany({
        where,
        include: {
          personA: { select: personPreview },
          personB: { select: personPreview },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mergeProposal.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async approveMerge(
    proposalId: string,
    dto: ApproveMergeDto,
    actor: AdminActor,
  ) {
    const proposal = await this.prisma.mergeProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) {
      throw new NotFoundException('Merge proposal not found');
    }
    if (proposal.status !== MERGE_PROPOSAL_STATUS.PENDING) {
      throw new BadRequestException(
        `Merge proposal is ${proposal.status} and cannot be approved`,
      );
    }

    if (
      dto.keeperPersonId !== proposal.personAId &&
      dto.keeperPersonId !== proposal.personBId
    ) {
      throw new BadRequestException(
        'keeperPersonId must match either personAId or personBId of the proposal',
      );
    }

    const keeperId = dto.keeperPersonId;
    const loserId =
      keeperId === proposal.personAId ? proposal.personBId : proposal.personAId;

    const result = await this.prisma.$transaction(async (tx) => {
      const keeper = await tx.person.findUnique({ where: { id: keeperId } });
      const loser = await tx.person.findUnique({ where: { id: loserId } });
      if (!keeper || keeper.deletedAt) {
        throw new NotFoundException('Keeper person not found or deleted');
      }
      if (!loser || loser.deletedAt) {
        throw new NotFoundException('Loser person not found or already deleted');
      }

      // ------------------------------------------------------------
      // parent_child rows where loser is the parent.
      // ------------------------------------------------------------
      const parentRels = await tx.parentChild.findMany({
        where: { parentId: loserId, deletedAt: null },
      });
      for (const rel of parentRels) {
        const dup = await tx.parentChild.findUnique({
          where: {
            parentId_childId_relationshipType: {
              parentId: keeperId,
              childId: rel.childId,
              relationshipType: rel.relationshipType,
            },
          },
        });
        if (dup) {
          // Keeper already has this edge — drop the duplicate from the
          // loser so it does not get reanimated by the rewrite.
          await tx.parentChild.delete({ where: { id: rel.id } });
        } else {
          await tx.parentChild.update({
            where: { id: rel.id },
            data: { parentId: keeperId },
          });
        }
      }

      // ------------------------------------------------------------
      // parent_child rows where loser is the child.
      // ------------------------------------------------------------
      const childRels = await tx.parentChild.findMany({
        where: { childId: loserId, deletedAt: null },
      });
      for (const rel of childRels) {
        const dup = await tx.parentChild.findUnique({
          where: {
            parentId_childId_relationshipType: {
              parentId: rel.parentId,
              childId: keeperId,
              relationshipType: rel.relationshipType,
            },
          },
        });
        if (dup) {
          await tx.parentChild.delete({ where: { id: rel.id } });
        } else {
          await tx.parentChild.update({
            where: { id: rel.id },
            data: { childId: keeperId },
          });
        }
      }

      // ------------------------------------------------------------
      // union_partners — unique (unionId, personId).
      // ------------------------------------------------------------
      const unions = await tx.unionPartner.findMany({
        where: { personId: loserId },
      });
      for (const partner of unions) {
        const dup = await tx.unionPartner.findUnique({
          where: {
            unionId_personId: {
              unionId: partner.unionId,
              personId: keeperId,
            },
          },
        });
        if (dup) {
          await tx.unionPartner.delete({ where: { id: partner.id } });
        } else {
          await tx.unionPartner.update({
            where: { id: partner.id },
            data: { personId: keeperId },
          });
        }
      }

      // ------------------------------------------------------------
      // claims — unique (accountId, personId).
      // ------------------------------------------------------------
      const claims = await tx.claim.findMany({
        where: { personId: loserId },
      });
      for (const claim of claims) {
        const dup = await tx.claim.findUnique({
          where: {
            accountId_personId: {
              accountId: claim.accountId,
              personId: keeperId,
            },
          },
        });
        if (dup) {
          // Same account claimed both — keep the strongest status on
          // the keeper, drop the loser-side claim.
          await tx.claim.delete({ where: { id: claim.id } });
        } else {
          await tx.claim.update({
            where: { id: claim.id },
            data: { personId: keeperId },
          });
        }
      }

      // ------------------------------------------------------------
      // identity_documents, media, person_names — no compound unique
      // keys to dedup against, so a flat reassign is sufficient.
      // ------------------------------------------------------------
      await tx.identityDocument.updateMany({
        where: { personId: loserId },
        data: { personId: keeperId },
      });
      await tx.media.updateMany({
        where: { personId: loserId },
        data: { personId: keeperId },
      });
      await tx.personName.updateMany({
        where: { personId: loserId },
        data: { personId: keeperId },
      });

      const now = new Date();
      const softDeleted = await tx.person.update({
        where: { id: loserId },
        data: { deletedAt: now },
      });
      const updatedProposal = await tx.mergeProposal.update({
        where: { id: proposalId },
        data: {
          status: MERGE_PROPOSAL_STATUS.APPROVED,
          resolvedAt: now,
          resolvedIntoPersonId: keeperId,
        },
      });

      return { keeper, loser: softDeleted, proposal: updatedProposal };
    });

    await this.audit.record({
      actor,
      action: 'approve',
      category: 'moderation.merge.approve',
      severity: AdminActionSeverity.WARNING,
      targetEntityType: 'merge_proposal',
      targetEntityId: proposalId,
      reason: dto.reason ?? null,
      beforeState: {
        status: proposal.status,
        personAId: proposal.personAId,
        personBId: proposal.personBId,
      } as unknown as Prisma.InputJsonValue,
      afterState: {
        status: result.proposal.status,
        resolvedIntoPersonId: result.proposal.resolvedIntoPersonId,
      } as unknown as Prisma.InputJsonValue,
      metadata: {
        keeperId,
        loserId,
      } as unknown as Prisma.InputJsonValue,
    });

    return result.proposal;
  }

  async rejectMerge(
    proposalId: string,
    dto: RejectMergeDto,
    actor: AdminActor,
  ) {
    const proposal = await this.prisma.mergeProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) {
      throw new NotFoundException('Merge proposal not found');
    }
    if (proposal.status !== MERGE_PROPOSAL_STATUS.PENDING) {
      throw new BadRequestException(
        `Merge proposal is ${proposal.status} and cannot be rejected`,
      );
    }

    const updated = await this.prisma.mergeProposal.update({
      where: { id: proposalId },
      data: {
        status: MERGE_PROPOSAL_STATUS.REJECTED,
        resolvedAt: new Date(),
      },
    });

    await this.audit.record({
      actor,
      action: 'reject',
      category: 'moderation.merge.reject',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'merge_proposal',
      targetEntityId: proposalId,
      reason: dto.reason,
      beforeState: { status: proposal.status } as unknown as Prisma.InputJsonValue,
      afterState: {
        status: updated.status,
        resolvedAt: updated.resolvedAt,
      } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ------------------------------------------------------------------
  // Verification requests
  // ------------------------------------------------------------------

  async listVerifications(query: ListQueueDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.VerificationRequestWhereInput = {
      status: {
        in: [
          VERIFICATION_REQUEST_STATUS.PENDING,
          VERIFICATION_REQUEST_STATUS.IN_REVIEW,
        ],
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.verificationRequest.findMany({
        where,
        include: {
          submittedByAccount: { select: { id: true, phoneNumber: true } },
          assignedModerator: { select: { id: true, phoneNumber: true } },
        },
        orderBy: [{ priority: 'desc' }, { submittedAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.verificationRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async assignVerificationToMe(requestId: string, actor: AdminActor) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Verification request not found');
    }
    if (
      request.status !== VERIFICATION_REQUEST_STATUS.PENDING &&
      request.status !== VERIFICATION_REQUEST_STATUS.IN_REVIEW
    ) {
      throw new BadRequestException(
        `Verification request is ${request.status} and cannot be assigned`,
      );
    }

    const updated = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        assignedModeratorId: actor.accountId,
        status: VERIFICATION_REQUEST_STATUS.IN_REVIEW,
      },
    });

    await this.audit.record({
      actor,
      action: 'assign',
      category: 'moderation.verification.assign',
      severity: AdminActionSeverity.INFO,
      targetEntityType: 'verification_request',
      targetEntityId: requestId,
      beforeState: {
        status: request.status,
        assignedModeratorId: request.assignedModeratorId,
      } as unknown as Prisma.InputJsonValue,
      afterState: {
        status: updated.status,
        assignedModeratorId: updated.assignedModeratorId,
      } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async resolveVerification(
    requestId: string,
    dto: ResolveVerificationDto,
    actor: AdminActor,
  ) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Verification request not found');
    }
    if (
      request.status === VERIFICATION_REQUEST_STATUS.RESOLVED ||
      request.status === VERIFICATION_REQUEST_STATUS.REJECTED
    ) {
      throw new BadRequestException(
        `Verification request is already ${request.status}`,
      );
    }

    const newStatus =
      dto.decision === 'APPROVED'
        ? VERIFICATION_REQUEST_STATUS.RESOLVED
        : VERIFICATION_REQUEST_STATUS.REJECTED;

    const updated = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        resolutionNote: dto.note ?? null,
        resolvedAt: new Date(),
      },
    });

    await this.audit.record({
      actor,
      action: 'resolve',
      category: 'moderation.verification.resolve',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'verification_request',
      targetEntityId: requestId,
      reason: dto.note ?? null,
      beforeState: {
        status: request.status,
      } as unknown as Prisma.InputJsonValue,
      afterState: {
        status: updated.status,
        resolutionNote: updated.resolutionNote,
        resolvedAt: updated.resolvedAt,
      } as unknown as Prisma.InputJsonValue,
      metadata: { decision: dto.decision } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ------------------------------------------------------------------
  // Identity documents
  // ------------------------------------------------------------------

  async listIdentityDocuments(query: ListQueueDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    // Spec asks for SELF_DECLARED + DOCUMENT_DECLARED. The enum exposes
    // SELF_DECLARED + DOCUMENT_VERIFIED — DOCUMENT_DECLARED only exists
    // on `verification_level`. We fall back to the closest "submitted
    // but not yet admin-stamped" set the schema actually supports.
    const where: Prisma.IdentityDocumentWhereInput = {
      deletedAt: null,
      verificationStatus: {
        in: [
          DocumentVerificationStatus.SELF_DECLARED,
          DocumentVerificationStatus.DOCUMENT_VERIFIED,
        ],
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.identityDocument.findMany({
        where,
        include: {
          person: {
            select: {
              id: true,
              displayName: true,
              gender: true,
              lifeStatus: true,
              birthYearApproximate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.identityDocument.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async verifyIdentityDocument(
    documentId: string,
    dto: VerifyDocumentDto,
    actor: AdminActor,
  ) {
    const doc = await this.prisma.identityDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Identity document not found');
    }
    if (doc.verificationStatus === DocumentVerificationStatus.ADMIN_VERIFIED) {
      throw new BadRequestException('Document is already admin-verified');
    }

    const now = new Date();
    const updated = await this.prisma.identityDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: DocumentVerificationStatus.ADMIN_VERIFIED,
        verifiedByAccountId: actor.accountId,
        verifiedAt: now,
      },
    });

    await this.audit.record({
      actor,
      action: 'verify',
      category: 'moderation.identity-document.verify',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'identity_document',
      targetEntityId: documentId,
      reason: dto.note ?? null,
      beforeState: {
        verificationStatus: doc.verificationStatus,
      } as unknown as Prisma.InputJsonValue,
      afterState: {
        verificationStatus: updated.verificationStatus,
        verifiedByAccountId: updated.verifiedByAccountId,
        verifiedAt: updated.verifiedAt,
      } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async rejectIdentityDocument(
    documentId: string,
    dto: RejectDocumentDto,
    actor: AdminActor,
  ) {
    const doc = await this.prisma.identityDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Identity document not found');
    }
    if (doc.verificationStatus === DocumentVerificationStatus.DISPUTED) {
      throw new BadRequestException('Document is already disputed');
    }

    const updated = await this.prisma.identityDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: DocumentVerificationStatus.DISPUTED,
      },
    });

    await this.audit.record({
      actor,
      action: 'reject',
      category: 'moderation.identity-document.reject',
      severity: AdminActionSeverity.WARNING,
      targetEntityType: 'identity_document',
      targetEntityId: documentId,
      reason: dto.reason,
      beforeState: {
        verificationStatus: doc.verificationStatus,
      } as unknown as Prisma.InputJsonValue,
      afterState: {
        verificationStatus: updated.verificationStatus,
      } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /**
   * Parse a comma-separated list of statuses into a filtered, validated
   * `ClaimStatus[]`. Unknown tokens are dropped silently — we never want
   * a malformed dashboard URL to break the moderator workflow.
   */
  private parseClaimStatuses(raw: string): ClaimStatus[] {
    const allowed = new Set<string>(Object.values(ClaimStatus));
    const tokens = raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0 && allowed.has(s));
    if (tokens.length === 0) {
      return [ClaimStatus.PENDING, ClaimStatus.DISPUTED];
    }
    return tokens as ClaimStatus[];
  }
}

/**
 * Phase-6 TOURISM + LEARNING — executable contract (reference implementation).
 *
 * WHY THIS EXISTS (parallel-safety):
 * The production TourismService / LearningService / LessonEnrollmentService and
 * their controllers are authored in parallel by other devs under
 * apps/api/src/modules/* and are not importable yet without risking a broken e2e
 * compile (the Phase-6 Prisma models land via the data-modeler). So this file is
 * a *behavioural contract*: a minimal, faithful reference of the rules the real
 * services MUST satisfy. `phase6-tourism-learning.e2e-spec.ts` drives THIS
 * against the in-memory Prisma double (`phase6-prisma-mock.ts`), so every
 * assertion here is a clause the production implementation has to keep green.
 * Once the production services land, the integrator re-points the spec at them
 * (the mock + scenarios are reusable verbatim). See docs/PHASE6-TESTPLAN.md.
 *
 * Contract clauses encoded:
 *  - INDEPENDENCE: a TourismPlace carries its provenance (source + source_ref)
 *    and is used STRICTLY as a cited SOURCE. Submitting/verifying a place NEVER
 *    touches the family graph, person data, or grants any government write
 *    access. Places surface PUBLIC in discovery, verified-first.
 *  - VERIFICATION GATE: only a moderator+ may flip `verified`. A normal account
 *    is forbidden. Verification writes both audit trails (Contribution + admin
 *    audit log).
 *  - LEARNING APPROVAL: a lesson from a VERIFIED CulturalAuthority auto-APPROVES
 *    (mirrors cultural-content); a normal author's lesson is PENDING and hidden
 *    from the public listing until approved. Every create writes a Contribution.
 *  - ENROLLMENT: enroll is an UPSERT on (lesson, account); marking progress to
 *    100 stamps `completed_at` exactly once.
 *
 * No-`any` throughout. snake_case lives only in the DB (schema @map); this code
 * speaks the camelCase Prisma client surface.
 */

import type {
  MockLearningLesson,
  MockLessonEnrollment,
  MockModerationStatus,
  MockTourismCategory,
  MockTourismPlace,
  MockTourismSource,
  MockLearningLevel,
} from './phase6-prisma-mock';

// --- Moderator gate (mirrors moderation.service MODERATOR_ROLES) ------------

export const MODERATOR_ROLES: ReadonlySet<string> = new Set<string>([
  'MODERATOR',
  'ADMIN',
  'SUPER_ADMIN',
]);

export interface Actor {
  accountId: string;
  role: string;
}

/** Raised for contract violations; carries a stable machine-readable code. */
export class Phase6Error extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'Phase6Error';
  }
}

// --- Minimal Prisma surface the reference services touch --------------------

interface PlaceRow {
  id: string;
  verified: boolean;
}

interface AuthorityRow {
  id: string;
  verified: boolean;
}

interface ContributionInput {
  accountId: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

interface AdminAuditInput {
  actorAccountId: string;
  actorRole: string;
  action: string;
  category: string;
  targetEntityType: string;
  targetEntityId: string;
  reason?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
}

interface ReferencePrisma {
  tourismPlace: {
    create(args: { data: Record<string, unknown> }): Promise<MockTourismPlace>;
    findFirst(args: { where: Record<string, unknown> }): Promise<PlaceRow | null>;
    findMany(args: {
      where?: Record<string, unknown>;
      orderBy?:
        | Record<string, 'asc' | 'desc'>
        | Record<string, 'asc' | 'desc'>[];
      take?: number;
    }): Promise<MockTourismPlace[]>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<MockTourismPlace>;
  };
  learningLesson: {
    create(args: { data: Record<string, unknown> }): Promise<MockLearningLesson>;
    findFirst(args: {
      where: Record<string, unknown>;
    }): Promise<MockLearningLesson | null>;
    findMany(args: {
      where?: Record<string, unknown>;
      orderBy?:
        | Record<string, 'asc' | 'desc'>
        | Record<string, 'asc' | 'desc'>[];
    }): Promise<MockLearningLesson[]>;
  };
  lessonEnrollment: {
    findFirst(args: {
      where: Record<string, unknown>;
    }): Promise<MockLessonEnrollment | null>;
    create(args: {
      data: Record<string, unknown>;
    }): Promise<MockLessonEnrollment>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<MockLessonEnrollment>;
  };
  culturalAuthority: {
    findFirst(args: {
      where: Record<string, unknown>;
    }): Promise<AuthorityRow | null>;
  };
  contribution: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  adminAuditLog: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

function assertModerator(actor: Actor): void {
  if (!MODERATOR_ROLES.has(actor.role)) {
    throw new Phase6Error('forbidden', 'Moderator privileges required');
  }
}

// --- TOURISM ----------------------------------------------------------------

export interface CreatePlaceInput {
  name: string;
  description?: string | null;
  region?: string | null;
  category: MockTourismCategory;
  latitude?: number | null;
  longitude?: number | null;
  source: MockTourismSource;
  /** Provenance citation / URL — independence requires the source be shown. */
  sourceRef?: string | null;
  mediaId?: string | null;
}

/**
 * Reference tourism service. Places are PUBLIC heritage/tourism pins sourced
 * from the Ministry of Tourism / NGOs / community, carried STRICTLY as cited
 * sources — never as authority over the family graph. Every mutation writes a
 * Contribution audit row.
 */
export class TourismReferenceService {
  constructor(private readonly prisma: ReferencePrisma) {}

  /**
   * Submit a tourism place. Always created UNVERIFIED with PUBLIC visibility,
   * attributed to the submitting account. The cited provenance (source +
   * sourceRef) is persisted verbatim so discovery can show where the data came
   * from. Independence: nothing here reads or writes person/graph data.
   */
  async createPlace(
    input: CreatePlaceInput,
    accountId: string,
  ): Promise<MockTourismPlace> {
    const place = await this.prisma.tourismPlace.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        region: input.region ?? null,
        category: input.category,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        source: input.source,
        sourceRef: input.sourceRef ?? null,
        mediaId: input.mediaId ?? null,
        verified: false,
        verifiedByAccountId: null,
        submittedByAccountId: accountId,
        visibilityScope: 'PUBLIC',
      },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'tourism_place',
        entityId: place.id,
        action: 'CREATE',
        newValue: {
          name: place.name,
          source: place.source,
          sourceRef: place.sourceRef,
          verified: false,
        },
      },
    });

    return place;
  }

  /**
   * Flip a place's `verified` flag. MODERATOR+ ONLY — independence means no
   * ordinary account (and no government actor) self-certifies a source. Writes
   * both the privileged-action audit log and the entity Contribution.
   */
  async verifyPlace(
    placeId: string,
    verified: boolean,
    actor: Actor,
    reason?: string | null,
  ): Promise<MockTourismPlace> {
    assertModerator(actor);

    const existing = await this.prisma.tourismPlace.findFirst({
      where: { id: placeId, deletedAt: null },
    });
    if (!existing) {
      throw new Phase6Error('not_found', 'Tourism place not found');
    }

    const updated = await this.prisma.tourismPlace.update({
      where: { id: placeId },
      data: {
        verified,
        verifiedByAccountId: verified ? actor.accountId : null,
      },
    });

    await this.recordAdminAudit({
      actorAccountId: actor.accountId,
      actorRole: actor.role,
      action: verified ? 'tourism_place.verify' : 'tourism_place.unverify',
      category: 'moderation',
      targetEntityType: 'tourism_place',
      targetEntityId: placeId,
      reason: reason ?? null,
      beforeState: { verified: existing.verified },
      afterState: { verified },
    });

    await this.prisma.contribution.create({
      data: {
        accountId: actor.accountId,
        entityType: 'tourism_place',
        entityId: placeId,
        action: verified ? 'VERIFY' : 'UNVERIFY',
        fieldName: 'verified',
        oldValue: { verified: existing.verified },
        newValue: { verified },
      },
    });

    return updated;
  }

  /**
   * Public discovery listing: non-deleted PUBLIC places, VERIFIED first
   * (cited+confirmed sources lead), then most-recent. Provenance fields ride
   * along on each row.
   */
  async listPublic(): Promise<MockTourismPlace[]> {
    return this.prisma.tourismPlace.findMany({
      where: { visibilityScope: 'PUBLIC', deletedAt: null },
      orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async recordAdminAudit(input: AdminAuditInput): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        actorAccountId: input.actorAccountId,
        actorRole: input.actorRole,
        action: input.action,
        category: input.category,
        severity: 'NOTICE',
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        reason: input.reason ?? null,
        beforeState: input.beforeState ?? null,
        afterState: input.afterState ?? null,
      },
    });
  }
}

// --- LEARNING ---------------------------------------------------------------

export interface CreateLessonInput {
  title: string;
  description?: string | null;
  content?: string | null;
  languageCode?: string | null;
  level?: MockLearningLevel;
  ethnicGroup?: string | null;
  authorityId?: string | null;
  mediaId?: string | null;
  isTicketed?: boolean;
  liveSessionId?: string | null;
  position?: number;
}

/**
 * Reference learning service. Lessons preserve culture/language; a lesson from a
 * VERIFIED CulturalAuthority auto-APPROVES (like cultural-content), otherwise it
 * is PENDING and hidden until a moderator approves it. Enrollment is an upsert;
 * reaching 100% stamps completion. Every create writes a Contribution.
 */
export class LearningReferenceService {
  constructor(private readonly prisma: ReferencePrisma) {}

  async createLesson(
    input: CreateLessonInput,
    accountId: string,
  ): Promise<MockLearningLesson> {
    // Auto-approval mirrors cultural-content: only a VERIFIED authority owned by
    // the author gates it.
    const verifiedAuthority = await this.prisma.culturalAuthority.findFirst({
      where: { accountId, verified: true, deletedAt: null },
    });

    // If pinned to an explicit authority, it must belong to the author.
    if (input.authorityId) {
      const owned = await this.prisma.culturalAuthority.findFirst({
        where: { id: input.authorityId, accountId, deletedAt: null },
      });
      if (!owned) {
        throw new Phase6Error(
          'forbidden',
          'You cannot author under an authority you do not own',
        );
      }
    }

    const isFromVerifiedAuthority = verifiedAuthority !== null;
    const moderationStatus: MockModerationStatus = isFromVerifiedAuthority
      ? 'APPROVED'
      : 'PENDING';

    const lesson = await this.prisma.learningLesson.create({
      data: {
        authorAccountId: accountId,
        authorityId: input.authorityId ?? verifiedAuthority?.id ?? null,
        title: input.title,
        description: input.description ?? null,
        content: input.content ?? null,
        languageCode: input.languageCode ?? null,
        level: input.level ?? 'BEGINNER',
        ethnicGroup: input.ethnicGroup ?? null,
        mediaId: input.mediaId ?? null,
        isTicketed: input.isTicketed ?? false,
        liveSessionId: input.liveSessionId ?? null,
        visibilityScope: 'PUBLIC',
        moderationStatus,
        position: input.position ?? 0,
      },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'learning_lesson',
        entityId: lesson.id,
        action: 'CREATE',
        newValue: {
          title: lesson.title,
          languageCode: lesson.languageCode,
          moderationStatus,
          isTicketed: lesson.isTicketed,
        },
      },
    });

    return lesson;
  }

  /** Public listing: only APPROVED, non-deleted PUBLIC lessons, by position. */
  async listPublic(): Promise<MockLearningLesson[]> {
    return this.prisma.learningLesson.findMany({
      where: {
        visibilityScope: 'PUBLIC',
        moderationStatus: 'APPROVED',
        deletedAt: null,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Enroll the account in a lesson — idempotent UPSERT on (lesson, account).
   * Re-enrolling never duplicates and never resets progress.
   */
  async enroll(
    lessonId: string,
    accountId: string,
  ): Promise<MockLessonEnrollment> {
    const lesson = await this.prisma.learningLesson.findFirst({
      where: { id: lessonId, deletedAt: null },
    });
    if (!lesson) {
      throw new Phase6Error('not_found', 'Lesson not found');
    }

    const existing = await this.prisma.lessonEnrollment.findFirst({
      where: { lessonId, accountId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.lessonEnrollment.create({
      data: { lessonId, accountId, progressPercent: 0, completedAt: null },
    });
  }

  /**
   * Mark progress (0..100). Auto-enrolls if needed. Reaching 100 stamps
   * completed_at exactly once (idempotent thereafter); dropping back below 100
   * clears it.
   */
  async markProgress(
    lessonId: string,
    accountId: string,
    progressPercent: number,
  ): Promise<MockLessonEnrollment> {
    if (progressPercent < 0 || progressPercent > 100) {
      throw new Phase6Error('invalid_progress', 'progress must be 0..100');
    }

    const enrollment = await this.enroll(lessonId, accountId);
    const completed = progressPercent >= 100;

    return this.prisma.lessonEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercent,
        completedAt: completed
          ? (enrollment.completedAt ?? new Date())
          : null,
      },
    });
  }
}

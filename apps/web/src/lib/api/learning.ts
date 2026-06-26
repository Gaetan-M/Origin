import type { VisibilityScope } from '@origin/shared-types';
import { apiClient } from './client';

/**
 * Web-side view models for the LEARNING surface — structured mini-lessons that
 * preserve culture, especially LANGUAGE lessons.
 *
 * A LearningLesson has a language_code/level/content, an optional author
 * CulturalAuthority (a verified expert / chefferie — lessons from a verified
 * authority may auto-approve, like cultural-content), and an optional
 * `isTicketed` flag that links to a live LESSON or premium content.
 *
 * Shapes mirror the read contract the `/learning` API is expected to expose
 * (see INTEGRATION NEEDED). Kept local until the public contract is published
 * in @origin/shared-types, mirroring the cultural/family-feed approach. Never
 * carries private person data.
 */

/** Mirrors prisma enum LearningLevel. */
export type LearningLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export const LEARNING_LEVELS: readonly LearningLevel[] = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
] as const;

/** Mirrors prisma enum ModerationStatus. */
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Public-safe author identity (display name only — never phone/private data). */
export interface LessonAuthor {
  accountId: string;
  displayName: string;
}

/** Public-safe authority summary shown on a verified-lesson badge. */
export interface LessonAuthoritySummary {
  id: string;
  displayName: string;
  region?: string | null;
  ethnicGroup?: string | null;
  verified: boolean;
}

/** Lightweight lesson card shape used in the lessons list. */
export interface LearningLessonSummary {
  id: string;
  title: string;
  description?: string | null;
  languageCode?: string | null;
  level: LearningLevel;
  ethnicGroup?: string | null;
  author: LessonAuthor;
  authority?: LessonAuthoritySummary | null;
  isFromVerifiedAuthority: boolean;
  isTicketed: boolean;
  /** Resolved public media URL, if any media was attached. */
  mediaUrl?: string | null;
  visibilityScope: VisibilityScope;
  moderationStatus: ModerationStatus;
  position: number;
  createdAt: string;
  /** Caller's enrollment, when authenticated and enrolled. */
  enrollment?: LessonEnrollment | null;
}

/** Full lesson detail — includes the mini-lesson `content` body. */
export interface LearningLessonDetail extends LearningLessonSummary {
  content?: string | null;
  /** Present when the lesson is ticketed and linked to a live session. */
  liveSessionId?: string | null;
}

export interface LessonEnrollment {
  id: string;
  lessonId: string;
  accountId: string;
  progressPercent: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearningLessonPage {
  items: LearningLessonSummary[];
  nextCursor: string | null;
}

export interface LearningLessonQuery {
  cursor?: string | null;
  limit?: number;
  /** Optional language facet filter (e.g. "ewondo", "duala"). */
  languageCode?: string | null;
  /** Optional level facet filter. */
  level?: LearningLevel | null;
}

export interface UpdateProgressInput {
  progressPercent: number;
}

/**
 * GET /learning/lessons — cursor-paginated PUBLIC list of approved lessons,
 * ordered by `position` then recency. Lessons from a verified authority are
 * surfaced first. Returns only public-safe fields.
 */
export async function getLessons(
  query?: LearningLessonQuery,
): Promise<LearningLessonPage> {
  const params = new URLSearchParams();
  if (query?.cursor) params.set('cursor', query.cursor);
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.languageCode) params.set('languageCode', query.languageCode);
  if (query?.level) params.set('level', query.level);
  const qs = params.toString();
  const { data } = await apiClient<LearningLessonPage>(
    `/learning/lessons${qs ? `?${qs}` : ''}`,
  );
  return data;
}

/** GET /learning/lessons/:id — full lesson detail incl. mini-lesson content. */
export async function getLesson(id: string): Promise<LearningLessonDetail> {
  const { data } = await apiClient<LearningLessonDetail>(`/learning/lessons/${id}`);
  return data;
}

/**
 * POST /learning/lessons/:id/enroll — enrol the caller. Idempotent: returns the
 * existing enrollment if already enrolled. Writes a Contribution audit row.
 */
export async function enrollInLesson(id: string): Promise<LessonEnrollment> {
  const { data } = await apiClient<LessonEnrollment>(
    `/learning/lessons/${id}/enroll`,
    { method: 'POST' },
  );
  return data;
}

/**
 * PATCH /learning/lessons/:id/progress — update the caller's progress (0–100).
 * The server sets `completedAt` when progress reaches 100.
 */
export async function updateLessonProgress(
  id: string,
  input: UpdateProgressInput,
): Promise<LessonEnrollment> {
  const { data } = await apiClient<LessonEnrollment>(
    `/learning/lessons/${id}/progress`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  return data;
}

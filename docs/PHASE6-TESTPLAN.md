# Phase 6 — TOURISM + LEARNING: QA test plan

Owner: dev-8 "Filet" (QA). Scope: the **TOURISM** heritage layer (TourismPlace —
provenance + moderator-gated verification + public discovery) and the
**LEARNING** mini-lessons (LearningLesson approval + LessonEnrollment progress).

## What is covered

Service-level integration spec, no HTTP:

- `apps/api/test/phase6-tourism-learning.e2e-spec.ts` — the scenarios.
- `apps/api/test/support/phase6-prisma-mock.ts` — in-memory `PrismaService`
  double for `tourismPlace` / `learningLesson` / `lessonEnrollment` /
  `culturalAuthority` / `contribution` / `adminAuditLog` / `account`, with a
  generic `where` / `orderBy` evaluator and a monotonic virtual clock for
  deterministic `created_at` ordering.
- `apps/api/test/support/phase6-reference.ts` — the **executable contract**
  (reference `TourismReferenceService` / `LearningReferenceService`) encoding the
  agreed Phase-6 business rules the production code must satisfy.

### Why a reference contract (and not the production service)

The production `TourismService` / `LearningService` / `LessonEnrollmentService`
and their controllers are authored in parallel under `apps/api/src/modules/*`,
and the Phase-6 Prisma models (`tourismPlace` / `learningLesson` /
`lessonEnrollment`) are added to `schema.prisma` by the data-modeler. Importing
unfinished services would risk a broken e2e compile. To stay parallel-safe **and**
keep the suite green, the spec drives a faithful reference of the rules against
the in-memory DB. This mirrors the Phase-5 LIVE approach.

**Re-pointing to production:** once the real services land, replace the
`new TourismReferenceService(prisma)` / `new LearningReferenceService(prisma)`
construction in the spec with the production services (inject the real
`PrismaService`, plus `AdminAuditService` / `ModerationService` for the verify
seam and `EventPublisher` where applicable). The mock, seed helpers and every
assertion are reusable verbatim. Each clause below is a contract the production
implementation has to keep green.

## Scenarios

| # | Invariant | Tests |
|---|-----------|-------|
| 1 | A tourism place carries its cited provenance (`source` + `source_ref`) verbatim, starts UNVERIFIED + PUBLIC, attributed to the submitter, and writes a Contribution audit. | `persists the cited provenance ... and starts UNVERIFIED + PUBLIC` |
| 1 | **Independence:** a place is never coupled to private person / family-graph data, and the submitter's phone never leaks onto the row. | `never couples a place to private person / family-graph data` |
| 1 | Public discovery ranks **VERIFIED sources first** (then most-recent), even when the verified source is older. | `ranks VERIFIED sources first in the public discovery listing` |
| 2 | A **moderator+** may verify a place; it flips `verified`, stamps `verified_by_account_id`, and writes **both** audit trails (admin log + Contribution). | `lets a moderator verify a place and writes both audit trails` |
| 2 | **Independence gate:** an ordinary account is FORBIDDEN from verifying; the flag never flips and no audit rows are written (no government / self-certification). | `FORBIDS an ordinary account from verifying a place` |
| 3 | A lesson from a **VERIFIED `CulturalAuthority`** auto-APPROVES, pins the authority, is PUBLIC, appears in the listing, and writes a Contribution. | `auto-APPROVES a verified-authority lesson and surfaces it` |
| 3 | A normal author's lesson is **PENDING** and **hidden** from the public listing. | `keeps a normal author's lesson PENDING and HIDDEN` |
| 3 | Approval gates on authority verification: same author goes PENDING → APPROVED once verified. | `hides an unverified-authority lesson but APPROVES once the authority is verified` |
| 3 | Authoring under an authority the account does not own is forbidden (nothing persisted). | `forbids authoring ... under an authority the account does not own` |
| 3 | Public listing ordered by `position` then creation. | `orders the public listing by position then creation` |
| 4 | Enrollment is an idempotent **UPSERT** on `(lesson, account)` — re-enrolling never duplicates or resets progress. | `enrolls idempotently (UPSERT)` |
| 4 | Reaching **100%** stamps `completed_at` exactly once (idempotent on repeat). | `stamps completed_at exactly once when progress reaches 100` |
| 4 | Dropping below 100 clears `completed_at`; out-of-range progress is rejected. | `clears completed_at if progress drops back below 100`, `rejects out-of-range progress values` |

## Running

```bash
cd apps/api && npm run test:e2e -- phase6-tourism-learning
```

(Uses `test/jest-e2e.json`; `testRegex` already matches `test/*.e2e-spec.ts`.)

## Independence guardrails asserted

- Tourism data is used **strictly as a cited SOURCE**: `source` +
  `source_ref` are persisted and surfaced; no government write path exists.
- Verification is **moderator-owned**, never granted to submitters or external
  authorities.
- A `TourismPlace` row carries **zero** person / graph / phone fields — the
  tourism vertical and the family graph are decoupled by construction.

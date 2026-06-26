# Phase 4 — Living Memory: QA Test Plan

Owner: dev-8 "Filet" (QA). Scope: the emotional-moat features — **Albums**,
**Memorial tributes**, **Oral history** (Source reuse). This plan describes the
invariants under test, the test seam, and what still needs wiring once the
sibling feature agents register their services.

## Files

| File | Purpose |
| --- | --- |
| `apps/api/test/phase4-memory.e2e-spec.ts` | Service-level integration spec for all Phase 4 invariants. |
| `apps/api/test/support/phase4-prisma-mock.ts` | NEW in-memory PrismaService double (album / albumItem / memorialTribute / source / person / claim / parentChild / unionPartner / contribution / media / account). Separate helper — does not touch the existing feed/cultural/kinship mocks. |

Run: `cd apps/api && npm run test:e2e -- phase4-memory` (or the repo's configured
e2e runner using `test/jest-e2e.json`).

## Test seam & strategy

The spec runs the **REAL `GraphDegreeService`** (the production degree-bounded
BFS) over the in-memory Prisma double, so FAMILY visibility is validated against
real traversal code rather than a re-implementation.

Because the Phase 4 feature services (`AlbumService`, `MemorialTributeService`,
`OralHistoryService`) are authored in parallel and may not be registered when
this spec compiles, the spec embeds **reference services** that encode the
agreed contract exactly:

- Visibility resolution mirrors `FamilyFeedService.canSee`
  (PRIVATE_SELF → owner/subject only; FAMILY → degree ≤ `visibleMaxDegree`
  (default `DEFAULT_MAX_DEGREE = 5`) from the owner person node; PUBLIC → open;
  unknown scope → fail closed).
- Memorial creation **must** verify `Person.life_status = DECEASED` (block on
  ALIVE/UNKNOWN).
- Every mutation writes a `Contribution` audit row and uses soft-delete.

The reference services double as an executable specification. When the real
services land, swap each `new RefXxxService(...)` for the DI-resolved instance;
assertions target the public contract, not internals.

## Graph fixture

```
grandparent (deg 2 from subject)
     |
  parent      (deg 1 from subject)   <- IN-degree relative
     |
  subject     (deg 0 — owner node)

stranger (no path)                    <- OUT-of-degree user
```

Each account holds a VERIFIED self-claim to exactly one person node.

## Coverage matrix

| # | Invariant | Cases |
| --- | --- | --- |
| 1 | **Album visibility** | PRIVATE_SELF owner-only (relative forbidden); FAMILY degree-bounded (owner/parent/grandparent in, stranger out); FAMILY tighter `visibleMaxDegree=1` excludes degree-2; PUBLIC open to stranger; soft-deleted album → NotFound + row still present; create writes Contribution. |
| 2 | **Album item ordering** | Items returned sorted by ascending `position` regardless of insertion order; item references existing Media + writes audit. |
| 3 | **Memorial life_status gate** | BLOCKED on ALIVE; BLOCKED on UNKNOWN; ALLOWED on DECEASED (+ audit); NotFound on missing person. |
| 4 | **Memorial tribute visibility** | FAMILY visible to in-degree relative, hidden from stranger; `visibleMaxDegree=1` hides degree-2 relative; PUBLIC open; author always sees own tribute even when out of degree. |
| 5 | **Oral history (Source)** | Testimony persists with transcript + `media_file_id` + audit; lists per-person (scoped to that person); soft-deleted testimony excluded but physically retained. |

## Invariants asserted (the QA contract feature agents must satisfy)

1. FAMILY content is degree-bounded via `GraphDegreeService`; per-item
   `visible_max_degree` overrides the default cap.
2. PRIVATE_SELF content is owner/subject-only; PUBLIC content is open.
3. Memorial tributes are **only** creatable on `life_status = DECEASED`.
4. The tribute author can always see their own tribute.
5. All mutations write a `Contribution` audit row.
6. Deletes are soft (`deleted_at`); rows are never physically removed and
   soft-deleted rows never surface in reads.
7. Oral history reuses the existing `Source` model (`source_type = ORAL_HISTORY`,
   `audio_transcript`, `media_file_id`) — no new upload path.

## INTEGRATION NEEDED

Wiring owned by other agents / outside QA's NEW-files-only scope:

- **Controllers to register** in `apps/api/src/app.module.ts` (feature agents):
  - `AlbumsModule` → `AlbumController` (create album, add/list/reorder items,
    get album for viewer) + `AlbumService`.
  - `MemorialModule` → `MemorialController` (create/list tributes) +
    `MemorialTributeService`.
  - `OralHistoryModule` → `OralHistoryController` (create/list testimonies) +
    `OralHistoryService` (extends/uses the existing `Source` model + media seam).
  - Each must import `AuthorizationModule` to inject `GraphDegreeService` /
    `VisibilityGuard`.
- **Swap reference services for real ones** in `phase4-memory.e2e-spec.ts` once
  the above are registered (replace `new RefXxxService(...)` with
  `moduleRef.get(XxxService)` and add the modules to `Test.createTestingModule`).
- **Schema**: Album / AlbumItem / MemorialTribute models already present in
  `apps/api/prisma/schema.prisma` (added by the data-modeler); `Source` reused
  as-is for oral history. A `prisma migrate` is required before HTTP-level e2e.
- **shared-types**: if `AlbumKind` / `MemorialTributeKind` / DTOs are exported
  from `packages/shared-types`, add them to `src/index.ts` (owned by that file's
  maintainer).
- **Web nav**: album / memorial / oral-history surfaces need routes in the
  Next.js app nav (web agent).

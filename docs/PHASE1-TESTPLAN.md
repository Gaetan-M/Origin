# Phase 1 Test Plan — Life-events + Family Feed

Scope: the Phase-1 happy paths for recording life events (birth / death / union)
and the degree-bounded private family feed (fan-out, visibility, reactions,
comments, audit trail).

Legend: **A** = automated (CI), **M** = manual / exploratory.

## Test assets

| File | Layer | Status |
| --- | --- | --- |
| `apps/api/test/family-feed-visibility.e2e-spec.ts` | Service integration (real `FamilyFeedService` + `GraphDegreeService`, in-memory Prisma) | A — green now |
| `apps/api/test/life-events-feed.e2e-spec.ts` | HTTP e2e via `AppModule` (real pipeline, in-memory Prisma, JWT guard stubbed) | A — green after integration (controllers + Prisma models wired) |
| `apps/api/test/support/feed-prisma-mock.ts` | Shared in-memory `PrismaService` double + graph seeders | util |

## Scenarios

### 1. Record a birth -> feed fan-out + visibility (the crux)
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 1.1 | A FAMILY post is visible to the subject themself (degree 0) | A | visibility spec |
| 1.2 | A FAMILY post is visible to an IN-degree relative (parent, degree 1) | A | visibility spec |
| 1.3 | A FAMILY post is HIDDEN from an OUT-of-degree user (disconnected) | A | visibility spec |
| 1.4 | A tighter per-post `visibleMaxDegree` excludes a degree-2 relative | A | visibility spec |
| 1.5 | A PUBLIC post is visible to anyone, including a stranger | A | visibility spec |
| 1.6 | A PRIVATE_SELF post is visible only to the subject | A | visibility spec |
| 1.7 | An account with no verified self-claim gets an empty feed | A | visibility spec |
| 1.8 | `POST /life-events` (BIRTH) fans out a FAMILY feed post | A | http e2e |
| 1.9 | The birth post surfaces in the in-degree relative's `GET /family-feed` | A | http e2e |
| 1.10 | The birth post is absent from the out-of-degree user's feed | A | http e2e |
| 1.11 | Unauthenticated `GET /family-feed` is rejected | A | http e2e |
| 1.12 | Pagination: a page may return `< limit` items while `hasMore` is true (keyset over candidates) | M | manual against real DB |

### 2. Record a death -> life_status flip
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 2.1 | `POST /life-events` (DEATH) flips `Person.life_status` ALIVE -> DECEASED | A | http e2e |
| 2.2 | `life_status` is never null after the flip; soft-delete untouched | M | manual / DB assertion |
| 2.3 | A `LifeEventRecordedEvent` (`type 'life-event.recorded'`) is published | M | manual (depends on eventing wiring) |

### 3. Reaction round-trip + audit
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 3.1 | `POST /family-feed/posts/:id/reactions` persists a reaction | A | http e2e |
| 3.2 | A `feed_reaction` Contribution audit row is written | A | http e2e |
| 3.3 | Duplicate (post, account, type) reaction is idempotent / 409 per `@@unique` | M | manual |

### 4. Comment round-trip + audit
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 4.1 | `POST /family-feed/posts/:id/comments` persists a comment | A | http e2e |
| 4.2 | A `feed_comment` Contribution audit row is written | A | http e2e |
| 4.3 | Empty comment body is rejected (400 validation) | A | http e2e |

### 5. Cross-cutting (manual / future automation)
| # | Scenario | Type |
| --- | --- | --- |
| 5.1 | UI strings bilingual FR/EN on feed + life-event flows | M |
| 5.2 | No CNI / OTP / phone ever logged during these flows | M |
| 5.3 | Soft-deleting a feed post removes it from all feeds | M |
| 5.4 | Reacting to / commenting on a post the user cannot SEE is forbidden (visibility on write path) | M (promote to A once write-side visibility guard lands) |

## Assumed HTTP contract (must be confirmed at integration)

The HTTP e2e centralises these in `ROUTES` at the top of `life-events-feed.e2e-spec.ts`:

- `POST /api/v1/life-events` body `{ kind: 'BIRTH'|'DEATH'|'UNION', primaryPersonId, occurredAt, datePrecision, involvedPersonIds?, visibilityScope?, visibleMaxDegree? }`
- `GET  /api/v1/family-feed` -> `{ data: { items: FeedItem[], nextCursor, hasMore } }`
- `POST /api/v1/family-feed/posts/:postId/reactions` body `{ reactionType }`
- `POST /api/v1/family-feed/posts/:postId/comments` body `{ body }`

Audit rows are asserted via `entityType` values `feed_post`, `feed_reaction`,
`feed_comment`. If the controllers use different paths / field names / entity
types, update the `ROUTES` constants and the audit `entityType` filters in one
place — the rest of the spec is path-agnostic.

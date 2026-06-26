# Phase 2 Test Plan — Public cultural world + moderation

Scope: the Phase-2 PUBLIC discovery world — community + verified-authority
cultural-heritage authoring, the public discovery feed, and real-time
moderation (reporting, content verdicts, authority verification). The
overriding invariant: the public world NEVER leaks family-graph edges,
degrees, phone numbers, or any private person data.

Legend: **A** = automated (CI), **M** = manual / exploratory.

## Test assets

| File | Layer | Status |
| --- | --- | --- |
| `apps/api/test/public-culture.e2e-spec.ts` | Service integration (real `CulturalContentService` + `PublicFeedService` + `ModerationService` + `AdminAuditService`, in-memory Prisma, stubbed `EventPublisher`) | A — green after integration (Prisma regenerated with Phase-2 models) |
| `apps/api/test/support/cultural-prisma-mock.ts` | In-memory `PrismaService` double for cultural/moderation models + seeders | util |
| `apps/api/src/search/cultural-indexing.subscriber.spec.ts` | Unit: only APPROVED content is indexed (PUBLIC scope, no graph data) | A — owned by search agent |

The spec wires the REAL services together over a single faked database, so it
validates the actual moderation + visibility logic (not a re-implementation) and
is independent of any controller / HTTP wiring the integrator still has to
register.

## Scenarios

### 1. Verified-authority content is auto-approved + discoverable (the crux)
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 1.1 | A VERIFIED authority's content is created `moderation_status = APPROVED` | A | public-culture spec |
| 1.2 | That content is `is_from_verified_authority = true` and `PUBLIC` | A | public-culture spec |
| 1.3 | It surfaces in `getPublicFeed()` attributed by the authority display name | A | public-culture spec |
| 1.4 | Verified content ranks AHEAD of unverified, regardless of creation order | A | public-culture spec |

### 2. Normal-author content is moderated before it goes public
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 2.1 | A normal author's content is `PENDING` and NOT in the public feed | A | public-culture spec |
| 2.2 | After a moderator `APPROVED` verdict it appears, attributed by author full name | A | public-culture spec |
| 2.3 | A `REJECTED` verdict keeps content out of the feed | A | public-culture spec |
| 2.4 | A moderation verdict writes both `AdminAuditLog` + `Contribution` | A | public-culture spec |
| 2.5 | Pagination / keyset cursor over `(verified, created_at, id)` is stable | M | manual against real DB |

### 3. Public payload isolation (privacy invariant)
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 3.1 | Feed item keys are a strict subset of the sanctioned public surface | A | public-culture spec |
| 3.2 | No `authorAccountId` / `phoneNumber` / graph / degree fields leak | A | public-culture spec |
| 3.3 | The author's phone number never appears anywhere in the payload | A | public-culture spec |
| 3.4 | `publishFeedPost` opt-in never exposes the author's family structure | M | manual (FeedPost projection) |

### 4. Community reporting + moderator resolution
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 4.1 | Any account can file a report (`status = OPEN`) | A | public-culture spec |
| 4.2 | The report appears in the moderator queue (OPEN/REVIEWING, FIFO) | A | public-culture spec |
| 4.3 | A moderator resolves it (`RESOLVED`), writing both audit trails | A | public-culture spec |
| 4.4 | A resolved report drops out of the open queue | A | public-culture spec |
| 4.5 | A duplicate identical open report from the same reporter is de-duplicated | A | public-culture spec |
| 4.6 | A non-moderator cannot resolve a report (`ForbiddenException`) | A | public-culture spec |

### 5. Authority verification gates auto-approval
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 5.1 | Self-registration always yields an UNVERIFIED authority | A | public-culture spec |
| 5.2 | While unverified, the author's content is `PENDING` | A | public-culture spec |
| 5.3 | After a moderator verifies the authority, new content is auto-`APPROVED` | A | public-culture spec |
| 5.4 | Only the post-verification item is discoverable in the public feed | A | public-culture spec |
| 5.5 | Verification writes both `AdminAuditLog` + `Contribution` | A | public-culture spec |
| 5.6 | An author cannot publish under an authority they do not own | M | manual (`ForbiddenException` path) |

### 6. Audit + eventing cross-checks
| # | Scenario | Type | Where |
| --- | --- | --- | --- |
| 6.1 | Authoring content writes a mandatory `Contribution` (`action = CREATE`) | A | public-culture spec |
| 6.2 | Authoring content publishes a `cultural-content.published` event | A | public-culture spec |
| 6.3 | Only APPROVED content is written to the search index (PUBLIC scope) | A | cultural-indexing subscriber spec |

## Notes / gaps to close at integration

- The spec runs green only AFTER the integrator regenerates Prisma with the
  Phase-2 models/enums (`CulturalAuthority`, `CulturalContent`,
  `ModerationReport`, and the four moderation enums). Until then `@prisma/client`
  has no cultural types — expected per the parallel-build rules.
- HTTP-level e2e (auth guard + `RolesGuard` on the moderation controller, the
  optional-auth public feed route) is intentionally NOT covered here because the
  controllers are still being registered. A follow-up `*.e2e-spec.ts` via
  `AppModule` should add: unauthenticated read of `GET /public-feed`, authed
  `POST /cultural-content`, and `RolesGuard` rejection of a non-moderator hitting
  `POST /moderation/...`.
- Known cross-agent mismatch to flag to the integrator: the
  `cultural-content.published` payload emitted by `CulturalContentService`
  (`{ contentId, contentType, authorAccountId, moderationStatus }`) is narrower
  than the payload `CulturalIndexingSubscriber` consumes
  (`{ culturalContentId, title, body, ... }`). The indexing subscriber will not
  receive the fields it expects until the two payload contracts are reconciled.
  The spec therefore asserts only that the event is published, not its full shape.

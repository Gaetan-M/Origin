# Phase 3 Test Plan — "Sommes-nous parents ?" (Kinship Check)

Signature feature: two users consent to learn **only** whether — and how
distantly — they are related through the single global family graph. The system
reveals **only** a human relationship label + a degree. It never reveals either
person's tree, ancestors, names, ids, phone, or the path between them.

> **PRIVACY IS THE CORE INVARIANT.** Every assertion below ultimately protects
> one rule: a kinship payload returned to either user contains **only**
> `{ related, degree, label }`.

## Components under test

| Component | Status | Role |
|---|---|---|
| `GraphDegreeService.computeDegree` | EXISTING (real, exercised) | bounded BFS over `ParentChild` + `UnionPartner` → degree or `null` |
| `RelationshipLabelService.label` | EXISTING (real, exercised) | degree → bilingual FR/EN label; `null`/≤0 → "no link" |
| `KinshipCheckService` (consent/compute orchestration) | being authored in parallel | request → consent/decline → compute → result |

Because the orchestration service is authored in parallel, the spec encodes its
**agreed contract** as an executable reference harness (`KinshipCheckHarness`)
that drives the two REAL services. When
`apps/api/src/modules/kinship-check/kinship-check.service.ts` lands, replace the
harness with the real service — the assertions (especially the privacy scan)
remain valid against its public output.

## Test files

- `apps/api/test/kinship-check.e2e-spec.ts` — service-level integration spec.
- `apps/api/test/support/kinship-prisma-mock.ts` — NEW in-memory PrismaService
  double for `kinshipCheck` / `claim` / `account` / `parentChild` /
  `unionPartner` / `contribution`, with graph seed helpers
  (`seedPerson` / `seedAccount` / `seedClaim` / `addParentChild` / `addUnion`).
  Sibling to `feed-prisma-mock.ts` — neither shared helper is edited.

## Consent / compute state machine asserted

```
request()  -> PENDING_CONSENT   (requester_consent = true, target_consent = false)
   |                                       NO compute, graph NOT read
   +-- target decline()  -> DECLINED       terminal, NO result, graph NOT read
   +-- target consent()  -> CONSENTED -> compute() -> COMPUTED
                                              result = { related, degree, label }
```

Compute runs **only** when `requester_consent && target_consent && status === CONSENTED`.

## Scenarios

| # | Scenario | Key assertions |
|---|---|---|
| 1 | No compute before target consent | status `PENDING_CONSENT`; `result` null; `computeDegree` spy **not** called; stored row has null `resultDegree/resultRelated/computedAt` |
| 2 | Declined check | status `DECLINED`; `result` null; graph **never** read; row stays result-free |
| 3 | **CRUX privacy invariant** | COMPUTED result equals exactly `{ related, degree, label }` (3 keys only); deep-scan of result + fetched check + **both** parties' list views leaks **zero** person-id/name/phone/path — neither as a key (regex) nor as a seeded value; persisted row stores no person-id/path columns |
| 4 | Related vs not-related labelling | real disconnected graph → `related=false, degree=null`, "Aucun lien de parenté trouvé" / "No family link found"; faked `degree=3` → `related=true`, cousin / third-degree label |
| 5 | No VERIFIED claim → cannot determine | target has only a `PENDING` claim → `related=null, degree=null`, "no link" label; graph engine never consulted; still no leak |
| + | Audit trail | request → `CREATE`, consent → `UPDATE` Contribution rows on `kinship_check` |

## Privacy scanner

`assertNoLeak(payload, secrets)` recursively walks any payload and:

1. asserts **no key** matches
   `person id / name / full name / phone / path / ancestor / tree / node /
   requester|target person / requester|target account` (case-insensitive);
2. asserts **no primitive value** equals any seeded secret — every person id,
   `displayName`, account `phoneNumber` and `fullName` used in the fixture.

`Date` values are skipped (timestamps describe the check, not the persons).

## How the invariant is structural, not just tested

In the harness `compute()` is the **only** place person ids are resolved (via
the requester's/target's `VERIFIED` claim). They live strictly as locals and are
**discarded** — never persisted on the `KinshipCheck` row (the agreed model has
no person-id/path columns) and never returned. Only the aggregate
`degree` + derived `label` (and `related`) survive. The real service must
preserve this shape.

## Running

```bash
cd apps/api && npm run test:e2e -- kinship-check
```

(Not run here — per the parallel-safe rules this agent only authors code.)

## Notes / follow-ups

- Finer labels (maternal vs paternal uncle, sibling vs grandparent at the same
  degree) need structured path metadata and are intentionally out of scope; they
  must be added **without** ever exposing names or the path (see
  `relationship-label.service.ts`).
- Rate-limiting and `EXPIRED`/`CANCELLED` transitions are orchestration concerns
  for the real `KinshipCheckService`; add coverage once its API is final.

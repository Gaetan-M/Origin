# Phase 5 — LIVE: QA test plan

Owner: dev-8 "Filet" (QA). Scope: the **LIVE** engagement accelerator
(LiveSession / LiveParticipant) — access control, LiveKit token gating, and
systematic replay.

## What is covered

Service-level integration spec, no HTTP, no real LiveKit:

- `apps/api/test/phase5-live.e2e-spec.ts` — the scenarios.
- `apps/api/test/support/phase5-live-prisma-mock.ts` — in-memory PrismaService
  double for `liveSession` / `liveParticipant` / `culturalAuthority` / `claim` /
  `account` / `contribution`, plus the family-graph edges (`parentChild` /
  `unionPartner`) consumed by the **real** `GraphDegreeService`.
- `apps/api/test/support/phase5-live-reference.ts` — the **executable contract**
  (reference `LiveTokenGate` / `LiveAccessPolicy` / `LiveSessionService`) the
  production code must satisfy.

### Why a reference contract (and not the production service)

The production `LiveSessionService` / `LiveTokenService` are authored in parallel
under `apps/api/src/modules/live` and are not importable yet without risking a
broken e2e compile, and `livekit-server-sdk` is an integration-time dependency
not installed in this workspace. To stay parallel-safe **and** keep the suite
green, the spec drives a faithful reference of the rules against the in-memory
DB **and the real `GraphDegreeService`** (so the degree-bounded FAMILY seam is
exercised on the actual production graph traversal — not a re-implementation).

**Re-pointing to production:** once the real services land, swap the
`buildService(...)` / `policyOnly()` factories in the spec to construct the
production `LiveSessionService` + `LiveAccessPolicy` (inject `PrismaService`,
`GraphDegreeService`, the LiveKit token service, and `EventPublisher`). The mock,
seed helpers and every assertion are reusable verbatim. Each clause below is a
contract the production implementation has to keep green.

## Scenarios

| # | Invariant | Tests |
|---|-----------|-------|
| 1 | PRIVATE/FAMILY join is **degree-bounded** around `subject_person_id` (real `GraphDegreeService`). In-bound admitted; out-of-degree, unrelated, and **unclaimed** callers denied; host always admitted; PRIVATE_SELF admits only the subject. | `FAMILY visibility` block |
| 2 | PUBLIC join is **open to any authenticated** account (even with no claim / no relation). | `PUBLIC visibility` block |
| 3 | Only a **VERIFIED `CulturalAuthority`** host may CREATE a PUBLIC `LESSON`/`MASTERCLASS`; non-authority and unverified-authority denied; non-gated public kinds (e.g. `STORYTELLING`) open. | `verified-authority host gate` block |
| 4 | Token minting returns **"not configured"** (never throws) when any of `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` is unset; mints a token + url when all are set; host/speaker get publish rights, viewers sub-only; a join with LiveKit unconfigured still **degrades gracefully** (access granted, no token, participant recorded). | `LiveKit token gating` block |
| 5 | Replay publication flips `replay_published` and **emits the feed surface** (PUBLIC -> public discovery; FAMILY/PRIVATE -> family feed), writes the mandatory `Contribution` audit, guards on ENDED + recording present + host-only + idempotency, and the replay respects the **same visibility** as the live. | `Replay publication` block |
| + | Lifecycle: only the host may START; operations on a soft-deleted / missing session are rejected. | `Lifecycle guards` block |

## Run

```bash
cd apps/api
npm run test:e2e -- phase5-live          # or: npx jest --config test/jest-e2e.json phase5-live
```

No env vars required: the token-gating tests construct `LiveTokenGate` with
explicit env objects (unset vs full creds), so they are hermetic.

## INTEGRATION NEEDED (for the integrator)

- **Controllers to register** in `app.module.ts` once the `live` module lands:
  - `POST /live` (create), `POST /live/:id/start`, `POST /live/:id/join`
    (returns the LiveKit token or `{ configured: false }`),
    `POST /live/:id/end`, `POST /live/:id/replay/publish`.
  - All guarded by the existing auth guard; FAMILY/PRIVATE routes additionally
    through `VisibilityGuard` / `GraphDegreeService` against `subject_person_id`.
- **Re-point** the two spec factories to the production `LiveSessionService` /
  `LiveAccessPolicy` (see "Re-pointing to production" above).
- **Env vars:** `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` (unset =>
  graceful "live not configured", like the Sentry no-op pattern).
- **npm dep (backend):** `livekit-server-sdk` (token minting). Web: `livekit-client`,
  `@livekit/components-react`.
- **Schema:** `LiveSession` / `LiveParticipant` already present in
  `schema.prisma` (data-modeler). No QA changes.

# ELEVATION WAVE 1 — Test Plan (LIVE + Tourism UX)

This wave elevates the LIVE world from a thin "schedule + token" MVP into a
ceremony-grade, interactive experience for an African + diaspora audience
(ceremonies broadcast to relatives abroad, family councils with raised hands and
a moderated stage, elders teaching languages), and adds the verified Tourism
discovery surface. This document records what the new UX is, what is **automated**
in the test suite, and what remains **manual / integration-time**.

> Owner of this doc + the automated LIVE-rebuild service tests: the test author.
> The production services/controllers and the web UX are authored in parallel by
> other devs; see "Integration boundary" below.

---

## 1. New LIVE UX (what wave 1 adds)

| Capability | What the user sees | Server behaviour |
|---|---|---|
| **Invitations** | Host invites relatives by account or by phone (E.164); invitees get a notification + a one-tap accept/decline. | `invite()` host-only → creates a `LiveInvitation` (PENDING) and, for an on-platform invitee, an `INVITATION_RECEIVED` `Notification` (off-platform phone → no notification, nothing to notify yet). Audited. |
| **Respond to invite** | Invitee taps Accept / Decline from the notification or the live card. | `respondToInvite()` — only the invitee, only once: PENDING → ACCEPTED/DECLINED, stamps `responded_at`. Audited. |
| **Join by code** | Family shares a short `invite_code`; a relative pastes it to enter directly. | `joinByCode()` resolves the session behind the code and **still enforces visibility** (PUBLIC open; FAMILY degree-bounded via the real graph; host always reaches their own). Unknown code → rejected. |
| **Raise hand** | Viewers in a family council raise a hand to ask to speak. | `raiseHand()` toggles `hand_raised` on the caller's participant row (must have joined). |
| **Promote to speaker** | Host pulls a raised hand up onto the stage. | `promoteToSpeaker()` host-only → `is_speaker = true`, `role = 'speaker'`, lowers the raised hand. The next token mint grants publish rights. Audited. |
| **Auto-post on start** | When a live starts, relatives discover it in their family feed (or the public feed for a public lesson). | `start()` host-only, SCHEDULED → LIVE, **auto-posts a `FeedPost`** mirroring the live's visibility scope + degree + subject anchor, then emits `live.started`. Audited. |
| **Token gating** | If LiveKit is not provisioned the room degrades to "coming soon" instead of erroring. | The token gate returns `{ configured: false, reason: 'live_not_configured' }` when env creds are unset — never throws. Join still records the participant. |

Privacy invariants preserved: the auto-post and notifications carry only the
live's own identity + coarse state (title, visibility, subject anchor) — never a
computed degree, relationship path, or any private person data. PUBLIC payloads
never leak family-graph edges.

---

## 2. Automated coverage (this wave)

### `apps/api/test/live-rebuild.e2e-spec.ts` — 22 service-level tests, all green

Wires the **real** `GraphDegreeService` over a fresh in-memory Prisma double
(`test/support/live-rebuild-prisma-mock.ts`) and drives the wave-1 behavioural
contract (`test/support/live-rebuild-reference.ts`). Real graph logic, faked
database, no HTTP — the same philosophy as `phase5-live.e2e-spec.ts`.

| Area | Cases |
|---|---|
| `invite()` | creates PENDING invitation **+ notifies an on-platform invitee** (type `INVITATION_RECEIVED`, related entity = the session) with an audit row; **no notification** for an off-platform phone invite; non-host forbidden; invite with neither account nor phone rejected. |
| `respondToInvite()` | ACCEPT → ACCEPTED (+ `responded_at`); DECLINE → DECLINED; only the invitee may respond; second response rejected (`already_responded`). |
| `joinByCode()` | resolves a PUBLIC session by code → joins as viewer (records participant, mints token); resolves a FAMILY session by code, admitting an **in-degree** relative via the real BFS; **still enforces visibility** — an out-of-degree caller is denied even with the code; unknown code → `invalid_code`. |
| `raiseHand()` | toggles `hand_raised` true → false on repeat; a non-participant cannot raise a hand. |
| `promoteToSpeaker()` | host promotes a viewer → `is_speaker` true, role `speaker`, hand lowered, audited; non-host forbidden; promoting a non-participant rejected. |
| `start()` auto-post | a FAMILY live auto-posts a **FAMILY** `FeedPost` (mirrors scope + `visible_max_degree` + subject anchor) and emits `live.started`; a PUBLIC live auto-posts a **PUBLIC** post; non-host start forbidden (no auto-post); non-SCHEDULED start rejected. |
| Token gating | join-by-code with LiveKit env unset returns a "not configured" token yet still records the participant — degrades, never crashes. |

**Run:**
```bash
cd apps/api && npx jest --config test/jest-e2e.json test/live-rebuild.e2e-spec.ts
```

### New test-support files
- `apps/api/test/support/live-rebuild-prisma-mock.ts` — in-memory `PrismaService`
  double for the rebuild models: `liveSession` (incl. `invite_code`),
  `liveParticipant` (incl. `hand_raised` / `is_speaker`), `liveInvitation`,
  `notification`, `feedPost`, `claim`, `account`, `contribution`, and the
  `parentChild` / `unionPartner` edges the real `GraphDegreeService` traverses.
  Seed helpers + public `db` stores for read-back assertions. No `any`.
- `apps/api/test/support/live-rebuild-reference.ts` — the executable contract
  (`LiveRebuildService` + env-gated `LiveTokenGate`). Every clause is a rule the
  production `LiveService` must keep green; the integrator re-points the spec at
  the real service once it lands (mock + scenarios reusable verbatim).

---

## 3. Integration boundary (re-point once production lands)

The spec drives a **reference contract**, not the production service, so it stays
green while the real LIVE rebuild is authored in parallel and before
`livekit-server-sdk` is installed in CI. When the production `LiveService` lands,
the integrator swaps the reference for the real service in `buildService(...)`;
the in-memory mock and all 22 scenarios carry over unchanged. Each method on the
reference (`invite` / `respondToInvite` / `joinByCode` / `raiseHand` /
`promoteToSpeaker` / `start`) names the contract the real method must satisfy,
including the stable error codes asserted in the spec.

---

## 4. Manual / not yet automated

These need a real LiveKit project + a running stack (out of scope for the
in-memory service tests):

- **Realtime media**: actual audio/video publish & subscribe, speaker promotion
  reflected live in the room, reconnect/renegotiation — exercise against a real
  LiveKit room (web: `livekit-client` + `@livekit/components-react`).
- **Push delivery**: the invite notification actually reaching the device
  (FCM/APNs) — the test asserts the `Notification` row is written, not delivery.
- **Off-platform phone invites**: the SMS deep-link → install → claim → the
  pending invitation resolving to the new account.
- **Web UX**: the live room, invite sheet, raise-hand affordance, host stage
  controls, the family-feed "🔴 En direct" card from the auto-post, and the
  Tourism discovery surface — verify visually (and with the `/run` skill).
- **End-to-end HTTP**: controller wiring, guards, DTO validation, and rate
  limiting on the new endpoints (see INTEGRATION NEEDED in the wave summary).
```

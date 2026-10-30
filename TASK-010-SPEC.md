# TASK-010 — Sync Foundation & Change Journal — Proposed Specification

**Status:** PROPOSED (documentation-only; awaiting human acceptance)
**Type:** Architecture + Specification
**Decision record:** `docs/architecture/DECISION-TASK-010.md`
**Technical spec:** `docs/architecture/SYNC-FOUNDATION-SPEC.md`
**Proposed title:** **TASK-010 — Sync Foundation & Change Journal**

> This document proposes the official TASK-010 specification. It is **NOT yet
> official**: the repository contains no prior TASK-010 spec (recovered status:
> "SPECIFICATION NOT FOUND"), so this is a proposal for a human to accept,
> modify, or reject.
>
> **This task is architecture/specification only. It does NOT implement
> anything and modifies NO runtime/application code and NO protected file.**

---

## A. Decision

**ACCEPT** the direction: **Local-first + Offline-first** with a **future
optional/deployable LAN Site Server** and a **Sync Foundation based on a
persistent Change Journal**. The browser/client remains fully functional
offline; the Site Server is never a hard runtime dependency of the core
offline laboratory; **Cloud is NOT part of this phase.**

**Recommended official title: "TASK-010 — Sync Foundation & Change Journal."**
This naming is consistent with the repository architecture, which itself labels
the work as the "Sync Engine / change journal" next phase
(`CHEMLABX_ARCHITECTURE.md` §13, §28 non-goal).

## B. Context

Completed, verified foundation (TASK-003 → TASK-009): IndexedDB `DataPort` +
`CHLDB` transitional mirror, schema/provenance versioning (`SCHEMA_VERSION=2`,
`CHEMISTRY_DATA_VERSION=validated-v1`, `CONTENT_VERSION=content-v1`), pure
Chemistry/Laboratory/Safety domains, reproducible `ResultRecord`s, versioned
Content Packs, and a fail-closed Authorization domain (`CHL.authorization`).
Baseline green: 3 validators PASS + `verify.ps1` 100/100 in 4 contexts, 10/10
pages, 0 runtime errors, offline SW intact.

The architecture (`CHEMLABX_ARCHITECTURE.md`) targets a node-optional,
edge-first system where a PWA with full local autonomy may later attach an
optional LAN Site Server and, later, Cloud — all over one set of domain ports.
The current code is the pure device mode.

## C. Problem

Multiple devices and teacher visibility are impossible today: all data is
per-device. To move toward the architecture's target without breaking offline
operation or making a server a hard dependency, the **change capture and
replication foundation** (journal + sync contract) must be designed first.

## D. Chosen architecture

Local-first + Offline-first; node-optional; a documented Change Journal + Sync
contract; a future optional LAN Site Server; no cloud this phase. Runtime code
is untouched; the deliverables are the two docs in `docs/architecture/` plus
this spec.

## E. Alternatives considered

- **Full Sync Engine / Site Server / Cloud now** — rejected (violates §28
  non-goal; needs §26 decisions).
- **CRDT library / Postgres now** — rejected at architectural level (§26
  SHOULD NOT DECIDE YET; single-writer preference).
- **Production AuthN now** (Argon2id/PBKDF2, tokens, MFA, OAuth, password
  reset) — rejected (deferred §24.5/§24.6/§18); AuthZ (TASK-009) remains.
- **Education domain / multi-tenancy now** — rejected (deferred, gated).
- **Do nothing (stay per-device)** — rejected only as an active *next phase*;
  it remains the minimum acceptable runtime posture but leaves the hardest
  design un-de-risked.

## F. Rationale

Matches §13/§28/§23 roadmap; lowest-risk next change set (documentation only);
preserves offline independence; reuses existing provenance/versioning/
authorization anchors; makes no premature vendor/library choices.

## G. Component boundaries

Client → Change Journal → Sync Engine → (optional Site Server / future Cloud).
Client is offline-autonomous; journal is the on-device interface between domain
writes and any transport; Site Server is an optional peer, never a hard
dependency; Server Storage/Cloud sit behind one neutral contract. (Full diagram
in `DECISION-TASK-010.md` §G.)

## H. Data ownership

Single-writer-per-resource for ResultRecords/subs/grades/assignments (§13.2).
Classification: ResultRecords, Submissions, Assignments, Classes → sync-eligible
(bounded); Session + credentials → local-only; profile/account/progress →
later; Content Packs, chemistry/lab/safety logic+datasets, authorization matrix
→ NOT journaled (static/bundled); settings → local-only for now; temporary lab
state → never. (Table in DECISION §H and SPEC §7.)

## I. Change Journal conceptual schema

`ChangeRecord { changeId (UUID), entityType, entityId, op (upsert|delete),
baseVersion, version, payloadRef, wallClock (informational), deviceId, actorId,
orgId }` + `ReplicaPosition { peer, byStream, ackTime }`. Wall-clock never an
ordering authority; ordering truth = per-entity version / existing
`ResultRecord.order`. Idempotency on `changeId`; ack = cursor; retry with
backoff; delete → tombstone. (SPEC §4.)

## J. Sync protocol contract

Push/pull delta exchange by cursor; replay protection via idempotent
`changeId`; duplicate handling by `changeId` dedupe; offline queueing
(non-fatal, non-blocking); reconnect = cursor negotiation → delta → idempotent
apply → ack. (SPEC §5.)

## K. Cursor / idempotency model

Cursor truth from per-entity version + `ResultRecord.order` (reuse, don't
invent); `changeId` is the sole de-dup key; ack = "durably applied through
cursor C"; failures observable, never claimed successful. (SPEC §4.7, §5.3.)

## L. Conflict-resolution policy

Architectural only: avoid conflicts by single-writer-per-resource; where
multi-writer, deterministic domain rules (e.g., LWW per scalar field with a
surfaced `ConflictRecord` for review; never silent-merge grades). No CRDT
library, no Postgres selected. (DECISION §L.)

## M. Offline / reconnect behavior

Core lab fully offline; sync additive; offline mutations append to journal +
queue persists; reconnect negotiates cursors and applies idempotently; failures
non-fatal + observable. (DECISION §M, SPEC §9.)

## N. Security boundaries

`CHL.authorization` (TASK-009) remains intact + authoritative; sync must call
`authorize(actor, permission)` and never bypass. Prototype auth is NOT
production-ready (localStorage session, no expiry, djb2 hash); credential
material never syncs; journaled changes carry validated `actorId`. Content is
one-way, version-gated. (DECISION §N, SPEC §8.)

## O. Future LAN Site Server boundary

Optional deployable peer on the same contract; must not become a hard runtime
dependency of core offline operation; absence degrades to device mode; server
storage behind the same contract (SQLite preferred by §25 when a server exists;
NOT chosen). Requires §26 MUST-DECIDE (school scenario, backend language)
before building. (DECISION §O.)

## P. Future Cloud extensibility

Cloud out of this phase; design keeps cloud as another transport over the same
contract with tenant scoping (`orgId`) and signed media bundles; no dependency
introduced. (DECISION §P.)

## Q. Explicit non-goals

DO NOT implement: Sync Engine; Change Journal runtime; Site Server; backend
API; cloud; PostgreSQL; Node/Go server; CRDT library; multi-tenancy; Education
domain; OAuth/SSO/MFA/password reset; production authentication; real 3D; AI;
PWA update system; build tooling migration.
DO NOT: renumber prior tasks; rewrite TASK-003..009; modify
chemistry/laboratory/safety/results domains; modify Authorization
implementation; modify DataPort/db; change SCHEMA_VERSION /
CHEMISTRY_DATA_VERSION / CONTENT_VERSION / APP_VERSION; modify service worker;
modify tests/runtime behavior.

## R. Dependencies

Depends on TASK-003 (DataPort/versioning/provenance), TASK-004/005 (domains
producing ResultRecords), TASK-006 (ResultRecord provenance/order), TASK-007
(validated chemistry dataset, bundled), TASK-008 (content packs, bundled),
TASK-009 (Authorization domain to enforce). Forward deps (future): §26
decisions for Site Server; §24.6/§24.7/§24.10 for Education/multi-tenancy;
§24.5/§18.1 for production auth/enrollment.

## S. Risks

Sync design unproven without a server (mitigate: spec-first, on-device
de-risking per §28); Site Server becoming hard dependency (mitigate: node-
optional boundary); prototype auth mistaken for production (mitigate: explicit
boundary, credentials never sync); content journaled as user data (mitigate:
one-way version-gated bundles); scope creep (mitigate: hard non-goals);
ResultRecord eviction vs. sync capture (mitigate: journal before/at persist,
tombstone model separate); version drift (mitigate: versions protected,
journal references only). (DECISION §S.)

## T. Acceptance criteria for the eventual implementation

Proposed (NOT to be executed now): (1) `verify.ps1` 100/100 in 4 contexts +
10/10 pages + 0 runtime errors, all validators PASS, version constants and
content hash unchanged; (2) a successful `ResultRecord` appends exactly one
idempotent change with stable `changeId`/`actorId`/version and none for
blocked/unknown/fail-closed outcomes; (3) cursor resume + idempotent replay +
dedupe behave correctly; (4) offline queueing non-blocking + non-fatal +
observable; (5) `authorization.js` byte-unchanged and every journaled change
gated through `authorize()`; (6) no Site Server/cloud/backend/DB vendor/CRDT/
production auth required; (7) classification table honored. (DECISION §T.)

## U. Open architectural decisions (MUST resolve before implementing)

1. Payload strategy (inline vs. reference). 2. Sync eligibility trigger.
3. Tombstone retention. 4. Account/profile sync policy (needs §24.5/§18.1).
5. Education sync shape (needs §24.6/§24.10). 6. Media bundle format (deferred).
7. `orgId` tenant scoping (deferred). 8. Site Server requirement + backend
language (§26 MUST-DECIDE). 9. Cloud ownership/model (deferred, out of phase).

---

## Deliverables this phase (documentation only)

- `docs/architecture/DECISION-TASK-010.md` — written (ADR, sections A–U).
- `docs/architecture/SYNC-FOUNDATION-SPEC.md` — written (conceptual spec).
- `TASK-010-SPEC.md` — this proposal document.

No runtime/application code, tests, protected files, or version constants were
modified. No implementation was started.

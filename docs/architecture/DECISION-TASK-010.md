# TASK-010 — Architectural Decision Record

**Status:** PROPOSED (documentation-only decision; no implementation)
**Scope:** Architecture & specification only
**Companion spec:** `docs/architecture/SYNC-FOUNDATION-SPEC.md`
**Proposed task title under review:** "Sync Foundation & Change Journal"

> This is an **Architectural Decision Record (ADR)** for the next implementation phase.
> It does NOT implement sync, a change journal, a Site Server, a backend, or cloud.
> It does NOT modify any runtime/application code or any protected file.

---

## A. Decision

**ACCEPT — with a naming correction** (see section below).

The proposed direction is accepted and is the correct next phase given the
completed TASK-003 → TASK-009 foundation chain:

> **Local-first + Offline-first** persistence, with a **future optional /
> deployable LAN Site Server**, and a **Sync Foundation based on a persistent
> Change Journal**. The browser/client remains fully functional offline. The
> future Site Server must NOT become a hard runtime dependency of the
> laboratory's core offline operation. **Cloud is NOT part of this phase.**

However, the proposed *name* **"Sync Foundation & Change Journal"** is
accepted only as a phase descriptor. The repository's own roadmap labels this
work as the "Sync Engine / change journal" and explicitly gates it as the
next phase after the foundation layer (see `CHEMLABX_ARCHITECTURE.md` §28
non-goal and §13), so the name is consistent with the architecture. The
**exact official title is recommended in the FINAL REPORT** (section 2) as:

> **TASK-010 — Sync Foundation & Change Journal**

Because no official TASK-010 spec exists in the repository (recovered earlier:
"SPECIFICATION NOT FOUND"), this ADR + spec are **proposals** to be accepted
by a human before any implementation. They are NOT an official TASK-010 spec
until approved.

---

## B. Context

ChemLabX Pro has shipped an offline-first PWA where the following foundation
is complete and verified:

- **TASK-003** — Foundation Layer: `DataPort` (IndexedDB), `CHLDB` transitional
  localStorage compatibility mirror, schema-versioned storage
  (`SCHEMA_VERSION=2`), provenance stamps, fail-closed reaction path,
  safe achievements, dead-file cleanup.
- **TASK-004** — Chemistry + Laboratory domains (pure).
- **TASK-005** — Safety Engine (pure, read-only over chemistry, fail-closed).
- **TASK-006** — Result Records domain (immutable, reproducible `ResultRecord`).
- **TASK-007** — Chemistry dataset validation/canonicalization
  (`CHEMISTRY_DATA_VERSION=validated-v1`).
- **TASK-008** — Versioned Content Packs + Content domain + `CONTENT_VERSION`
  (`content-v1`) manifest.
- **TASK-009** — Authorization domain (`CHL.authorization`, fail-closed,
  pure) + auth hardening.

Regression baseline (all green): content validator 37/37 PASS; chemistry
validator PASS; authorization validator PASS; `test/verify.ps1` 100/100 in all
four contexts (online fresh, offline preload, offline run1, offline run2);
10/10 pages; 0 runtime errors; offline service worker intact.

The architecture (`CHEMLABX_ARCHITECTURE.md`) defines a **node-optional,
edge-first** design: a PWA with full local autonomy that *may* upgrade to a
per-site LAN server and *may* later sync through a Sync Engine to a Cloud —
all over one set of domain ports. The current codebase is the pure / device
mode (Architecture A); the Sync Engine and Site Server are documented but not
built.

---

## C. Problem

The foundation layer provides durable **local** persistence and versioning,
but it has no coordination mechanism beyond a single device:

1. A student's `ResultRecord`s, submissions, progress, and profile live only
   on one browser/device (`localStorage` mirror + IndexedDB `kv`/`meta`).
2. There is no way to move data between devices or to a teacher/school console
   without manual export.
3. The architecture's target (teacher visibility, class monitoring, safe data
   ownership) depends on being able to replicate a bounded, well-defined set
   of *user* data between replicas.
4. Any replication must be added **without breaking full offline operation**
   and **without making a server a hard dependency**, per the architecture's
   node-optional rule and §28 non-goals.

The immediate problem for TASK-010 is therefore: **lay the durable,
reproducible, offline-first foundation for change capture and replication**
(the Change Journal + a documented Sync contract) — without building a
runtime sync engine, a server, or cloud.

---

## D. Chosen architecture

**Local-first + Offline-first, node-optional, with a documented Sync
Foundation (Change Journal) and a future optional LAN Site Server.**

Concretely, this phase defines (does not build):

- A **conceptual Change Journal** model (append-only record of mutating
  operations on sync-eligible entities).
- A **synchronization contract** (push/pull/cursors/idempotency/offline queue).
- **Boundaries** between Client / Change Journal / Sync Engine / Site Server /
  Server Storage / future Cloud.
- **Data-ownership** classification: what eventually synchronizes vs. what
  stays local-only.
- **Conflict-resolution policy** at the architectural level (deterministic,
  domain-specific; no CRDT library chosen).
- **Security boundaries** preserving the TASK-009 Authorization domain.

The browser/client remains fully functional offline. The Site Server is an
*optional deployable* that attaches to the same contract later; it is never a
hard runtime dependency of the laboratory's core offline operation. Cloud is
explicitly out of scope for this phase.

---

## E. Alternatives considered

| Alternative | Description | Why rejected / status |
|---|---|---|
| **A. Pure device-local (as today), no sync work** | Keep everything per-device | Rejected for TASK-010: correct that nothing is *required*, but the architecture targets multi-device/teacher visibility; deferring entirely leaves the hardest design decision un-de-risked. Accepted as the **minimum acceptable scope** (spec-only, no runtime), not as a non-change. |
| **B. Full Sync Engine implementation now** | Build journal + transport + server this phase | Rejected: violates §28 non-goal ("Site Server is a later phase once sync journal types are proven on device") and the explicit non-goals (DO NOT implement sync engine/server/cloud). |
| **C. Build a LAN Site Server now** | Stand up a Node/Go + SQLite server | Rejected: requires §26 MUST-DECIDE backend-language + school-scenario decisions; explicitly deferred. |
| **D. Choose a CRDT library / CRDT-everything** | Eventual-consistency via CRDTs | Rejected at architectural level: §13.2 prefers single-writer-per-resource + domain conflict policy; CRDTs only where truly collaborative (none required now). Do NOT select a library. |
| **E. Choose PostgreSQL now** | Database vendor pre-selection | Rejected: §25 recommends SQLite first; Postgres only when analytics scale needs it. Do NOT prematurely select Postgres. |
| **F. Add the production AuthN stack now** (Argon2id/PBKDF2, token sessions, MFA, OAuth, password reset) | Production-grade authentication | Rejected for TASK-010: explicitly deferred (AUDIT §24.5/§24.6, §18). This phase keeps the TASK-009 Authorization domain intact and does NOT claim prototype auth is production-ready. |
| **G. Begin the Education domain / multi-tenancy now** | Classes/assignments/grading/tenant core | Rejected: explicitly deferred and gated on §24/§26 human decisions; depends on sync/site-server infrastructure. Listed as future-only. |

---

## F. Rationale

1. **Matches the documented roadmap.** The architecture (§13, §28) and the
   audit (§23 Phase 2/4) both place the change journal / sync as the next step
   after the foundation layer is proven on-device. TASK-003–009 completed the
   foundation (storage, versioning, datasets, content, authorization).
2. **Lowest-risk next change set.** Capturing a bounded Change Journal and
   documenting a sync contract changes no runtime behavior and keeps every
   current regression green. It de-risks the hardest design decisions
   (identity, cursor, idempotency, conflict policy) before a server exists.
3. **Preserves offline independence.** The client keeps full local authority;
   sync is additive and non-blocking; the Site Server remains optional.
4. **Reuses existing structures.** `ResultRecord.provenance`, `versions.js`,
   `contentManifest`, and the `CHL.authorization` domain are exact anchors for
   change identity, entity versioning, content bundling, and sync
   authorization respectively.
5. **No premature choices.** No CRDT library, no Postgres, no server language,
   no cloud — consistent with §26 "SHOULD NOT DECIDE YET".

---

## G. Component boundaries

```
 +----------------------------------------------------------+
 | CLIENT (browser PWA)                                     |
 |   - runs fully offline (no server dependency)            |
 |   - CHLDB (transitional mirror) + DataPort (IndexedDB)   |
 |   - Domain modules (chemistry, laboratory, safety,       |
 |     results, content, authorization)                     |
 |   - writes to LOCAL store FIRST                          |
 +--------------------------+-------------------------------+
                            |
                            | appends mutations
                            v
 +----------------------------------------------------------+
 | CHANGE JOURNAL  (persistent, append-only on-device)      |
 |   ChangeRecord: changeId, entityType, entityId, op,      |
 |   version, baseVersion, payloadRef, wallClock, deviceId, |
 |   actorId, orgId(later)                                  |
 |   Cursor/sequence per entity stream                      |
 +--------------------------+-------------------------------+
                            |
                            | reads/writes via SYNC contract
                            v
 +----------------------------------------------------------+
 | SYNC ENGINE  (future implementation; NOT now)            |
 |   push / pull / cursor handling / replay protection      |
 |   / duplicate handling / offline queue / reconnect       |
 +--------------------------+-------------------------------+
          |                                   |
          v                                   v
 +----------------+                +-------------------------+
 | SITE SERVER    |                | FUTURE CLOUD           |
 | (OPTIONAL,     |  <----later---->| (OPTIONAL, NOT now)    |
 |  NOT now)      |   same contract |                        |
 | Local authority|                | Tenant-coded data      |
 | node on LAN    |                | (orgId), media bundles |
 +----------------+                +-------------------------+
```

- **CLIENT ↔ JOURNAL:** the client is the source of writes; it appends to the
  journal in the same local transaction/reliability model as `DataPort`.
- **JOURNAL ↔ SYNC ENGINE:** the single interface between device-local
  persistence and any external transport. No domain module talks to a server
  directly.
- **SYNC ENGINE ↔ SITE SERVER / CLOUD:** one transport-neutral contract. Site
  Server is a LAN peer; Cloud (later) is another transport with tenant scoping.
- **SITE SERVER** is optional; its absence degrades to pure device mode (A).
- **SERVER STORAGE** is behind the same contract; it is not a typed dependency
  of the client.

---

## H. Data ownership

Ground rules (from §13.2 single-writer-per-resource and current code):

- A LabSession / Result / notebook is written solely by its **student + engine**.
- A GradeRecord / submission grade is written by **teacher or auto-assessor**.
- An Assignment is written by a **teacher** (single org site).
- Membership by an **OrgAdmin** (later, multi-tenant phase).
- Content is authored by the **Platform** (one-way, version-gated; no user conflicts).

### Data classification (WHAT should eventually sync vs. stay local)

This phase **documents** the classification; it does not build sync. The table
is advisory for the eventual implementation.

| Data class | Existing home | Sync eligibility | Rationale |
|---|---|---|---|
| **ResultRecords** | `results` collection (`results.js`) | **SYNC-ELIGIBLE** (bounded: capped at 100/device, oldest-first eviction) | They are the core reproducible artifacts a student/teacher must see; carry `provenance`, `versions`, `userId`, deterministic `order` (a natural, already-stable sequence anchor for a cursor). |
| **Submissions** | `submissions` collection (`db.js`) | **SYNC-ELIGIBLE** | Teacher needs them; idempotency keyed `(studentId, assignmentId, attemptNo)` per §13.1. |
| **Assignments** | `assignments` collection | **SYNC-ELIGIBLE** | Teacher-authored; LWW per §13.2. |
| **Classes** | `classes` collection | **SYNC-ELIGIBLE** (membership later org-scoped) | Roster/class structure for teacher console. |
| **User/session state** | `users` collection + `session` (`auth.js`) | **LOCAL-ONLY (credentials/session); account/profile data SYNC-ELIGIBLE in a later phase** | The `session` object is device-local by nature. Passwords are hashed with the prototype djb2 hash only (`db.js hashPassword`) — **NOT production-ready**; credential material must NOT be treated as a sync payload in this phase. Account/profile fields (name, school, role) may later sync under the (future) production auth + enrollment policy. |
| **Progress / achievements / XP / per-user level** | `users[].progress` | **PARTIALLY SYNC-ELIGIBLE (later)** | Game/education analytics; safe to sync once education domain policy (§24.10) is decided. Not this phase's concern beyond a placeholder classification. |
| **Content Packs** | `js/data/content/*` + `contentManifest` | **DO NOT sync (bundle, not user data)** | Content is platform-authored, immutable (`content-v1`, SHA-256 `contentHash`), version-gated; it travels as versioned bundles / HTTP, never as a change journal. |
| **Chemistry/lab/safety domain logic & datasets** | `js/domain/*`, `js/data/reactions.js` | **DO NOT sync (code/immutable dataset)** | Pinned, immutable datasets (`validated-v1`); versioned and distributed, not replicated user state. |
| **Authorization data** | `authorization.js` (static role/permission matrix) | **DO NOT sync (code/config)** | The matrix is code; the canonical vocabulary is static. Sync must respect it via the actor's permission, but the matrix itself is not a journaled entity. |
| **Settings / preferences** | `localStorage` (e.g., locale) + `meta` | **LOCAL-ONLY for now** | Minor; sync only under a later settings-lane decision. |
| **Temporary laboratory state** (in-progress mix/session) | memory / live session | **LOCAL-ONLY (never sync)** | Transient, not durable artifacts; only a completed presented `ResultRecord` is sync-eligible. |

---

## I. Change Journal conceptual schema

A persistent, append-only log of mutating operations on sync-eligible entities.
Conceptual (NOT an implementation):

```
ChangeRecord {
  changeId    : string   // UUID; globally unique, idempotency key
  entityType  : string   // 'result' | 'submission' | 'assignment' | 'class' | ...
  entityId    : string   // id of the affected entity
  op          : string   // 'upsert' | 'delete' (see tombstones)
  baseVersion : number   // version the change was based on (for conflict detect)
  version     : number   // new entity version after this change
  payloadRef  : string   // reference strategy (see below)
  wallClock   : string   // ISO-8601 at origin; informational, NOT ordering truth
  deviceId    : string   // origin/device identity
  actorId     : string   // acting user id (authorization-aware)
  orgId       : string|null // future tenant scoping (multi-tenant phase)
}

ReplicaPosition / Cursor {
  upstream     : string   // sync direction / peer identity
  perEntity    : { entityType+entityId -> lastAppliedVersion }
  lastAckTime  : string|null
}
```

### Field notes

- **Identity:** `changeId` is a UUID generated at the origin device and never
  mutated; replication dedupes on it. Deterministically reproducible where the
  entity has an app-standard id generator (`CHLDB.uid()`) — but a UUID is
  required at the journal level for cross-device uniqueness.
- **Entity/type:** the unit of journaling is a semantic entity (a
  `ResultRecord`, a `Submission`), not a raw storage key. This keeps the
  journal aligned with domain modules rather than the transitional
  localStorage/`kv` representation.
- **Operation:** `upsert`/`delete` for now (extendable). "Create" and "update"
  are both `upsert`; delete is explicit (tombstone-safe).
- **Timestamp/version:** `wallClock` is informational only and never used as
  an ordering authority (ResultRecords already use a deterministic `order`,
  not wall-clock — keep that principle). Ordering truth = per-entity `version`
  and/or the deterministic `order` already present in ResultRecords.
- **Origin/device identity:** `deviceId` plus `actorId`; synchronized with the
  TASK-009 authorization actor model (writes carry a validated `actorId`);
  unknown/guest actor must be resolvable to the permission check at the
  boundary.
- **Payload/reference strategy:** prefer a **payload reference** (store the
  full entity snapshot in the journal, or reference it by
  `entityType+entityId+version`) rather than embedding mutable heavy blobs.
  The concrete strategy (inline payload vs. reference to the store) is an
  open decision (U).
- **Cursor/sequence:** per-entity-or-stream cursors let replicas resume from
  the last applied version and exchange "changes since cursor" (§13.1).
- **Idempotency:** `changeId` dedupe; no double-apply regardless of order.
- **Acknowledgement:** a peer acks a cursor position, not individual changes;
  an ack means "all changes <= cursor applied durably".
- **Retry:** per-change retry with exponential backoff; the queue persists;
  partial sync resumes from cursor (§13.1).
- **Tombstones/deletions:** `op:'delete'` produces a tombstone ChangeRecord so
  deletes propagate; tombstone cleanup/retention is an open decision (U).

---

## J. Sync protocol contract (conceptual)

Conceptual contract for the eventual Sync Engine; NOT implemented now.

- **Push:** client sends `changes since <localCursor>` (bounded batch) to the
  peer; peer applies idempotently (`changeId` dedupe), persists, then acks the
  new cursor.
- **Pull:** client sends its known cursors; peer returns changes since those
  cursors plus the peer's current cursor.
- **Cursor handling:** each replica tracks `ReplicaPosition`; exchange is
  `cursor + changes since cursor`. Never a full re-read.
- **Replay protection:** idempotent `changeId`s; media bundles / transport
  payloads signed (later); server-side ack allows safe replay of un-acked
  batches.
- **Duplicate handling:** dedupe on `changeId`; efficiency/payload is reused
  on retry without re-applying.
- **Offline queueing:** any transport failure is non-fatal; the journal holds
  changes; local operations never block on sync.
- **Reconnect behavior:** on reconnect, exchanges cursors, negotiates the
  diff, applies missing changes, acks, and (later) raises conflict records for
  review per domain policy.

---

## K. Cursor / idempotency model

- **Source of cursor truth:** per-entity `version` (a monotonic counter) and,
  for ResultRecords specifically, the existing deterministic `order` — reuse
  these rather than inventing a parallel sequence.
- **Idempotency:** `changeId` (UUID) is the sole de-dup key; a change is a
  "create/update/delete" of one entity at one `version`.
- **Ack model:** ack = "durably applied through cursor C", enabling replay of
  exactly the un-acked tail.
- **Failure semantics:** failures are observable (mirror existing
  `DataPort.status()` / `CHLDB.storageStatus()` nondestruction principle: a
  failed sync is never claimed successful).

---

## L. Conflict-resolution policy (architectural level only)

- **Avoid conflicts by single-writer-per-resource** (§13.2): a LabSession/
  Result is written only by its student + engine; a GradeRecord only by
  teacher/auto-assessor; an Assignment only by a teacher. Most education data
  converges cleanly and needs no merge.
- Where multi-writer exists (org settings, assignment edits), use
  **deterministic domain-specific rules**, e.g. last-write-wins per scalar
  field with a surfaced `ConflictRecord` for review — never silent auto-merge
  of grades.
- No CRDT library is selected. CRDTs are used only where truly collaborative
  (none required now). Postgres is not selected. These remain in
  "SHOULD NOT DECIDE YET".

---

## M. Offline / reconnect behavior

- The laboratory core operates fully offline; sync is strictly additive.
- Offline: mutations append to the journal locally; queue persists.
- Reconnect: cursor negotiation, delta exchange, idempotent apply, ack.
- Any sync failure is non-fatal and observable; the device remains the
  authority while disconnected (matching §18 "offline ≠ insecure" with the
  same local PDP policy bundle in a later production-auth phase).

---

## N. Security boundaries

- **The TASK-009 `CHL.authorization` domain stays intact and authoritative**
  for application-level authorization (roles, permissions, fail-closed deny).
  It is pure, deterministic, storage/DOM/network-free — the sync boundary must
  call `authorize(actor, permission)` and never bypass it.
- **Do NOT claim the prototype authentication is production-ready.** Current
  auth: localStorage session `{userId, ts}`, no session expiry (TASK-009
  explicitly left expiry out of scope), djb2-style `hashPassword` (reversible,
  demo-only). Sync design must assume NO trust in a client-held credential and
  MUST NOT treat credential material as a sync payload.
- Sync writes must carry an `actorId` validated through the same role/permission
  vocabulary; a guest resolves to `'user'` per `authorization.js`.
- All sync is over authenticated/associated peers in later phases; media
  bundles are signed later. Content is one-way and version-gated so a peer can
  never push content as user data.
- Credential/profile separation: session state = local-only; only bounded,
  non-credential account/profile data may later sync under a production-auth +
  enrollment policy (future).

---

## O. Future LAN Site Server boundary

- The Site Server is an **optional deployable** LAN node that implements the
  same sync contract as a peer.
- It must **not** become a hard runtime dependency of the laboratory's core
  offline operation; its absence degrades cleanly to device mode.
- Server storage sits behind the same contract (SQLite preferred by §25 when
  a server exists; NOT chosen now).
- Site Server requires §26 MUST-DECIDE items (school-scenario requirement,
  backend language) — a human decision before building it.

---

## P. Future Cloud extensibility

- Cloud is **NOT part of this phase.** Design keeps cloud as *another
  transport* over the same contract with tenant scoping (`orgId`) and signed
  media bundles so the design does not foreclose it. No cloud dependency is
  introduced now.

---

## Q. Explicit non-goals

This phase does NOT implement any of:
- Sync Engine runtime
- Change Journal runtime/persistence
- Site Server
- Backend API
- Cloud
- PostgreSQL
- Node/Go server
- CRDT library
- Multi-tenancy
- Education domain
- OAuth/SSO, MFA, password reset
- Production authentication
- Real 3D
- AI
- PWA update system
- Build tooling migration

---

## R. Dependencies

On prior completed tasks (all verified green):
- **TASK-003** — `DataPort` (IndexedDB), `CHLDB` mirror, `SCHEMA_VERSION=2`,
  provenance stamps → the durability + versioning anchor for the journal.
- **TASK-004/005** — Chemistry/Laboratory/Safety domains → the entities that
  produce sync-eligible `ResultRecord`s.
- **TASK-006** — Result Records (`provenance`, `versions`, deterministic
  `order`, `userId`, cap/eviction) → the primary sync-eligible artifact and a
  proven stable sequence for cursors.
- **TASK-007** — validated chemistry dataset (`validated-v1`) → versioned,
  immutable dataset that is bundled, not journaled.
- **TASK-008** — Content Packs + `contentManifest` (`content-v1`) → versioned
  content that travels as bundles, not change records.
- **TASK-009** — `CHL.authorization` (fail-closed) → the authority the sync
  boundary must enforce; must remain intact.

Forward dependencies (future, NOT this phase): the Site Server (requires
§26 backend/school decisions); the Education domain and multi-tenancy (require
§24.6/§24.7/§24.10 + the sync/journal types proven on-device); production
authentication/enrollment (requires §24.5/§18.1).

---

## S. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Sync design is built without a server, risking an un-proven prototype | Med | Keep this phase spec+conceptual only; de-risk identity/cursor/conflict decisions on-device first (§28 ordering). |
| A future Site Server becomes a de-facto hard dependency | High | Enforce the node-optional boundary; client must be verifiable offline with no server present. |
| Prototype auth treated as production | High | Explicit security boundary: not production-ready; credential material never syncs; `authorize()` never bypassed. |
| Content accidentally journaled as user data | Med | Content is one-way, version-gated bundles; excluded from the change journal. |
| Scope creep into education/sync/server/cloud | High | Hard non-goals list; this phase changes no runtime code. |
| ResultRecords eviction collides with sync capture | Med | Journal captures changes before/at persistence; eviction is a client retention policy, not a sync-deletion signal (tombstone model separate). |
| Version drift in `versions.js` | High | Version constants are protected and unchanged by this phase; journal references versions, never mutates them. |

---

## T. Acceptance criteria for the eventual implementation TASK-010

These are **proposed** acceptance criteria for the future implementation
process (NOT an official spec, and NOT to be implemented now):

1. Client remains fully functional and all four `test/verify.ps1` contexts
   (online fresh, offline preload, offline run1, offline run2) stay 100/100
   with 0 runtime errors; 10/10 pages load.
2. Content/chemistry/authorization validators all PASS; the content manifest
   hash and all version constants are unchanged.
3. A `ResultRecord`'s successful creation appends exactly one idempotent
   journal change with a stable `changeId`, valid `actorId`, and correct
   `entityType`/`entityId`/`version`; no change is generated for
   blocked/unknown/fail-closed outcomes (mirrors `results.js shouldPersist`).
4. Cursor resume + idempotent replay + duplicate-suppression behave correctly
   under a documented unit scenario.
5. Offline queueing: local operations never block on sync; a simulated
   transport failure is non-fatal and observable.
6. The `CHL.authorization` module is byte-unchanged and every journaled change
   is gated through `authorize(actor, permission)` in the design.
7. No Site Server, cloud, backend, database vendor, CRDT library, or production
   auth is required to run — documented non-goals hold.
8. The classification table (section H) is honored: content/domain/dataset/
   auth-matrix stay local/static; session+credentials stay local-only; only
   bounded well-defined user data is sync-eligible.

---

## U. Open architectural decisions (MUST resolve before implementing)

Before the real Sync Engine / Site Server is built, a human must resolve:

1. **Payload strategy**: inline full entity snapshot in the journal vs.
   reference-by-`entityType+entityId+version`. (This phase defines both; pick
   one for implementation.)
2. **Sync eligibility triggers**: when does an entity become sync-eligible and
   what wakes the (future) sync engine (manual, on-write, periodic)?
3. **Tombstone retention/cleanup** policy for `delete` changes.
4. **Session/credential policy** and whether any account/profile field besides
   `ResultRecord`s/submissions may sync (needs §24.5/§18.1 production-auth +
   enrollment decision).
5. **Education-domain scope** (assignments/classes/submissions sync shape)
   driven by §24.6/§24.10 — only needed once that domain starts.
6. **Media bundle format** for air-gapped transfer (signed bundles), deferred.
7. **Org/tenant scoping** (`orgId`) — deferred to multi-tenancy phase (§24.7).
8. **Site Server requirement/backend language** — the §26 MUST-DECIDE items,
   deferred.
9. **Cloud ownership & model** — deferred (§26, §24.6), out of this phase.

---

## Cross-reference to protected constraints

- `SCHEMA_VERSION`, `CHEMISTRY_DATA_VERSION`, `CONTENT_VERSION`, `APP_VERSION`
  are NOT changed (and `CONTENT_VERSION` stays bound to the manifest).
- `sw.js` (service worker) NOT modified.
- No runtime/application code, no tests, no domain modules are modified.

---

## Final Decision Summary (this ADR)

| Proposed | Verdict |
|---|---|
| Direction: Local-first + Offline-first + optional LAN Site Server + Sync Foundation/Change Journal | **ACCEPT** — correct next phase, matches §13/§28/§23 |
| Name: "Sync Foundation & Change Journal" | **ACCEPT as proposed official title** (consistent with the architecture's own "Sync Engine / change journal" roadmap language) |
| Implementation now | **REJECT** — spec-only this phase (non-goal) |
| Site Server / Cloud / backend / DB vendor / CRDT / production auth now | **REJECT** — non-goals, deferred |

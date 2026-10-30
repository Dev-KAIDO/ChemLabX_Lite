# TASK-010 — Sync Foundation & Change Journal — Specification

**Status:** PROPOSED SPECIFICATION (documentation only; no implementation)
**Decision record:** `docs/architecture/DECISION-TASK-010.md`
**Scope:** Conceptual architecture & contract for the future Sync Foundation.
**Non-goals:** No runtime sync engine, no Change Journal runtime, no Site
Server, no backend, no cloud, no DB vendor, no CRDT, no auth change.

> This document specifies the **conceptual** Change Journal model and the
> **proposed** synchronization contract so that the eventual implementation
> (a later approved task) has an agreed foundation. Nothing here is executed.
> This is a proposal, not an official spec, until accepted by a human.

---

## 1. Purpose

Provide a durable, offline-first, vendor-neutral definition of:

1. What a **change** is (identity, entity, operation, version, origin,
   payload, idempotency).
2. How replicas reason about **what changed** (cursor/sequence) and
   **reconnect** without loss or duplication.
3. How **conflicts** are resolved for the bounded set of sync-eligible data.
4. Where the **boundaries** are between client, journal, sync engine, site
   server, server storage, and cloud.
5. How **authorization** (TASK-009) and **versioning/provenance**
   (TASK-003/006/008) constrain the model.

It does not define a UI, a server implementation, a transport, or cluster
state.

---

## 2. Glossary

- **Replica** — an independent copy of a bounded data set that can apply and
  author changes (a client device, a future site server, a future cloud).
- **Change** — the minimal unit of replication; one mutate of one entity.
- **Change Journal** — append-only persistent log of changes authored on a
  replica.
- **Cursor / ReplicaPosition** — the last applied change position per peer /
  entity stream; basis for delta exchange.
- **Entity** — a semantic unit (e.g., a `ResultRecord`, a `Submission`).
- **Sync-eligible** — data class selected for replication (see DECISION §H).

---

## 3. Component boundaries

```
 CLIENT ───────────► CHANGE JOURNAL ◄────────── SYNC ENGINE
  (author, offline)      (on-device)                │   (future)
        ▲                   │                        │
        │ local store       │ appends                │ push/pull/cursor/ack
        │ (DataPort/CHLDB)  ▼                        ▼
                    (SITE SERVER   ──────────►   SERVER STORAGE)
                    optional peer                  SQLite (future)
                          ▲
                          │ same contract
                     (FUTURE CLOUD — later, out of phase)
```

- **Client** is always functional offline; it is the authority while
  disconnected.
- **Change Journal** is the single on-device interface between domain writes
  and any transport. Domain modules never talk to a server.
- **Sync Engine** (future) implements push/pull/cursor/idempotency/queue over
  one neutral contract.
- **Site Server** (future/optional) is a peer on the LAN; never a hard
  dependency; absence degrades to device mode.
- **Server Storage** and **Future Cloud** sit behind the same contract; cloud
  adds tenant scoping (`orgId`) and signed media bundles.

---

## 4. Change Journal conceptual schema

Conceptual record (NOT an implementation):

```
ChangeRecord {
  changeId    : string     // UUID, global, immutable, idempotency key
  entityType  : string     // e.g. 'result' | 'submission' | 'assignment' | 'class'
  entityId    : string     // id of the affected entity
  op          : 'upsert' | 'delete'
  baseVersion : number     // version the origin was based on (conflict detection)
  version     : number     // new entity version after this change
  payloadRef  : string     // reference or inline snapshot (decision U1)
  wallClock   : string     // ISO-8601 at origin; informational only
  deviceId    : string     // origin device identity
  actorId     : string     // acting user id (authorization-aware)
  orgId       : string|null// future tenant scoping (multi-tenant phase)
}

ReplicaPosition {           // per-replica cursor
  peer     : string
  byStream : { streamKey -> lastAppliedVersion }
  ackTime  : string|null
}
```

### 4.1 Identity and uniqueness
- `changeId` is a **UUID generated at the origin device**; it is never mutated
  and is the sole de-dup key across all replicas.
- Where the app already has a stable entity id (`CHLDB.uid()`), the journal
  reuses the *entity's* id for `entityId`; the journal *change* still needs its
  own unique `changeId`.

### 4.2 Entity/type and operation
- Journaling is at the **semantic entity** level (a `ResultRecord`, a
  `Submission`), aligned with domain modules, not with the transitional
  localStorage/`kv` key space.
- `upsert` covers create and update; `delete` produces a tombstone record.

### 4.3 Timestamp / version
- `wallClock` is informational; it is **never** an ordering authority (matching
  `results.js`, which uses a deterministic `order`, not wall-clock).
- Ordering truth is the per-entity `version` counter, and for ResultRecords the
  existing deterministic `order` field.

### 4.4 Origin / device identity
- `deviceId` + `actorId` record who/where. Writes are authorization-gated.

### 4.5 Payload / reference strategy
- **Option 1 (inline):** the full immutable entity snapshot embedded in the
  change. Pros: self-contained replay/audit. Cons: larger journal, storage
  duplication.
- **Option 2 (reference):** store `entityType+entityId+version`; the reader
  resolves the latest entity from the local store. Pros: smaller. Cons: replay
  of a historical state requires the store.
- Both are valid; **pick one** (open decision U1) before implementation.

### 4.6 Cursor / sequence
- Per-entity/stream cursors resume delta exchange from the last applied
  version; never a full re-read.

### 4.7 Idempotency / acknowledgement / retry
- **Idempotency:** dedupe on `changeId`; a change is at-most-once applied even
  if received multiple times or out of order.
- **Ack:** a peer acks a **cursor position** ("all changes <= C durably
  applied"), not an individual change; un-acked changes are replayed safely.
- **Retry:** per-change exponential backoff; queue persists; partial sync
  resumes from cursor. Any transport failure is non-fatal and observable
  (mirrors `DataPort.status()`/`CHLDB.storageStatus()` non-swallow principle).

### 4.8 Tombstones / deletions
- A delete is a tombstone ChangeRecord. Retention/cleanup of tombstones is an
  open decision (U3).

---

## 5. Synchronization contract (proposed)

### 5.1 Push
Origin sends `changes since <localCursor>` (bounded batch). Peer applies
idempotently (`changeId` dedupe), persists durably, then acks the new cursor.

### 5.2 Pull
A replica sends its known cursors; peer returns changes since those cursors
plus its current cursor.

### 5.3 Cursor handling
Exchange is always `cursor + changes since cursor` (delta), never a
re-read.

### 5.4 Replay protection
- Idempotent `changeId` de-dupes retries.
- Later, transport/media payloads are signed (bundles); an ack allows safe
  replay of exactly the un-acked tail.

### 5.5 Duplicate handling
Dedupe on `changeId`; a retried batch reuses payloads without re-apply.

### 5.6 Offline queueing
Any transport failure queues; local operations never block on sync. The device
remains authoritative while disconnected.

### 5.7 Reconnect behavior
On reconnect: exchange cursors → negotiate delta → apply missing changes
idempotently → ack → (later) surface `ConflictRecord`s for domain review.

---

## 6. Conflict-resolution policy (architectural)

- **Prefer single-writer-per-resource** (§13.2): a `ResultRecord` is written by
  its student + engine; a `GradeRecord`/submission grade by teacher/auto-
  assessor; an `Assignment` by a teacher. No merge is needed for these.
- For multi-writer cases (org settings, assignment edits): **deterministic,
  domain-specific rules** — e.g., last-write-wins per scalar field with a
  surfaced `ConflictRecord` for review. Never silent-merge grades.
- No CRDT library is selected; no Postgres. These stay "SHOULD NOT DECIDE
  YET" (§26).

---

## 7. Data-class sync eligibility

| Data class | Sync | Note |
|---|---|---|
| ResultRecords | YES (bounded) | cap/eviction retained; journal before/at persist |
| Submissions | YES | idempotency key `(studentId, assignmentId, attemptNo)` |
| Assignments | YES | teacher LWW |
| Classes | YES | membership org-scoped later |
| Session + credentials | LOCAL-ONLY | never sync this phase |
| User profile/account | later | needs production auth + enrollment policy |
| Progress/achievements/XP | later | needs §24.10 |
| Content Packs | NO | version-gated bundles |
| Chemistry/lab/safety logic+datasets | NO | code/immutable dataset |
| Authorization matrix | NO | static code/config |
| Settings/preferences | LOCAL-ONLY | later |
| Temporary lab state | NO | transient; only a completed presented ResultRecord is eligible |

---

## 8. Security boundaries

- `CHL.authorization` (TASK-009) stays intact and authoritative; the sync
  boundary must call `authorize(actor, permission)` and never bypass it.
- **Prototype auth is NOT production-ready**: localStorage session `{userId,
  ts}`, no expiry (TASK-009 left expiry out of scope), djb2-style `hashPassword`
  (demo only). No client-held credential is trusted; credential material never
  enters a sync payload.
- Every Journaled change carries a validated `actorId`; unknown/guest resolves
  to `'user'` per `authorization.js`.
- Content is one-way + version-gated; a peer can never push content as user data.

---

## 9. Offline / reconnect behavior (spec detail)

- Core lab operates fully offline; sync additive.
- Offline: mutations append to journal locally; queue persists.
- Reconnect: cursor negotiation → delta exchange → idempotent apply → ack.
- Any sync failure non-fatal + observable; device is authority while offline
  (aligned with §18 "offline ≠ insecure", with the same local PDP/bundle in a
  later production-auth phase).

---

## 10. Versioning & provenance rules (must respect)

- `SCHEMA_VERSION=2`, `CHEMISTRY_DATA_VERSION=validated-v1`,
  `CONTENT_VERSION=content-v1` (bound to manifest), `APP_VERSION`,
  `ENGINE_VERSION`, `SAFETY_MODEL_VERSION` — **all unchanged by this phase**.
- The journal references these versions for provenance; it must never mutate
  them.
- `ResultRecord` provenance (`CHL.provenance`) is the audit anchor; journal
  changes must not split/corrupt it.

---

## 11. Open decisions (MUST resolve before real implementation)

1. **Payload strategy** — inline vs. reference (choose one).
2. **Sync eligibility trigger** — manual / on-write / periodic; what wakes the
   future engine.
3. **Tombstone retention** — retain vs. compact `delete` records.
4. **Account/profile sync** — which non-credential fields may sync (needs
   §24.5/§18.1).
5. **Education-domain sync shape** — assignments/classes/submissions (needs
   §24.6/§24.10).
6. **Media bundle format** — signed bundles for air-gapped transfer (deferred).
7. **`orgId` tenant scoping** — multi-tenancy phase (deferred).
8. **Site Server requirement / backend language** — §26 MUST-DECIDE (deferred).
9. **Cloud ownership/model** — deferred, out of phase.

---

## 12. Non-goals (repeat)

Do NOT implement now: Sync Engine, Change Journal runtime, Site Server, backend
API, cloud, PostgreSQL, Node/Go server, CRDT library, multi-tenancy, Education
domain, OAuth/SSO/MFA/password-reset, production authentication, real 3D, AI,
PWA update system, build tooling migration.

---

## 13. Out of scope for verification in this phase

No tests, no runtime code, no page behavior are changed. The existing green
baseline (content/chemistry/authorization validators + `verify.ps1` 100/100 in
4 contexts) is unaffected because nothing in the repo changes.

---

## 14. Relationship to existing artifacts

- `CHEMLABX_ARCHITECTURE.md` §12 (offline data model), §13 (Sync Engine),
  §14 (data ownership), §15 (versioning/reproducibility), §18 (security),
  §28 (next task).
- `AUDIT_REPORT.md` §23 (roadmap phases), §24 (human decisions), DO-NOT-
  IMPLEMENT (L495–509).
- `js/core/dataport.js` (`DataPort`), `js/core/db.js` (`CHLDB`),
  `js/core/versions.js`, `js/domain/results.js`, `js/domain/authorization.js`,
  `js/data/content/manifest.js`.
- `docs/architecture/04-sync-architecture.mmd` (diagram source).

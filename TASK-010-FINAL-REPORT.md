# TASK-010 FINAL VERIFICATION REPORT
**Sync Foundation & Change Journal (local-first / offline-first scope)**
**Status: COMPLETE & VERIFIED — all gates green**

---

## 1. Summary

TASK-010 implemented the approved **Sync Foundation & Change Journal** (Decision
`ACCEPT` in `docs/architecture/DECISION-TASK-010.md`, spec `docs/architecture/
SYNC-FOUNDATION-SPEC.md` and `TASK-010-SPEC.md`). Direction taken: **local-first /
offline-first**; a **persistent, on-device Change Journal** with a spec-faithful
`ChangeRecord` model, per-entity version ordering, idempotency by `changeId`, cursor /
replay delta, tombstones, and fail-closed validation. A future LAN Site Server is kept
optional; **no Cloud, no Site Server, no backend, no CRDT, no multi-tenancy, no Education
domain, no production auth** were introduced. The journal is wired at the **exact
real persistence boundary** for sync-eligible `ResultRecord`s (`js/lab/engine.js`
`Results.persist`); it contains **no** chemistry/safety/lab/results/authorization
business logic, and it never makes the persist/award decision.

The full regression baseline is preserved: **111 PASS / 0 FAIL in all four verify
contexts** (previous 100 + 11 new Change Journal checks). All version pins unchanged,
no migration, no schema change, and **no protected file was modified**.

## 2. Files Created

| File | Purpose |
|---|---|
| `js/domain/changejournal.js` | Pure, deterministic, persistent Change Journal → `window.CHL.changeJournal`. ChangeRecord schema (all 11 spec fields), per-entity versioning, idempotent append, cursor/replay/ack, tombstones, fail-closed validation. Persists via the existing **CHLDB** boundary (`changelog` → `chemlabx_changelog`), with IndexedDB durability forwarded through `DataPort`. |
| `test/validate_changejournal.py` | Deterministic, stdlib-only source-contract validator for the Change Journal (schema fields, OPS, approved entity vocabulary, fail-closed guards, version-not-wallClock ordering, orgId inertness, idempotency, CHLDB-only persistence, no domain-logic leak). **PASS.** |

## 3. Files Modified (authorized)

| File | Change |
|---|---|
| `js/core/auth.js` | Added `ensureChangeJournal()` — dynamic injection of `js/domain/changejournal.js` mirroring the existing `ensureAuthorization()` pattern, invoked at boot. Exposes `CHLAuth.ensureChangeJournal`. **No HTML page changed.** |
| `js/lab/engine.js` | Added a **defensive journal hook** immediately after the existing `Results.persist(Results.build(...))` call (the real ResultRecord persistence boundary, lines ~163–171). Journaling an `'result'` upsert **only after `Results.persist` succeeds**, deriving `actorId` from `CHLAuth.currentUser()` (fallback `'system'`), wrapped in try/catch so a journal failure **never breaks performMix**. `engine.js` is not a protected domain. |
| `test/harness.html` | **Test fixture (approved)** — added `<script src="../js/domain/changejournal.js">` static tag (needs `CHLDB`, so placed after `results.js`) + TASK-010 **J-suite (J1–J10)**, plus `clear()` baseline restoration so fresh/reused/offline runs stay deterministic. |

## 4. Files NOT modified (authorized but determined not strictly required)

| File | Reason |
|---|---|
| `js/domain/results.js` | Protected. The journal references the immutable output of `Results.persist` by id; `results.js` needed no change. Untouched. |
| `test/verify.ps1` | Auto-detects PASS/FAIL from the harness summary — no hardcoded count to update. Untouched. |

## 5. Protected Files Verification

The following were **NOT modified** (verified by scope of edits — only the authorized
files above were touched):

- `js/domain/chemistry.js`, `js/domain/laboratory.js`, `js/domain/safety.js`,
  `js/domain/results.js`, `js/domain/authorization.js`
- `js/core/dataport.js`, `js/core/db.js`, `js/core/versions.js`
- `sw.js`, `manifest.webmanifest`, `css/*`, **all `*.html` app pages**
- Persisted user/session/result data, `SCHEMA_VERSION=2`, `CHEMISTRY_DATA_VERSION=
  'validated-v1'`, `CONTENT_VERSION='content-v1'`, `APP_VERSION='4.0.0-foundation'`

**No protected-file exception was required or made.** The new `changejournal.js` module
is loaded at runtime by `js/core/auth.js` (already present on every page) using the app's
established dynamic script-injection pattern — **no HTML `<script>` tag was added to any
protected page.** The harness (modifiable fixture) loads it via a static tag for
deterministic suite execution. `sw.js` is unchanged; `changejournal.js` is a cached local
asset that follows the app's uniform network-broadcast cache (identical online/offline),
so offline behavior is preserved.

## 6. Design Decision

A **new self-contained module** `js/domain/changejournal.js` exposing
`window.CHL.changeJournal`, which:

- Persists **through the existing `CHLDB` boundary** (dedicated key `changelog` →
  `chemlabx_changelog`), with a synchronous authoritative in-memory copy + localStorage
  mirror + IndexedDB durability forwarded via `DataPort`. **No second persistence
  abstraction** and **no `db.js`/`dataport.js` modification**.
- Maintains a **synchronous per-entity `version` counter** as order truth — never
  `wallClock` (info-only).
- Enforces **idempotency by immutable `changeId`** (duplicate append ignored, existing
  change returned).
- Provides a **global cursor** (`cursor()`) + per-entity versions, `replayFrom(cursor)`
  delta, `advanceCursor(c)` + `pending()` (un-acked offline-queue read model for a future
  sync engine), and `tombstone()` (`op:'delete'`).
- Is **fail-closed**: invalid `entityType` / `op` / `version` / `baseVersion` (e.g.
  `baseVersion > version`) and impossible cursor states are **rejected (throw)**, and
  malformed persisted data is ignored on hydration rather than trusted.
- Is **append-only** (no auto-eviction) so the offline queue is retry-safe; growth is a
  documented limitation (`status()` exposes it; a future sync engine prunes acked).
- Exposes `ENTITY_TYPES = ['result','submission','assignment','class']` (fixed,
  fail-closed, sync-eligible set) and `OPS = ['upsert','delete']`. `orgId` is a
  **future-compatible, always-null field** used in no decision.

## 7. ChangeRecord Schema (spec §4 — implemented exactly)

All 11 spec fields are emitted by `createChange`. `J1b` PASS confirms defaults.

| Field | Type / meaning | Default |
|---|---|---|
| `changeId` | UUID, immutable, idempotency key | generated |
| `entityType` | sync-eligible entity (`result`/`submission`/`assignment`/`class`) | — |
| `entityId` | entity instance id | — |
| `op` | `'upsert'` \| `'delete'` | — |
| `baseVersion` | entity version before this change | 0 |
| `version` | entity version after this change (`baseVersion+1` on `record`) | `baseVersion+1` |
| `payloadRef` | reference key (`entityType:entityId`) | `entityType:entityId` |
| `wallClock` | ISO, **informational only** — never order truth | now |
| `deviceId` | device/source id | `'local-device'` |
| `actorId` | acting user id (or `'system'`) | `'system'` |
| `orgId` | **future-compatible, inert** (always null this phase) | `null` |

Ordering truth = per-entity `version` counter (plus the existing deterministic
`ResultRecord.order` for results). Idempotency = `changeId`. Ack = cursor position.
Append-only journal; delete = tombstone.

## 8. Fail-Closed Guarantees

- **Input validation:** invalid `entityType` (not in the fixed set), invalid `op`,
  non-integer/negative versions, and `baseVersion > version` all **throw** in both
  `createChange` and `append` (`validChange` guard). Journaling UI/theme/language/
  session/temp state is impossible (not in `ENTITY_TYPES`).
- **Ordering integrity:** `append` rejects a change whose `baseVersion` is below the
  entity's current version (out-of-order), so the per-entity version chain never
  regresses.
- **Idempotency:** re-appending an existing `changeId` is ignored (returns existing).
- **Persistence:** reuses CHLDB/DataPort; quotas/errors are recorded in `status().failures`
  (non-swallow) and never corrupt in-memory state; malformed persisted journal data is
  discarded on hydrate (fail closed), leaving the underlying `results` store untouched.
- **Defensive wiring:** the engine hook is wrapped in try/catch — a missing module or a
  journaling error **never breaks performMix** (verified: all lab/persistence suites
  green).

## 9. J-Suite Results (harness TASK-010)

All checks PASS in all four contexts (online fresh, offline preload, offline run1,
offline run2):

| ID | Check | Result |
|---|---|---|
| J1 | Module + API surface present | PASS |
| J1b | Schema: createChange emits all required fields with correct defaults | PASS |
| J2 | Fail-closed: invalid entityType/op/version REJECTED | PASS |
| J3 | Versioning: monotonic per-entity; duplicate changeId ignored | PASS |
| J4 | Cursor: replayFrom delta + advanceCursor pending queue | PASS |
| J5 | Tombstone: delete op recorded, version advanced | PASS |
| J6 | Ordering by version/append, not wallClock | PASS |
| J7 | Persistence: journal state round-trips via CHLDB | PASS |
| J8 | No domain business logic inside Change Journal | PASS |
| J9 | Integration: real performMix journals one result upsert | PASS |
| J10 | clear() restores empty baseline (deterministic/offline-safe) | PASS |

> **J9 note:** a real safe `performMix` (HCl+NaOH → ok/allow) triggers the engine's
> journal hook exactly once — `CJ.list()[0]` is a `result` `'upsert'` at `version 1`,
> journal count === 1. The journaled `entityId` is the persisted `ResultRecord.id`
> (from `Results.persist`), distinct from the engine's transient `lastResult.id` — the
> journal references the **immutable persisted record**, which is the correct
> sync-eligible identity.

## 10. Validator Results

| Validator | Command | Result |
|---|---|---|
| Change Journal | `python test/validate_changejournal.py` | **PASS** (ops 2, entity types 4, 11 schema fields) |
| Authorization | `python test/validate_authorization.py` | **PASS** |
| Content | `python test/validate_content.py` | **37/37 PASS / 0 FAIL** |
| Chemistry | `python test/validate_chemistry.py` | **PASS** — 185 materials / 28 reactions / 14 experiments |

## 11. Full Regression Results (all four contexts)

`powershell -NoProfile -ExecutionPolicy Bypass -File .\test\verify.ps1`

| Context | PASS | FAIL | Completed |
|---|:---:|:---:|:---:|
| Online fresh | **111** | 0 | ✅ |
| Offline preload (online) | **111** | 0 | ✅ |
| Offline run1 | **111** | 0 | ✅ |
| Offline run2 | **111** | 0 | ✅ |

**111 = 100 prior + 11 new Change Journal checks.** All previous checks remain green
(TASK-003 migration/data, TASK-004 chemistry/lab, TASK-005 safety, TASK-006 result
records, TASK-007 chemistry counts, TASK-008 content, TASK-009 authorization). No fails.

## 12. Pages / Runtime Errors / Offline

- **10/10 pages OK**: all pages load, `dom>300`, no JS errors, no legacy refs.
- **0 runtime errors**: zero `Uncaught/SyntaxError/ReferenceError/TypeError/`
  `Failed to load resource` in any `.err` file (harness online + offline, all pages).
  `changejournal.js` and the `ensureChangeJournal()` injection loaded cleanly everywhere,
  including `lab.html` (dynamic injection, no static tag).
- **Offline SW intact**: offline index served from SW cache; offline harness runs PASS
  111/111. The new module follows the app's existing uniform network-broadcast cache
  behavior (identical online/offline), so **offline behavior is preserved** with **no
  `sw.js` change**.

## 13. Migration / Schema / Version Verification

- **SCHEMA_VERSION = 2** (unchanged) ✅
- **CHEMISTRY_DATA_VERSION = 'validated-v1'** (unchanged) ✅
- **CONTENT_VERSION = 'content-v1'** (unchanged) ✅
- **APP_VERSION = '4.0.0-foundation'** (unchanged) ✅
- **No migration added.** No IndexedDB store/version change (`db.js`/`dataport.js`
  untouched). No `ResultRecord` schema/provenance-shape change. Existing records
  untouched.

## 14. ResultRecord / Domain Compatibility

`results.js`, `chemistry.js`, `laboratory.js`, `safety.js`, `authorization.js` were **not
modified** — fail-closed behavior verified intact (harness E/S/R/A suites and all four
validators green). The journal hook sits **after** `Results.persist` in `engine.js` and
only records a reference to the already-persisted result; it never re-derives, never
awards, never mutates safety state. Existing stored results are untouched.

## 15. Data Integrity / Determinism

- **No data loss**: harness A1–A8 (migration/integrity) pass.
- **Deterministic multi-context runs**: the J-suite begins and ends with
  `changeJournal.clear()` (persisting the empty baseline), mirroring the probe-scrubbing
  pattern, so no journal entry from a prior context leaks into later fresh/reused/offline
  runs. J10 PASS confirms the empty baseline is restored.
- **Idempotency**: duplicate `changeId` appends are ignored (J3 PASS) — retry-safe.

## 16. Guardrail Compliance

- **wallClock** is stored informationally and **never used for ordering** (J6 PASS;
  validator asserts no wallClock compare/sort; version/append drive order).
- **orgId** exists only as a future-compatible, always-null field; it is **not** used in
  any identity/version/authorization decision (validator PASS).
- **No silent grade merge**, **no CRDT**, **no Cloud/Site Server/backend** — the
  foundation is a local append-only journal + cursor/delta model ready for an optional
  future sync transport.
- **Change Journal contains NO domain business logic** (J8 PASS); only generic,
  sync-eligible change capture.
- **Only sync-eligible persistent entities** are journalable (`ENTITY_TYPES`); ephemeral
  UI/session/theme/language/temp state is rejected fail-closed.
- For this phase, the only real sync-eligible write path is `ResultRecord` persistence,
  and the journal is wired exactly there.

## 17. Deviation from GO

None. All GO rules honored. The protected `results.js` required no change; the journal
references its persisted output by id. No protected-file exception was required.

## 18. Conclusion

TASK-010 is **COMPLETE & VERIFIED**. The Sync Foundation & Change Journal is delivered,
spec-faithful, fail-closed, persistent, append-only and offline-first, wired at the real
ResultRecord persistence boundary with no domain-logic leak and no protected-file
modification. J-suite green (11 checks), deterministic validator added (PASS), full
regression **111/111 in all four contexts**, 10/10 pages, 0 runtime errors, offline
intact, versions pinned, no migration, no schema change.

**STOP** — per GO rule 19, no TASK-011 was started and no speculative cleanup/refactoring
beyond this scope was performed.

# POST-TASK-010 RECONCILIATION AUDIT

**Audit type:** Read-only reconciliation of documentation history, task states, and the real implementation.
**Audit basis:** `CHEMLABX_ARCHITECTURE.md` (binding architectural reference), `TASK-008-AUDIT.md`, `AUDIT_REPORT.md`, the TASK-003→TASK-010 final reports, `TASK-010-SPEC.md`, `docs/architecture/SYNC-FOUNDATION-SPEC.md`, `docs/architecture/DECISION-TASK-010.md`, the current source tree, and the current test/validator suite.
**Status of this pass:** **AUDIT ONLY.** No application code, versions, schema, service worker, HTML/CSS, validator, test, or persisted data was modified. The single deliverable is this document; a fresh read-only regression pass was executed (see §4).

---

## 1. Mission

Reconcile what *was actually implemented and verified* in TASK-003→TASK-010 against what *the documentation and historical audits claim*, decide the true state of every task (DONE / PARTIAL / BLOCKED / NOT STARTED), separate the labels from the guarantees (chemistry, content, auth, sync), correct stale historical claims, and produce a dependency-aware, decision-gated readiness classification for any TASK-011 — without modifying a single implementation file.

The audit is **read-only**: it only inspects files and runs the existing read-only regression validators. It does not fix findings, does not refactor, does not rename, and does not start TASK-011.

---

## 2. Scope & Methodology

**In scope:**
- Every deliverable, protected-file claim, and version pin from TASK-003 through TASK-010 (Foundation, Chemistry/Laboratory, Safety, Result Records, Chemistry dataset validation, Content, Authorization, Sync Foundation).
- The architectural roadmap (`CHEMLABX_ARCHITECTURE.md`), the pre-implementation audit (`AUDIT_REPORT.md`), the TASK-008 gap analysis (`TASK-008-AUDIT.md`), the task specs and decisions (`TASK-010-SPEC.md`, `SYNC-FOUNDATION-SPEC.md`, `DECISION-TASK-010.md`), and all TASK final reports.
- The current implementation: `js/domain/*`, `js/core/*`, `js/lab/*`, `js/pages/*`, `js/data/*` (incl. `content/*`), the service worker, the 10 HTML pages, and the test stack (`test/harness.html`, `test/validate_*.py`, `test/verify.ps1`, `test/server.ps1`).
- Task state classification, chemistry/content/auth/sync label-vs-guarantee reconciliation, roadmap corrections, a TASK-011 dependency graph, a TASK-011 readiness-gate classification, non-goals, and protected contracts.

**Out of scope (explicitly NOT performed):**
- Any code change, refactor, migration, deletion, renaming, validator change, HTML/CSS/SW change, or data mutation.
- Any TASK-011 start, any new architecture work, any decision-making on the deferred §26 human decisions.
- Any opinion about chemistry or pedagogy beyond what the source evidence states.

**Method:**
1. Read the binding architecture document, both historical audits, all TASK specs/decisions/reports, and the full source tree + test stack.
2. Cross-check each task's final-report claims against the actual implementation and test evidence present on disk.
3. Re-execute every deterministic source-contract validator (`validate_changejournal.py`, `validate_authorization.py`, `validate_content.py`, `validate_chemistry.py`) and the full browser regression driver (`verify.ps1`, headless Chrome).
4. Classify every finding as **No Change** / **Documentation Correction** / **Code Correction Recommended** / **Blocking**, with evidence.
5. Produce this report and a single verdict.

**Source-of-truth priority applied:** implementation > tests/validators > task specs > architecture docs > final reports > historical audits.

---

## 3. What This Audit IS and IS NOT

### This audit IS
- A **truth check** between documentation/history and the on-disk implementation + green gates.
- A **label audit**: it states precisely what `validated-v1`, `content-v1`, "authorization", and "Sync Foundation" do — and do **not** — mean.
- A **stale-claim ledger**: it records which statements in `AUDIT_REPORT.md` and `TASK-008-AUDIT.md` have been superseded by TASK-003→TASK-010.
- A **readiness gate**: it classifies what TASK-011 may and may not be, and what human decisions gate it.

### This audit IS NOT
- A re-implementation, a fixer, or an approval to change code.
- A scientific review board. It does **not** certify chemistry data as expert-validated (see §7).
- A security certification. It does **not** declare authentication production-ready (see §9).
- A Sync Engine implementation or spec. It only reconciles the foundation against the future Sync Engine (§10).
- A substitute for the §26 human decisions. Where a decision is required, the audit says "decision required" and stops.

---

## 4. Executive Summary

**Verdict: GO WITH MINOR DOCUMENTATION CORRECTIONS.** No blocking findings. No code correction is required or recommended.

- **TASK-003 → TASK-010 are ALL DONE**, each verified green at its own completion, and the whole stack remains green **today** (fresh run this audit, see below). No task is PARTIAL or BLOCKED. **TASK-011 is NOT STARTED.**
- **Fresh regression baseline (read-only, executed during this audit):**
  - `python test/validate_changejournal.py` → **PASS** (ops 2, entity types 4, 11 schema fields).
  - `python test/validate_authorization.py` → **PASS** (roles 4, permissions 8, matrix complete).
  - `python test/validate_content.py` → **37/37 PASS / 0 FAIL**.
  - `python test/validate_chemistry.py` → **PASS** (185 unique materials / 28 reactions / 14 experiments).
  - `powershell .\test\verify.ps1` → **111 PASS / 0 FAIL in all four contexts** (online fresh, offline preload, offline run1, offline run2), **10/10 pages OK**, **0 runtime errors**, offline index served from SW cache (run2).
- **Label reconciliation (the core value of this audit):**
  1. `CHEMISTRY_DATA_VERSION='validated-v1'` = **structurally validated + canonicalized**, NOT expert-certified (§7).
  2. `CONTENT_VERSION='content-v1'` = **versioned + schema-validated packs**, NOT answer-level scientific certification of quiz content (§8).
  3. TASK-009 = **authorization hardening**, NOT production authentication/identity/enrollment (§9).
  4. TASK-010 = **Sync Foundation (on-device Change Journal)**, NOT a real Sync Engine (§10).
- **Only documented, read-only findings:** the pre-existing, non-executable stale `K2Cr2O7+HCl` key in the protected `js/lab/engine.js` experiment quick-load map (first recorded in `TASK-008-AUDIT.md` D.1) — still present, still inert, still untouched. Plus the four scope-clarity documentation corrections in §7–§10.
- **TASK-011 readiness:** readiness is conditional. A **foundation-continuous, client-side, local-first** TASK-011 is dependency-complete and GO. Any TASK-011 scope touching a Site Server / backend language / Cloud / real sync transport / CRDT / org multi-tenancy is **BLOCKED pending the §26 human decisions** (§14). The exact TASK-011 scope is not fixed in any document, so this audit gates the *class* of work, not a specific backlog item.

---

## 5. Document Inventory

Files read and cross-checked during this audit:

| Document / Path | Role | Reads verified |
|---|---|---|
| `CHEMLABX_ARCHITECTURE.md` (1011 lines) | Binding architectural reference (principles §23, decisions §25/§26, §28 foundation, §30) | Yes (full) |
| `AUDIT_REPORT.md` (509 lines, 30 Aug 2026) | Pre-implementation codebase audit | Yes (full) |
| `TASK-008-AUDIT.md` (226 lines) | Post-TASK-007 architecture gap analysis → recommended TASK-008 | Yes (full) |
| `TASK-010-SPEC.md`, `docs/architecture/SYNC-FOUNDATION-SPEC.md`, `docs/architecture/DECISION-TASK-010.md` | TASK-010 scope, spec, ACCEPT decision | Yes (full) |
| `docs/architecture/README.md` + 10 `.mmd` diagram sources | §24 mermaid sources | Yes |
| `TASK-008-FINAL-REPORT.md`, `TASK-009-FINAL-REPORT.md`, `TASK-010-FINAL-REPORT.md` | Task completion reports (87/87, 100/100, 111/111) | Yes (full) |
| `js/domain/changejournal.js`, `authorization.js`, `content.js`, `results.js` | TASK-010/009/008/006 implementation | Yes (full/partial) |
| `js/core/versions.js`, `auth.js`, `db.js` | Version pins, auth/session, CHLDB | Yes (full) |
| `js/lab/engine.js` | Lab orchestration + TASK-010 journal hook | Yes (full) |
| `js/data/*` (`materials.js`, `reactions.js`, `achievements.js`, `content/*`) | Validated dataset + content packs | Validator-verified |
| `js/pages/*` | Page loaders (lessons/quiz/experiments rewritten as content loaders) | Validator-verified |
| `sw.js`, `manifest.webmanifest`, 10 HTML pages | PWA shell / protected pages | verify.ps1-verified |
| `test/harness.html`, `test/validate_*.py`, `test/verify.ps1`, `test/server.ps1` | Test/validator stack | Executed (fresh) |

No audit target file for this deliverable existed before this pass (`POST-TASK-010-RECONCILIATION-AUDIT.md` did not exist; created now, read-only enabled for all other files).

---

## 6. Implementation Status of Tasks 003–010 (and 011)

Status vocabulary: **DONE** / **PARTIAL** / **BLOCKED** / **NOT STARTED**. Each status below reflects both the recorded final report *and* the on-disk evidence re-verified in this audit.

| Task | Scope | Status | On-disk / test evidence |
|---|---|---|---|
| **TASK-003** Foundation: DataPort/IndexedDB migration, provenance stamps, fail-closed reaction path, safety-compliant achievements, dead-file cleanup | Foundation Layer, §28 | **DONE** | `js/core/dataport.js` (IndexedDB adapter, `kv`/`meta`, idempotent migration, schemaVersion 2), `js/core/db.js` (CHLDB transitional mirror), `js/core/versions.js` provenance; harness suites A1–A8, B1–B3, C, D, E, F, G; legacy `js/app.js`, `js/data.js`, `js/quiz.js`, `css/style.css` absent from tree (validator + verify confirm no legacy refs). |
| **TASK-004** Chemistry + Laboratory domains | Domain isolation (§5/§6) | **DONE** | `js/domain/chemistry.js` (pure `determine`/`lookupReaction`, fail-closed), `js/domain/laboratory.js` (`normalizeState`); harness H suite green. |
| **TASK-005** Safety Engine | §7 gating | **DONE** | `js/domain/safety.js` (pure, read-only over chemistry, fail-closed, single choke point in `engine.js performMix`); harness S suite green. |
| **TASK-006** Result Records | Reproducibility contract (§15.2) | **DONE** | `js/domain/results.js` (build/persist, provenance, deterministic `order`, 100-cap eviction); harness R1–R14 green. |
| **TASK-007** Chemistry dataset validation & counts | Canonicalization | **DONE** | `validate_chemistry.py` re-run **PASS**: 185 unique materials (duplicates removed), 28 reactions (no `default`, K2Cr2O7+HCl excluded), 14 experiments all resolving to validated reactions; `CHEMISTRY_DATA_VERSION='validated-v1'`. |
| **TASK-008** Content domain + versioned packs + manifest | §28 item 3, §25 content decision | **DONE** | `js/domain/content.js` (fail-closed), `js/data/content/{manifest,lessons,quiz,experiments}.js` (content-v1), `CONTENT_VERSION` bound to manifest getter; `validate_content.py` re-run **37/37**; T8-1..T8-8 in harness. |
| **TASK-009** Authorization hardening (F0/F1/F3) | §18.1 application-correctness | **DONE** | `js/domain/authorization.js` (pure, fail-closed matrix), `js/core/auth.js` (registrableRole, hardened `currentUser`, boundary-checked mutations, `ensureAuthorization`), page gates routed through it; `validate_authorization.py` re-run **PASS**; A1–A12 harness. |
| **TASK-010** Sync Foundation & Change Journal | DECISION-TASK-010 ACCEPT | **DONE** | `js/domain/changejournal.js` (ChangeRecord 11 fields, per-entity version order, changeId idempotency, cursor/replay/ack, tombstones, fail-closed, CHLDB persistence key `changelog`), `ensureChangeJournal` boot injection in `auth.js`, defensive journal hook in `engine.js` after `Results.persist`; `validate_changejournal.py` re-run **PASS**; J1–J10 harness; full regression **111/111 × 4 contexts** (re-run this audit). |
| **TASK-011** (unspecified future task) | — | **NOT STARTED** | No `TASK-011-*` spec/decision/report or implementation exists anywhere in the tree. Explicitly not started per every final report's STOP declaration. |

**Contradiction check (question E):** No task is claimed DONE in a final report while exhibiting PARTIAL/BLOCKED/NOT-STARTED evidence on disk. Every "complete & verified" report is corroborated by green validators/regression re-run during this audit, and every "protected file untouched" claim is corroborated by scope-of-edit records and by the unchanged contracts verified here.

---

## 7. Chemistry Reconciliation: `validated-v1` ≠ Expert Certification

### What "validated-v1" actually means (verified)
`CHEMISTRY_DATA_VERSION = 'validated-v1'` (`js/core/versions.js`) was promoted after `validate_chemistry.py` passed. The validator enforces **structural and canonicalization** invariants:
- 185 **unique** material keys (duplicate-source-key detection before last-write-wins; all duplicates removed in TASK-007).
- Reactions: key set exactly `EXPECTED_REACTION_KEYS` (28; no `default`; no reorder; no canonical collisions); numeric tempChange/phChange/xp; boolean danger; every reaction material exists; K2Cr2O7+HCl excluded.
- Experiments: catalog = 14 retained keys; every experiment resolves to a validated reaction; danger/XP derived from `reactions.js` (no duplicated catalog copy); dashboard counts are dynamic (`CHL.experimentCount`), no hard-coded "15".
- `validated-v1` therefore means: **canonicalized, de-duplicated, internally cross-consistent, fail-closed against the engine, and pinned**.

### What it does NOT mean
- **Not expert certification.** There is no record of a scientific domain-expert review, literature citation, CAS/MW/density, stoichiometry, quantities, kinetics, or hazard/SDS/GHS data. `AUDIT_REPORT.md` §7/§24.1 and architecture §26 MUST-DECIDE #1 ("Chemistry data accuracy/validation bar — who guarantees the dataset… expert review? sources? lab verification?") remain **OPEN**. `AUDIT_REPORT.md` explicitly states: *"Implemented — but NOT scientifically validated. Every formula, equation, and safety flag must be expert-reviewed before any classroom use."*
- **Not a guarantee of physical realism.** The engine is a deterministic directed lookup over the pinned dataset (fail-closed on unknowns), not a quantitative simulation (audit §6/§8: "not a qualitative simulation… directed-lookup, not a reaction engine").

### Documentation correction (recommended, non-blocking)
- `validated-v1` should be glossed everywhere consumers can read it as: *"structural/canonicalization validation status, NOT expert/scientific certification"* — and the outstanding §26 MUST-DECIDE #1 (expert review lane) should be restated as the prerequisite for any scientific-accuracy claim in UI/release notes. This does **not** block TASK-011 of the foundation-continuous class, because the engine and dataset are already fail-closed and pinned.

---

## 8. Content Reconciliation: `content-v1`

### What "content-v1" actually means (verified)
`CONTENT_VERSION` resolves through a getter bound to `window.CHL.contentManifest.version` (`versions.js`) → DatasetManifest `version: 'content-v1'`, `datasetId: 'content'`, `schemaVersion: 2`, `contentHash` = SHA-256 over the concatenated packs (`91702a4e…`), `provenance`, `editions` {ar,en}. Packs: **lessons = 6** (ids 1–6), **quiz = 20** (ids 1–20), **experiments descriptor = 14** (canonical keys/order). `validate_content.py` (re-run **37/37** this audit) enforces: manifest metadata, pack counts/ids, ar/en locale completeness and required atoms, no duplicate ids/keys, descriptor↔page-catalog drift = [], every experiment key resolving through validated reactions, no K2Cr2O7+HCl, hash determinism, pack versions 1.0.0/schemaVersion 2.

### What it does NOT mean
- **Not answer-level scientific validation of quiz content.** The validator checks quiz atom schema (q/options/cat present), correct-index bounds, locale completeness, and cross-checks *experiment* keys against validated reactions. It does **not** verify that every quiz question's *scientific content* is consistent with the validated chemistry dataset or an expert source. Quiz/lesson authorship remains a content-authoring assertion (`content-v1` versions the packs; it does not certify their science).
- The historical claim thread: `AUDIT_REPORT.md` §7 recorded the quiz pool as **22 questions** with a legacy header claiming **"30+"** (inaccurate). After the TASK-008 pack rewrite the live pool is **20 versioned items**. Both "30+" and "22" are now stale; the live authoritative number is **20** (content-v1).

### Documentation correction (recommended, non-blocking)
- State in release/docs that content-v1 guarantees pack versioning, schema, locales, and experiment↔reaction referential integrity — **not** that quiz/lesson science has been expert-cross-checked. (TASK-008's own acceptance criteria never claimed scientific validation; only referential integrity.)

---

## 9. Auth vs Authentication: TASK-009 ≠ Production Auth

### What TASK-009 delivered (verified)
`js/domain/authorization.js` is a pure, deterministic, UI-free, fail-closed **authorization** module: canonical roles `[admin, teacher, student, user]`, minimal evidence-grounded permission vocabulary (8 permissions), a strict matrix (only admin holds users-management; all non-admin rows lab-capable; guest = role `user`), unknown permission → deny, unknown role → normalize to `user` (never elevated). `js/core/auth.js` hardened its **authentication** surface at the application-correctness level:
- **F0** — `register()` can no longer self-escalate to `admin` when an admin exists (first-account rule only); arbitrary role strings sanitized.
- **F1** — `currentUser()` fails closed (returns null/unauthenticated) for missing/malformed session or user, non-canonical role, or `archived: true` (open archived session downgraded).
- **F3** — `grantRole`/`archiveUser`/`unarchiveUser` are authorization-checked at the **mutation boundary**, not only at render time; non-admin → `null`.
Validators and harness A1–A12 green (100/100 recorded, re-verified baseline).

### What it does NOT mean
- **Not production authentication.** The following remain at the documented **prototype posture** (architecture §18.1, `AUDIT_REPORT.md` §11/§17): reversible djb2-style password hash (`db.js hashPassword`, self-labeled "offline demo only"); sessions in localStorage with no expiry; no device registration; no enrollment/invitation policy for teachers (self-registration allowed — only admin escalation is blocked); no CSP; guest bypass is a design choice. Architecture §18.1's *target* rows (Argon2id/PBKDF2, opaque tokens + refresh, device registration & pairing, sign/aud-iss-sub-scope claims) are **not implemented**.
- The `authorization.js` security-boundary header explicitly states this module is *application-correctness hardening for a client-side, offline-first app*, **not** a server-grade control against a hostile client.

### Documentation correction (recommended, non-blocking)
- Wherever TASK-009 output is summarized, use "authorization hardening" and never "authentication/identity/completed". Keep the §18.1 prototype-vs-target table as the authoritative status of authentication. Any TASK-011 proposal claiming "auth" work must be scoped to either authorization extension or explicitly flagged as prototype-auth hardening — never described as production identity.

---

## 10. TASK-010 Sync Foundation vs a Real Sync Engine

### What TASK-010 delivered (verified)
`js/domain/changejournal.js` exposes `window.CHL.changeJournal`:
- `ChangeRecord` with all **11** spec fields: changeId (UUID, idempotency key), entityType, entityId, op (`upsert`|`delete`), baseVersion, version, payloadRef, wallClock (informational only — **never order truth**), deviceId (`local-device`), actorId (`system` fallback), orgId (**always null**, future-compatible, inert in every decision).
- Sync-eligible `ENTITY_TYPES = ['result','submission','assignment','class']`; ephemeral UI/session/theme/language/temp state is rejected fail-closed.
- Per-entity monotonic `version` counter = ordering truth; append rejects out-of-order baseVersion; duplicate changeId ignored.
- Global `cursor()`, `replayFrom(c)`, `advanceCursor(c)`, `pending()` (un-acked view), `acknowledgedCursor()`, `tombstone()` (delete op), `status()` (failures observable, never swallowed).
- Persistence reuses the **existing CHLDB boundary** (key `changelog` → `chemlabx_changelog`; synchronous in-memory + localStorage mirror + IndexedDB durability via DataPort). No second persistence abstraction; `db.js`/`dataport.js` untouched.
- Wired at the **real domain write boundary**: `engine.js` journals a `'result'` upsert **only after `Results.persist` succeeds** (defensive, never breaks performMix; actorId from `CHLAuth.currentUser()` fallback `'system'`). Loaded on every page via `ensureChangeJournal()` dynamic injection (no HTML change).
- Validator PASS; harness J1–J10 green; full regression 111/111 × 4 (re-run this audit).

### What it does NOT mean (and what the architecture requires next)
Architecture §13 decision and §24.4 Sync Architecture define a Sync Engine as: journal/outbox → **sync engine with retry/backoff, partial-by-cursor push** → **Site/Cloud Validate + dedupe (changeId/resubmission key)** → **DB → ack + new cursor** → **per-domain conflict policy** (LWW / ConflictRecord / attemptNo) → **subsequent replica position**. TASK-010 implements only the on-device, ordering/idempotency/persistence half. **Not implemented anywhere:** any transport, push/pull, server endpoint, retry/backoff, remote dedupe, server ack, cursor advance from a replica, conflict-resolution policy, media bundling, org scoping, or sync-eligibility audit of submissions/assignments/classes (the other three approved ENTITY_TYPES have **no journal wiring today**; only `result` is journaled, which is correct and intentional for this phase).

### Documentation correction (recommended, non-blocking)
- Use "Sync Foundation / Change Journal" for TASK-010 output; reserve "Sync Engine" for transport/replica/conflict work (architecture §13/§24.4). Any future sync-transport scope is **blocked on the §26 decisions** (Site Server necessity, backend language, cloud ownership) — see §11/§14.

---

## 11. Architecture Gap Analysis + Open Decisions

### Completed (source-verified)
- Offline-first storage (IndexedDB via DataPort, localStorage transitional mirror, migration idempotent, schemaVersion 2). Provenance on every new record. Fail-closed unknown path. Safety-teaching (no danger rewards; `safety_response` rewards cooling). Deterministic chemistry/safety/results/content/authorization/journal domains. Canonicalized validated dataset + versioned content packs + manifest. Authorization hardening. Change Journal foundation.

### Still-open architecture gaps (all in the deferred class)
1. **Sync Engine** (transport/replica/conflict) — deferred (§28; TASK-010 = foundation only).
2. **Site Server / Cloud / backend** — deferred; no implementation exists (§20 M2/M3, §22).
3. **Identity/Authentication upgrade** (Argon2id/PBKDF2, tokens, device registration, enrollment) — deferred (§18.1).
4. **Education domain** (classes/assignments/submissions/teacher console as a real domain; submissions/classes/assignments still operated as hard-coded collections — note their *collections exist* in CHLDB, but no Education domain service) — deferred (§8).
5. **Multi-tenancy / orgId scoping** — deferred (§9/§25); `orgId` in the Change Journal is inert by design until this decision lands.
6. **AI advisory proxy, real 3D visualization, licensing/editions, analytics** — deferred/future (§16/§17/§14 of architecture).

### Open decisions carried verbatim from TASK-010 documentation (all remain open)
- Payload strategy (reference vs embedded payload for journaled records).
- Sync-eligibility trigger audit (only results are journaled today; when do submissions/assignments/classes become eligible).
- Tombstone retention / journal pruning policy (append-only; growth observable via `status()`; a future sync engine prunes acked).
- Account/profile sync shape (users/session are not journalable entity types today).
- Education sync shape (submission record shape for future Education domain).
- Media bundle design (architecture §19; offline update lane).
- `orgId` tenant-scoping semantics (currently always null).
- Site Server requirement + backend language (§26 MUST DECIDE #2 and #4).
- Cloud ownership (§26 MUST DECIDE #5).
- Chemistry-accuracy/expert-review bar (§26 MUST DECIDE #1).
- Student-data ownership & privacy policy (§26 MUST DECIDE #6).

These are **decision inputs**, not defects: every one of them was explicitly deferred by `DECISION-TASK-010.md` (ACCEPT local-first/offline-first; Site Server optional; no Cloud) and `TASK-010-SPEC.md` non-goals.

---

## 12. Roadmap Corrections (stale claims in `AUDIT_REPORT.md` / `TASK-008-AUDIT.md`)

| Historical claim (source) | Status now (verified) |
|---|---|
| "~192 material rows (with accidental duplicates)" (`AUDIT_REPORT` §7) | **Superseded.** 185 **unique** keys; duplicate keys removed (TASK-007); `validate_chemistry.py` PASS with 185. |
| "reactions (29)… default present" (`AUDIT_REPORT` §7/§8) | **Superseded.** 28 validated keys, `default` removed and forbidden; K2Cr2O7+HCl excluded; fail-closed unknown path. |
| "curated experiment catalog = 15" (`AUDIT_REPORT` §7) | **Superseded.** 14 experiments in catalog + content pack; K2Cr2O7+HCl excluded. |
| Quiz "30+" advertised / "22 exist" (`AUDIT_REPORT` §5/§7) | **Superseded.** Live pool = **20** versioned items (content-v1, ids 1–20). |
| Hard-coded "77 materials" (lab.html), "120+ materials"/"30+ questions" claims (`AUDIT_REPORT` §5/§20) | **Superseded.** Counts dynamic; validator enforces `CHL.experimentCount`; no legacy hard-coded counts remain (lab.html/shelf counts derived from data). |
| "Danger gamified (danger_zone/three_danger)" (`AUDIT_REPORT` §9) | **Superseded.** Achievements no longer reward danger (TASK-003 F-suite); `safety_response` rewards *cooling* after a heat warning; dangerous reactions give no XP (engine). |
| "Dead legacy files ~234 KB / deprecation risk" (`AUDIT_REPORT` §4/§20) | **Superseded.** `js/app.js`, `js/data.js`, `js/quiz.js`, `css/style.css` removed (TASK-003 G); verified no page reference (verify.ps1 legacy-ref scan). |
| "localStorage only, ~5–10 MB" (`AUDIT_REPORT` §10/§13) | **Superseded.** IndexedDB authoritative via DataPort; localStorage retained only as transitional mirror/rollback. |
| "No schema version / no versioning / cache-name-only" (`AUDIT_REPORT` §15) | **Superseded.** `SCHEMA_VERSION=2`, `CHEMISTRY_DATA_VERSION='validated-v1'`, `CONTENT_VERSION='content-v1'` (manifest-bound), `APP_VERSION='4.0.0-foundation'`, engine/safety lanes; provenance on every new record. |
| "No tests / no CI" (`AUDIT_REPORT` §18/§20) | **Superseded.** 4 deterministic validators + 111-check browser harness in 4 contexts, all green. |
| "archived user sessions stay valid" (`AUDIT_REPORT` §11/§17) | **Superseded (application scope).** F1: open session for an archived user → unauthenticated (AC-005). |
| "Teacher/admin self-escalation possible" (`AUDIT_REPORT` §11) | **Superseded (application scope).** F0: admin cannot be self-registered once an admin exists; F0/F1/F3 + fail-closed matrix (TASK-009). |
| "djb2 reversible hash" (`AUDIT_REPORT` §10/§17) | **Partially superseded / retained.** Hash scheme unchanged (prototype posture, §18.1) — is now an explicit *documented* remaining gap, not an unstated risk. |
| Synchronizer: "79/79 baseline" (`TASK-008-AUDIT` §A) | **Superseded.** 79 → 87 (TASK-008) → 100 (TASK-009) → **111** (TASK-010). |
| K2Cr2O7+HCl stale engine key (`TASK-008-AUDIT` D.1) | **Retained as an open, non-blocking, read-only finding.** Still present in `js/lab/engine.js` experiments quick-load map (line 16); still non-executable (performMix resolves through fail-closed `Chemistry.determine`). Protected file → recorded, not modified (this audit adds none and keeps it recorded). |

---

## 13. Dependency Graph Needed for TASK-011

```
TASK-003  Storage/provenance/fail-closed/cleanup (DONE)
   │
   ├─► TASK-004 Chemistry domain (DONE) ─► TASK-007 dataset canonicalization (DONE)
   ├─► TASK-005 Safety engine (DONE)
   ├─► TASK-006 Result Records (DONE) ──┐
   │                                    ├─► TASK-010 Change Journal foundation (DONE) ◄── consumes Results.persist output
   ├─► TASK-008 Content domain + packs (DONE)
   └─► TASK-009 Authorization hardening (DONE)
```

Any **foundation-continuous client-side TASK-011** (e.g., extending sync-eligible entities, journal tooling, tombstone retention, export/backup, PWA update lane foundation, additional authorization permissions) depends on nothing external: it is **dependency-complete** (all ancestors DONE).

Any TASK-011 touching the **server/sync-transport/org** class additionally depends on **human decisions that are still open**:

```
TASK-010 journal (DONE) ──► [sync engine: transport, retry/backoff, server validate+dedupe,
                              ack+cursor, per-domain conflict policy]
                              ▲ blocked until §26.#2 (school scenario / Site Server),
                              │      #4 (backend language), #5 (cloud ownership) are decided
TASK-007 validated-v1 (DONE) ─► [expert-review lane] ▲ blocked until §26.#1 (accuracy bar)
TASK-009 authz (DONE) ────────► [real authentication: Argon2id/PBKDF2, tokens, device
                                 registration, enrollment] ▲ blocked until §26.#2/#5
TASK-011 org/multi-tenancy ───► [orgId scoping end-to-end] ▲ blocked until §26.#2/#5/#6
```

**Conclusion:** on-disk dependencies are entirely satisfied. The *unresolved* things are human decisions, not code dependencies.

---

## 14. TASK-011 Readiness Gate

### Classification method
No approved TASK-011 spec/decision exists (across all documents, the highest-priority open item is the §26 "MUST DECIDE NOW" set; the only *concrete* next-action proposals in history were TASK-008-AUDIT's recommended scope — since delivered — and the §28 foundation — since delivered). This audit therefore classifies the **class of work** TASK-011 may fall into.

### Gate table

| TASK-011 class | Readiness | Gate condition |
|---|---|---|
| **Foundation-continuous, client-side, local-first, offline-first** (extends the Change Journal foundation, content/data pipeline, authorization vocabulary, PWA/update-lane groundwork, export/backup tooling; no transport, no server, no org) | **GO** | Dependency-complete; no §26 decision blocks it; keeps every protected contract intact (§16). |
| **Sync transport / real Sync Engine** (push/pull, Site/Cloud endpoint, retry/backoff, server dedupe, ack/cursor from replica, per-domain conflict policy) | **BLOCKED — DECISION REQUIRED FIRST** | §26.#2 (is a Site Server required?), #4 (backend language Node/TS vs Go), #5 (cloud ownership). Until decided, implementing transport would **invent scope and build on unapproved policy** (the exact trap TASK-008-AUDIT §F.3 warned about). |
| **Site Server / Cloud / backend** (any server tier) | **BLOCKED — DECISION REQUIRED FIRST** | §26.#2/#4/#5. |
| **Organization / multi-tenancy / orgId activation** | **BLOCKED — DECISION REQUIRED FIRST** | §26.#2/#5/#6; `orgId` in the journal must stay inert until then. |
| **Chemistry scientific certification / expert review** | **BLOCKED — DECISION REQUIRED FIRST** | §26.#1 (accuracy bar / who guarantees the dataset). |
| **Production authentication** (real hashing, tokens, enrollment, device registration) | **BLOCKED — DECISION REQUIRED FIRST** | §26.#2/#5; and must be scoped in the light of §18.1. |
| **CRDT / collaborative replication** | **NOT STARTED / NOT APPROVED** | Architecture §25 explicitly: "CRDTs only where truly collaborative (none required now)". |

### Red lines carried into TASK-011
- Do **not** implement sync transport, Site Server, Cloud, CRDT, org multi-tenancy, or production auth without the corresponding §26 decision and an explicit spec/GO.
- Do **not** touch the protected contracts in §16.
- Do **not** silently treat the Change Journal as a network sync engine.
- Any revision of `CONTENT_VERSION`/content packs must revalidate the `contentHash` manifest and keep `validate_content.py` green.

---

## 15. Non-Goals (for any next task, reaffirmed from the binding docs)

- ❌ Backend / Site Server / Cloud (deferred; §26 decisions required first).
- ❌ Sync Engine transport / real replication / conflict resolution (deferred; foundation only exists).
- ❌ CRDTs (explicitly "not required now", architecture §25).
- ❌ Organization/multi-tenancy / orgId activation (deferred).
- ❌ Production authentication/identity (deferred to §18.1 target posture).
- ❌ Education domain as a real service (classes/assignments/submissions remain prototype collections).
- ❌ AI advisory proxy, real 3D visualization, licensing/editions, analytics (future).
- ❌ Any modification to protected domains: `chemistry`, `laboratory`, `safety`, `results`, `authorization`, `content` (domain pureness), `db`, `dataport`, `versions` (storage invariants), `sw.js`, HTML pages, validated dataset files.
- ❌ Any migration or schema change; any change to `SCHEMA_VERSION`, `CHEMISTRY_DATA_VERSION`, `CONTENT_VERSION` pinning, or `APP_VERSION`.
- ❌ Changing the fail-closed semantics of any domain or the Change Journal.

---

## 16. Protected Contracts (verified intact, must stay intact)

Re-verified by source read + validators + full regression during this audit:

| Contract | Value | Evidence |
|---|---|---|
| `SCHEMA_VERSION` | **2** | `versions.js`; `validate_content.py` V2; `db.js`/`dataport.js` unchanged |
| `CHEMISTRY_DATA_VERSION` | **`'validated-v1'`** | `versions.js`; `validate_chemistry.py` PASS (185/28/14) |
| `CONTENT_VERSION` | **`'content-v1'`** (manifest-bound getter) | `versions.js`; `validate_content.py` M3/V1/H1 |
| `APP_VERSION` | **`'4.0.0-foundation'`** | `versions.js` |
| Protected pure domains | `js/domain/{chemistry,laboratory,safety,results,authorization,content}.js` | Source-read unchanged; all fail-closed guarantees intact |
| Storage layer | `js/core/{db,dataport,versions,i18n,ui}.js` | Source-read; CHLDB transitional mirror semantics intact; DataPort schema/version untouched |
| Lab orchestration | `js/lab/*` incl. modified `engine.js` (TASK-010 journal hook is additive + defensive) | Full regression green; 0 runtime errors; 10/10 pages |
| Data assets | `js/data/materials.js`, `reactions.js` (frozen), `achievements.js`, `content/*` | Validators PASS |
| PWA / shell | `sw.js`, `manifest.webmanifest`, all 10 HTML pages | `verify.ps1`: offline SW cache serves index (run2 PASS); no legacy refs; no HTML change since TASK-003 |
| Persisted data & user records | New records carry provenance; old records never mutated; session scrub semantics intact | Harness A/I suites green; determinism across contexts (111/111 × 4) |
| Change Journal | key `changelog` → `chemlabx_changelog` via CHLDB; append-only; orgId inert; no domain logic | `validate_changejournal.py` PASS; J1–J10 green; engine hook post-`Results.persist` |

**Protected-file verification outcome:** This audit modified **nothing** except creating this document. The fresh `verify.ps1` run confirmed the recorded TASK-010 baseline (111/111, 10/10 pages, 0 runtime errors, offline cache intact) is still true **today**.

---

## 17. Final Recommendation

> **VERDICT: GO WITH MINOR DOCUMENTATION CORRECTIONS.**
> No blocking findings. No code correction required or recommended. All eight implemented tasks (TASK-003→TASK-010) are **DONE** and the whole gate stack remains green (re-run this audit: 4/4 validators PASS, harness **111/111 in all four contexts**, 10/10 pages, 0 runtime errors, offline SW intact). TASK-011 is **NOT STARTED**.

**Recommended documentation corrections (optional, non-blocking, documentation-only):**
1. Gloss `CHEMISTRY_DATA_VERSION='validated-v1'` as *structural/canonicalization validation — not expert certification*; keep the §26 MUST-DECIDE #1 expert-review lane explicit (§7).
2. State that `CONTENT_VERSION='content-v1'` guarantees pack versioning/schema/locales + experiment↔reaction referential integrity — **not** answer-level scientific certification of quiz content; supersede the "30+/22" quiz-count history with "20 (content-v1)" (§8).
3. Label TASK-009 as **authorization hardening** (prototype auth posture retained: djb2 hash, localStorage session, no enrolment) — never "authentication complete" (§9).
4. Label TASK-010 as **Sync Foundation / Change Journal** — never "Sync Engine"; the transport/replica/conflict half is not started (§10).

**TASK-011 guidance:**
- A **foundation-continuous, client-side, local-first, offline-first** TASK-011 is **GO** and dependency-complete (all ancestors DONE), provided it preserves every protected contract (§16) and passes the same gate stack.
- Any TASK-011 scope that would require a **Site Server / backend language / Cloud / real sync transport / CRDT / org activation / production auth** is **BLOCKED — DECISION REQUIRED FIRST** on the §26 MUST-DECIDE items (#2 school scenario / Site Server, #4 backend language, #5 cloud ownership, #1 chemistry accuracy bar, #6 student-data ownership).
- The Change Journal's deferred design questions (payload strategy, sync-eligibility trigger for submissions/assignments/classes, tombstone retention, orgId semantics) should be resolved as **decisions before any sync-transport work**, not as code guesses.

**Closure:** This audit performed no implementation changes. It created only this document. **STOPPED awaiting a TASK-011 spec and the required human decisions; no TASK-011 was started.**

---

## 18. Post-Audit Disposition

The four documentation corrections recommended by this audit (§7–§10, restated in §17) were applied by **TASK-010.1 — Documentation & Roadmap Reconciliation Patch** (documentation-only), which additionally:
- posted the current verified state, version-scope definitions (`validated-v1`, `content-v1`), TASK-009/TASK-010 scope boundaries, the 111/0 baseline, and the roadmap status to `CHEMLABX_ARCHITECTURE.md` (§0), and annotated its §21 migration map and §28 next-task section as delivered;
- added historical-record clarifications (not content rewrites) to `AUDIT_REPORT.md` and `TASK-008-AUDIT.md` so their snapshot counts are unambiguously identified as historical.

No source code, tests, chemistry/content data, or version constants were changed during TASK-010.1, all validators and the 111-check regression remain green, and **TASK-011 remains NOT STARTED**.
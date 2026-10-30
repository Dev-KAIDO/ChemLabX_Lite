# TASK-008 — Architecture Gap Analysis & Next-Step Audit

**Scope:** Read-only architecture audit of ChemLabX Pro after TASK-007.
**Basis:** `CHEMLABX_ARCHITECTURE.md` (binding architectural reference), current source, current tests, TASK-003..007 outcomes.
**Status of this pass:** Audit only. **No application code, versions, schema, service worker, or persisted data were modified.**

> **HISTORICAL RECORD — audit snapshot taken after TASK-007.** The “Current verifier state” (**79/79 PASS**) and all TASK-003..007 outcomes describe **that point in time only** and are preserved intentionally as history. They were superseded by the later baselines (87 → TASK-008, 100 → TASK-009, **111 → TASK-010**). Authoritative current state: `CHEMLABX_ARCHITECTURE.md` (§0 status note) and `docs/architecture/POST-TASK-010-RECONCILIATION-AUDIT.md`.

---

## A. Current Architecture State

ChemLabX Pro is a Vanilla-ESM, offline-first PWA (no build step, no bundler). The source tree and the task→module mapping (evidenced by `test/harness.html` suite headers) is:

| Suite | Scope | Implements |
|---|---|---|
| A (A1–A8) | Migration localStorage → IndexedDB | TASK-003, §28 item 1 |
| B (B1–B3) | IndexedDB read/write/status | TASK-003, §28 item 1 |
| C | CHLDB compatibility layer (`js/core/db.js`) | TASK-003, §28 item 1 |
| D | Provenance stamps | TASK-003, §28 item 2 |
| E | Fail-closed reaction / unknown-result path | TASK-003, §28 items 2,4 |
| F | Safety-compliant achievements | TASK-003, §28 item 5 |
| G | Cleanup (dead files removed) | TASK-003, §28 item 6 |
| H | Chemistry + Laboratory domains | TASK-004 |
| S (S1–S…) | Safety Engine | TASK-005 |
| R (R1–R14) | Result Records domain | TASK-006 |
| T (T1–T4) | Chemistry dataset validation & counts | TASK-007 |

Current verifier state: `test/verify.ps1` green at **79/79 PASS / 0 FAIL** across online + offline run1 + offline run2 contexts; `test/validate_chemistry.py` green (PASS / 0 errors) after promoting `CHEMISTRY_DATA_VERSION` to `validated-v1`.

**Layer realization (architecture §4 / §21):**
- **Storage:** `js/core/dataport.js` = IndexedDB adapter with `kv`/`meta` stores, idempotent non-destructive migration, observable failure status, schema version `2` (primary device store per §12 / §25). `js/core/db.js` retained as synchronous compatibility front-end (`CHLDB`).
- **Domain (pure, UI-free):** `js/domain/chemistry.js` (`Chemistry.determine`/`lookupReaction`, fail-closed), `js/domain/laboratory.js` (`Laboratory.normalizeState`), `js/domain/safety.js` (`Safety.evaluate`, read-only over chemistry, fail-closed), `js/domain/results.js` (`Results.build/persist`, reproducibility contract with provenance + deterministic order + 100-record cap/eviction).
- **Laboratory orchestration:** `js/lab/engine.js` (`Lab`) with a single safety gate before mutation/presentation/reward; XP withheld for danger; ResultRecords persisted for resolved/presented outcomes.
- **Data assets:** `js/data/materials.js` (185 unique keys), `js/data/reactions.js` (28 validated keys, `default` removed), `js/data/achievements.js` (15 safety-compliant achievements).
- **Versioning:** `js/core/versions.js` — `SCHEMA_VERSION: 2`, `CHEMISTRY_DATA_VERSION: 'validated-v1'`, plus `APP_VERSION`, `CONTENT_VERSION`, `ENGINE_VERSION`, `SAFETY_MODEL_VERSION`, `SAFETY_RULES_VERSION`. `CHL.provenance()` stamps every new record.
- **Distribution:** `sw.js` + `manifest.webmanifest` (offline APP_SHELL).

---

## B. Completed Architecture Requirements

Verified against source + harness:

1. **Offline-First storage (§4, §12, §25):** `DataPort` IndexedDB adapter implemented (`js/core/dataport.js:30-33`, `340-370`); localStorage is a compat mirror, never authoritative; migration is non-destructive + idempotent (A1–A8 green).
2. **Schema-versioned storage (§12.5):** `dbSchemaVersion` recorded on migration (`dataport.js:306`); `SCHEMA_VERSION: 2` (`versions.js:12`); no silent shape change.
3. **Provenance stamps on new records (§15, R12):** `Results.build` embeds `versions()` + `CHL.provenance({resultId, resultsVersion})` (`js/domain/results.js:89-111`); determined engines stamp `chemistryDataVersion`/`engineVersion` (`chemistry.js:121`, `engine.js:25`). Only newly-created records get provenance; old records never mutated (R7/R8/R12/R13 green).
4. **Deterministic, versioned Chemistry engine (§6, R8):** `Chemistry.determine` is a pure function, no DOM, no randomness, no safety import (`chemistry.js:79-123`); pinned against `CHEMISTRY_DATA_VERSION`.
5. **Fail-closed unknown path (§3 principle, §21 "fail-closed unknowns", §28 item 4):** `determine` returns `status:'unknown-result'`, no fabricated products/XP (`chemistry.js:85-91`); `engine.js` surfaces it (E-suite green). Dead `default` reaction removed (TASK-007).
6. **Pure Safety boundary, fail-closed, read-only over chemistry, no UI (TASK-005, §7):** `js/domain/safety.js` verified as deterministic, UI-free, fail-closed, consumes only normalized session + DeterminationResult via read-only ports (S-suite green).
7. **Safety-teaching, not entertainment (§29 / R9 / principle #20):** achievements never reward danger (`js/data/achievements.js`, F-suite green; `safety_response` rewards cooling a heat warning, `achievements.js:15`); dangerous reactions get no XP (`engine.js:130-131`).
8. **Result reproducibility contract (§15.2, TASK-006):** `ResultRecord` carries inputs, conditions, decision, gate, versions, provenance, deterministic `order`; cap/eviction by insertion order not wall-clock (`results.js:115-136`).
9. **Chemistry dataset canonicalization & independent versioning (TASK-007):** 185 unique materials (V=warning, Al2O3=Aluminium), 28 reactions (default removed, order stable), 14 experiments, `CHEMISTRY_DATA_VERSION` promoted to `validated-v1` with `SCHEMA_VERSION` still 2; deterministic validator `test/validate_chemistry.py`.
10. **Dead-code cleanup (§21, §28 item 6):** `js/app.js`, `js/data.js`, `js/quiz.js`, `css/style.css` no longer exist and are not referenced by any HTML.

---

## C. Missing Requirements

The single most material gap within the **already-defined Foundation Layer** (§28 "TASK-003" scope) that remains un-implemented:

### C.1 — Versioned Content Packs (NOT DONE; the only unfinished §28 item)
- Architecture **§28 item 3** requires: *"Content packs: move lesson/quiz/experiment catalogs into versioned JSON packs under the same ContentVersion mechanism (keep current JS modules as loaders during transition)."*
- Architecture **§25 decision — Content storage (Confidence: High):** *"Versioned content packs (JSON/Markdown) with manifests + locale"* replacing *"hard-coded lesson/quiz strings"*; enables distribution & update lanes (§19).
- Architecture **§21 migration map:** `js/pages/lessons.js`, `js/pages/quiz.js` → **REBUILD** into the **Content domain (versioned JSON/Markdown packs)**; `experiments.js` → App Layer over ports.
- Architecture **§15 DataSetManifest** describes a content manifest: `{ datasetId, version, schemaVersion, schemaHash, contentHash, publishedAt, provenance, editions }`.

**Current evidence (drift):**
- `js/pages/lessons.js`: `var lessonsData = [ { id, title, titleEn, icon, content, contentEn }, ... ]` — hard-coded JS literals with inline HTML, both locales baked in. No manifest, no schema validation, no version, no loader.
- `js/pages/quiz.js`: `var allQuestions = [ ... ]` — hard-coded literals, both locales in each item.
- No `ContentPack`/`DatasetManifest`/content loader/manifest exists anywhere in `js/` (searched: zero hits).
- `CONTENT_VERSION: 'prototype-content-v1'` exists (`versions.js:13`) and is stamped into result provenance (`results.js:34`), but **nothing reads or validates content under it** — it is currently a bare label.
- Experiment catalog (`js/pages/experiments.js`) is itself content (experiment templates §15 content lane); its equation/XP/danger now derive from `reactions.js` (TASK-007, single source of truth), but its *descriptive* list is also a hard-coded JS literal (not a versioned pack).

### C.2 — Not-yet (explicitly deferred / require human decisions — OUT of TASK-008)
These are real in the architecture but §28 / §26 explicitly defer them and they are gated on unresolved "MUST DECIDE NOW" decisions:
- Sync Engine / change journal / cursors / conflict policy (§13) — deferred by §28 ("Site Server is a later phase once sync journal types are proven on device").
- Site Server / Cloud / backend (§20, §22) — deferred; requires backend-language + cloud-ownership decisions (§26).
- Identity/Authorization upgrade to permission+scope+PDP (§11, §18.1) — prototype posture still present; §28 non-goal.
- Education domain (classes/assignments/submissions/teacher console) (§8) — future.
- Multi-tenancy / editions / licensing (§9, §10) — future.

---

## D. Architecture Violations / Drift

### D.1 (MODERATE — record only; file protected)
`js/lab/engine.js:16` still contains the stale experiment-map entry `'K2Cr2O7+HCl': ['K2Cr2O7', 'HCl']` even though that experiment was removed from the experiments page catalog (TASK-007) and no validated reaction for it exists.
- Runtime impact: **non-executable** — `performMix` resolves through `Chemistry.determine` (fail-closed), so any attempt returns `unknown-result`/no products (verified logic path `engine.js:78-95`). No fabricated chemistry is possible.
- It is a dead/misleading map key. `js/lab/engine.js` is a **protected file** → **recorded as a finding, not modified.**

### D.2 (MATERIAL)
Hard-coded lesson/quiz content is a **single-source-of-truth violation** at the content layer: quiz answers and lesson statements are authored inline, independent of the validated chemistry dataset (`reactions`/`materials`) and of any `CONTENT_VERSION`. If validated chemistry changes, quiz content can silently drift out of scientific alignment with no version/validation signal. This is the core of C.1.

### D.3 (MINOR)
`CONTENT_VERSION` is stamped into provenance but is not backed by any content manifest/schema — the version label can change without any content package or compatibility check (§19 compatibility matrix not yet present for content).

### D.4 (COSMETIC / OBSERVED, NON-VIOLATION)
`engine.js:25,60` and `chemistry.js:80` / `safety.js:136` contain `|| 'unvalidated-prototype'` literal fallbacks. These are **inert** — `versionOf`/`chemistryVersion` resolve to the live `CHL.versions.CHEMISTRY_DATA_VERSION = 'validated-v1'`. Recorded for completeness; the live value wins, so no behavior drift. Protected files → not modified.

---

## E. Technical Debt

1. **Unversioned content (largest debt):** lessons/quiz/experiments descriptions are hard-coded literals with no manifest/schema/version/locale loader. Directly blocks §19 update lanes and §8 Education content distribution later.
2. **Engine `experiments` map partial duplication:** `engine.js:11-17` duplicates experiment→material key lists that also exist as content; already divergent from the page catalog (D.1). Debt from having the same catalog concept in two places.
3. **Role-check authz (`auth.js require(roles)` + `DB.hashPassword` djb2):** prototype posture (§18.1) retained; known, intended-deferred, but is the next correctness/polish debt once identity work begins.
4. **Prototype content XP/achievement coupling in quiz (`+15 XP per correct`):** gamification is present offline; fine for now, but should later be driven by an Education/Assessment domain (deferred).

---

## F. Risks

- **R-1 (Medium, near):** Shipping unversioned content while chemistry data is now `validated-v1` — a content/chemistry mismatch could present a scientifically-inconsistent quiz/lesson. (TASK-008 directly reduces this.)
- **R-2 (Low, current):** stale `K2Cr2O7+HCl` map key could confuse a future implementer into thinking the experiment is runnable; it is not (fail-closed). Recorded, not modified (protected).
- **R-3 (Deferred):** none of the deferred items (sync/server/authz/education) are safe to start without the §26 human decisions; starting them now risks inventing scope and building on unapproved policy.

---

## G. Recommended TASK-008 Scope

**TASK-008 — Foundation Completion: Versioned Content Packs (Content domain) + CONTENT_VERSION manifest.**

Complete the **only unfinished item of the §28 Foundation Layer** (item 3), faithfully and offline-first:

1. **Content pack loader (`Content` domain / module, e.g. `js/core/content.js` or `js/domain/content.js` — pure, UI-free like the other domains):**
   - Versioned, schema-validated content packs for **lessons**, **quiz**, and **experiment descriptive catalogs**.
   - Locale-structured (ar/en) rather than inline-duplicated locale pairs.
   - Fail-closed content lookup (unknown pack/item/version → explicit error, never fabricated/empty fallback), mirroring the chemistry fail-closed principle (principle #3).
   - Expose a `ContentVersion` manifest (datasetId, version, schemaVersion, contentHash, editions) that `versions.js` `CONTENT_VERSION` and result provenance can reference (§15, §19).
2. **Keep current page modules as loaders during transition** (per §28 item 3 "keep current JS modules as loaders"): `lessons.js`, `quiz.js`, `experiments.js` read from the Content pack instead of their inline literals.
3. **Deterministic, fail-closed content validator** (`test/validate_content.py`, stdlib, paralleling `test/validate_chemistry.py`): dup-key detection, schema validation, ar/en completeness, id/reference integrity, content↔validated-reaction cross-check (e.g., quiz answers consistent with `reactions.js`), version/hash stability.
4. **Harness additions** (TASK-008 T-checks): content manifest resolves, all pack items load, unknown item fails closed, locale completeness, CONTENT_VERSION consistency with provenance stamp.

**Why this (architecturally correct, non-invented):**
- It is the **one remaining deliverable of the already-approved TASK-003 foundation scope** (§28 item 3) — not a new invention.
- It needs **no backend, auth, sync, cloud, or multi-site** — avoiding the forbidden "invent scope" trap.
- It is **offline-first compatible** (JS-module packs + SW caching; no runtime network dependency).
- It is a **prerequisite** for later Education (§8) and Content distribution/update lanes (§19), so it is the correct dependency order.
- It keeps **all protected domains untouched** (chemistry/safety/lab/core defined above remain unmodified).

---

## H. Explicitly Out-of-Scope for TASK-008

- ❌ Backend / Site Server / Cloud (deferred; needs §26 decisions)
- ❌ Authentication/Authorization upgrade (role-check→PDP) (deferred)
- ❌ Sync Engine / change journal / cursors / conflict policy (deferred)
- ❌ Education domain (classes/assignments/submissions/teacher console) (deferred)
- ❌ Multi-tenancy / editions / licensing (deferred)
- ❌ AI / visualization / 3D (future; adapter/domain additions)
- ❌ Any modification to the Chemistry / Laboratory / Safety / Results domains
- ❌ Any modification to `SCHEMA_VERSION`, the IndexedDB schema, `sw.js`, `test/verify.ps1`, `test/server.ps1`, or persisted data
- ⚠️ `js/lab/engine.js` K2Cr2O7+HCl stale key: **in scope ONLY as a recorded finding; NOT modified** (protected file).

---

## I. Files that MUST NOT be modified (TASK-008)

- `js/domain/chemistry.js`, `js/domain/laboratory.js`, `js/domain/safety.js`, `js/domain/results.js`
- `js/core/dataport.js`, `js/core/db.js`, `js/core/auth.js`, `js/core/i18n.js`, `js/core/ui.js`
- `js/lab/engine.js`, `js/lab/lab.js`, `js/lab/shelf.js`, `js/lab/bench.js`, `js/lab/effects.js`, `js/lab/particles.js`
- `js/data/materials.js`, `js/data/reactions.js` (validated dataset — frozen at `validated-v1`)
- `css/*`, all HTML pages, `sw.js`, `manifest.webmanifest`
- `test/verify.ps1`, `test/server.ps1`
- All persisted/user/session/result data
- `js/core/versions.js` (unless TASK-008 introduces a separate content manifest — only then `CONTENT_VERSION` may be revised under explicit approval; `SCHEMA_VERSION` and `CHEMISTRY_DATA_VERSION` MUST remain unchanged)

---

## J. Files that MAY need modification (TASK-008)

- **New:** `js/core/content.js` (or `js/domain/content.js`) — Content domain loader + manifest (pure).
- **New:** `js/data/content/lessons.json.js` (or JS pack) — versioned, schema-validated lesson pack.
- **New:** `js/data/content/quiz.json.js` — versioned quiz pack.
- **New:** `js/data/content/experiments.json.js` (descriptive experiment catalog pack).
- **New:** `test/validate_content.py` — deterministic content validator.
- `js/pages/lessons.js`, `js/pages/quiz.js`, `js/pages/experiments.js` — as **loaders** reading from the Content pack (keep behavior).
- `test/harness.html` — add TASK-008 content checks (test fixture, editable for TASK-008).
- Optionally `js/core/versions.js` — set `CONTENT_VERSION` to the new manifest id under explicit approval only (not required for the schema).

---

## K. Acceptance Criteria

1. Lessons, quiz, and experiment descriptive catalogs load from versioned Content packs (not inline literals) with identical visible behavior.
2. Content is locale-structured (ar/en) and schema-validated; all items present in both locales.
3. Unknown content item/version **fails closed** (explicit error, no fabricated/empty fallback).
4. `CONTENT_VERSION` (or a content manifest) is consistent with what result provenance stamps (no version label without a backing package).
5. `test/validate_content.py` runs deterministically: **PASS / 0 errors**.
6. Full `test/verify.ps1` suite remains **all PASS / 0 FAIL** in all four contexts (online fresh, offline preload, offline run1, offline run2), 10/10 pages load, zero runtime/console errors, offline SW caching intact. *(TASK-008 raised the harness from the 79-check baseline to 87 checks by adding T8-1..T8-8.)*
7. No protected file modified (D.1 finding recorded, not fixed).
8. `SCHEMA_VERSION` stays 2; `CHEMISTRY_DATA_VERSION` stays `validated-v1`.

---

## L. Verification Plan

1. `python test/validate_content.py` → expect **PASS / 0 errors**.
2. `python test/validate_chemistry.py` → must remain **PASS / 0 errors** (dataset untouched).
3. `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\LENOVO\Desktop\ChemLabX_Pro\test\verify.ps1"` → expect **79/79 PASS / 0 FAIL** across all four contexts; 10/10 pages OK; zero runtime/console errors; offline run1/run2 intact.
4. Rendered-page smoke check: lessons, quiz, and experiments pages render full catalogs (count/ids match packs); an unknown content id fails closed.
5. Provenance check: content read stamped with the acting content version; existing records untouched.
6. Confirm no protected file changed (diff/read-only re-verification).

---

## FINAL RECOMMENDATION

> **RECOMMENDATION: TASK-008 SHOULD START**

**Objective:** Complete the Foundation Layer's one unfinished §28 item — introduce a pure **Content domain** with **versioned, schema-validated Content Packs** (lessons, quiz, experiment-descriptive catalog), a `CONTENT_VERSION` manifest, offline-first loaders, and a deterministic fail-closed content validator — establishing the single authoritative, versioned content source every later Education/update-lane phase depends on. No backend, auth, sync, cloud, or multi-site work.

**Scope:** G above (loader + packages + manifest + validator + loaders-as-transition + harness checks).

**Allowed Files:** J above.

**Protected Files:** I above (domains, core storage/auth, lab, datasets, CSS/HTML/sw/manifest, verify/server scripts, persisted data, schema).

**Dependencies:** TASK-003 (DataPort/provenance/fail-closed) — complete. None of the deferred items (§26 decisions) is a dependency for TASK-008.

**Acceptance Criteria:** K above.

**Verification Commands:** L above (validator, chemistry validator, full verify.ps1, page smoke checks).

---

*This audit modified no files. STOPPED awaiting approval before any implementation.*

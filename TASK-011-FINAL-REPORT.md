# TASK-011 — Education Domain Foundation · Final Report

**Project:** ChemLabX Pro (prototype foundation)
**Task:** TASK-011 — Education Domain Foundation
**Date:** 2026-10-28
**Status:** COMPLETE — validated
**Final decision:** **GO**

---

## A. Task identity & decision

| Item | Value |
|---|---|
| Task | TASK-011 — Education Domain Foundation |
| Baseline | TASK-003 → TASK-010 COMPLETE (111 PASS / 0 FAIL) |
| Delivered | UI-free, offline-first, deterministic education domain over the existing `CHLDB` boundary |
| Rules version | `prototype-education-v1` |
| Regression result | **143 PASS / 0 FAIL** in all four harness contexts |
| Protected contracts | Unchanged (see §J) |
| TASK-012 | **NOT STARTED** (hard stop, §32) |
| Decision | **GO** |

No UI was added or changed. No version pin was bumped. No deployment, mirror, or configuration change was performed.

---

## B. Deliverables

| File | Change | Notes |
|---|---|---|
| `js/domain/education.js` | **NEW** (712 lines, 31,234 bytes) | The TASK-011 domain module; exposes `window.Education` and `CHL.education` |
| `test/harness.html` | Modified (additive) | One script tag after the content packs + K-suite (K1–K32) inserted between the J-suite and the I-suite |
| `test/server.ps1` | Modified (test infra) | Per-request exception isolation only; see §J.1 |
| `CHEMLABX_ARCHITECTURE.md` | Modified (annotations) | Post-TASK-011 status, 143 baseline, roadmap status, additive §31 delivery note |
| `TASK-011-FINAL-REPORT.md` | **NEW** | This report |

**Not changed:** every page module, every HTML page, `js/core/*`, `js/domain/{chemistry,laboratory,safety,results,authorization,changejournal,content}.js`, `sw.js`, `manifest.webmanifest`, content packs/manifest, `js/data/*`, CSS, `js/lab/*`.

---

## C. Architecture & module boundary

`js/domain/education.js` is a single IIFE loaded after the content packs. It has **no DOM access, no network access, no timers, no randomness, and no third-party dependency** (asserted by K26). All identifiers come from `CHLDB.uid()`; all persistence goes through the existing `CHLDB` API; all reads return deep copies so callers cannot mutate the store by reference.

```
Pages / future UI
      │  (not implemented in TASK-011)
      ▼
window.Education  ──►  CHLDB (localStorage / DataPort boundary)
      │                CHL.authorization (roles only; unchanged)
      │                CHL.changeJournal (class/assignment/submission only)
      └──────────────►  CHL.content (lesson/quiz/experiment reference checks)
```

The domain never writes `js/core/*` state directly, never rewrites historical records, and never deletes records (archive-only).

---

## D. Domain model

`ENTITY_TYPES = ['teacher','student','course','class','assignment','submission']`

| Entity | Storage | Identity | Statuses | Versioned fields |
|---|---|---|---|---|
| Teacher profile | `CHLDB.get/set('teachers')` (id→record map) | `user.id` | `active`, `archived` | `entityVersion`, `createdAt`, `updatedAt`, `provenance`, `orgId:null` |
| Student profile | `CHLDB.get/set('students')` | `user.id` | `active`, `archived` | same + `classIds[]` |
| Course | `CHLDB.get/set('courses')` | generated or supplied | `active`, `archived` | same + `code` (unique) |
| Class | `CHLDB.classes` (existing collection) | generated or supplied | `active`, `archived` | same + `teacherId`/`teacherIds[]`, `courseIds[]`, `studentIds[]` |
| Assignment | `CHLDB.assignments` | generated or supplied | `draft`, `published`, `archived` | same + refs, `type`, `target`, window, `dueDate` alias |
| Submission | `CHLDB.submissions` | generated | `submitted`, `returned` | same + `attempt`, `resultRef`, `submittedAt`, `returnedAt` |

**Invariants (K30):** `orgId` is always `null`; `entityVersion` starts at 1 and is monotonically bumped on every mutation; every record carries a provenance stamp from `CHL.provenance({ eduRules: 'prototype-education-v1' })`; `createdAt ≤ updatedAt`.

**Status vocabulary** is a closed allow-list; `isValidStatus` returns `false` for any unknown entity type or status (K2).

---

## E. Lifecycle & fail-closed rules

All invalid input throws `EducationError` (never a silent no-op):

| Rule | Behavior |
|---|---|
| Missing/empty bilingual required text | throw |
| Duplicate profile / id / course code / class code | throw |
| Unknown status | throw |
| Non-null `orgId` | throw (**rejected at every mutator entry point**) |
| Unknown content reference (packs loaded) | throw |
| Unauthorized/unknown role, guest, unprofiled student | throw |
| `availableFrom > dueAt` | throw |
| Assignment with no lesson/experiment/quiz refs | throw |
| Publish non-draft / re-publish archived | throw |
| Submit draft/archived/future assignment | throw |
| Return non-submitted or already-returned submission | throw |
| Invalid `resultRef` | throw |

Lifecycle is **archive-only**: `active → archived`; assignment `draft → published → archived`; submission `submitted → returned`. There is no delete path.

`bump()` increments `entityVersion` and refreshes `updatedAt`; `baseRecord()` stamps `orgId:null`, version 1, timestamps, and provenance exactly once per new record.

---

## F. Authorization

- **No new permission atoms.** `js/domain/authorization.js` is untouched (K28 compares `PERMISSION_NAMES` and the full `PERMISSIONS` matrix against the pre-suite snapshot).
- Role resolution (`roleOf`) prefers the **stored** `CHLDB.users` role whenever the actor id resolves (anti-spoof); otherwise the supplied role is normalized through `CHL.authorization.normalizeRole`, which maps unknown/absent roles to `user` (fail-closed). Guests are `user` and cannot write.
- Effective matrix used by the domain:

| Operation | admin | teacher | student | user/guest |
|---|---|---|---|---|
| Create teacher/student profile | ✔ | ✘ | ✘ | ✘ |
| Archive profile | ✔ | ✘ | ✘ | ✘ |
| Create course | ✔ | ✔ | ✘ | ✘ |
| Create/update/archive class | ✔ | ✔ (owner only) | ✘ | ✘ |
| Enroll/unenroll student | ✔ | ✔ (owner only) | ✘ | ✘ |
| Create/publish/archive assignment | ✔ | ✔ (owner only) | ✘ | ✘ |
| Submit | ✔ | ✘ | ✔ (self only) | ✘ |
| Return submission | ✔ | ✔ (owner only) | ✘ | ✘ |
| Read class submissions | ✔ | ✔ (owner only) | ✘ | ✘ |
| Read own submissions | ✔ | ✔ | ✔ (self only) | ✘ |

This is **client-side correctness hardening**, not a server-grade security boundary (same posture as the rest of the prototype; see `authorization.js`).

---

## G. Persistence & page compatibility

- Profiles/courses are id→record maps under `teachers` / `students` / `courses` — no new database, no new storage engine, no `education-db`.
- Class/Assignment/Submission reuse the **existing** `classes` / `assignments` / `submissions` collections so the delivered pages keep working. Domain fields are added; page fields are preserved:
  - Class: `teacherId`, `teacherIds[]`, `code`, `studentIds[]`, `courseIds[]`, `status`.
  - Assignment: `teacherId`, `type`, `target`, `dueDate` (alias of `dueAt`), `lessonRefs[]`/`experimentRefs[]`/`quizRefs[]`, `status`.
  - Submission: `studentId`, `userId` (page dedupe), `classId`, `assignmentId`, `status`, `submittedAt`, `attempt`, `resultRef`.
- Enrollment is synced both ways: `createClass`/`addStudentToClass` append the class id to the student profile, `removeStudentFromClass` removes it (K9, K32).
- Student profiles are never auto-created: a class may only reference an existing Student profile (fail-closed).

---

## H. Change Journal integration

| Write | Journaled |
|---|---|
| Class create/update/archive/enroll/unenroll | ✅ `upsert` |
| Assignment create/publish/archive | ✅ `upsert` |
| Submission submit/return | ✅ `upsert` |
| Teacher / Student profile | ❌ (not in the journal `ENTITY_TYPES` contract) |
| Course | ❌ (same reason) |

- The journal `ENTITY_TYPES = ['result','submission','assignment','class']` and the 11-field `ChangeRecord` contract are **unchanged** (validator PASS).
- Writes call `CHL.changeJournal.record(type, id, 'upsert', {id}, actorId)` at the domain boundary.
- Journal failures are caught defensively and never break a domain write; they remain observable via `changeJournal.status().failures`.
- K27 runs an isolated flow and asserts exactly `{class:1, assignment:2, submission:1}`, all `upsert`, zero failures, and **zero** journal entries for the course created in the same flow.
- The teacher/student/course gap is deliberate and documented (spec §19); extending the journal contract is out of scope for TASK-011.

---

## I. Content references & submissions

- An assignment must carry at least one of `lessonRefs` / `experimentRefs` / `quizRefs`.
- References are validated fail-closed against the **loaded** packs: lesson ids 1–6, quiz ids 1–20, experiment keys from the 14-key canonical list (e.g. `Na+H2O`, `HCl+NaOH`). Unknown references throw.
- `type` is derived: `experimentRefs → 'lab'`, else `lessonRefs → 'lesson'`, else `'quiz'`; `target` is the first reference value.
- Submission requires: published assignment, active class, and an existing Student profile; a student may only submit for themselves.
- `resultRef` must resolve to an existing `CHLDB.results` record; it is stored normalized as `result:<id>` (a bare id also resolves). No result is fabricated.
- Resubmission creates a **new** submission record with `attempt + 1` (K21: attempts 1 → 2 → 3, distinct ids, no duplicate entity).
- `returnSubmission` sets `status:'returned'`, `returnedAt`, optionally `feedback`, and bumps `entityVersion` (K22).
- An overdue `dueAt` does **not** block submission (explicit decision); a future `availableFrom` does.

---

## J. Verification evidence

### J.1 Automated validators (unchanged contracts)

| Validator | Result | Evidence |
|---|---|---|
| `test/validate_chemistry.py` | **PASS** | 0 errors; 185 materials, 28 reaction keys, 14 experiments; no dangling refs |
| `test/validate_content.py` | **PASS** | 37/37; manifest `content-v1`, schemaVersion 2, hash matched, packs 6/20/14 |
| `test/validate_authorization.py` | **PASS** | 4 roles, 8 permissions, matrix intact |
| `test/validate_changejournal.py` | **PASS** | ops `upsert/delete`, entity types 4, required fields 11 |

### J.2 Regression driver `test/verify.ps1` (Chrome headless)

| Context | Result |
|---|---|
| Harness — fresh online profile | **143 PASS / 0 FAIL**, completed |
| Harness — offline-profile preload (online) | **143 PASS / 0 FAIL**, completed |
| Harness — offline run 1 (SW cache) | **143 PASS / 0 FAIL**, completed |
| Harness — offline run 2 (SW cache, idempotent) | **143 PASS / 0 FAIL**, completed |
| Page loads | **10/10 OK** (index, login, register, dashboard, lab, experiments, lessons, quiz, profile, admin) |
| Runtime errors | **0** |
| Offline index from SW cache | **PASS** |

**Baseline arithmetic:** 111 (TASK-003 → TASK-010 A–J suites) + 32 (K1–K32) = **143**. No existing check was removed, weakened, or renumbered.

**Test-infra note (disclosed):** `test/server.ps1` was hardened to catch a per-request client abort inside the loop. Chrome closing a connection during the Service Worker precache could previously terminate the PowerShell test server, which made every subsequent offline-context navigation render Chrome's net-error page (`PASS=0 FAIL=0 completed=False`). The server still serves the same bytes, MIME types, 404s, and root; **no product behavior changed**. This was test-infrastructure fragility, not a domain defect.

### J.3 K-suite coverage (32 checks)

| Check | Covers |
|---|---|
| K1–K2 | API surface, rules version, entity types, status vocabulary |
| K3–K6 | Teacher/Student profile create + fail-closed identity rules |
| K7–K8 | Course create + fail-closed (missing/dup code, dup id, `orgId`) |
| K9–K11 | Class create, page-compat fields, links, enrollment sync, fail-closed, dup id, `orgId` |
| K12–K14 | Assignment create (lab), derivation (lesson/quiz), fail-closed refs/class/role/window |
| K15–K17 | Publish, publish fail-closed, archive terminal |
| K18–K21 | Submit, resultRef, fail-closed states, resubmission attempts |
| K22–K25 | Return + fail-closed; role-scoped class/student reads |
| K26–K28 | Source hygiene (UI-free/offline/no random), journal discipline, authorization untouched |
| K29–K30 | Version pins unchanged; record invariants |
| K31–K32 | Exact baseline restore (stores, users, journal, session); relationship round-trip |

K31 runs **last**, after K32, and restores the exact pre-suite snapshot: `teachers`, `students`, `courses`, `classes`, `assignments`, `submissions`, `results`, `users`, `session`, and an empty Change Journal. Any mid-suite exception also triggers a best-effort restore plus a recorded `K` failure.

### J.4 Contract integrity

| Protected contract (§30) | Modified? | Integrity |
|---|---|---|
| Chemistry domain + validated dataset | **NO** | ✅ verified by validator + K29 |
| Safety domain | **NO** | ✅ untouched |
| Results domain / result records | **NO** | ✅ untouched; `resultRef` read-only |
| Authorization module + permission atoms | **NO** | ✅ K28 snapshot equality |
| Change Journal module + 11-field record | **NO** | ✅ validator + K27 |
| DB core / DataPort / storage boundary | **NO** | ✅ untouched |
| Version pins (`SCHEMA_VERSION=2`, `CHEMISTRY_DATA_VERSION='validated-v1'`, `APP_VERSION='4.0.0-foundation'`, `CONTENT_VERSION`) | **NO** | ✅ K29 |
| Service Worker (`sw.js`) | **NO** | ✅ offline contexts PASS |
| Web app manifest / content manifest | **NO** | ✅ validators PASS |
| Existing content data + packs | **NO** | ✅ validator PASS |
| Page modules + HTML pages | **NO** | ✅ 10/10 pages OK, 0 runtime errors |
| Existing A–J harness suites | **NO** | ✅ 111 checks unchanged; K is additive |
| `test/harness.html` | **YES** (additive) | Script tag + K-suite only |
| `test/server.ps1` | **YES** (test infra) | Per-request abort isolation only |
| `js/domain/education.js` | **NEW** | The deliverable |
| `CHEMLABX_ARCHITECTURE.md` | **YES** (docs) | Status annotations + additive §31 |

**Integrity verdict: PASS — no protected contract was altered.**

---

## K. Not implemented, known limitations, final decision

### K.1 Not implemented (by design / per §26 decisions)

1. **Production identity** — no MFA, SSO/OAuth, provider integration, provisioning, import, or account lifecycle. Teacher/Student remain profiles linked to existing `CHLDB.users`.
2. **Organization multi-tenancy** — `orgId` is always `null`; non-null input is rejected. No tenant scoping, membership model, or isolation.
3. **Gradebook / assessment / analytics** — no grades, rubrics, weighting, progress dashboards, or reporting. `resultRef` only links to an existing result record.
4. **Site Server, Cloud, Sync transport** — no network layer, no sync engine runtime, no conflict resolution, no CRDT. The Change Journal remains on-device only.
5. **UI** — no screens, routes, components, or navigation changes.
6. **Content authoring** — no new lessons/quizzes/experiments; references are validated against `content-v1`.
7. **Deletes / retention** — archive-only; no destructive delete or purge path.
8. **TASK-012** — not started (§32 hard stop).

### K.2 Known limitations

1. **Teacher/Student/Course are not journaled.** The journal `ENTITY_TYPES` contract (§19) does not include them, so those writes are not replayable. This is a documented gap; changing the contract is out of scope.
2. **Page status nuance.** The delivered pages dedupe submissions by presence and write `'completed'` in some flows; `returnSubmission` sets `'returned'`. Because page dedupe is presence-based, a returned submission still counts as "present" for those pages. Domain reads (`submissionsForClass` / `submissionsForStudent`) are authoritative for state.
3. **Domain classes need domain profiles.** A class may only reference an existing Student profile; legacy/seed enrollments that name a user without a profile are not auto-created (fail-closed).
4. **Client-side authorization only.** Role checks are correctness hardening, not a server-grade boundary; a determined client can bypass them in the same way as the rest of the prototype.
5. **No optimistic concurrency.** `entityVersion` is monotonic per record, but there is no compare-and-swap/locking; a single device's last write wins. Concurrent writers are out of scope until Sync.
6. **`dueAt` is advisory.** Overdue assignments do not block submission; only a future `availableFrom` does.
7. **Actor-role derivation.** If the actor id resolves to a stored user, the stored role wins (anti-spoof); otherwise the supplied role is normalized. An unknown role becomes `user` and is denied writes.
8. **K-suite depends on seeded users.** The deterministic K-suite selects the seeded admin/teacher/student users present in all four verify contexts; it restores the exact baseline afterwards (K31).

### K.3 Final decision

**GO.**

TASK-011 is implemented, validated, and regression-clean:

- Domain: complete for the specified foundation scope.
- Authorization: fail-closed, no new permission atoms.
- Journal: class/assignment/submission only, contract untouched.
- Protected contracts: intact.
- Validators: 4/4 PASS.
- Regression: 143 PASS / 0 FAIL in 4 contexts, 10/10 pages, 0 runtime errors, offline SW intact.

**HARD STOP.** No TASK-012, no opportunistic refactoring, no UI changes, no version bump, no mirror, no deployment.

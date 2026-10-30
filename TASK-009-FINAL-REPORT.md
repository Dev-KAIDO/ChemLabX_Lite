# TASK-009 FINAL VERIFICATION REPORT
**Identity & Authorization Hardening (application-correctness scope)**
**Status: COMPLETE & VERIFIED — all gates green**

---

## 1. Summary

TASK-009 implemented the approved **application-correctness authorization hardening**
per the Pre-Specification and PRE-GO reports, using Option C+D: separation of
authentication from authorization, a pure fail-closed authorization module, and
centralized authorization decisions. Findings **F0, F1, F3** are closed. The full
regression baseline is preserved (87/87 plus 13 new authorization checks = **100/100**
in all four verify contexts), all version pins unchanged, no migration, no schema
change, and **no protected file was modified**.

## 2. Files Created

| File | Purpose |
|---|---|
| `js/domain/authorization.js` | Pure, deterministic, UI-independent, fail-closed authorization module → `window.CHL.authorization` |
| `test/validate_authorization.py` | Deterministic, stdlib-only source-contract validator for the role/permission vocabulary + matrix |

## 3. Files Modified (authorized)

| File | Change |
|---|---|
| `js/core/auth.js` | **F0** registration admin-escalation fix; **F1** hardened `currentUser()`; **F3** boundary-checked `grantRole`/`archiveUser` (and added `unarchiveUser`); dynamic load of `authorization.js`; `ensureAuthorization` + fail-closed `authorizeAtBoundary` |
| `js/pages/admin.js` | Render gate routed through `CHL.authorization.requirePermission(user,'users.roles.assign')`; archive/unarchive routed through authorization-checked `CHLAuth` methods; grantRole success-gated |
| `js/pages/dashboard.js` | Gate routed through `CHL.authorization.requirePermission(user,'lab.run')` (behavior equivalent) |
| `js/core/ui.js` | Nav role normalized through `CHL.authorization.normalizeRole` (fail-closed, unknown → 'user') |
| `test/harness.html` | **Test fixture (approved)** — added `<script src="../js/domain/authorization.js">` + TASK-009 A-suite (A1–A12) |

## 4. Files NOT modified (authorized but determined not strictly required)

| File | Reason |
|---|---|
| `js/domain/results.js` | Existing `currentUser()` (lines 54–62) already provides correct, defensive actor-id attribution and handles missing/malformed users; GO rule 9 permits modification only "if strictly required" → **not required**. Preserved untouched. |

## 5. Protected Files Verification

The following were **NOT modified** (verified by scope of edits — only the authorized
files above were touched):

- `js/domain/chemistry.js`, `js/domain/laboratory.js`, `js/domain/safety.js`, `js/domain/content.js`
- `js/data/*` (materials, reactions, achievements, `content/*`)
- `js/core/dataport.js`, `js/core/db.js`, `js/core/versions.js`
- `js/lab/*` (particles, effects, shelf, bench, engine, lab)
- `sw.js`, `manifest.webmanifest`, `css/*`, **all `*.html` app pages**
- Persisted user/session/result data

**No protected-file exception was required or made.** The new `authorization.js`
module is loaded at runtime by `js/core/auth.js` (already present on every page)
using the app's established dynamic script-injection pattern — **no HTML `<script>`
tag was added to any protected page.** The harness (modifiable fixture) loads it via a
static tag for deterministic suite execution.

## 6. F0 / F1 / F3 Closure Evidence

### F0 — Registration admin self-escalation (closed)
`auth.js` `registrableRole()`:
- A requested `admin` role is permitted **only** when zero admin accounts exist
  (first-account rule).
- When an admin already exists, a requested `admin` is **refused / downgraded to
  `user`**.
- Arbitrary/unknown role strings are sanitized: `isValidRole` restricts to the
  canonical vocabulary; anything else becomes `user`. No arbitrary string can
  bypass the rule.
- **Harness evidence:** `A3` PASS — `requested=admin stored=user adminExists=true`;
  `A3b` PASS — `stored=student`.

### F1 — Hardened `currentUser()` (closed)
`currentUser()` now returns `null` (unauthenticated) when:
- no session / no `userId`;
- stored user missing or malformed (`!u || !u.id`);
- stored role is not a string or not in the canonical vocabulary (**fail closed**);
- `u.archived === true` (**AC-005**: an open session is downgraded to unauthenticated).

Valid existing users are returned as-is (compatibility preserved). No session expiry
was added (out of scope).
- **Harness evidence:** `A5` PASS — `noSession=true missingUser=true malformedUser=true`;
  `A4` PASS — `active=true archivedSession=false`; `A11` PASS — valid admin still
  authenticates + `require` works.

### F3 — Boundary-checked privileged mutations (closed)
`grantRole` / `archiveUser` / `unarchiveUser` now authorize the **current actor** at
the mutation boundary via `authorizeAtBoundary(actor, permission)`:
- `grantRole` → requires `users.roles.assign` (admin only); target role validated
  against canonical vocabulary.
- `archiveUser` → requires `users.archive`; `unarchiveUser` → requires
  `users.unarchive`.
- Non-admin actors → method returns `null` (target unchanged). Not just render-time:
  checked inside the mutation itself.
- `auth.js` delegates to `CHL.authorization.authorize` when available; otherwise
  **denies** (fail closed — never fabricates a grant).
- **Harness evidence:** `A6` PASS — `grant=null archive=null roleUnchanged=true`;
  `A9` PASS — non-admin gate decision denied.

## 7. Authorization Matrix Implemented

Canonical roles (exactly four): **`admin`, `teacher`, `student`, `user`**.
Guest = role `user` (lab-capable, no user-management), per existing `guest()`.

| Permission | admin | teacher | student | user (incl. guest) |
|---|:---:|:---:|:---:|:---:|
| `users.read` | ✅ | ❌ | ❌ | ❌ |
| `users.roles.assign` | ✅ | ❌ | ❌ | ❌ |
| `users.archive` | ✅ | ❌ | ❌ | ❌ |
| `users.unarchive` | ✅ | ❌ | ❌ | ❌ |
| `users.update.self` | ✅ | ✅ | ✅ | ✅ |
| `lab.run` / `lab.mix` | ✅ | ✅ | ✅ | ✅ |
| `results.attribute` | ✅ | ✅ | ✅ | ✅ |

Fail-closed rules: unknown role → `normalizeRole` → `user` (never admin/teacher);
unknown permission → deny; null/missing actor → deny.

`validate_authorization.py` confirms the matrix: `ROLES=[admin,teacher,student,user]`,
8 permissions within the approved minimal vocabulary, admin-only exclusivity
(`users.roles.assign/archive/unarchive/read` held by admin only), all non-admin rows
lab-capable, and fail-closed source guards present. **PASS.**

## 8. A-Suite Results (harness TASK-009)

All checks PASS in all four contexts (online fresh, offline preload, offline run1,
offline run2):

| ID | Check | Result |
|---|---|---|
| A1 | Module + API present | PASS |
| A2 | Canonical role vocabulary == [admin,teacher,student,user] | PASS |
| A3 | F0: register requesting admin cannot self-escalate when admin exists | PASS |
| A3b | F0: explicit student/user roles preserved | PASS |
| A4 | AC-005: archived record with open session → unauthenticated | PASS |
| A5 | F1: missing/malformed session or user → unauthenticated | PASS |
| A6 | F3: non-admin grantRole/archiveUser/unarchiveUser refused, target unchanged | PASS |
| A7 | Non-canonical admin-like role strings grant NO admin permissions | PASS |
| A8 | Unknown role/permission fail closed (deny) | PASS |
| A9 | Admin gate decision denies non-admin (incl. unauthenticated) | PASS |
| A10 | Guest lab-capable, no user-management/admin permissions | PASS |
| A11 | Valid user compatibility — auth, labels, require preserved | PASS |
| A12 | Authorization API surface callable without throwing | PASS |

> **A7 semantics note:** This is application-correctness hardening. Any role that is
> not the exact canonical string `admin` (e.g. `administrator`, `ADMIN`, garbage)
> is normalized to `user` and grants **zero** admin permissions, and an open session
> with such a role is treated as unauthenticated. A user who hand-writes the exact
> string `admin` into their own localStorage/IndexedDB record is, within the
> client-side threat model, indistinguishable from a real admin; that is explicitly
> outside this task's protection boundary (per the approved "no hostile-client /
> no server-grade" scope).

## 9. Validator Results

| Validator | Command | Result |
|---|---|---|
| Authorization | `python test/validate_authorization.py` | **PASS** (roles 4, permissions 8, matrix rows admin/student/teacher/user) |
| Content | `python test/validate_content.py` | **37/37 PASS / 0 FAIL** |
| Chemistry | `python test/validate_chemistry.py` | **PASS** — 185 materials / 28 reactions / 14 experiments |

## 10. Full Regression Results (all four contexts)

`powershell -NoProfile -ExecutionPolicy Bypass -File .\test\verify.ps1`

| Context | PASS | FAIL | Completed |
|---|:---:|:---:|:---:|
| Online fresh | **100** | 0 | ✅ |
| Offline preload (online) | **100** | 0 | ✅ |
| Offline run1 | **100** | 0 | ✅ |
| Offline run2 | **100** | 0 | ✅ |

**100 = 87 baseline + 13 new authorization checks.** All previous checks remain green
(TASK-003 migration/data, TASK-004 chemistry/lab, TASK-005 safety, TASK-006 result
records, TASK-007 chemistry counts, TASK-008 content). No fails.

## 11. Pages / Runtime Errors / Offline

- **10/10 pages OK**: all pages load, `dom>300`, no JS errors, no legacy refs,
  including the modified `admin.html`, `dashboard.html`, `login.html`,
  `register.html`, `profile.html`.
- **0 runtime errors**: zero `Uncaught/SyntaxError/ReferenceError/TypeError/`
  `Failed to load resource` in any `.err` file (harness online + offline, all pages).
  `authorization.js` loaded cleanly everywhere.
- **Offline SW intact**: offline index served from SW cache; offline harness runs
  PASS 100/100. The new module follows the app's existing uniform network-broadcast
  cache behavior (identical online/offline), so **offline behavior is preserved** with
  no `sw.js` change.

## 12. Migration / Schema / Version Verification

- **SCHEMA_VERSION = 2** (unchanged) ✅
- **CHEMISTRY_DATA_VERSION = 'validated-v1'** (unchanged) ✅
- **CONTENT_VERSION = 'content-v1'** (bound to manifest; harness `T8-2` PASS) ✅
- **APP_VERSION = '4.0.0-foundation'** (unchanged) ✅
- **No migration added.** No IndexedDB store/version change (`db.js`/`dataport.js`
  untouched). No `ResultRecord` schema/provenance-shape change. Existing records
  untouched.

## 13. ResultRecord Compatibility

`results.js` was **not modified**. `ResultRecord` build/persist shape, provenance,
`hc` snapshots, 100-record cap, and eviction are unchanged. Harness `R1–R14` results
suite passes (part of the 100/100). Existing stored results are untouched.

## 14. Data Integrity / Seeded Accounts / Guest

- **No data loss**: harness `A1–A8` (migration/integrity) pass; probe users created by
  the A-suite are run-unique and scrubbed at the end (session reset to null), so no
  state leaks across fresh/reused/offline runs.
- **Seeded accounts still authenticate**: `admin@chemlabx.com`, `student@chemlabx.com`
  present and valid (harness `C1` PASS; `A11` valid-admin auth PASS).
- **Guest lab still works**: `A10` PASS — guest role `user`, `lab.run`/`lab.mix`
  allowed, user-management denied.

## 15. Deviations from GO

None. All 19 GO rules honored. `results.js` and `ui.js` were modified only to the
extent required (ui.js navigation fail-closed normalization; results.js not needed).
No protected-file exception was required.

## 16. Conclusion

TASK-009 is **COMPLETE & VERIFIED**. F0/F1/F3 closed, centralized fail-closed
authorization module delivered, A-suite green (13 checks), deterministic validator
added (PASS), full regression **100/100 in all four contexts**, 10/10 pages, 0 runtime
errors, offline intact, versions pinned, no migration, no protected-file modification.

**STOP** — per GO rule 19, no TASK-010 was started and no speculative cleanup/
refactoring beyond this scope was performed.

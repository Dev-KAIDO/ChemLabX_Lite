# ChemLabX Pro — Codebase Audit Report

**Audit date:** 30 August 2026
**Scope:** Entire `ChemLabX_Pro` prototype (static front-end + local PWA layer). Audit-only; no code changes were made.
**Method:** Full read of all 42 files (10 HTML pages, 8 CSS files, 21 modular JS files, 3 legacy JS files, `sw.js`, `manifest.webmanifest`), plus script/link wiring verification and dataset counts. Note: report published in English although the app UI is Arabic-first.

> **HISTORICAL RECORD — snapshot of 30 Aug 2026, taken before TASK-003 → TASK-010.** All observations and counts in this report (e.g. ~192 material rows, 29 reactions, 15 experiments, 22 / “30+” quiz questions, localStorage-only persistence, “no tests/CI”) describe the prototype **as it stood at the audit date only** and are preserved intentionally as history. They must NOT be read as the current state. Authoritative current state: `CHEMLABX_ARCHITECTURE.md` (§0 status note) and `docs/architecture/POST-TASK-010-RECONCILIATION-AUDIT.md`.

---

## 1. Executive Summary

ChemLabX 4.0 is a **polished, fully client-side educational prototype**: a bilingual (AR/EN, RTL-first) virtual chemistry lab with a shelf of ~192 material entries, a curated reaction catalog, drag-and-drop bench, gamified XP/achievements, lessons, quizzes, classes/assignments for teachers, and an admin console — all persisted in `localStorage` behind a thin data layer, wrapped in a small PWA (`sw.js` + `manifest.webmanifest`).

The codebase is **organized well for a demo** (clean ES5 IIFE modules split into `core` / `data` / `lab` / `pages`), with a deliberately swappable data layer (`db.js`) and a theming/i18n system that works.

However, it is **not production-ready** and carries material gaps:

1. **Chemistry data is prototype-grade, not scientifically validated.** Materials lack CAS/MW/density/concentration; reactions (29) are game-styled records (XP, emoji effects) with no stoichiometry, quantities, kinetics, or hazard data. Quiz question count is advertised as "30+" but only 22 exist.
2. **No real safety/chemistry engine.** Reaction detection is keyed lookup (pair subsets + a `'default'` fallback) that can present chemically naive results; "danger" is a boolean with a **counter that gamifies dangerous reactions** — risky for an educational product.
3. **Auth & storage are demo-grade.** Passwords are hashed with a reversible non-cryptographic hash; sessions live in `localStorage`; anyone can self-register as a teacher; there is no encryption, no multi-device, no backend.
4. **Dead legacy code coexists with the 4.0 tree.** `js/app.js` (77.7 KB), `js/data.js` (50.6 KB), `js/quiz.js` (20.2 KB) and `css/style.css` (86 KB) are **not referenced by any page** yet duplicate datasets and 86 KB of theme/styles (drift risk).
5. **"3D" is a marketing claim.** The lab's third dimension is a decorative particle-field canvas with mouse parallax and a drag tilt (~14°) — there is no 3D engine, no molecular structure data.
6. **The PWA works but is minimal**: cache-first (`chemlabx-v1`), no navigation fallback, no update notice, no versioning of content/data.

**Verdict:** Strong foundation, safe to evolve **incrementally** — but the two gates are (a) deciding the scientific-accuracy bar and validating the data, and (b) hardening storage/auth before any real deployment. See §23 (migration strategy), §24 (human decisions), and the summary table at the end.

---

## 2. Current Technology Stack

| Layer | Reality |
|---|---|
| Language | Vanilla JavaScript (ES5-style: `var`, IIFE modules, `'use strict'`) |
| Markup | 10 static multi-page (MPA) HTML pages, `lang="ar" dir="rtl"` |
| Styling | Hand-written CSS; 6 themes via `[data-theme]` attribute in `css/base.css` |
| Frameworks/Libraries | **None.** No React/Vue/vanilla-deps. Only external: Google Fonts (Inter, Roboto Mono, Cairo) |
| Build tooling | **None.** No `package.json`, no bundler, no transpiler, no lint/format config, no tests, no CI |
| Persistence | `localStorage` only (key namespace `chemlabx_`), via a wrapper (`js/core/db.js`) |
| Auth | Custom, client-side, in localStorage (`js/core/auth.js`) |
| PWA | `sw.js` (cache-first, stale-while-revalidate) + `manifest.webmanifest` |
| Rendering "3D" | Canvas particle field (`js/lab/particles.js`) — decorative, not 3D |
| Run model | Static file hosting; no server, no API, no database |

Consequence: the app is fast, dependency-free, and trivially hostable anywhere — but has no server, no real security, no test harness, and no content/deploy pipeline.

---

## 3. Current Architecture

```
            index.html ──► landing.js (SW registration, lang toggle, canvas)
                 │
                 ▼
        login.html / register.html ──► pages/auth.js ──► core/auth.js ──► core/db.js ──► localStorage
                 │
                 ▼
          dashboard.html ──► pages/dashboard.js  (role-based home: classes, join, assignments, subs)
                 │
    ┌────────────┼───────────────┬─────────────────────────┐
    ▼            ▼               ▼                         ▼
lab.html      experiments.html  lessons.html            quiz.html
js/lab/*     pages/experiments  pages/lessons           pages/quiz
(data/materials.js, reactions.js, achievements.js)   profile.html ──► pages/profile.js
                                             admin.html ──► pages/admin.js
```

- **Global namespaces:** `CHL` (lang), `CHLDB` (storage), `CHLAuth`, `Lab` (lab runtime), `CHLXFX`/`Field` (canvas effects). Page modules use `window.t(ar, en)` for bilingual strings.
- **Shared modules on every page:** `i18n.js → db.js → auth.js → ui.js`; lab-related pages additionally load `data/{materials,reactions,achievements}.js`; the lab itself loads `lab/{particles,effects,shelf,bench,engine,lab}.js`.
- **i18n pattern:** HTML carries `data-ar` / `data-en` (and `data-ar-placeholder`/`data-en-placeholder`); `applyI18n()` populates text at load; page JS renders bilingual content via `t()`.
- **Theming:** an inline bootstrap `<script>` in every `<head>` reads `chemlabx_theme`/`chemlabx_lang` from localStorage before CSS/HTML paint (avoids FOUC).
- **Data layer:** flat JS object literals (materials/reactions/achievements/lessons/quiz) in code; user data in localStorage collections. No schema, no validation, no versioning.
- **PWA:** precaches the entire app shell at install; all same-origin GETs are cache-first with background network refresh.

The architecture is a coherent, single-browser MPA. It has **no client-server split**, so teacher/admin/student are all views over the same local database on one device.

---

## 4. Project Structure

```
ChemLabX_Pro/
├── index.html            landing page (registers service worker)
├── login.html / register.html
├── lab.html              virtual lab (shelf + bench + tools)
├── dashboard.html        role-based home (modals: class/join/assignment/add-student)
├── experiments.html      experiment catalog
├── lessons.html          lesson catalog
├── quiz.html             quiz player (10 random questions)
├── profile.html          stats, levels, achievements
├── admin.html            users / classes / assignments monitoring
├── manifest.webmanifest  PWA manifest (ar, rtl, standalone)
├── sw.js                 service worker (cache 'chemlabx-v1')
├── assets/               icon-192.png, icon-512.png
├── css/  (8 files)
│   ├── base.css           12.7 KB  tokens + 6 themes + base
│   ├── components.css     18.3 KB  modals, toasts, nav, buttons, forms
│   ├── landing.css         6.8 KB  (index.html)
│   ├── auth.css            6.1 KB  (login/register)
│   ├── dashboard.css       7.2 KB  (dashboard/experiments/lessons/profile/admin)
│   ├── lab.css            52.9 KB  (lab.html — one large sheet)
│   ├── quiz.css           12.1 KB  (quiz.html)
│   └── style.css          86.0 KB  LEGACY — not referenced by any page
└── js/
    ├── core/  i18n.js(1.5K) db.js(5.3K) auth.js(5.3K) ui.js(8.3K)
    ├── data/  materials.js(31.7K) reactions.js(15.6K) achievements.js(3.3K)
    ├── lab/   particles.js(4.5K) effects.js(6.3K) shelf.js(14.4K)
    │          bench.js(12.4K) engine.js(25.2K) lab.js(17.0K)
    ├── pages/ dashboard.js(33.0K) admin.js(13.2K) experiments.js(8.8K)
    │          lessons.js(17.5K) profile.js(10.4K) quiz.js(22.6K)
    │          auth.js(4.3K) landing.js(1.4K)
    └── LEGACY (dead — no page references them):
        app.js(77.7K) data.js(50.6K) quiz.js(20.2K)
```

Verified wiring: no HTML page loads `js/app.js`, `js/data.js`, `js/quiz.js`, or `css/style.css`. All 10 pages reference `manifest.webmanifest`.

---

## 5. UI/UX Assessment

**Strengths**
- Bilingual, RTL-first UI with real working i18n (`data-ar`/`data-en`, per-page `applyI18n()`), including placeholders.
- 6 coherent CSS themes (default/ocean/emerald/royal/sunset/light) applied before paint via inline bootstrap script — no flash of wrong theme.
- Consistent glassmorphism component set (`components.css`): modals, toasts, nav, buttons, forms.
- Role-aware navigation and role-specific dashboard content; teacher/admin flows re-use the same components.
- Quiz player has a clean idle/progress/stats layout; lab has a proper two-pane shelf + bench + log layout.

**Weaknesses / Issues**
- **Hard-coded counts:** `lab.html` header says "77 مادة / 77 Materials" as static text while the actual DB has 192 entries — mismatch.
- **Marketing vs. data mismatch:** dashboard quick-links claim "120+ materials" and "30+ questions"; quiz.md header says "10 random questions"; actual pools: 192 material rows (with accidental duplicates), 22 quiz questions. Claims are not data-driven.
- **Inline/per-page style fragmentation:** `dashboard.html`, `profile.html`, `experiments.html`, `admin.html` each embed `<style>` blocks; many elements carry inline `style="direction:ltr;..."`. Hard to maintain; inconsistent with token system.
- **Accessibility (a11y) not addressed:** tabs/modals lack keyboard focus management; no `aria-*` on interactive glass components; contrast not audited; the animated tilt on the bench may disorient users (vestibular).
- **i18n data duplication:** every interactive string is hard-coded twice (Arabic + English) in markup, plus again in `<style>`-embedded markup and JS `t()` calls — single-source-of-truth should be a content layer.
- Drag/positioning on the bench uses random absolute placement; usability on small screens unverified.
- Emojis are used as icons throughout (no SVG sprite set).

**Classification:** structure acceptable; needs a visual/UX consolidation pass, data-driven counts, and an a11y pass before education deployment.

---

## 6. Laboratory Assessment

Files: `lab.html`, `js/lab/{particles,effects,shelf,bench,engine,lab}.js`.

**What exists (verified)**
- **Shelf:** `materialDB` (192 rows) with categories in `categoryConfig` (alkali, alkaline, transition, metal, halogen, noble, acid, base, salt, oxide, …), search box + category filter, bilingual names/formulas/colors.
- **Bench:** materials added as draggable items at random positions; quantity selector (default 5, unit `ml`); temperature/pH simulation (`Lab.state.temperature = 25.0`, `ph = 7.0`) mutated by reactions.
- **Tools:** heat/stir (and filter/cool lineage from 3.0) interact with state; reactions triggered by mixing items on the bench (`performMix` gated by `isReacting`).
- **Log:** `Lab.addLog` bilingual observation log; XP granted; achievements unlocked; undone via `undoHistory`.
- **Effects:** canvas particle field + drag tilt (≤14°) for ambience; 6 palette themes.

**Coherence issues**
- Detection is material-pair-based, quantities are cosmetic (5 ml), and outcomes come from a lookup table, not a simulation.
- `Lab.state` mixes UI (selectedQty/unit, benchItems) with simulation (temp, ph) and gamification (xp, achievements) — a state-machine split is warranted.
- Observation log is free text; nothing records observations to a student notebook or labs report.

**Assessment:** a good interactive demo, **not a quantitative simulation**. Fine as a learning "toy", inadequate as a credible lab training simifier without a real engine and validated data.

---

## 7. Chemistry Data Assessment

Three datasets, all flat JS literals, **no attribution, no version, no scientific identifiers**:

| Dataset | Size | Fields | Gaps |
|---|---|---|---|
| `materialDB` (`js/data/materials.js`) | 192 rows | name/nameEn/formula/color/type/state(danger\|safe\|warning) | No CAS, molecular weight, density, concentration, SDS/GHS. Accidental **duplicate keys**: `V`, `Bi`, `C6H6`, `CH4`, `C12H22O11`, `PbI2`, `Al2O3` each appear twice |
| `reactions` (`js/data/reactions.js`) | 29 keys | equation, products[], effect, effectEn, danger(bool), tempChange(°C), phChange, xp, log, logEn | No stoichiometric coefficients/quantities, no kinetics/rate, no thermochemistry units, no equilibrium, no hazard details; XP on reactions is gamification not chemistry |
| Achievements (`js/data/achievements.js`) | ~10 | icon/title/titleEn/desc/descEn | `danger_zone`/`three_danger` reward performing dangerous reactions — educationally questionable |

Quiz: `js/pages/quiz.js` and legacy `js/quiz.js` both contain the **same 22-question pool** (10 selected randomly, +15 XP each). Legacy header claims "30+" — inaccurate.

Curated experiment catalog: `engine.experiments` (15) and `pages/experiments.js` `experimentTitles` (15, with descAr/descEn/danger/xp).

**Verdict (per the reporting rule):** **Implemented — but NOT scientifically validated.** Every formula, equation, and safety flag must be expert-reviewed before any classroom use. No experiment in this codebase has a measured result, uncertainty, or citation.

---

## 8. Reaction Engine Assessment

File: `js/lab/engine.js` (plus reaction data).

- `findReaction()`: sorts material ids → exact lookup `reactions['Na,H2O']` → **subset match** (any 2+ present materials) → **`reactions['default']` fallback**.
- The default fallback means **any unrecognized combination** produces a canned outcome — a chemically plausible-but-unverified response for arbitrary pairs. This is the single most dangerous abstraction for a chemistry app.
- `performMix()`: guards re-entry via `isReacting`; applies tempChange/phChange, effect text, XP, danger tracking, logs.
- No mass balance, no limiting reactant, no states derivation, no by-products beyond the products[] list, no concentration/temperature-dependent outcomes.

**Assessment:** a directed-lookup reaction system, not a reaction engine. For production, this must be rebuilt over validated data with stoichiometry-aware behavior (or fail-closed for unknown pairs).

---

## 9. Safety Assessment

- Material-level `state: 'danger'|'warning'|'safe'` (e.g., Li/Na/K/Cs/Rb/Hg danger; Ba/Sr/Cr warning).
- Reaction-level `danger: true` with bilingual warnings and a per-user `dangerousReactions` counter.
- **Counter-gamification:** achievements reward reaching dangerous experiments (`danger_zone`, `three_danger`) — incentivizes risky behavior in a tool meant for minors.
- No PPE consideration, no hazard classes (GHS), no quantity/stoichiometry-danger thresholds, no ventilation/disposal guidance, no emergency stop beyond UI reset, no guest/sink of real risk.
- Quantities are cosmetic (5 ml default) so "danger" is decorative — the app cannot compute whether a real mix would be unsafe.

**Assessment:** Safety is a **prototype flag system**, not a Safety Engine. For an educational product this is the highest-priority rebuild, and XP/counter should never reward danger.

---

## 10. Storage Assessment

File: `js/core/db.js` (121 lines). Namespace `chemlabx_`.

- `localStorage` JSON under keys `chemlabx_lang`, `chemlabx_theme`, `chemlabx_session`, `chemlabx_guestId`, plus collections `users`, `classes`, `assignments`, `submissions` (object-keyed by id; `get/set/list/getById/upsert/remove`).
- First-run **seed** creates admin@chemlabx.com/admin123, teacher@chemlabx.com/teacher123, student@chemlabx.com/student123, one class (CH101) and one sample assignment.
- `hashPassword()` is a djb2-style variant (base-36) — **reversible/brute-forceable**; comment itself says "offline demo only".
- Limits: ~5–10 MB per origin, per-browser, deleted with site data; no concurrency, no offline merge, no cross-tab coherence.

**Assessment:** the `CHLDB` abstraction is clean and swappable (good design intent), but the backing store is inadequate for accounts, classes, or safety-relevant data. Migration path (§23) targets IndexedDB/local-first DB + cloud sync.

---

## 11. Authentication & RBAC Assessment

File: `js/core/auth.js` (+ `js/pages/auth.js`).

- Roles: `admin`, `teacher`, `student`, `user`; `CHLAuth` covers `register/login/logout/currentUser/isLoggedIn/require/updateUser/archiveUser/grantRole/guest`.
- Validation: email non-empty + trimmed/lowercased + uniqueness; password ≥ 6 chars. No email format check, no password strength, no reset/recovery, no MFA.
- **Registration:** self-serve; anyone can pick `teacher` (subtitle encourages it) — no invitation/approval. Because the seed guarantees an admin, the "first user becomes admin" branch is effectively only hit on a wiped DB.
- Sessions: `chemlabx_session` in localStorage = { userId, ts }; `currentUser()` loads user by id but does **not** re-check `archived`, so archiving blocks future logins but not already-open sessions.
- Pages gate with `CHLAuth.require([roles])`; wrong-role and logged-out users are redirected.
- Guest mode: `guestId` persisted locally, role `user`, full lab access without account.

**Assessment:** client-side, demo-grade. Fine for a single-browser prototype; `teacher` self-promotion, archived-session staleness, and weak password scheme must be resolved when a backend/org model lands.

---

## 12. Education Assessment

- **Lessons** (`js/pages/lessons.js`): `lessonsData` array, bilingual content embedded as HTML strings with icons; grid + detail view; completion marks XP.
- **Quiz** (`js/pages/quiz.js`): 22-question pool (10 random), 15 XP per correct, timer, best score saved to profile. No question categories/leveling, no explanations-on-answer, no audio.
- **Progress:** XP → levels with thresholds 30/80/150/250/400 → titles Beginner → Genius (`js/pages/profile.js`); achievements grid (locked/earned styling).
- **Teacher flows:** create classes, join codes (CH101 style), publish assignments typed lab/lesson/quiz with target + due date; add students (auto-creates account with predictable temp password `student123`); submissions tracked as score/XP records (`dashboard.js`, `admin.js`).
- **Content depth:** thin. Lessons/quiz are few and hardcoded; no rubrics, no grading, no per-skill analytics, no curriculum mapping, no reports for teachers/parents.

**Assessment:** a coherent gamified MVP of self-study + teacher assignment tracking. Needs content scale and assessment quality before it's a real education product.

---

## 13. PWA / Offline Assessment

- `manifest.webmanifest`: name/description (Arabic), `start_url ./index.html`, `scope ./`, `display standalone`, `dir rtl`, `lang ar`, theme/bg `#0f1226`; icons 192 + 512 (`any`/`maskable`). No `id`, no screenshots, no `shortcuts`.
- `sw.js`: cache `chemlabx-v1`; precaches full app shell (10 HTML, manifest, icons, 7 CSS, 24 JS); install → skipWaiting; activate → deletes other caches + claim; fetch → cache-first with background-network fill (stale-while-revalidate) for same-origin GETs.
- **Registered only from `index.html`** (`pages/landing.js`), guarded to `http`/`https`. Because scope covers the directory, install-via-index makes all pages offline-capable afterward.
- **No navigation fallback** (offline visits to a non-cached URL fail), **no update notification** (new shell silently caches on next install), **no update/version UX**, fonts are cross-origin so Google Fonts are not cacheable/sw-eligible (offline font fallback only).
- Versioning: cache name = app version; content/data have no separate versioning (§15).

**Assessment:** minimal but functional offline-first shell; acceptable for demo, needs update policy + offline fallback + font handling for production PWA.

---

## 14. Multi-Organization Assessment

**Not implemented.** There is no organization entity anywhere:
- `school`/`schoolEn` exist only as free-text fields on a user profile.
- `classes` carry `teacherId` + `studentIds` + a join `code`; nothing scopes data to an organization.
- `admin` is a single global role over the whole localStorage database.
- No tenant separation → on a shared device, one user could read/edit everyone's data (see §17).

Any multi-school product (the stated long-term direction) requires an Organization Core before anything else is layered on.

---

## 15. Versioning & Update Assessment

- No app version constant/metadata file (version only live in the `sw.js` cache name `chemlabx-v1`).
- **Data has no schema version or migration** — materials/reactions/lessons/quiz are unreferenced JS literals; user records (progress shapes) can silently change shape between versions.
- No changelog, no update prompt, no force-update, no data-migration runner.
- Risk is compounded by **dual sources of truth** (modern data vs legacy data files §4/§19): drift already visible (e.g., headers, counts).
- Cache invalidation relies on bumping `chemlabx-v1` manually.

**Assessment:** this is the main maintenance headache for any future change, and directly gates the chemistry-data rebuild (§23).

---

## 16. 3D / Visualization Assessment

- **There is no 3D**, only a decorative canvas particle field (`js/lab/particles.js`: `PARTICLES_COUNT = 90`, DPR ≤ 2, `Molecule` class drawing pseudo-depth via z/s/drift) with mouse parallax and drag tilt (≤14°, `effects.js`).
- Named "Molecule", drawn as glowing points — attractive but **not molecular structure**; no molecular data, no camera, no lighting, no pick/rotate of real 3D geometry.
- The "3D" framing in marketing/README-style claims is unmet by functionality.

**Assessment:** document reality first (rename "particles" or drop "3D" claims); investment in genuine 3D is out of scope until a visualization domain/engine decision is made (see DO NOT IMPLEMENT YET).

---

## 17. Security Assessment

Client-only app; threat model is "attacker with browser access".

**Risks (confirmed)**
- **Password hashing is non-cryptographic** (`db.js:47` djb2) — trivially reversible with a small wordlist; hashes stored in plain localStorage.
- **Session in localStorage** — exfiltrated (XSS) or machine-shared → account takeover; no expiry beyond `ts` (unused), no CSRF considerations (no server anyway).
- **Self-service `teacher` role** — anyone can claim educator privileges.
- **`archive` vs delete** — archived users cannot log in again but existing sessions remain valid.
- **XSS surface via `innerHTML`** patterns in several renderers — `esc()` exists and is used in dashboard/admin/profile, but sanitization is ad-hoc, not systematic; lessons content is fed from code constants (lower risk) — still, no CSP (`Content-Security-Policy` absent), no `X-Frame-Options` notions (static hosting).
- **Predictable student temp passwords** (`student123`) created by teachers.
- **Guest mode** bypasses identity entirely (design choice, but notable).

**Assessment:** acceptable for a local demo, not for deployment. Decide a real auth backend or local-encrypted vault + CSP before multi-user use.

---

## 18. Code Quality Assessment

**Strengths**
- Consistent modular IIFE style; namespaces (`CHL/CHLDB/CHLAuth/Lab`) make ordering and dependency explicit.
- Clean separation: `core` (infra) / `data` / `lab` / `pages`.
- Clear utility intent: `db.js` explicitly designed as a "swappable later for a real backend API".
- Consistent bilingual `t()` calls and escaped output in admin/dashboard.

**Weaknesses**
- **Duplicate CSS:** `css/style.css` (86 KB) is the legacy ancestor; its theme blocks are byte-identical to `base.css` at the same line numbers — full duplication dead code.
- **Duplicate data:** materials/reactions/achievements/quiz exist in both modern and legacy forms (must NOT diverge — they already do in headers/counts).
- **Fragmented styling:** per-page `<style>` blocks + inline `style=` attributes battle the token system.
- **File size distribution:** `lab.css` 52.9 KB and `dashboard.js` 33 KB approach do-one-thing limits; `engine.js` + `lab.js` mix rendering, simulation, and gamification.
- **No tests, no linter, no prettier, no CI** — regression risk for refactors is unmanaged.
- Magic numbers (XP per action, level thresholds, drag limits) are inline literals.

**Assessment:** code is readable and consistent for a demo; it needs test scaffolding and deduplication before growth.

---

## 19. File-by-File Classification

Vocabulary: **KEEP** / **REFACTOR** / **REBUILD** / **REMOVE** / **NEW** / **REVIEW**.

| File | Class | Rationale |
|---|---|---|
| `css/base.css` | **KEEP** | Design tokens + 6 themes; consolidate here |
| `css/components.css` | **REFACTOR** | Good shared set; absorb drift from per-page `<style>` blocks |
| `css/dashboard.css` | **KEEP** (→merge into components) | Small; shared by 5 pages |
| `css/landing.css` | **KEEP** | Small, page-specific |
| `css/auth.css` | **KEEP** | Small, page-specific |
| `css/quiz.css` | **KEEP** | Small, page-specific |
| `css/lab.css` | **REFACTOR** | 52.9 KB monolith; split tools/shelf/bench/log/animations |
| `css/style.css` | **REMOVE** | Unreferenced 86 KB legacy duplicate of base themes + old styles |
| `js/core/i18n.js` | **KEEP** | 36-line, minimal, works; minor: unused `window.CHL.lang` legacy alias |
| `js/core/db.js` | **REFACTOR** | Clean API — keep shape; add validation, schema version, migrate hook, swap store later |
| `js/core/auth.js` | **REFACTOR** | Keep API; harden (check archived on `currentUser`, real hashing later, email format) |
| `js/core/ui.js` | **KEEP** | Themes + toast + nav renderer; good |
| `js/data/materials.js` | **REBUILD** | Move to validated, versioned, sourced dataset (slotted with legacy data removed); de-dup keys |
| `js/data/reactions.js` | **REBUILD** | Rebuild over validated chemistry data w/ stoichiometry & fail-closed unknown pairs |
| `js/data/achievements.js` | **REFACTOR** | Keep gamification but remove danger-rewarding achievements (design decision) |
| `js/lab/particles.js` | **KEEP** | Decorative canvas; rename claims, not code |
| `js/lab/effects.js` | **KEEP** | Theme palette + tilt; ensure `prefers-reduced-motion` respected |
| `js/lab/shelf.js` | **REFACTOR** | 14 KB renderer; derive counts from data (fix "77 مواد" hard-code), virtualize later |
| `js/lab/bench.js` | **REFACTOR** | Insertion/drag/drop; a11y (keyboard), deterministic placement |
| `js/lab/engine.js` | **REBUILD** | Replace lookup+default with validated reaction model; fail-closed; engine ≠ rendering |
| `js/lab/lab.js` | **REFACTOR** | Separate app-state (sim) from UI state; split gamification side-effects |
| `js/pages/landing.js` | **KEEP** | 35 lines; SW registration + i18n |
| `js/pages/auth.js` | **REFACTOR** | Tighten role flow; email validation; reuse core rules |
| `js/pages/dashboard.js` | **REFACTOR** | 33 KB: split role-rendering, class/assignment CRUD into modules; data-driven stats |
| `js/pages/experiments.js` | **KEEP** (align data) | Thin catalog renderer; sync with engine experiments |
| `js/pages/lessons.js` | **REBUILD** | Move content out of JS strings into a content model (JSON/Markdown, versioned, bilingual) |
| `js/pages/quiz.js` | **REFACTOR** | Expand pool, add explanations; reuse content model |
| `js/pages/profile.js` | **KEEP** | Read-only display; small |
| `js/pages/admin.js` | **REFACTOR** | Reuse shared list/table components; add session/archive checks |
| `js/app.js` | **REMOVE** | Legacy 3.0 monolith (77.7 KB), unreferenced |
| `js/data.js` | **REMOVE** | Legacy dataset duplicate (50.6 KB), unreferenced; migrate content before removal |
| `js/quiz.js` | **REMOVE** | Legacy quiz (20.2 KB), unreferenced; questions already ported |
| `sw.js` | **REFACTOR** | Add navigation fallback, versioning per data/model, update prompt, font handling |
| `manifest.webmanifest` | **REVIEW** | Add `id`/`screenshots`/`shortcuts`; confirm icon quality |
| `assets/icon-*.png` | **REVIEW** | Purpose/quality audit (maskable safe-zone) |
| `*.html` (all 10) | **REFACTOR** | Remove duplicate inline `<style>`/bootstrap scripts; centralize head template |

---

## 20. Technical Debt

1. **Dead legacy tree** (`app.js`, `data.js`, `quiz.js`, `style.css`) ≈ 234 KB unreferenced — remove safely after migrating unique content (quiz Qs already ported; materials duplicated).
2. **Duplicate datasets** (modern + legacy) with already-diverging headers/counts — a future drift hazard.
3. **Duplicate CSS themes** (style.css ≈ base.css theme blocks) and fragmented per-page inline styles.
4. **Hard-coded, misleading counts**: "77 materials" (`lab.html`), "120+" / "30+" claims vs. actual 192 rows / 22 questions.
5. **Lookup-with-default reaction model** — silently plausible answers for arbitrary mixes.
6. **Non-cryptographic password scheme + localStorage sessions** — blocking for any real deployment.
7. **No content/schema versioning** anywhere (data, lessons, progress shapes, cache).
8. **No tests/CI/lint** — refactor safety net missing.
9. **Mixed concerns** in `lab.js`/`engine.js`/`dashboard.js` (render + sim + gamification).
10. **Marketing vs. functionality gap on "3D"**.
11. **i18n text duplicated** across markup attributes, inline JS, and `<style>`-embedded markup (no single source).
12. **Danger rewarded via achievements** (design debt in pedagogy/safety).

---

## 21. Architecture Gaps

| Gap | Today | Needed (target) |
|---|---|---|
| Chemistry | Lookup tables | Validated, versioned data + stoichiometry-aware engine |
| Safety | Boolean flags + danger counter | Safety Engine (hazards, PPE, disposal, fail-closed unknowns) |
| Persistence | localStorage (~5 MB, single browser) | IndexedDB/local DB + sync; schema-versioned migrations |
| Auth/RBAC | Local, weak hash, self-service roles | Real auth (password hardening/backend) + enrollment approval |
| Multi-organization | None | Org entity + scoping (later) |
| Education | Hardcoded lessons/quiz, XP only | Content model + grading/rubrics + analytics |
| PWA | Basic cache-first | Offline fallback, update policy, versioning |
| 3D/Visualization | Decorative canvas | Honest labeling now; real 3D later (decision-gated) |
| Administration | Global single self-hosted | Scoped admin + audit trail |
| Testing | None | Unit/contract tests for engine, data validation, storage |
| Deployment | Static files | Versioned release pipeline (when needed) |

---

## 22. Risks

**High**
- **R1 — Unvalidated chemistry data** taught as fact (equations, dangers, effects). Impact: incorrect learning, safety misconceptions.
- **R2 — Default-reaction fallback** produces plausible-but-unverified outcomes for arbitrary material mixes.
- **R3 — Danger gamification** (achievements for dangerous reactions) in a product aimed at minors.
- **R4 — localStorage data loss** (clear site data / new browser) destroys accounts, classes, submissions without warning.
- **R5 — Session/password weakness** → account takeover on shared machines.

**Medium**
- **R6 — Dead-code drift** between legacy and modern datasets cause inconsistencies already visible.
- **R7 — Offline update gap** (no update notice) leaves users on stale caches/content silently.
- **R8 — Teacher self-registration** undermines classroom integrity without moderation.
- **R9 — Misleading "3D"/counts claims** damage credibility with evaluators/users.

**Low**
- **R10 — A11y gaps** limit usability (modals, keyboard lab, reduced-motion).
- **R11 — Fonts offline** degrade to fallbacks (no self-hosted fonts).

Suggested response: address R1–R4 before any classroom/real use; R6 before refactors; others tracked in §23/24.

---

## 23. Recommended Migration Strategy

Incremental, keep-the-app-runnable, feature-flag new paths. No big-bang rewrite.

**Phase 0 — Decisions (≈1 week, no code):** settle §24 items; confirm scientific-accuracy bar; agree "3D" labeling.

**Phase 1 — De-risk foundation:**
1. Remove dead files (`app.js`, `data.js`, `quiz.js`, `style.css`) once quiz content port is verified (already done).
2. Introduce a **content + schema model** (`CHEMLABX_DATA_VERSION` versioned JSON/Markdown for materials, reactions, lessons, quiz) replacing JS-literal drift; add a schema-validation runner.
3. Make counts data-driven (fix "77" hard-code, dashboard "120+/30+").
4. Fail-closed reaction engine: unknown pairs → explicit "no data; requires experiment" instead of `'default'`.
5. Centralize CSS: absorb per-page `<style>` + inline styles into `base/components`; split `lab.css`.

**Phase 2 — Storage/Auth hardening (local-first):** swap store binding behind `CHLDB` (IndexedDB first, local file export/import), add data migrations + version, real password hashing, archived-check in `currentUser`, email validation, teacher-role moderation, session expiry.

**Phase 3 — Education/safety:** validated chemistry dataset (expert review), Safety Engine, content-scaling lessons/quiz with explanations, grading/rubrics, and teacher analytics. Remove danger-rewarding achievements.

**Phase 4 — Platform (optionally):** cloud API vs local DB decision → Sync Engine; organization/tenant layer; PWA update policy; release pipeline.

Each phase ends with the app still runnable; phases 1–3 are independent of §24 platform decisions, so they can start immediately after data-accuracy resolution.

---

## 24. Items Requiring Human Decisions

1. **Scientific-accuracy bar** — must chemistry data be expert-validated/sourced before any educational use? (Gate for Phase 1–3.)
2. **Dead-code cleanup** — approve removal of legacy `app.js`/`data.js`/`quiz.js`/`style.css`.
3. **"3D" positioning** — stop claiming 3D now, or commit budget to a real visualization later?
4. **Danger-gamification** — keep/remove achievements that reward dangerous reactions; defines safety posture.
5. **RBAC policy** — open self-registration for teachers, or invitation/approval? Keep guest mode?
6. **Local-first vs. backend** — is a single-device/local-storage-synced model acceptable, or must cloud API be designed now? Influences sync/auth/storage.
7. **Organization scope** — single school (org field) vs. true multi-tenancy (new core).
8. **Data/content licensing** — lessons & question authorship, Arabic/English QA ownership.
9. **PWA update UX** — desired behavior (silent cache vs. prompt), and whether to self-host fonts.
10. **Education depth** — keep XP/achievements/levels a core motivator, or add graded rubrics/analytics in the target state?
11. **Developer workflow** — adopt a test runner/linter/bundler (e.g., npm+CI) or stay dependency-free?
12. **Deployment** — where/how ChemLabX will be hosted (static host only vs. Node/other), affecting Phases 2–4.

---

## 25. Recommended Next Task

**Task:** *"Validate & version the chemistry data model, and de-risk the reaction engine."*

Concretely: (a) expert-review the 29 reactions + curated 15 experiments and the ~192 material entries (normalize duplicates, add CAS + hazard class); (b) introduce schema-versioned content modules with a validation script; (c) replace the default reaction fallback with an explicit unknown-result state; (d) fix all hard-coded/misleading counts. This is the smallest change set that removes the highest-severity risks (R1–R3, R6) and unblocks everything else. It needs only data decision (item 1) before execution.

---

## Summary Table

| Area | Current State | Target State | Action |
|---|---|---|---|
| Chemistry data | 192 entries + 29 reactions + 22 quiz Qs; prototype, unvalidated, duplicated keys | Validated, sourced, versioned dataset | REBUILD + expert review |
| Reaction engine | Keyed-lookup w/ `default` fallback | Stoichiometry-aware, fail-closed on unknowns | REBUILD |
| Safety | Boolean flags + danger counter (rewarded) | Safety Engine (PPE, hazards, disposal, no danger rewards) | REBUILD |
| Storage | localStorage, wrapper `CHLDB` | IndexedDB/local DB + migrations + export/import | REFACTOR + swap |
| Auth/RBAC | Local, djb2 hash, self-service teacher, stale sessions | Hardened auth, enrollment policy, session expiry | REFACTOR |
| Education | Lessons/quiz/xp hardcoded | Content model + grading + analytics | REBUILD / REFACTOR |
| PWA/Offline | Cache-first, no fallback/update UX | Offline fallback + update policy | REFACTOR |
| Multi-org | None (school = free-text) | Org/tenant core (later) | NEW (deferred) |
| Versioning | Only cache name `v1` | App+data schema versions, migrations | NEW |
| 3D | Decorative particle canvas, claims "3D" | Honest labeling; real 3D only after decision | KEEP + clarify |
| Security | No CSP, reversible hashes, XSS ad-hoc | CSP, sanitized rendering, session hardening | REFACTOR |
| Code hygiene | 234 KB dead files, dup CSS/data, no tests | Deduped, linted, tested | REFACTOR + REMOVE |
| Administration | Global single admin, archive-only control | Scoped admin + audit trail | REFACTOR |

## DO NOT IMPLEMENT YET

Pending the §24 decisions and Phase-gating, do **not** build these now:

- A full quantitative **Chemistry Engine** (reaction solver, kinetics, thermochemistry) — blocked by data-validation decision (§24.1) and content model.
- A **Safety Engine** (GHS/SDS/PHR computations) — blocked by §24.4 posture.
- **Cloud API / Sync Engine / real database migration** — blocked by §24.6 (local-first vs backend).
- **Organization/multi-tenant layer** — blocked by §24.7.
- **Real 3D molecular visualization** — blocked by §24.3; current canvas must not be marketed as 3D meanwhile.
- **Graded rubrics / analytics dashboards** — blocked by §24.10 education-depth decision.
- **External auth providers (OAuth/SSO), password reset, MFA** — blocked by §24.5/§24.6.
- **Build pipeline / bundler / TS migration / CI** — unless §24.11 chooses tooling.
- **PWA update/notification system and self-hosted fonts** — blocked by §24.9.

Any of these may be unblocked by resolving the related human decision and re-planning its phase in §23.
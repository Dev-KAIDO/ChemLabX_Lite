/* ==========================================================================
   ChemLabX 4.0 — Auth & Session (TASK-009 hardened)
   Authentication (identity/session) lives here. AUTHORIZATION decisions are
   delegated to the pure module js/domain/authorization.js (CHL.authorization).

   Hardening applied:
   - F0: register() can no longer self-escalate to 'admin' when an admin
         already exists. Only the first-account rule may promote. Arbitrary
         role strings are sanitized against the canonical vocabulary.
   - F1: currentUser() validates the stored user/role and treats missing,
         malformed, unknown-role, or archived://true users as unauthenticated
         (returns null). Valid existing users keep working normally.
   - F3: privileged mutations (grantRole / archiveUser / unarchiveUser) are
         authorization-checked at the mutation boundary, not only at render
         time. Non-admin actors cannot invoke them successfully.
   - No session expiry was added (out of scope for TASK-009).
   ========================================================================== */
(function () {
    'use strict';

    var DB = window.CHLDB;

    /* ---- Canonical roles (must mirror js/domain/authorization.js) ----
       Kept inline so currentUser()/register() can run synchronously and
       fail-closed before/independent of the async authorization.js load. */
    var CANONICAL_ROLES = ['admin', 'teacher', 'student', 'user'];

    function isValidRole(role) {
        return CANONICAL_ROLES.indexOf(role) !== -1;
    }
    function normalizeRole(role) {
        return isValidRole(role) ? role : 'user';
    }

    function roleLabel(role) {
        var map = {
            admin: { ar: '\u0645\u0633\u0624\u0648\u0644', en: 'Admin' },
            teacher: { ar: '\u0645\u0639\u0644\u0645', en: 'Teacher' },
            student: { ar: '\u0637\u0627\u0644\u0628', en: 'Student' },
            user: { ar: '\u0645\u0633\u062A\u062E\u062F\u0645', en: 'User' }
        };
        return map[role] || map.user;
    }

    /* ---- Load the pure authorization module (content.js-style dynamic
       injection). Pages run their authorization-relevant code at
       DOMContentLoaded+ (admin.js, dashboard.js) or from user-action handlers
       (admin mutations), by which time this has resolved. No HTML change and
       no network dependency: the file is a cached local asset. ---- */
    var authzLoaded = false;
    function ensureAuthorization(cb) {
        cb = cb || function () {};
        if (window.CHL && window.CHL.authorization) {
            authzLoaded = true;
            return cb(null);
        }
        if (typeof document === 'undefined') return cb(null);
        var s = document.createElement('script');
        s.src = 'js/domain/authorization.js';
        s.onload = function () { authzLoaded = true; cb(null); };
        s.onerror = function () { cb(new Error('AuthzError: failed to load js/domain/authorization.js')); };
        document.head.appendChild(s);
    }

    /* ---- Load the pure change-journal module (TASK-010). Mirrors the
       ensureAuthorization() dynamic-injection pattern so the Change Journal is
       available on every page without adding static <script> tags to protected
       HTML. It is a cached local asset (independent of any network). Pages
       that journal (engine.js) run from user-action handlers, by which time
       this has usually resolved; the journal hook itself is defensive and
       never breaks the host action if the module is unavailable. ---- */
    function ensureChangeJournal(cb) {
        cb = cb || function () {};
        if (window.CHL && window.CHL.changeJournal) return cb(null);
        if (typeof document === 'undefined') return cb(null);
        var s = document.createElement('script');
        s.src = 'js/domain/changejournal.js';
        s.onload = function () { cb(null); };
        s.onerror = function () { cb(new Error('ChangeJournalError: failed to load js/domain/changejournal.js')); };
        document.head.appendChild(s);
    }

    /* Synchronous fail-closed authorization decision used INSIDE auth.js at
       mutation boundaries. Delegates to the pure module when available;
       otherwise DENIES (fail closed). It never fabricates a grant. */
    function authorizeAtBoundary(actor, permission) {
        var A = window.CHL && window.CHL.authorization;
        if (A && typeof A.authorize === 'function') return !!A.authorize(actor, permission);
        return false;
    }

    /* ---- F0 helper: compute the registrable role for a register() call ----
       - Default to 'user' for anything not a known role.
       - teacher/student/user are permitted.
       - 'admin' is permitted ONLY when no admin account exists yet
         (first-account rule); otherwise it is refused (downgraded to 'user')
         so no existing app can gain an admin through self-registration. */
    function registrableRole(requested) {
        var role = isValidRole(requested) ? requested : 'user';
        if (role !== 'admin') return role;
        var admins = DB.users.list().filter(function (u) { return u.role === 'admin'; });
        return admins.length === 0 ? 'admin' : 'user';
    }

    window.CHLAuth = {
        roleLabel: roleLabel,
        ensureAuthorization: ensureAuthorization,
        ensureChangeJournal: ensureChangeJournal,

        register: function (opts) {
            var email = (opts.email || '').trim().toLowerCase();
            if (!email || !opts.password) return { error: window.t('\u0627\u0644\u0628\u0631\u064A\u062F \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646', 'Email and password are required') };
            if (opts.password.length < 6) return { error: window.t('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0623\u0642\u0644 \u0645\u0646 6 \u0623\u062D\u0631\u0641', 'Password must be at least 6 characters') };
            var existing = DB.users.list().filter(function (u) { return u.email === email; });
            if (existing.length > 0) return { error: window.t('\u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0628\u0642\u0627\u064B', 'Email already registered') };

            /* F0: sanitize the requested role; never self-escalate to admin
               once an admin exists. */
            var role = registrableRole(opts.role || 'user');

            var id = DB.uid();
            var user = {
                id: id,
                name: opts.name || email.split('@')[0],
                nameEn: opts.nameEn || opts.name || email.split('@')[0],
                email: email,
                pass: DB.hashPassword(opts.password),
                role: role,
                level: opts.level || 'beginner',
                school: opts.school || '',
                schoolEn: opts.schoolEn || '',
                createdAt: Date.now(),
                classIds: [],
                progress: { xp: 0, quizBest: 0, lessonsDone: [], experimentsDone: [], dangerousReactions: 0, achievements: {} }
            };
            DB.users.upsert(id, user);
            return { user: user };
        },

        login: function (email, password) {
            var e = (email || '').trim().toLowerCase();
            var users = DB.users.list();
            for (var i = 0; i < users.length; i++) {
                var u = users[i];
                if (u.email === e && u.pass === DB.hashPassword(password || '')) {
                    if (u.archived) return { error: window.t('\u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628', 'This account has been disabled') };
                    DB.set('session', { userId: u.id, ts: Date.now() });
                    return { user: u };
                }
            }
            return { error: window.t('\u0628\u0631\u064A\u062F \u0623\u0648 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629', 'Invalid email or password') };
        },

        logout: function () {
            DB.set('session', null);
            window.location.href = 'login.html';
        },

        /* --- F1: hardened currentUser() ---
           Returns the validated session user, or null (unauthenticated) when:
           - no session / no userId
           - stored user missing or malformed
           - user.archived === true  (an open session is downgraded to
             unauthenticated; intentional AC-005 behavior)
           - role is not part of the canonical vocabulary (fail closed)
           A valid existing user is returned as-is. */
        currentUser: function () {
            var s = DB.get('session', null);
            if (!s || typeof s !== 'object' || !s.userId) return null;
            var u = DB.users.getById(s.userId);
            if (!u || typeof u !== 'object' || !u.id) return null;
            /* fail closed on malformed role */
            if (typeof u.role !== 'string' || !isValidRole(u.role)) return null;
            /* intentional: an archived user with an open session is not
               authenticated (AC-005) */
            if (u.archived === true) return null;
            return u;
        },

        isLoggedIn: function () { return !!this.currentUser(); },

        require: function (roles) {
            var u = this.currentUser();
            if (!u) { window.location.href = 'login.html'; return null; }
            if (roles && roles.indexOf(u.role) === -1) {
                window.location.href = 'dashboard.html';
                return null;
            }
            return u;
        },

        updateUser: function (id, patch) {
            var u = DB.users.getById(id);
            if (!u) return null;
            DB.users.upsert(id, Object.assign({}, u, patch));
            return DB.users.getById(id);
        },

        /* --- F3: authorization-checked privileged mutations ---
           Each refuses (returns null / no-op) unless the CURRENT actor holds
           the matching permission. Not just render-time: checked here at the
           mutation boundary. Target roles are validated against the canonical
           vocabulary. */
        archiveUser: function (id) {
            var actor = this.currentUser();
            if (!authorizeAtBoundary(actor, 'users.archive')) return null;
            var u = DB.users.getById(id);
            if (!u) return null;
            DB.users.upsert(id, Object.assign({}, u, { archived: true }));
            return DB.users.getById(id);
        },

        unarchiveUser: function (id) {
            var actor = this.currentUser();
            if (!authorizeAtBoundary(actor, 'users.unarchive')) return null;
            var u = DB.users.getById(id);
            if (!u) return null;
            DB.users.upsert(id, Object.assign({}, u, { archived: false }));
            return DB.users.getById(id);
        },

        grantRole: function (id, role) {
            var actor = this.currentUser();
            if (!authorizeAtBoundary(actor, 'users.roles.assign')) return null;
            /* validate the target role against the canonical vocabulary */
            if (!isValidRole(role)) return null;
            var u = DB.users.getById(id);
            if (!u) return null;
            DB.users.upsert(id, Object.assign({}, u, { role: role }));
            return DB.users.getById(id);
        },

        guest: function () {
            /* Local guest profile (no account) */
            var id = DB.get('guestId', null);
            if (!id) {
                id = DB.uid();
                DB.set('guestId', id);
            }
            return { id: id, name: window.t('\u0632\u0627\u0626\u0631', 'Guest'), role: 'user', guest: true, level: 'beginner', progress: { xp: 0, quizBest: 0, lessonsDone: [], experimentsDone: [], dangerousReactions: 0, achievements: {} } };
        }
    };

    /* Preload the pure authorization module so page-level gates and mutation
       handlers can rely on it being present by DOMContentLoaded+. */
    ensureAuthorization(function () {});

    /* Preload the pure change-journal module (TASK-010) the same way, so it is
       present before any user-action journaling on lab/dashboard pages. */
    ensureChangeJournal(function () {});
})();

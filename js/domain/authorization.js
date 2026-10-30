/* ==========================================================================
   ChemLabX 4.0 — Authorization Domain (TASK-009)
   Pure, deterministic, UI-independent, fail-closed authorization.

   This module separates AUTHORIZATION from AUTHENTICATION (which lives in
   js/core/auth.js). It holds the canonical role vocabulary, the minimal
   permission matrix grounded only in capabilities evidenced in the current
   codebase, and the centralized authorize() decision.

   Guarantees:
   - No DOM access, no storage access, no network. Fully offline-safe.
   - Deterministic: identical (role, permission) input always yields the
     same boolean; no randomness, no timestamps, no external state.
   - Fail-closed by default: an UNKNOWN role is treated as the least
     privileged normal role ('user'); an UNKNOWN permission is denied; a
     guest/unauthenticated actor is denied for every user-management and
     admin permission.
   - Does NOT render, navigate, or redirect. Callers (the auth/page layer)
     decide how to respond to a denied decision.

   Security boundary: this is application-correctness hardening for a
   client-side, offline-first app. A user who controls the browser/device
   can still edit localStorage/IndexedDB directly, so this module is NOT a
   server-grade security control against a hostile client. It makes the
   application's OWN authorization checks consistent and fail-closed.
   ========================================================================== */
(function () {
    'use strict';

    /* ---- Canonical role vocabulary (exactly four roles) ---- */
    var ROLES = ['admin', 'teacher', 'student', 'user'];

    /* ---- Minimal permission vocabulary (evidence-grounded only) ----
       No class/assignment "write" capabilities are invented beyond what the
       current code actually exercises. */
    var PERMISSION_NAMES = [
        'users.read',
        'users.roles.assign',
        'users.archive',
        'users.unarchive',
        'users.update.self',
        'lab.run',
        'lab.mix',
        'results.attribute'
    ];

    /* ---- Role -> permission matrix ----
       guest maps to the normal 'user' role exactly as the existing
       CHLAuth.guest() does (role 'user'): lab-capable, no user-management. */
    var PERMISSIONS = {
        admin: [
            'users.read',
            'users.roles.assign',
            'users.archive',
            'users.unarchive',
            'users.update.self',
            'lab.run',
            'lab.mix',
            'results.attribute'
        ],
        teacher: [
            'users.update.self',
            'lab.run',
            'lab.mix',
            'results.attribute'
        ],
        student: [
            'users.update.self',
            'lab.run',
            'lab.mix',
            'results.attribute'
        ],
        user: [
            'users.update.self',
            'lab.run',
            'lab.mix',
            'results.attribute'
        ]
    };

    /* ---- Pure lookups ---- */

    function isValidRole(role) {
        return ROLES.indexOf(role) !== -1;
    }

    /* Fail-closed normalization: any unknown/derived/arbitrary role string is
       reduced to the least privileged NORMAL role. It can NEVER become
       'admin' or 'teacher' through an unvalidated string. */
    function normalizeRole(role) {
        if (ROLES.indexOf(role) !== -1) return role;
        return 'user';
    }

    function isValidPermission(permission) {
        return PERMISSION_NAMES.indexOf(permission) !== -1;
    }

    /* Resolve an actor (a user record or a bare { role }) to a canonical role.
       Returns null only when the actor cannot be interpreted as a valid,
       non-degraded user. For fail-closed purposes an unknown role resolves to
       'user' via normalizeRole; a missing actor resolves to null (deny). */
    function actorRole(actor) {
        if (!actor) return null;
        if (typeof actor.role === 'string') return normalizeRole(actor.role);
        return null;
    }

    /* Central decision: does `actor` hold `permission`?
       - Unknown actor            -> false
       - Unknown permission       -> false (fail closed)
       - Role without permission  -> false
       - A guest is role 'user'   -> governed by the 'user' row (lab yes,
                                     user-management no).                 */
    function authorize(actor, permission) {
        var role = actorRole(actor);
        if (!role) return false;
        if (!isValidPermission(permission)) return false;
        var granted = PERMISSIONS[role];
        if (!granted) return false;
        return granted.indexOf(permission) !== -1;
    }

    function can(actor, permission) {
        return authorize(actor, permission);
    }

    /* Decision-only page guard helper. Because the module is UI-independent it
       does NOT navigate; it returns a boolean the caller turns into a redirect
       or a denied-state render. */
    function requirePermission(actor, permission) {
        return authorize(actor, permission);
    }

    /* ---- Public API ---- */
    window.CHL = window.CHL || {};
    window.CHL.authorization = {
        ROLES: ROLES.slice(),
        PERMISSION_NAMES: PERMISSION_NAMES.slice(),
        PERMISSIONS: (function () {
            var copy = {};
            Object.keys(PERMISSIONS).forEach(function (r) { copy[r] = PERMISSIONS[r].slice(); });
            return copy;
        })(),
        isValidRole: isValidRole,
        normalizeRole: normalizeRole,
        isValidPermission: isValidPermission,
        authorize: authorize,
        can: can,
        requirePermission: requirePermission
    };
})();

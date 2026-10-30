/* ==========================================================================
   ChemLabX 4.0 — Result Records Domain (TASK-006)
   Reproducibility contract for each resolved/presented mix. Consumes the
   existing DeterminationResult + SafetyResult snapshots produced by the
   Chemistry and Safety domains; it never re-derives chemistry or safety
   decisions and never awards XP or mutates safety state.

   Persistence is capped at MAX_RECORDS (100) with oldest-first eviction
   based on a deterministic insertion order (a monotonic integer, NOT a
   wall-clock sort). Blocked/unknown/unsupported/fail-closed outcomes are
   NEVER persisted. The only timestamp is the record provenance field
   (savedAt via CHL.provenance) — the pure computation carries none.
   ========================================================================== */
(function () {
    'use strict';

    var R = window.Results = window.Results || {};

    var RULES_VERSION = 'prototype-result-records-v1';
    var MAX_RECORDS = 100;

    /* ---- isolated value snapshot: strip shared references from live domain
            outputs so the record is immutable for reproduction ---- */
    function snapshot(v) {
        if (v === null || v === undefined) return v;
        try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
    }

    function versions() {
        var v = (window.CHL && window.CHL.versions) || {};
        return {
            appVersion: v.APP_VERSION != null ? v.APP_VERSION : null,
            schemaVersion: v.SCHEMA_VERSION != null ? v.SCHEMA_VERSION : null,
            contentVersion: v.CONTENT_VERSION != null ? v.CONTENT_VERSION : null,
            chemistryDataVersion: v.CHEMISTRY_DATA_VERSION != null ? v.CHEMISTRY_DATA_VERSION : null,
            engineVersion: v.ENGINE_VERSION != null ? v.ENGINE_VERSION : null,
            safetyModelVersion: v.SAFETY_MODEL_VERSION != null ? v.SAFETY_MODEL_VERSION : null,
            safetyRulesVersion: v.SAFETY_RULES_VERSION != null ? v.SAFETY_RULES_VERSION : null
        };
    }

    function collection() {
        /* The registered results collection instance exposed on CHLDB.
           ref C: db.js registers `collection('results')` as CHLDB.results. */
        return (window.CHLDB && window.CHLDB.results) ? window.CHLDB.results : null;
    }

    /* Only resolved/presented outcomes may be persisted. Blocked, unknown,
       unsupported or fail-closed results return false. */
    function shouldPersist(safety) {
        return !!(safety && safety.gate && safety.gate.allowPresentation === true);
    }

    function currentUser() {
        try {
            if (window.CHLAuth && window.CHLAuth.currentUser) {
                var u = window.CHLAuth.currentUser();
                if (u && u.id) return u.id;
            }
        } catch (e) { /* guest fallback */ }
        return 'guest';
    }

    var fallbackSeq = 0;
    function makeId() {
        /* Prefer the app-standard id generator (CHLDB.uid); fall back to a
           deterministic, clock/random-free module counter. */
        if (window.CHLDB && window.CHLDB.uid) return window.CHLDB.uid();
        fallbackSeq++;
        return 'r' + fallbackSeq;
    }

    /* Build an immutable ResultRecord from the existing DeterminationResult and
       SafetyResult snapshots. Pure: no timestamps beyond the provenance field,
       no wall-clock dependency, no re-derivation, no XP, no safety mutation. */
    function build(opts) {
        opts = opts || {};
        var determination = opts.determination || null;
        var safety = opts.safety || null;
        var session = opts.session || null;

        var reactionKey = (determination && determination.reaction && determination.reaction.id)
            ? determination.reaction.id
            : (opts.reactionKey || null);
        var materials = (session && session.materials)
            ? snapshot(session.materials)
            : (determination && determination.products ? [] : []);

        return {
            id: opts.id || makeId(),
            userId: opts.userId || currentUser(),
            reactionKey: reactionKey,
            materials: materials,
            conditionsIn: snapshot((session && { temperature: session.temperature, ph: session.ph }) || {}),
            decision: safety ? safety.decision : null,
            status: safety ? safety.status : null,
            rewarded: !!(safety && safety.gate && safety.gate.allowReward),
            gate: {
                allowPresentation: !!(safety && safety.gate && safety.gate.allowPresentation),
                allowReward: !!(safety && safety.gate && safety.gate.allowReward)
            },
            versions: versions(),
            hc: {
                determination: snapshot(determination),
                safety: snapshot(safety)
            },
            order: 0,
            provenance: (window.CHL && window.CHL.provenance)
                ? window.CHL.provenance({ resultId: opts.id || null, resultsVersion: RULES_VERSION })
                : null
        };
    }

    /* Deterministic insertion order (monotonic integer, not a wall-clock value). */
    function nextOrder(c) {
        var ids = Object.keys(c || {});
        var max = 0;
        for (var i = 0; i < ids.length; i++) {
            var r = c[ids[i]];
            if (r && typeof r.order === 'number' && r.order > max) max = r.order;
        }
        return max + 1;
    }

    /* Enforce the 100-record cap: evict the OLDEST records first (by the
       deterministic insertion order), never by a wall-clock sort. */
    function evict(c) {
        var all = c.all() || {};
        var ids = Object.keys(all);
        if (ids.length <= MAX_RECORDS) return;
        var sorted = ids
            .map(function (id) { return { id: id, order: (all[id] && all[id].order) || 0 }; })
            .sort(function (a, b) { return a.order - b.order; });
        var excess = sorted.length - MAX_RECORDS;
        for (var i = 0; i < excess; i++) c.remove(sorted[i].id);
    }

    /* Persist a ResultRecord. Refuses (returns null) for anything that is not a
       resolved/presented outcome. Non-blocking for UX: mirrors + forwards via
       CHLDB, and failures remain observable without breaking the caller. */
    function persist(record) {
        var c = collection();
        if (!c || !record) return null;
        if (!record.gate || record.gate.allowPresentation === false) return null;

        var all = c.all() || {};
        record.order = nextOrder(all);
        if (!record.id) record.id = makeId();
        if (!record.provenance && window.CHL && window.CHL.provenance) {
            record.provenance = window.CHL.provenance({ resultId: record.id, resultsVersion: RULES_VERSION });
        }
        try {
            c.upsert(record.id, record);
            evict(c);
        } catch (e) {
            /* observable via CHLDB.storageStatus(); never throw into performMix */
            return null;
        }
        return record;
    }

    function all() {
        var c = collection();
        return c ? (c.all() || {}) : {};
    }

    function list() {
        var o = all();
        return Object.keys(o)
            .map(function (id) { return o[id]; })
            .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    }

    function count() {
        return Object.keys(all()).length;
    }

    R.RULES_VERSION = function () { return RULES_VERSION; };
    R.MAX_RECORDS = MAX_RECORDS;
    R.shouldPersist = shouldPersist;
    R.build = build;
    R.persist = persist;
    R.evict = evict;
    R.all = all;
    R.list = list;
    R.count = count;
})();

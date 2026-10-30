/* ==========================================================================
   ChemLabX 4.0 — Change Journal Foundation (TASK-010)
   Persistent, on-device, offline-first change journal + cursor/version model
   for future synchronization (Site Server / Cloud are OUT of this phase).

   Boundary:
   - This module ONLY captures and orders persistent, sync-eligible entity
     changes. It contains NO Chemistry, Safety, Laboratory, Results, or
     Authorization business logic, and it never decides whether an entity may
     persist (that decision stays with the owning domain).
   - Ordering is driven by a per-entity monotonic `version` counter, NEVER by
     `wallClock`. `wallClock` is informational only.
   - Idempotency is enforced by the immutable `changeId`; a duplicate append is
     ignored and the existing change returned. `orgId` is a future-compatible
     field only (always null in this phase) and is never used for authorization.

   Fail-closed:
   - Malformed records, invalid operations, invalid versions, invalid entity
     types, or impossible cursor states are REJECTED (throw) and never corrupt
     existing journal data.
   - Persistence reuses the existing CHLDB boundary (localStorage mirror →
     IndexedDB via DataPort). Failures are observable via status(), never
     silently swallowed.
   ========================================================================== */
(function () {
    'use strict';

    var CHL = window.CHL = window.CHL || {};

    var KEY = 'changelog';
    var SEP = '\u0000';
    var OPS = ['upsert', 'delete'];
    var ENTITY_TYPES = ['result', 'submission', 'assignment', 'class'];
    var DEFAULT_DEVICE_ID = 'local-device';
    var DEFAULT_ACTOR_ID = 'system';
    var MAX_FAILURES = 20;

    var S = {
        changes: [],
        byId: {},
        perEntity: {},
        cursor: 0,
        acked: 0,
        duplicates: 0,
        failures: []
    };

    function recordFailure(msg) {
        S.failures.push({ at: new Date().toISOString(), message: msg });
        if (S.failures.length > MAX_FAILURES) S.failures.shift();
    }

    function isInt(n) {
        return typeof n === 'number' && isFinite(n) && Math.floor(n) === n;
    }

    function entityKey(entityType, entityId) {
        return String(entityType) + SEP + String(entityId);
    }

    function entityIndex(entityType, entityId) {
        var k = entityKey(entityType, entityId);
        return S.perEntity[k] || null;
    }

    function safeCopy(v) {
        if (v === null || v === undefined) return v;
        try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; }
    }

    function uuid() {
        try {
            if (window.crypto && window.crypto.getRandomValues) {
                var b = new Uint8Array(16);
                window.crypto.getRandomValues(b);
                b[6] = (b[6] & 0x0f) | 0x40;
                b[8] = (b[8] & 0x3f) | 0x80;
                var h = '';
                for (var i = 0; i < b.length; i++) {
                    var hex = b[i].toString(16);
                    if (hex.length === 1) hex = '0' + hex;
                    h += hex;
                    if (i === 3 || i === 5 || i === 7 || i === 9) h += '-';
                }
                return h;
            }
        } catch (e) {}
        return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }

    function validChange(c) {
        if (!c || typeof c !== 'object') return false;
        if (typeof c.changeId !== 'string' || !c.changeId) return false;
        if (typeof c.entityType !== 'string' || ENTITY_TYPES.indexOf(c.entityType) === -1) return false;
        if (typeof c.entityId !== 'string' || !c.entityId) return false;
        if (OPS.indexOf(c.op) === -1) return false;
        if (!isInt(c.version) || c.version < 0) return false;
        if (!isInt(c.baseVersion) || c.baseVersion < 0) return false;
        if (c.version < c.baseVersion) return false;
        if (c.actorId != null && typeof c.actorId !== 'string') return false;
        if (c.payload != null && typeof c.payload !== 'object') return false;
        return true;
    }

    /* Pure factory: builds + validates a ChangeRecord WITHOUT appending it. */
    function createChange(o) {
        o = o || {};
        var entityType = o.entityType;
        var entityId = o.entityId;
        var op = o.op;
        if (typeof entityType !== 'string' || ENTITY_TYPES.indexOf(entityType) === -1) {
            throw new Error('ChangeJournal: invalid entityType');
        }
        if (typeof entityId !== 'string' || !entityId) {
            throw new Error('ChangeJournal: invalid entityId');
        }
        if (OPS.indexOf(op) === -1) {
            throw new Error('ChangeJournal: invalid op');
        }
        var baseVersion = isInt(o.baseVersion) ? o.baseVersion : 0;
        var version = isInt(o.version) ? o.version : baseVersion + 1;
        if (version < 0 || baseVersion < 0 || version < baseVersion) {
            throw new Error('ChangeJournal: invalid version');
        }
        var changeId = (typeof o.changeId === 'string' && o.changeId) ? o.changeId : uuid();
        if (!changeId) throw new Error('ChangeJournal: invalid changeId');
        return {
            changeId: changeId,
            entityType: entityType,
            entityId: entityId,
            op: op,
            baseVersion: baseVersion,
            version: version,
            payloadRef: (typeof o.payloadRef === 'string' && o.payloadRef)
                ? o.payloadRef
                : (entityType + ':' + entityId),
            payload: (o.payload && typeof o.payload === 'object') ? safeCopy(o.payload) : null,
            wallClock: (typeof o.wallClock === 'string' && o.wallClock)
                ? o.wallClock
                : new Date().toISOString(),
            deviceId: (typeof o.deviceId === 'string' && o.deviceId) ? o.deviceId : DEFAULT_DEVICE_ID,
            actorId: (typeof o.actorId === 'string' && o.actorId) ? o.actorId : DEFAULT_ACTOR_ID,
            orgId: (o.orgId && typeof o.orgId === 'string') ? o.orgId : null
        };
    }

    function persist() {
        try {
            if (window.CHLDB && window.CHLDB.set) {
                window.CHLDB.set(KEY, {
                    changes: S.changes.map(safeCopy),
                    cursor: S.cursor,
                    acked: S.acked
                });
            }
        } catch (e) {
            recordFailure('persist: ' + (e && e.message || String(e)));
        }
    }

    function hydrate() {
        var saved = null;
        try {
            saved = (window.CHLDB && window.CHLDB.get) ? window.CHLDB.get(KEY, null) : null;
        } catch (e) { saved = null; }
        if (!saved || !Array.isArray(saved.changes)) return;
        var ok = true;
        var i, c;
        for (i = 0; i < saved.changes.length; i++) {
            if (!validChange(saved.changes[i])) { ok = false; break; }
        }
        if (!ok) {
            recordFailure('hydrate: malformed journal data ignored (fail closed)');
            return;
        }
        try {
            var changes = [];
            var byId = {};
            var perEntity = {};
            for (i = 0; i < saved.changes.length; i++) {
                c = saved.changes[i];
                if (byId[c.changeId]) continue;
                byId[c.changeId] = c;
                changes.push(c);
                perEntity[entityKey(c.entityType, c.entityId)] = { version: c.version, changeId: c.changeId };
            }
            S.changes = changes;
            S.byId = byId;
            S.perEntity = perEntity;
            S.cursor = (typeof saved.cursor === 'number' && saved.cursor >= 0) ? saved.cursor : changes.length;
            S.acked = (typeof saved.acked === 'number') ? Math.min(saved.acked, S.cursor) : 0;
        } catch (e) {
            recordFailure('hydrate: ' + (e && e.message || String(e)));
        }
    }

    /* Idempotent append: a duplicate changeId is ignored and the existing
       change returned. Out-of-order per-entity versions are rejected. */
    function append(change) {
        if (!validChange(change)) throw new Error('ChangeJournal: malformed change rejected');
        if (S.byId[change.changeId]) {
            S.duplicates++;
            return S.byId[change.changeId];
        }
        var idx = entityIndex(change.entityType, change.entityId);
        if (idx && change.baseVersion < idx.version) {
            throw new Error('ChangeJournal: baseVersion below current entity version (out of order)');
        }
        S.changes.push(change);
        S.byId[change.changeId] = change;
        S.perEntity[entityKey(change.entityType, change.entityId)] = { version: change.version, changeId: change.changeId };
        S.cursor = S.changes.length;
        persist();
        return change;
    }

    /* Create (baseVersion/version from the entity's current state) + append. */
    function record(entityType, entityId, op, payload, actorId, opts) {
        opts = opts || {};
        var idx = entityIndex(entityType, entityId);
        var baseVersion = idx ? idx.version : 0;
        var version = baseVersion + 1;
        var change = createChange({
            entityType: entityType,
            entityId: entityId,
            op: op,
            baseVersion: baseVersion,
            version: version,
            payload: payload,
            actorId: actorId,
            changeId: opts.changeId,
            wallClock: opts.wallClock,
            deviceId: opts.deviceId
        });
        return append(change);
    }

    function tombstone(entityType, entityId, actorId, opts) {
        return record(entityType, entityId, 'delete', null, actorId, opts);
    }

    function has(changeId) {
        return !!S.byId[changeId];
    }

    function get(changeId) {
        return S.byId[changeId] || null;
    }

    function findByEntity(entityType, entityId) {
        var idx = entityIndex(entityType, entityId);
        if (!idx) return null;
        return S.byId[idx.changeId] || null;
    }

    function versionOf(entityType, entityId) {
        var idx = entityIndex(entityType, entityId);
        return idx ? idx.version : 0;
    }

    function cursor() { return S.cursor; }

    function acknowledgedCursor() { return S.acked; }

    function advanceCursor(c) {
        if (!isInt(c) || c < 0) throw new Error('ChangeJournal: invalid cursor');
        if (c > S.cursor) throw new Error('ChangeJournal: cursor beyond journal');
        S.acked = Math.max(S.acked, c);
        persist();
        return S.acked;
    }

    function replayFrom(c) {
        if (!isInt(c) || c < 0 || c > S.cursor) throw new Error('ChangeJournal: invalid cursor for replay');
        return S.changes.slice(c);
    }

    function pending() {
        return S.changes.slice(S.acked);
    }

    function list() { return S.changes.slice(); }

    function count() { return S.changes.length; }

    function clear() {
        S.changes = [];
        S.byId = {};
        S.perEntity = {};
        S.cursor = 0;
        S.acked = 0;
        S.duplicates = 0;
        try {
            if (window.CHLDB && window.CHLDB.set) {
                window.CHLDB.set(KEY, { changes: [], cursor: 0, acked: 0 });
            }
        } catch (e) {
            recordFailure('clear: ' + (e && e.message || String(e)));
        }
        return { count: 0 };
    }

    function status() {
        return {
            ready: true,
            count: S.changes.length,
            cursor: S.cursor,
            acknowledged: S.acked,
            duplicates: S.duplicates,
            failures: S.failures.slice()
        };
    }

    hydrate();

    CHL.changeJournal = {
        OPS: OPS.slice(),
        ENTITY_TYPES: ENTITY_TYPES.slice(),
        DEFAULT_DEVICE_ID: DEFAULT_DEVICE_ID,
        DEFAULT_ACTOR_ID: DEFAULT_ACTOR_ID,
        createChange: createChange,
        record: record,
        append: append,
        tombstone: tombstone,
        has: has,
        get: get,
        findByEntity: findByEntity,
        versionOf: versionOf,
        cursor: cursor,
        acknowledgedCursor: acknowledgedCursor,
        advanceCursor: advanceCursor,
        replayFrom: replayFrom,
        pending: pending,
        list: list,
        count: count,
        clear: clear,
        status: status
    };
})();

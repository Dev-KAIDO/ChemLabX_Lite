/* ==========================================================================
   ChemLabX 4.0.0-foundation — DataPort (TASK-003)
   IndexedDB-backed persistent storage layer.

   Role:
   - IndexedDB is the new persistent storage target introduced by TASK-003.
     The synchronous CHLDB localStorage mirror in js/core/db.js is a
     TRANSITIONAL COMPATIBILITY LAYER only (page logic still reads it
     synchronously by design — see db.js). IndexedDB is authoritative for
     durable persistence; localStorage is never described as the long-term
     authoritative store.

   Migration:  localStorage -> IndexedDB
   - idempotent, non-destructive, sequential, restart-safe.
   - localStorage is NEVER deleted by TASK-003.

   Failure handling:
   - IndexedDB failures are NEVER silently swallowed. Every failure is
     recorded (DataPort.status()), exposed as a detectable error state,
     and reported back to callers. The app may continue on the
     compatibility mirror, but a failed IndexedDB write is never claimed
     to have succeeded.
   ========================================================================== */
(function () {
    'use strict';

    var CHL = window.CHL = window.CHL || {};
    var V = CHL.versions || { SCHEMA_VERSION: 2 };

    var DB_NAME = 'chemlabx';
    var DB_VERSION = 1;
    var STORE_KV = 'kv';
    var STORE_META = 'meta';

    var MIGRATION_STEPS = ['v1'];

    var status = {
        health: 'unknown',        // 'unknown' | 'ok' | 'degraded'
        ready: false,             // datastore opened
        migrated: false,          // migration completed successfully
        failures: [],             // [{ at, key, message }]
        lastError: null,
        integrity: null           // 'ok' | 'failed' | null (not yet checked)
    };

    function recordFailure(key, err) {
        var msg = (err && err.message) ? err.message : String(err);
        status.failures.push({ at: new Date().toISOString(), key: key || null, message: msg });
        if (status.failures.length > 50) status.failures.shift();
        status.lastError = msg;
        status.health = 'degraded';
    }

    function resolveOnLoad(request) {
        return new Promise(function (resolve, reject) {
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error); };
        });
    }

    function txDone(tx) {
        return new Promise(function (resolve, reject) {
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error); };
            tx.onabort = function () { reject(tx.error || new Error('tx aborted')); };
        });
    }

    var dbPromise = null;
    function openDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise(function (resolve, reject) {
            if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
            var req = window.indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV, { keyPath: 'k' });
                if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'k' });
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
        return dbPromise;
    }

    /* ---------- low-level store helpers (throw on failure) ---------- */
    function kvGet(db, key) {
        return new Promise(function (resolve, reject) {
            var tx = db.transaction([STORE_KV], 'readonly');
            var store = tx.objectStore(STORE_KV);
            var req = store.get(key);
            req.onsuccess = function () { resolve(req.result ? req.result.v : undefined); };
            req.onerror = function () { reject(req.error); };
            txDone(tx).catch(reject);
        });
    }
    function kvPut(db, key, value) {
        return new Promise(function (resolve, reject) {
            var tx = db.transaction([STORE_KV], 'readwrite');
            var store = tx.objectStore(STORE_KV);
            store.put({ k: key, v: value });
            txDone(tx).then(resolve, reject);
        });
    }
    function kvCount(db) {
        return openDB().then(function () {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction([STORE_KV], 'readonly');
                var store = tx.objectStore(STORE_KV);
                var req = store.count();
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function () { reject(req.error); };
                txDone(tx).catch(reject);
            });
        });
    }
    function kvKeys(db) {
        return new Promise(function (resolve, reject) {
            var tx = db.transaction([STORE_KV], 'readonly');
            var store = tx.objectStore(STORE_KV);
            var keys = [];
            var req = store.openCursor();
            req.onsuccess = function () {
                var cursor = req.result;
                if (cursor) { keys.push(cursor.key); cursor.continue(); }
                else resolve(keys);
            };
            req.onerror = function () { reject(req.error); };
            txDone(tx).catch(reject);
        });
    }
    function metaGet(db, key) {
        return new Promise(function (resolve, reject) {
            var tx = db.transaction([STORE_META], 'readonly');
            var store = tx.objectStore(STORE_META);
            var req = store.get(key);
            req.onsuccess = function () { resolve(req.result ? req.result.v : undefined); };
            req.onerror = function () { reject(req.error); };
            txDone(tx).catch(reject);
        });
    }
    function metaPut(db, key, value) {
        return new Promise(function (resolve, reject) {
            var tx = db.transaction([STORE_META], 'readwrite');
            var store = tx.objectStore(STORE_META);
            store.put({ k: key, v: value });
            txDone(tx).then(resolve, reject);
        });
    }

    /* ---------- public async API (never throws; reports via status) ---------- */
    var writeQueue = [];
    var flushing = false;
    function flushQueue() {
        if (flushing || !status.ready) return Promise.resolve();
        flushing = true;
        return openDB().then(function (db) {
            var p = Promise.resolve();
            while (writeQueue.length) {
                var op = writeQueue.shift();
                p = p.then(function () {
                    return kvPut(db, op.key, op.value).catch(function (err) {
                        recordFailure(op.key, err);
                        return { ok: false };
                    });
                });
            }
            return p;
        }).catch(function (err) {
            recordFailure(null, err);
        }).then(function () {
            flushing = false;
        });
    }

    function set(key, value) {
        if (!status.ready) {
            writeQueue.push({ key: key, value: value });
            return { ok: true, queued: true, key: key, flushed: false };
        }
        return openDB().then(function (db) {
            return kvPut(db, key, value).then(function () {
                return { ok: true, key: key, flushed: true };
            }, function (err) {
                recordFailure(key, err);
                return { ok: false, key: key, error: err && err.message || String(err) };
            });
        });
    }

    function getDBMeta(key) {
        return openDB().then(function (db) { return metaGet(db, key); });
    }
    function setDBMeta(key, value) {
        return openDB().then(function (db) { return metaPut(db, key, value); });
    }

    function localKeys() {
        var out = [];
        var i;
        try {
            for (i = 0; i < window.localStorage.length; i++) {
                var k = window.localStorage.key(i);
                if (k && k.indexOf('chemlabx_') === 0) out.push(k);
            }
        } catch (e) {
            recordFailure('localKeys', e);
        }
        return out.sort();
    }

    /* ---------- MIGRATION ---------- */
    /* One sequential step registered for schema v1->v2:
       copies every legacy chemlabx_* localStorage key into the kv store.
       Copy is per-key overwrite: idempotent and restart-safe. A step is only
       marked applied after its integrity check passes, so an interrupted
       run always re-runs cleanly. */
    var migrationStep_runners = {
        'v1': function (db) {
            var keys = localKeys();
            var i, p = Promise.resolve();
            for (i = 0; i < keys.length; i++) {
                (function (k) {
                    p = p.then(function () { return kvPut(db, k, readLocal(k)); });
                })(keys[i]);
            }
            return p.then(function () { return { from: 1, to: 2, copied: keys.length }; });
        }
    };

    function readLocal(key) {
        var raw = null;
        try { raw = window.localStorage.getItem(key); } catch (e) { recordFailure(key, e); return null; }
        if (raw === null) return null;
        try { return JSON.parse(raw); } catch (e) { return raw; }
    }

    /* Verify every legacy key exists in kv with identical JSON value. */
    function verifyMigrationAsync(db) {
        var keys = localKeys();
        var p = Promise.resolve({ checked: keys.length });
        keys.forEach(function (key) {
            p = p.then(function (acc) {
                return kvGet(db, key).then(function (idbVal) {
                    var localVal = readLocal(key);
                    if (JSON.stringify(localVal) !== JSON.stringify(idbVal)) {
                        acc.mismatch = acc.mismatch || [];
                        acc.mismatch.push(key);
                    }
                    return acc;
                });
            });
        });
        return p.then(function (acc) {
            return kvKeys(db).then(function (idbKeys) {
                acc.idbKeys = idbKeys.length;
                var pr = 'chemlabx_';
                var idbApp = idbKeys.filter(function (k) { return k && k.indexOf(pr) === 0; });
                acc.idbAppKeys = idbApp.length;
                return acc;
            });
        });
    }

    var pendingMigrations = false;
    function ensureMigrated() {
        return openDB().then(function (db) {
            return metaGet(db, 'migrated').then(function (already) {
                if (already === true) {
                    status.migrated = true;
                    return { reused: true };
                }
                if (pendingMigrations) return { running: true };
                pendingMigrations = true;
                return metaGet(db, 'migrations').then(function (applied) {
                    applied = (applied || []).slice();
                    var anyFailed = false;
                    var run = Promise.resolve();
                    MIGRATION_STEPS.forEach(function (stepName) {
                        if (applied.indexOf(stepName) !== -1) return;
                        run = run.then(function () {
                            return migrationStep_runners[stepName](db).then(function (stepResult) {
                                return verifyMigrationAsync(db).then(function (verify) {
                                    if (verify.mismatch && verify.mismatch.length) {
                                        anyFailed = true;
                                        status.integrity = 'failed';
                                        recordFailure('migration-' + stepName, new Error('integrity mismatch on ' + verify.mismatch.join(', ')));
                                        return { applied: false, verify: verify, step: stepResult };
                                    }
                                    status.integrity = 'ok';
                                    applied.push(stepName);
                                    return metaPut(db, 'migrations', applied).then(function () {
                                        return { applied: true, verify: verify, step: stepResult };
                                    });
                                });
                            });
                        });
                    });
                    return run.then(function (last) {
                        if (anyFailed) {
                            /* do NOT claim success; leave 'migrated' unset so a restart retries */
                            pendingMigrations = false;
                            return { reused: false, applied: false, integrity: 'failed', step: last };
                        }
                        return metaPut(db, 'migrated', true).then(function () {
                            return metaPut(db, 'dbSchemaVersion', V.SCHEMA_VERSION).then(function () {
                                return metaPut(db, 'lastMigratedAt', new Date().toISOString()).then(function () {
                                    status.migrated = true;
                                    pendingMigrations = false;
                                    return { reused: false, applied: true, integrity: 'ok', step: last };
                                });
                            });
                        });
                    }, function (err) {
                        pendingMigrations = false;
                        throw err;
                    });
                });
            });
        }).catch(function (err) {
            pendingMigrations = false;
            recordFailure('migration', err);
            status.migrated = false;
            return { error: err && err.message || String(err) };
        });
    }

    /* ---------- BOOT ---------- */
    openDB()
        .then(function () {
            status.ready = true;
            status.health = 'ok';
            return ensureMigrated();
        })
        .then(function () { return flushQueue(); })
        .catch(function (err) {
            recordFailure('open', err);
        });

    window.DataPort = {
        DB_NAME: DB_NAME,
        DB_VERSION: DB_VERSION,
        STORE_KV: STORE_KV,
        STORE_META: STORE_META,
        openDB: openDB,
        get: function (key) { return openDB().then(function (db) { return kvGet(db, key); }); },
        set: set,
        remove: function (key) {
            return openDB().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction([STORE_KV], 'readwrite');
                    var store = tx.objectStore(STORE_KV);
                    store.delete(key);
                    txDone(tx).then(function () { resolve(true); }, function (err) { recordFailure(key, err); resolve(false); });
                });
            });
        },
        list: function () { return openDB().then(function (db) { return kvKeys(db); }); },
        meta: { get: getDBMeta, set: setDBMeta },
        localKeys: localKeys,
        ensureMigrated: ensureMigrated,
        status: function () {
            return { health: status.health, ready: status.ready, migrated: status.migrated, failures: status.failures.slice(), lastError: status.lastError, integrity: status.integrity, pendingWrites: writeQueue.length };
        },
        /* drain buffered writes once the store is ready */
        flush: function () {
            if (status.ready) return flushQueue();
            return openDB().then(function () { status.ready = true; return flushQueue(); });
        }
    };
})();
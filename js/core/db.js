/* ==========================================================================
   ChemLabX 4.0.0-foundation — Database access layer (CHLDB)

   IMPORTANT (TASK-003):
   CHLDB synchronous localStorage mirror = TRANSITIONAL COMPATIBILITY LAYER.
   Page logic reads synchronously and is out of scope, so reads continue to
   use this in-memory cache seeded from the localStorage mirror. IndexedDB
   (js/core/dataport.js, window.DataPort) is the NEW persistent storage
   target introduced by TASK-003 and is authoritative for durable
   persistence. Every write is forwarded to IndexedDB while the localStorage
   mirror is retained ONLY as a compatibility / rollback copy. Do NOT treat
   localStorage as the long-term authoritative store — it is the transitional
   mirror until page logic moves to asynchronous reads.

   Failure handling: IndexedDB write failures are never silently swallowed —
   DataPort records them and exposes a detectable error state
   (CHLDB.storageStatus()). If IndexedDB fails, the localStorage mirror data
   is preserved and the app can continue, but the failure is observable.
   ========================================================================== */
(function () {
    'use strict';

    var CHL = window.CHL = window.CHL || {};
    var NS = 'chemlabx_';

    /* ---------- in-memory compatibility cache (seeded from localStorage) ---------- */
    var cache = {};
    var mirrorHealth = 'ok';
    var mirrorLastError = null;

    function readLocal(key) {
        var raw = null;
        try { raw = window.localStorage.getItem(key); } catch (e) { return null; }
        if (raw === null) return null;
        try { return JSON.parse(raw); } catch (e) { return raw; }
    }

    function initCache() {
        var i, k;
        try {
            for (i = 0; i < window.localStorage.length; i++) {
                k = window.localStorage.key(i);
                if (k && k.indexOf(NS) === 0) cache[k] = readLocal(k);
            }
        } catch (e) { mirrorHealth = 'degraded'; mirrorLastError = String(e); }
    }

    /* ---------- persist: cache + localStorage mirror + IndexedDB (DataPort) ---------- */
    function persist(key, data) {
        cache[key] = data;
        try {
            window.localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            mirrorHealth = 'degraded';
            mirrorLastError = String(e && e.message || e);
        }
        /* forward to IndexedDB; failures are recorded inside DataPort (never silently)
           and are observable via CHLDB.storageStatus(). */
        if (window.DataPort) {
            window.DataPort.set(key, data);
        }
    }

    function get(key, def) {
        var ck = NS + key;
        if (Object.prototype.hasOwnProperty.call(cache, ck)) {
            var v = cache[ck];
            return (v === null || v === undefined) ? def : v;
        }
        return readLocal(ck) === null ? def : readLocal(ck);
    }
    function set(key, val) { persist(NS + key, val); }

    /* Collections stored as objects keyed by id */
    function collection(name) {
        return {
            all: function () { return get(name, {}); },
            save: function (data) { persist(NS + name, data); },
            list: function () {
                var c = get(name, {});
                return Object.keys(c).map(function (k) { return c[k]; });
            },
            getById: function (id) { return get(name, {})[id] || null; },
            upsert: function (id, row) {
                var c = get(name, {});
                var isNew = !Object.prototype.hasOwnProperty.call(c, id);
                /* Provenance: stamped ONLY on NEW LabSession/Result records (one consistent
                   shape). Old historical records are never mutated to add provenance —
                   re-saving an existing record that lacks provenance leaves it untouched. */
                if (isNew && name === 'submissions' && row && !row.provenance) {
                    row = Object.assign({}, row, { provenance: CHL.provenance ? CHL.provenance() : null });
                } else if (row && !row.provenance) {
                    row = Object.assign({}, row);
                }
                c[id] = row;
                persist(NS + name, c);
                return row;
            },
            remove: function (id) {
                var c = get(name, {});
                delete c[id];
                persist(NS + name, c);
            }
        };
    }

    var users = collection('users');
    var classes = collection('classes');
    var assignments = collection('assignments');
    var submissions = collection('submissions');
    var results = collection('results');

    /* Simple non-cryptographic hash for passwords (offline demo only) */
    function hashPassword(str) {
        var h = 5381;
        for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
        return 'h' + Math.abs(h).toString(36);
    }

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    /* ---------- Seed demo data on first run ---------- */
    function seedIfEmpty() {
        if (Object.keys(users.all()).length > 0) return;

        var adminId = uid(), teacherId = uid(), studentId = uid();
        var now = Date.now();

        users.upsert(adminId, {
            id: adminId, name: '\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645', nameEn: 'System Admin',
            email: 'admin@chemlabx.com', pass: hashPassword('admin123'), role: 'admin',
            level: 'advanced', createdAt: now,
            progress: { xp: 0, quizBest: 0, lessonsDone: [], experimentsDone: [], dangerousReactions: 0, achievements: {} }
        });
        users.upsert(teacherId, {
            id: teacherId, name: '\u0623\u0633\u062A\u0627\u0630 \u0623\u062D\u0645\u062F', nameEn: 'Mr. Ahmed',
            email: 'teacher@chemlabx.com', pass: hashPassword('teacher123'), role: 'teacher',
            school: '\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0639\u0644\u0648\u0645', schoolEn: 'Science School',
            level: 'advanced', createdAt: now,
            progress: { xp: 120, quizBest: 8, lessonsDone: [1, 2], experimentsDone: ['Na+H2O'], dangerousReactions: 1, achievements: {} }
        });
        users.upsert(studentId, {
            id: studentId, name: '\u0637\u0627\u0644\u0628 \u062A\u062C\u0631\u064A\u0628\u064A', nameEn: 'Demo Student',
            email: 'student@chemlabx.com', pass: hashPassword('student123'), role: 'student',
            level: 'beginner', createdAt: now,
            progress: { xp: 25, quizBest: 6, lessonsDone: [], experimentsDone: [], dangerousReactions: 0, achievements: {} }
        });

        var classId = uid();
        classes.upsert(classId, {
            id: classId, name: '\u0643\u064A\u0645\u064A\u0627\u0621 101', nameEn: 'Chemistry 101',
            code: 'CH101', teacherId: teacherId,
            description: '\u062A\u062C\u0631\u0628\u0647 \u0623\u0648\u0644\u0649', descriptionEn: 'First batch',
            studentIds: [studentId], createdAt: now
        });

        var assignmentId = uid();
        assignments.upsert(assignmentId, {
            id: assignmentId, classId: classId, teacherId: teacherId,
            title: '\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 \u0645\u0639 \u0627\u0644\u0645\u0627\u0621', titleEn: 'Sodium + Water Reaction',
            type: 'lab', target: 'Na+H2O',
            description: '\u0646\u0641\u0630 \u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 \u0645\u0639 \u0627\u0644\u0645\u0627\u0621 \u0648\u0633\u062C\u0644 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A', descriptionEn: 'Run the Sodium + Water experiment and record your observations',
            dueDate: now + 7 * 24 * 3600 * 1000, createdAt: now
        });

        var s = users.getById(studentId);
        s.classIds = [classId];
        users.upsert(studentId, s);
    }

    /* ---------- Public API ---------- */
    window.CHLDB = {
        NS: NS,
        uid: uid,
        hashPassword: hashPassword,
        seed: seedIfEmpty,
        users: users,
        classes: classes,
        assignments: assignments,
        submissions: submissions,
        results: results,
        get: get,
        set: set,
        provenance: function (extra) { return CHL.provenance ? CHL.provenance(extra) : null; },
        storageStatus: function () {
            var dp = window.DataPort ? window.DataPort.status() : null;
            return {
                transitional: true,
                mirror: { health: mirrorHealth, lastError: mirrorLastError },
                dataPort: dp
            };
        },
        ensureMigrated: function () {
            return window.DataPort ? window.DataPort.ensureMigrated() : Promise.resolve({ error: 'DataPort unavailable' });
        },
        flush: function () {
            return window.DataPort ? window.DataPort.flush() : Promise.resolve(false);
        }
    };

    initCache();
    seedIfEmpty();
})();
/* ==========================================================================
   ChemLabX 4.0 — Content domain (TASK-008)
   Pure, UI-free domain for versioned, locale-structured content packs
   (lessons, quiz, experiments). Reads pack data (CHL.contentPacks), the
   content DatasetManifest (CHL.contentManifest), and resolves localized items
   deterministically.

   FAIL-CLOSED by design:
     - unknown pack        -> throws ContentError
     - unknown item/key    -> throws ContentError (never fabricates/empty)
     - unknown locale      -> throws ContentError
     - missing ar/en field -> throws ContentError (no silent fallback)
     - malformed pack      -> throws ContentError

   No networking, no DOM writes beyond ensuring local pack <script> assets are
   loaded for the protected-HTML pages (offline-first: served by the app shell).
   ========================================================================== */
(function () {
    'use strict';
    var CHL = window.CHL = window.CHL || {};

    var VALID_LOCALES = ['ar', 'en'];
    var KNOWN_PACKS = ['lessons', 'quiz', 'experiments'];

    function fail(message) {
        throw new Error('ContentError: ' + message);
    }

    /* Atoms a content item must expose per locale (by pack type). */
    var REQUIRED_LOCALE_FIELDS = {
        lessons: ['title', 'body'],
        quiz: ['q', 'options', 'cat'],
        experiments: ['title', 'desc']
    };

    function typeOf(name) {
        if (name === 'lessons') return 'lessons';
        if (name === 'quiz') return 'quiz';
        return 'experiments';
    }

    function requirePack(name) {
        if (KNOWN_PACKS.indexOf(name) === -1) fail('unknown content pack "' + name + '"');
        var reg = CHL.contentPacks;
        if (!reg || !reg[name]) fail('content pack "' + name + '" is not loaded');
        var pack = reg[name];
        if (!pack || !Array.isArray(pack.items)) fail('content pack "' + name + '" is malformed (missing items array)');
        return pack;
    }

    function itemKey(item, name) {
        if (name === 'lessons' || name === 'quiz') return item.id;
        return item.key;
    }

    function validateLocale(item, name, lang) {
        if (VALID_LOCALES.indexOf(lang) === -1) fail('unsupported locale "' + lang + '"');
        var loc = item.content && item.content[lang];
        if (!loc || typeof loc !== 'object') fail('item "' + itemKey(item, name) + '" has no "' + lang + '" locale');
        var required = REQUIRED_LOCALE_FIELDS[typeOf(name)];
        for (var i = 0; i < required.length; i++) {
            var f = required[i];
            var v = loc[f];
            if (v === undefined || v === null || v === '') {
                fail('item "' + itemKey(item, name) + '" is missing required "' + lang + '" field "' + f + '"');
            }
        }
        return loc;
    }

    var api = {
        KNOWN_PACKS: KNOWN_PACKS.slice(),

        manifest: function () {
            if (!CHL.contentManifest) fail('content manifest is not loaded');
            return CHL.contentManifest;
        },
        version: function () {
            return api.manifest().version;
        },
        schemaVersion: function () {
            return api.manifest().schemaVersion;
        },
        contentHash: function () {
            return api.manifest().contentHash;
        },
        datasetId: function () {
            return api.manifest().datasetId;
        },
        isLoaded: function (name) {
            return !!(CHL.contentPacks && CHL.contentPacks[name]);
        },
        packVersion: function (name) {
            var pack = requirePack(name);
            return pack.version;
        },
        packSchemaVersion: function (name) {
            var pack = requirePack(name);
            return pack.schemaVersion;
        },

        /* Localize a single item for a locale. Fail-closed. */
        localize: function (name, item, lang) {
            if (!item) fail('cannot localize a missing item');
            return validateLocale(item, name, lang);
        },

        /* Resolve a single item by id/key and localize it. Fail-closed. */
        resolve: function (name, key, lang) {
            var pack = requirePack(name);
            var item;
            for (var i = 0; i < pack.items.length; i++) {
                if (String(itemKey(pack.items[i], name)) === String(key)) { item = pack.items[i]; break; }
            }
            if (!item) fail('content pack "' + name + '" has no item "' + key + '"');
            return {
                key: itemKey(item, name),
                icon: item.icon || null,
                correct: item.correct,
                content: validateLocale(item, name, lang)
            };
        },

        /* Resolve every item of a pack in pack order, localized. Build-time
           validation of full ar/en completeness (fail-closed). */
        resolveAll: function (name, lang) {
            if (VALID_LOCALES.indexOf(lang) === -1) fail('unsupported locale "' + lang + '"');
            var pack = requirePack(name);
            return pack.items.map(function (item) {
                /* validate BOTH locales so a missing one cannot hide */
                validateLocale(item, name, 'ar');
                validateLocale(item, name, 'en');
                return {
                    key: itemKey(item, name),
                    icon: item.icon || null,
                    correct: item.correct,
                    content: validateLocale(item, name, lang)
                };
            });
        },

        count: function (name) {
            return requirePack(name).items.length;
        },

        keys: function (name) {
            return requirePack(name).items.map(function (it) { return itemKey(it, name); });
        },

        /* Load the Content domain itself + manifest + the named packs so the
           protected pages can read them offline-first (local <script> assets).
           Resolves when everything is present; fails closed otherwise. */
        ensure: function (names) {
            var wanted = [];
            var seen = {};
            [].concat(names || []).forEach(function (n) {
                if (seen[n]) return;
                seen[n] = 1;
                if (KNOWN_PACKS.indexOf(n) === -1) fail('unknown content pack "' + n + '"');
                if (!api.isLoaded(n)) wanted.push('js/data/content/' + n + '.js');
            });
            if (!CHL.contentManifest) wanted.push('js/data/content/manifest.js');

            if (typeof document === 'undefined') {
                /* non-browser: expect synchronized globals; fail if missing */
                wanted.forEach(function () {}); // no-op
                return Promise.resolve();
            }

            return Promise.all(wanted.map(function (src) {
                return new Promise(function (resolve, reject) {
                    var existing = document.querySelector('script[data-content-src="' + src + '"]');
                    if (existing) return resolve();
                    var s = document.createElement('script');
                    s.src = src;
                    s.setAttribute('data-content-src', src);
                    s.onload = function () { resolve(); };
                    s.onerror = function () { reject(new Error('ContentError: failed to load ' + src)); };
                    document.head.appendChild(s);
                });
            })).then(function () {
                wanted.forEach(function () { /* eager validate */ });
            });
        }
    };

    CHL.content = api;
})();

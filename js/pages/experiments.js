/* ==========================================================================
   ChemLabX 4.0 — Experiments catalog page (links into the virtual lab)
   TASK-007: reactions.js is the single source of truth for equation, XP,
   and danger. Catalog keys stay '+' separated (engine.js owns the material
   map keyed by the same '+' IDs passed to lab.html?exp=KEY).
   TASK-008: this module is the experiments-lane LOADER + single source for
   the descriptive catalog. It registers its locale-structured display
   metadata into the pure Content domain (js/domain/content.js) as the
   'experiments' pack and renders through it (offline-first). The '+' separated
   catalog literals remain here because the TASK-007 validator
   (test/validate_chemistry.py) parses them from this source — kept intact.
   js/data/content/experiments.js is the versioned pack descriptor, and
   test/validate_content.py cross-checks the two (fail-closed).
   ========================================================================== */
(function () {
    'use strict';

    var experimentTitles = {
        'Na+H2O': { ar: '\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 \u0645\u0639 \u0627\u0644\u0645\u0627\u0621', en: 'Sodium + Water', descAr: '\u062A\u0641\u0627\u0639\u0644 \u0639\u0646\u064A\u0641 \u064A\u0646\u062A\u062C \u0647\u064A\u062F\u0631\u0648\u062C\u064A\u0646 \u0648\u0647\u064A\u062F\u0631\u0648\u0643\u0633\u064A\u062F \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645', descEn: 'Vigorous reaction producing hydrogen + sodium hydroxide' },
        'HCl+NaOH': { ar: '\u062A\u0639\u0627\u062F\u0644 \u062D\u0645\u0636-\u0642\u0627\u0639\u062F\u0629', en: 'Acid-Base Neutralization', descAr: '\u062A\u0641\u0627\u0639\u0644 \u062A\u0639\u0627\u062F\u0644 \u064A\u0646\u062A\u062C \u0645\u0644\u062D \u0648\u0645\u0627\u0621', descEn: 'Neutralization producing salt and water' },
        'Zn+HCl': { ar: '\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0632\u0646\u0643 \u0645\u0639 \u0627\u0644\u062D\u0645\u0636', en: 'Zinc + Acid', descAr: '\u0625\u0646\u062A\u0627\u062C \u063A\u0627\u0632 \u0627\u0644\u0647\u064A\u062F\u0631\u0648\u062C\u064A\u0646', descEn: 'Hydrogen gas evolution' },
        'CuSO4+Zn': { ar: '\u062A\u0631\u0633\u064A\u0628 \u0627\u0644\u0646\u062D\u0627\u0633', en: 'Copper Deposition', descAr: '\u062A\u0631\u0633\u064A\u0628 \u0627\u0644\u0646\u062D\u0627\u0633 \u0639\u0644\u0649 \u0627\u0644\u0632\u0646\u0643', descEn: 'Copper deposited on zinc' },
        'KMnO4+H2O2': { ar: '\u0628\u0631\u0645\u0646\u063A\u0646\u0627\u062A + \u0628\u064A\u0631\u0648\u0643\u0633\u064A\u062F', en: 'Permanganate + Peroxide', descAr: '\u062A\u0641\u0627\u0639\u0644 \u0623\u0643\u0633\u062F\u0629 \u0645\u0644\u0648\u0646 \u064A\u0646\u062A\u062C \u0623\u0643\u0633\u062C\u064A\u0646', descEn: 'Colorful oxidation producing oxygen' },
        'AgNO3+Cu': { ar: '\u062A\u0631\u0633\u064A\u0628 \u0627\u0644\u0641\u0636\u0629', en: 'Silver Deposition', descAr: '\u062A\u0631\u0633\u064A\u0628 \u0627\u0644\u0641\u0636\u0629 \u0639\u0644\u0649 \u0627\u0644\u0646\u062D\u0627\u0633', descEn: 'Silver crystals on copper' },
        'CaCO3+HCl': { ar: '\u0643\u0631\u0628\u0648\u0646\u0627\u062A + \u062D\u0645\u0636', en: 'Carbonate + Acid', descAr: '\u0641\u0648\u0631\u0627\u0646 \u063A\u0627\u0632 \u062B\u0627\u0646\u064A \u0623\u0643\u0633\u064A\u062F \u0627\u0644\u0643\u0631\u0628\u0648\u0646', descEn: 'Carbon dioxide effervescence' },
        'NH3+HCl': { ar: '\u0623\u0645\u0648\u0646\u064A\u0627 + \u062D\u0645\u0636', en: 'Ammonia + Acid', descAr: '\u062F\u062E\u0627\u0646 \u0623\u0628\u064A\u0636 \u0645\u0646 \u0643\u0644\u0648\u0631\u064A\u062F \u0627\u0644\u0623\u0645\u0648\u0646\u064A\u0648\u0645', descEn: 'White smoke of ammonium chloride' },
        'FeCl3+NaOH': { ar: '\u0647\u064A\u062F\u0631\u0648\u0643\u0633\u064A\u062F \u0627\u0644\u062D\u062F\u064A\u062F', en: 'Iron Hydroxide', descAr: '\u0631\u0627\u0633\u0628 \u0628\u0646\u064A \u0645\u062D\u0645\u0631', descEn: 'Brown-red precipitate' },
        'CuSO4+NaOH': { ar: '\u0647\u064A\u062F\u0631\u0648\u0643\u0633\u064A\u062F \u0627\u0644\u0646\u062D\u0627\u0633', en: 'Copper Hydroxide', descAr: '\u0631\u0627\u0633\u0628 \u0623\u0632\u0631\u0642 \u0645\u0632\u0631\u0642', descEn: 'Blue precipitate' },
        'CaO+H2O': { ar: '\u0625\u062E\u0645\u0627\u062F \u0627\u0644\u062C\u064A\u0631', en: 'Slaking Lime', descAr: '\u062A\u0641\u0627\u0639\u0644 \u0637\u0627\u0631\u062F \u0644\u0644\u062D\u0631\u0627\u0631\u0629', descEn: 'Exothermic slaking reaction' },
        'AgNO3+NaCl': { ar: '\u062A\u0631\u0633\u064A\u0628 \u0643\u0644\u0648\u0631\u064A\u062F \u0627\u0644\u0641\u0636\u0629', en: 'Silver Chloride', descAr: '\u0631\u0627\u0633\u0628 \u0623\u0628\u064A\u0636 \u0645\u0646 \u0643\u0644\u0648\u0631\u064A\u062F \u0627\u0644\u0641\u0636\u0629', descEn: 'White silver chloride precipitate' },
        'H2SO4+H2O': { ar: '\u062A\u0645\u062F\u064A\u062F \u062D\u0645\u0636 \u0627\u0644\u0643\u0628\u0631\u064A\u062A\u064A\u0643', en: 'Sulfuric Acid Dilution', descAr: '\u062A\u0641\u0627\u0639\u0644 \u0634\u062F\u064A\u062F \u0627\u0644\u062D\u0631\u0627\u0631\u0629 \u2014 \u062A\u0646\u0628\u064A\u0647: \u0623\u0636\u0641 \u0627\u0644\u062D\u0645\u0636 \u0625\u0644\u0649 \u0627\u0644\u0645\u0627\u0621', descEn: 'Highly exothermic — add acid to water' },
        'CH3COOH+NaHCO3': { ar: '\u062E\u0644 + \u0628\u064A\u0643\u0631\u0628\u0648\u0646\u0627\u062A', en: 'Vinegar + Baking Soda', descAr: '\u0641\u0648\u0631\u0627\u0646 \u063A\u0627\u0632 \u062B\u0627\u0646\u064A \u0623\u0643\u0633\u064A\u062F \u0627\u0644\u0643\u0631\u0628\u0648\u0646 \u0627\u0644\u0645\u0623\u0644\u0648\u0641', descEn: 'Classic CO\u2082 volcano' }
    };

    /* Build the fallback pack from the retained catalog literal above. At
       runtime the versioned descriptor (js/data/content/experiments.js) is the
       source: ensureContent() loads it through the Content domain, and this
       builder is only used if that asset cannot be loaded. The catalog literals
       must stay here because test/validate_chemistry.py parses them. */
    var CHL = window.CHL = window.CHL || {};
    CHL.contentPacks = CHL.contentPacks || {};
    function inlineExperimentPack() {
        return {
            packName: 'experiments',
            version: (CHL.contentManifest && CHL.contentManifest.packs && CHL.contentManifest.packs.experiments)
                ? CHL.contentManifest.packs.experiments.version : '1.0.0',
            schemaVersion: 2,
            items: Object.keys(experimentTitles).map(function (key) {
                var e = experimentTitles[key];
                return {
                    key: key,
                    icon: null,
                    content: {
                        ar: { title: e.ar, desc: e.descAr },
                        en: { title: e.en, desc: e.descEn }
                    }
                };
            })
        };
    }

    /* Resolve an experiment's '+' separated material IDs to its validated
       reaction using the same deterministic subset-matching logic the engine
       and Chemistry domain use (subset matching preserved — out of scope to
       tighten). reactions.js is the single source of truth. */
    function resolveReaction(parts) {
        if (typeof reactions === 'undefined') return null;
        if (!parts || parts.length < 2) return null;
        var sorted = parts.slice().sort().join(',');
        if (reactions[sorted]) return reactions[sorted];
        var keys = Object.keys(reactions).filter(function (k) { return k !== 'default'; });
        for (var i = 0; i < keys.length; i++) {
            var kparts = keys[i].split(',');
            if (kparts.length >= 2 && kparts.every(function (p) { return parts.indexOf(p) !== -1; })) {
                return reactions[keys[i]];
            }
        }
        return null;
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function render(root) {
        window.CHLUI.initNav('experiments');
        var lang = window.CHL.lang;

        var html = '<div class="lessons-header">';
        html += '<h1>' + window.t('\uD83D\uDCDA \u0627\u0644\u062A\u062C\u0627\u0631\u0628 \u0627\u0644\u0645\u062E\u062A\u0628\u0631\u064A\u0629', '\uD83D\uDCDA Lab Experiments') + '</h1>';
        html += '<p>' + window.t('\u0627\u062E\u062A\u0631 \u062A\u062C\u0631\u0628\u0629 \u0644\u062A\u062D\u0645\u064A\u0644\u0647\u0627 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0641\u064A \u0627\u0644\u0645\u0639\u0645\u0644 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A. \u0633\u064A\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u062A\u062A\u0631\u0643 \u0644\u0643 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u062A\u0641\u0627\u0639\u0644!', 'Pick an experiment to auto-load it in the virtual lab. Materials are placed for you — you run the reaction!') + '</p>';
        html += '</div>';

        html += '<div class="experiment-grid">';
        /* Read the localized pack through the Content domain (fail-closed). */
        var items = window.CHL.content.resolveAll('experiments', lang);
        items.forEach(function (item) {
            var key = item.key;
            var e = item.content;
            var reaction = resolveReaction(key.split('+'));
            var title = e.title;
            var desc = e.desc;
            var equation = reaction ? reaction.equation : key.replace(/\+/g, ' + ');
            var xp = reaction ? (typeof reaction.xp === 'number' ? reaction.xp : 0) : 0;
            var danger = reaction ? !!reaction.danger : false;
            var tag = danger ? 'tag-danger' : 'tag-safe';
            var tagText = lang === 'en' ? (danger ? '⚠️ Dangerous' : '✅ Safe') : (danger ? '⚠️ خطير' : '✅ آمن');
            html += '<div class="experiment-card" data-exp="' + key + '">' +
                '<span class="tag ' + tag + ' exp-badge">' + tagText + '</span>' +
                '<h3>' + esc(title) + '</h3>' +
                '<p>' + esc(desc) + '</p>' +
                '<div class="exp-equation">' + equation + '</div>' +
                '<div class="exp-xp">+' + xp + ' XP</div>' +
                '</div>';
        });
        html += '</div>';

        root.innerHTML = html;

        root.querySelectorAll('.experiment-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var key = card.dataset.exp;
                window.location.href = 'lab.html?exp=' + encodeURIComponent(key);
            });
        });
    }

    function ensureContent(cb) {
        if (window.CHL && window.CHL.content) {
            window.CHL.content.ensure(['experiments']).then(function () { cb(); }, function (e) {
                /* The descriptor is precached with the app shell; only fall back
                   to the inline copy if it truly cannot load. */
                if (!window.CHL.content.isLoaded('experiments')) {
                    window.CHL.contentPacks.experiments = inlineExperimentPack();
                }
                cb(window.CHL.content.isLoaded('experiments') ? null : e);
            });
            return;
        }
        var existing = document.querySelector('script[data-content-src="js/domain/content.js"]');
        if (existing) {
            var tried = 0;
            (function poll() {
                if (window.CHL && window.CHL.content) return ensureContent(cb);
                tried++;
                if (tried > 200) return cb(new Error('content domain unavailable'));
                setTimeout(poll, 10);
            })();
            return;
        }
        var s = document.createElement('script');
        s.src = 'js/domain/content.js';
        s.setAttribute('data-content-src', 'js/domain/content.js');
        s.onload = function () { ensureContent(cb); };
        s.onerror = function () { cb(new Error('failed to load js/domain/content.js')); };
        document.head.appendChild(s);
    }

    function init() {
        var root = document.getElementById('expRoot');
        if (!root) return;
        ensureContent(function (err) {
            if (err) {
                if (window.CHLUI) window.CHLUI.toast('Content unavailable', 'error', '\u26A0\uFE0F');
                return;
            }
            render(root);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    /* TASK-007: expose the retained experiment count dynamically (derived
       from the catalog, after removing K2Cr2O7+HCl). Dashboard reads this
       instead of a hard-coded number. Synchronous so the dashboard/harness
       see it immediately. */
    window.CHL = window.CHL || {};
    window.CHL.experimentCount = Object.keys(experimentTitles).length;
})();

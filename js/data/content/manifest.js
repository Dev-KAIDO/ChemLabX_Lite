/* ==========================================================================
   ChemLabX 4.0 — Content DatasetManifest (TASK-008)
   Binding DatasetManifest (§15.1) for the 'content' lane: lessons, quiz, and
   experiments (descriptive catalog). CONTENT_VERSION in js/core/versions.js is
   bound to manifest.version, so every new provenance stamp carries the real,
   immutable content dataset version.

   contentHash is a deterministic SHA-256 over the concatenated bytes (in a
   fixed order) of the published pack sources:
       js/data/content/lessons.js
       js/data/content/quiz.js
       js/data/content/experiments.js
   test/validate_content.py recomputes it and FAILS CLOSED on mismatch.
   ========================================================================== */
(function () {
    'use strict';
    var CHL = window.CHL = window.CHL || {};

    CHL.contentManifest = {
        datasetId: 'content',
        version: 'content-v1',
        schemaVersion: 2,
        contentHash: 'b52ba5d76b47faece3d998775a3daad42acae0b0704fbdeb1d1c194b4b6c77e6',
        publishedAt: '2026-09-02T00:00:00.000Z',
        provenance: {
            sources: [
                'CHEMLABX_ARCHITECTURE.md \u00A715 (DatasetManifest)',
                'legacy prototype curriculum (lessons/quiz)',
                'js/data/reactions.js validated-v1 (experiments display lane)'
            ],
            reviewers: [
                'TASK-003 foundation validation',
                'TASK-007 chemistry data validation (validated-v1)',
                'TASK-008 content pack validation'
            ],
            languageBasis: 'ar primary, en translation'
        },
        editions: {
            ar: { locale: 'ar', dir: 'rtl', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
            en: { locale: 'en', dir: 'ltr', label: 'English' }
        },
        packs: {
            lessons:     { version: '1.0.0', schemaVersion: 2, count: 6,  ids: [1, 2, 3, 4, 5, 6] },
            quiz:        { version: '1.0.0', schemaVersion: 2, count: 20, ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
            experiments: { version: '1.0.0', schemaVersion: 2, count: 14, keys: ['Na+H2O', 'HCl+NaOH', 'Zn+HCl', 'CuSO4+Zn', 'KMnO4+H2O2', 'AgNO3+Cu', 'CaCO3+HCl', 'NH3+HCl', 'FeCl3+NaOH', 'CuSO4+NaOH', 'CaO+H2O', 'AgNO3+NaCl', 'H2SO4+H2O', 'CH3COOH+NaHCO3'] }
        }
    };
})();

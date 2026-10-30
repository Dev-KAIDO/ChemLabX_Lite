/* ==========================================================================
   ChemLabX 4.0.0-foundation — Version & Provenance metadata (TASK-003)
   Single source of truth for schema/content/chemistry-data/engine/safety.
   ========================================================================== */
(function () {
    'use strict';

    var CHL = window.CHL = window.CHL || {};

    var VERSIONS = {
        APP_VERSION: '4.0.0-foundation',
        SCHEMA_VERSION: 2,
        /* CONTENT_VERSION is BOUND to the content DatasetManifest (TASK-008):
           it resolves to js/data/content/manifest.js's `version` lazily so the
           binding survives load order (content.js/manifest.js load after this
           module on the pages; provenance is only stamped later). Keeps
           SCHEMA_VERSION=2 and CHEMISTRY_DATA_VERSION='validated-v1' unchanged. */
        get CONTENT_VERSION() {
            return (window.CHL && window.CHL.contentManifest && window.CHL.contentManifest.version) || 'content-v1';
        },
        CHEMISTRY_DATA_VERSION: 'validated-v1',
        ENGINE_VERSION: 'prototype',
        SAFETY_MODEL_VERSION: 'prototype-rules-v1',
        SAFETY_RULES_VERSION: 'prototype-rules-v1'
    };

    /* Provenance stamp for NEW LabSession/Result records.
       Old historical records are never mutated to add provenance.
       One consistent shape is used across every new record. */
    function provenance(extra) {
        var p = {
            appVersion: VERSIONS.APP_VERSION,
            schemaVersion: VERSIONS.SCHEMA_VERSION,
            contentVersion: VERSIONS.CONTENT_VERSION,
            chemistryDataVersion: VERSIONS.CHEMISTRY_DATA_VERSION,
            engineVersion: VERSIONS.ENGINE_VERSION,
            safetyModelVersion: VERSIONS.SAFETY_MODEL_VERSION,
            safetyRulesVersion: VERSIONS.SAFETY_RULES_VERSION,
            savedAt: new Date().toISOString()
        };
        if (extra) {
            for (var k in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, k)) p[k] = extra[k];
            }
        }
        return p;
    }

    function getVersionInfo() {
        return {
            appVersion: VERSIONS.APP_VERSION,
            schemaVersion: VERSIONS.SCHEMA_VERSION,
            contentVersion: VERSIONS.CONTENT_VERSION,
            chemistryDataVersion: VERSIONS.CHEMISTRY_DATA_VERSION,
            engineVersion: VERSIONS.ENGINE_VERSION,
            safetyModelVersion: VERSIONS.SAFETY_MODEL_VERSION,
            safetyRulesVersion: VERSIONS.SAFETY_RULES_VERSION
        };
    }

    CHL.versions = VERSIONS;
    CHL.provenance = provenance;
    CHL.getVersionInfo = getVersionInfo;
})();
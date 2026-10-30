/* ==========================================================================
   ChemLabX 4.0 — Chemistry Domain (TASK-004)
   Pure, deterministic reaction determination over the versioned dataset.
   Boundary: no DOM/UI, no persistence, no achievements, no randomness.
   ========================================================================== */
(function () {
    'use strict';

    var CH = window.Chemistry = window.Chemistry || {};

    function versionOf(key, fallback) {
        if (window.CHL && window.CHL.versions && window.CHL.versions[key]) return window.CHL.versions[key];
        return fallback;
    }

    function materialOf(id) {
        if (typeof materialDB === 'undefined' || !materialDB) return null;
        return materialDB[id] || null;
    }

    function recordOf(pairId) {
        if (typeof reactions === 'undefined' || !reactions) return null;
        return reactions[pairId] || null;
    }

    function matchKey(materialIds) {
        if (typeof reactions === 'undefined') return null;
        if (!materialIds || materialIds.length < 2) return null;
        var sorted = materialIds.slice().sort().join(',');
        if (reactions[sorted]) return sorted;
        var keys = Object.keys(reactions).filter(function (k) { return k !== 'default'; });
        for (var i = 0; i < keys.length; i++) {
            var parts = keys[i].split(',');
            var allPresent = parts.every(function (p) { return materialIds.indexOf(p) !== -1; });
            if (allPresent && parts.length >= 2) return keys[i];
        }
        return null;
    }

    function lookupReaction(materialIds) {
        if (typeof reactions === 'undefined') return null;
        if (!materialIds || materialIds.length < 2) return null;
        var key = matchKey(materialIds);
        return key ? reactions[key] : null;
    }

    function normalizeInput(input) {
        var src = input || {};
        var mats = Array.isArray(src.materials) ? src.materials : [];
        var materials = mats.map(function (m) {
            var o = m || {};
            return {
                id: String(o.id != null ? o.id : o.material),
                qty: o.qty != null ? o.qty : null,
                unit: o.unit != null ? o.unit : null,
                name: o.name != null ? o.name : null,
                nameEn: o.nameEn != null ? o.nameEn : null,
                formula: o.formula != null ? o.formula : null
            };
        }).filter(function (m) {
            return m.id && m.id !== 'null' && m.id !== 'undefined' && m.id !== 'unknown';
        });
        return {
            materials: materials,
            temperature: typeof src.temperature === 'number' ? src.temperature : 25,
            ph: typeof src.ph === 'number' ? src.ph : 7
        };
    }

    function cloneRecord(record, products) {
        var clone = {};
        for (var k in record) {
            if (Object.prototype.hasOwnProperty.call(record, k)) clone[k] = record[k];
        }
        clone.products = products;
        return clone;
    }

    function determine(input, chemistryDataVersion, engineVersion) {
        var dv = chemistryDataVersion || versionOf('CHEMISTRY_DATA_VERSION', 'unvalidated-prototype');
        var ev = engineVersion || versionOf('ENGINE_VERSION', 'prototype');
        var snap = normalizeInput(input);
        var ids = snap.materials.map(function (m) { return m.id; });
        var key = ids.length >= 2 ? matchKey(ids) : null;
        if (!key) {
            return {
                status: 'unknown-result',
                reason: 'not-in-validated-dataset',
                provenance: { chemistryDataVersion: dv, engineVersion: ev }
            };
        }
        var record = reactions[key];
        var reactants = snap.materials.slice().sort(function (a, b) {
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        }).map(function (m) {
            var info = materialOf(m.id) || {};
            return {
                id: m.id,
                formula: info.formula || m.formula || m.id,
                name: info.name || m.name || m.id,
                nameEn: info.nameEn || m.nameEn || '',
                qty: m.qty != null ? m.qty : null,
                unit: m.unit != null ? m.unit : null
            };
        });
        var products = (record.products || []).map(function (p) {
            return { name: p.name, nameEn: p.nameEn, formula: p.formula, color: p.color };
        });
        return {
            status: 'resolved',
            reaction: { id: key, equation: record.equation || '', record: cloneRecord(record, products) },
            reactants: reactants,
            products: products,
            conditions: { temperature: snap.temperature, ph: snap.ph },
            derived: {
                tempChange: typeof record.tempChange === 'number' ? record.tempChange : 0,
                phChange: typeof record.phChange === 'number' ? record.phChange : 0,
                danger: !!record.danger,
                xp: typeof record.xp === 'number' ? record.xp : 0
            },
            provenance: { chemistryDataVersion: dv, engineVersion: ev }
        };
    }

    CH.determine = determine;
    CH.lookupReaction = lookupReaction;
    CH.findReaction = lookupReaction;
    CH.material = materialOf;
    CH.reaction = recordOf;
})();
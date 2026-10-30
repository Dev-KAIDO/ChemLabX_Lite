/* ==========================================================================
   ChemLabX 4.0 — Laboratory Domain (TASK-004)
   Pure session normalization + id helpers. No DOM/UI, no persistence.
   ========================================================================== */
(function () {
    'use strict';

    var LB = window.Laboratory = window.Laboratory || {};

    function normalizeState(state) {
        var s = state || {};
        var bench = Array.isArray(s.benchItems) ? s.benchItems : [];
        var materials = bench.map(function (b) {
            var o = b || {};
            return {
                id: String(o.material != null ? o.material : o.id),
                qty: typeof o.qty === 'number' ? o.qty : null,
                unit: o.unit != null ? o.unit : null
            };
        }).filter(function (m) {
            return m.id && m.id !== 'null' && m.id !== 'undefined' && m.id !== 'unknown';
        });
        return {
            materials: materials,
            temperature: typeof s.temperature === 'number' ? s.temperature : 25,
            ph: typeof s.ph === 'number' ? s.ph : 7
        };
    }

    function joinIds(ids, separator, sort) {
        var arr = Array.isArray(ids) ? ids.slice() : [];
        if (sort) arr.sort();
        return arr.join(separator);
    }

    LB.normalizeState = normalizeState;
    LB.joinIds = joinIds;
})();
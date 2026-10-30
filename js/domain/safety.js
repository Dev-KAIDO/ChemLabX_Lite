/* ==========================================================================
   ChemLabX 4.0 — Safety Engine (TASK-005)
   Pure, deterministic safety evaluation over determination output + material
   state. No DOM, no UI, no achievements, no XP, no timestamps, no randomness.
   Consumes DeterminationResult + Laboratory.normalizeState() output only.
   ========================================================================== */
(function () {
    'use strict';

    var SH = window.Safety = window.Safety || {};

    /* ---------- centralized prototype thresholds (changeable in one place) ---------- */
    var THRESHOLDS = {
        TEMP_CHANGE_CONCERN: 25,
        TEMP_PROJECTED_HIGH: 60,
        PH_LOW: 3,
        PH_HIGH: 11,
        MATERIAL_STATE_SAFE: 'safe',
        MATERIAL_STATE_WARNING: 'warning',
        MATERIAL_STATE_DANGER: 'danger'
    };

    /* ---------- versioning ---------- */
    function versionOf(key, fallback) {
        if (window.CHL && window.CHL.versions && window.CHL.versions[key]) return window.CHL.versions[key];
        return fallback;
    }

    function rulesVersion() {
        return versionOf('SAFETY_RULES_VERSION', 'prototype-rules-v1');
    }

    /* ---------- deterministic digest for consumed input fingerprint ---------- */
    function sessionHash(session) {
        var s = session || {};
        var ids = (s.materials || []).slice().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
        var idPart = ids.map(function (m) { return m.id; }).join(',');
        return idPart + '|' + (typeof s.temperature === 'number' ? s.temperature.toFixed(1) : '25') + '|' + (typeof s.ph === 'number' ? s.ph.toFixed(1) : '7');
    }

    /* ---------- safe material read via Chemistry.material port ---------- */
    function materialOf(id) {
        if (window.Chemistry && typeof window.Chemistry.material === 'function') return window.Chemistry.material(id);
        return null;
    }

    /* ---------- helpers ---------- */
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function severityIndex(level) { return level === 'high' ? 3 : level === 'medium' ? 2 : 1; }
    function maxSeverity(a, b) { return severityIndex(a) >= severityIndex(b) ? a : b; }
    function isKnownState(s) { return s === 'safe' || s === 'warning' || s === 'danger'; }
    function isMaterialUnknown(m) {
        var id = m && m.id;
        return !id || id === 'null' || id === 'undefined' || id === 'unknown';
    }

    /* ---------- per-aspect analyzers (return {level, reason}) ---------- */

    function analyzeMaterials(session, det) {
        var mats = session.materials || [];
        var result = { level: 'low', reasons: [], matStates: [], concerns: 0, unknownMats: false, unknownMeta: 0, contradictions: false };
        var worst = 'low';

        for (var i = 0; i < mats.length; i++) {
            var m = mats[i];
            if (isMaterialUnknown(m)) { result.unknownMats = true; continue; }
            var info = materialOf(m.id);
            if (!info) { result.unknownMats = true; continue; }
            var state = info.state ? info.state : 'unknown';
            var conf = isKnownState(state) ? 'high' : 'low';
            if (state === 'unknown') { result.unknownMeta++; }
            result.matStates.push({ id: m.id, state: state, stateSource: 'materialDB-v1', confidence: conf });

            if (state === 'danger') { worst = 'high'; result.concerns++; }
            else if (state === 'warning' && severityIndex(worst) < 2) { worst = 'medium'; result.concerns++; }
        }

        /* compare individual material states against determination danger flag */
        if (det && det.status === 'resolved' && typeof det.derived === 'object' && det.derived) {
            var detDanger = !!det.derived.danger;
            var anyDangerMat = false;
            var anyWarningMat = false;
            var allSafeMat = result.matStates.length > 0;
            for (var j = 0; j < result.matStates.length; j++) {
                if (result.matStates[j].state === 'danger') { anyDangerMat = true; allSafeMat = false; }
                else if (result.matStates[j].state === 'warning') { anyWarningMat = true; allSafeMat = false; }
                else if (result.matStates[j].state !== 'safe') { allSafeMat = false; }
            }
            if (detDanger && allSafeMat) { result.contradictions = true; worst = 'medium'; result.concerns++; }
            if (!detDanger && anyDangerMat && result.matStates.length >= 2) { result.contradictions = true; worst = maxSeverity(worst, 'medium'); result.concerns++; }
        }

        result.level = worst;
        return result;
    }

    function analyzeThermal(session, det) {
        var result = { level: 'low', reasons: [], concerns: 0 };
        if (!det || det.status !== 'resolved' || !det.derived) return result;
        var tempChange = typeof det.derived.tempChange === 'number' ? det.derived.tempChange : 0;
        var projected = (typeof session.temperature === 'number' ? session.temperature : 25) + tempChange;

        if (Math.abs(tempChange) >= THRESHOLDS.TEMP_CHANGE_CONCERN) { result.level = 'high'; result.concerns++; return result; }
        if (projected > THRESHOLDS.TEMP_PROJECTED_HIGH) { result.level = 'high'; result.concerns++; return result; }
        if (projected > 35) { result.level = 'medium'; result.concerns++; return result; }
        return result;
    }

    function analyzePH(session, det) {
        var result = { level: 'low', reasons: [], concerns: 0 };
        if (!det || det.status !== 'resolved' || !det.derived) return result;
        var phChange = typeof det.derived.phChange === 'number' ? det.derived.phChange : 0;
        var projected = (typeof session.ph === 'number' ? session.ph : 7) + phChange;
        var low = THRESHOLDS.PH_LOW;
        var high = THRESHOLDS.PH_HIGH;

        if (projected < low || projected > high) { result.level = 'high'; result.concerns++; return result; }
        if (projected < 5 || projected > 9) { result.level = 'medium'; result.concerns++; return result; }
        return result;
    }

    function analyzeReaction(det) {
        var result = { level: 'low', reasons: [], concerns: 0 };
        if (!det || det.status !== 'resolved') return result;
        if (typeof det.derived === 'object' && det.derived && !!det.derived.danger) { result.level = 'high'; result.concerns++; }
        return result;
    }

    /* ---------- reason builder ---------- */
    function pushReason(reasons, code, level) {
        reasons.push({ code: code, level: level || 'low' });
    }

    /* ---------- main entry ---------- */
    function evaluate(session, determination, opts) {
        var dv  = (opts && opts.chemistryDataVersion) || versionOf('CHEMISTRY_DATA_VERSION', 'unvalidated-prototype');
        var ev  = (opts && opts.engineVersion)         || versionOf('ENGINE_VERSION', 'prototype');
        var rv  = rulesVersion();
        var smv = versionOf('SAFETY_MODEL_VERSION', 'prototype-rules-v1');
        var det = determination || null;
        var reasons = [];
        var status  = 'ok';
        var matAnalysis = { level: 'low', matStates: [], concerns: 0, unknownMats: false, contradictions: false };
        var thermalAnalysis = { level: 'low', concerns: 0 };
        var phAnalysis      = { level: 'low', concerns: 0 };
        var reactionAnalysis = { level: 'low', concerns: 0 };

        /* ---- guard: incomplete determination ---- */
        if (!det || typeof det !== 'object' || !det.status) {
            pushReason(reasons, 'INCOMPLETE_DET_V1', 'high');
            status = 'unsupported';
        }

        /* ---- guard: unsupported combo (≠2 valid materials) ---- */
        else if (!session || !Array.isArray(session.materials) || session.materials.length !== 2) {
            pushReason(reasons, 'UNSUPPORTED_COMBO_V1', 'high');
            status = 'unsupported';
        }

        /* ---- guard: unknown reaction (determination itself) ---- */
        else if (det.status === 'unknown-result') {
            pushReason(reasons, 'UNMATCHED_REACTION_V1', 'high');
            status = 'unsupported';
        }

        /* ---- guard: incomplete resolved structure ---- */
        else if (det.status === 'resolved') {
            if (!det.derived || typeof det.derived !== 'object') {
                pushReason(reasons, 'INCOMPLETE_DET_V1', 'high');
                status = 'unsupported';
            } else {
                /* ---- analyze aspects (independent; worst wins) ---- */
                matAnalysis = analyzeMaterials(session, det);
                thermalAnalysis = analyzeThermal(session, det);
                phAnalysis = analyzePH(session, det);
                reactionAnalysis = analyzeReaction(det);

                if (matAnalysis.unknownMats) {
                    pushReason(reasons, 'UNKNOWN_MATERIAL_V1', 'high');
                    status = 'unsupported';
                }

                if (matAnalysis.concerns > 0 && matAnalysis.level !== 'low') {
                    pushReason(reasons, 'MAT_STATE_V1', matAnalysis.level);
                }

                if (matAnalysis.contradictions) {
                    pushReason(reasons, 'CONTRADICT_META_V1', 'medium');
                }

                if (thermalAnalysis.concerns > 0) {
                    pushReason(reasons, 'THERMAL-EXO-V1', thermalAnalysis.level);
                }

                if (phAnalysis.concerns > 0) {
                    pushReason(reasons, 'PH_EXTREME_V1', phAnalysis.level);
                }

                if (reactionAnalysis.concerns > 0) {
                    pushReason(reasons, 'REACT_DANGER_V1', 'high');
                }

                /* ---- if status not already unsupported, derive from worst aspect ---- */
                if (status !== 'unsupported') {
                    var worst = 'low';
                    var worstLvl;
                    worstLvl = matAnalysis.level;    if (severityIndex(worstLvl) > severityIndex(worst)) worst = worstLvl;
                    worstLvl = thermalAnalysis.level; if (severityIndex(worstLvl) > severityIndex(worst)) worst = worstLvl;
                    worstLvl = phAnalysis.level;      if (severityIndex(worstLvl) > severityIndex(worst)) worst = worstLvl;
                    worstLvl = reactionAnalysis.level; if (severityIndex(worstLvl) > severityIndex(worst)) worst = worstLvl;
                    if (matAnalysis.contradictions && severityIndex(worst) < 2) worst = 'medium';

                    /* missing material metadata => never classify safe (caution floor) */
                    if (matAnalysis.unknownMeta > 0) {
                        pushReason(reasons, 'MISSING_META_V1', 'medium');
                        if (severityIndex(worst) < 2) worst = 'medium';
                    }

                    if (worst === 'high') status = 'danger';
                    else if (worst === 'medium') status = 'caution';
                    else status = 'ok';
                }
            }
        }

        /* ---- else: det.status is some unexpected value ---- */
        else {
            pushReason(reasons, 'INCOMPLETE_DET_V1', 'high');
            status = 'unsupported';
        }

        /* ---- classify confidence ---- */
        var confidence = 'high';
        if (status === 'unsupported') confidence = 'low';
        else if (status === 'caution') confidence = 'low';
        else if (matAnalysis.contradictions) confidence = 'low';
        else if (reactionAnalysis.concerns > 0) confidence = 'medium';

        /* ---- resolve final level (for summary) ---- */
        var finalLevel = 'low';
        var lvl;
        lvl = matAnalysis.level;    if (severityIndex(lvl) > severityIndex(finalLevel)) finalLevel = lvl;
        lvl = thermalAnalysis.level; if (severityIndex(lvl) > severityIndex(finalLevel)) finalLevel = lvl;
        lvl = phAnalysis.level;      if (severityIndex(lvl) > severityIndex(finalLevel)) finalLevel = lvl;
        lvl = reactionAnalysis.level; if (severityIndex(lvl) > severityIndex(finalLevel)) finalLevel = lvl;
        if (matAnalysis.contradictions && severityIndex(finalLevel) < 2) finalLevel = 'medium';

        /* ---- map status -> decision + gate ---- */
        var decision = 'block';
        var allowPresentation = false;
        var allowReward = false;
        var escalation = 'none';

        if (status === 'ok') {
            decision = 'allow'; allowPresentation = true; allowReward = true; escalation = 'none';
        } else if (status === 'caution') {
            decision = 'warn'; allowPresentation = true; allowReward = true; escalation = 'warn';
        } else if (status === 'danger') {
            decision = 'warn'; allowPresentation = true; allowReward = false; escalation = 'warn';
        } else {
            /* unsupported */
            decision = 'block'; allowPresentation = false; allowReward = false; escalation = 'block';
        }

        /* ---- assemble determination mirror (no mutable or new data) ---- */
        var detMirror = null;
        if (det && typeof det === 'object') {
            detMirror = {
                status: det.status || 'unknown',
                reactionId: (det.reaction && det.reaction.id) || null,
                productCount: (det.products && det.products.length) || 0,
                tempChange: (det.derived && typeof det.derived.tempChange === 'number') ? det.derived.tempChange : 0,
                phChange: (det.derived && typeof det.derived.phChange === 'number') ? det.derived.phChange : 0,
                danger: !!(det.derived && det.derived.danger)
            };
        }

        /* ---- assemble result ---- */
        return {
            status: status,
            decision: decision,
            level: finalLevel,
            confidence: confidence,
            reasons: reasons,
            materials: matAnalysis.matStates,
            determination: detMirror,
            gate: {
                allowPresentation: allowPresentation,
                allowReward: allowReward,
                escalation: escalation
            },
            provenance: {
                safetyModelVersion: smv,
                rulesVersion: rv,
                consumed: {
                    sessionHash: sessionHash(session),
                    chemistryDataVersion: dv,
                    engineVersion: ev
                }
            }
        };
    }

    SH.evaluate = evaluate;
    SH.RULES_VERSION = rulesVersion;
    SH.THRESHOLDS = THRESHOLDS;
})();

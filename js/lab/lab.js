/* ==========================================================================
   ChemLabX 4.0 — Lab Controller
   Shared state + helpers, event wiring, keyboard shortcuts, assignment context.
   ========================================================================== */
(function () {
    'use strict';

    var Lab = window.Lab = window.Lab || {};

    /* ========== STATE ========== */
    Lab.state = {
        benchItems: [],
        temperature: 25.0,
        ph: 7.0,
        isReacting: false,
        reactionTimeout: null,
        xp: 0,
        selectedQty: 5,
        selectedUnit: 'ml',
        experimentCount: 0,
        validExperiments: 0,
        dangerousReactions: 0,
        toolsUsed: {},
        unlockedAchievements: {},
        undoHistory: [],
        zoom: 1,
        experimentsDone: [],
        assignment: null,
        assignmentDone: false,
        /* TASK-003: metrics for safe, education-focused achievements only */
        highTempWarning: false,
        cooledAfterWarning: false,
        measurementsTaken: false,
        lastResult: null,
        lastDetermination: null,
        lastSafetyAssessment: null
    };

    /* ========== SHARED HELPERS ========== */
    Lab.t = function (ar, en) { return window.CHL.lang === 'en' ? en : ar; };
    Lab.getTime = function () {
        var d = new Date();
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
    };
    Lab.genId = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
    Lab.matName = function (m) { return (window.CHL.lang === 'en' && m.nameEn) ? m.nameEn : m.name; };

    Lab.toast = function (message, type, icon) {
        if (window.CHLUI && window.CHLUI.toast) window.CHLUI.toast(message, type, icon);
    };

    /* ========== LOG ========== */
    Lab.addLog = function (message, type, reactionData, actionType) {
        var logContainer = document.getElementById('logContainer');
        if (!logContainer) return;
        var entry = document.createElement('div');
        entry.className = 'log-entry' + (reactionData ? ' clickable' : '');
        entry.innerHTML = '<span class="time">' + Lab.getTime() + '</span><span class="' + (type || '') + '">' + message + '</span>';
        if (actionType) entry.dataset.action = actionType;
        if (reactionData) {
            entry.dataset.reaction = JSON.stringify(reactionData);
            entry.addEventListener('click', function () {
                Lab.engine.showReactionDetail(JSON.parse(this.dataset.reaction));
            });
        }
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    };

    /* ========== UI UPDATE ========== */
    Lab.updateUI = function () {
        var state = Lab.state;
        var tempDisplay = document.getElementById('tempDisplay');
        if (tempDisplay) {
            tempDisplay.textContent = state.temperature.toFixed(1) + ' \u00B0C';
            tempDisplay.className = 'value ' + (state.temperature > 60 ? 'red' : state.temperature > 35 ? 'orange' : state.temperature < 10 ? 'blue' : 'green');
        }
        var phDisplay = document.getElementById('phDisplay');
        if (phDisplay) {
            phDisplay.textContent = state.ph.toFixed(1);
            phDisplay.className = 'value ' + (state.ph < 3 || state.ph > 11 ? 'red' : state.ph < 5 || state.ph > 9 ? 'orange' : 'blue');
        }
        var itemCount = document.getElementById('itemCount');
        if (itemCount) itemCount.textContent = state.benchItems.length;
        var reactionStatus = document.getElementById('reactionStatus');
        if (reactionStatus) {
            reactionStatus.textContent = state.isReacting ? Lab.t('\u0641\u0639\u0627\u0644', 'reacting') : Lab.t('\u062E\u0627\u0645\u0644', 'idle');
            reactionStatus.style.color = state.isReacting ? 'var(--accent-orange)' : 'var(--text-secondary)';
        }
        var benchStatus = document.getElementById('benchStatus');
        if (benchStatus) benchStatus.textContent = state.isReacting ? Lab.t('\u0641\u0639\u0627\u0644', 'reacting') : Lab.t('\u062C\u0627\u0647\u0632', 'ready');
        var statusDot = document.getElementById('statusDot');
        if (statusDot) statusDot.className = 'status-dot ' + (state.isReacting ? 'warning' : 'safe');
        var xpDisplay = document.getElementById('xpDisplay');
        if (xpDisplay) xpDisplay.textContent = state.xp + ' XP';
        var levelDisplay = document.getElementById('levelDisplay');
        if (levelDisplay) {
            var lv;
            if (state.xp < 30) lv = Lab.t('\uD83E\uDD49 \u0645\u0628\u062A\u062F\u0626', 'Beginner');
            else if (state.xp < 80) lv = Lab.t('\uD83E\uDD48 \u0645\u0633\u0627\u0639\u062F', 'Assistant');
            else if (state.xp < 150) lv = Lab.t('\uD83E\uDD47 \u0643\u064A\u0645\u064A\u0627\u0626\u064A', 'Chemist');
            else if (state.xp < 250) lv = Lab.t('\uD83C\uDFC6 \u062E\u0628\u064A\u0631', 'Expert');
            else if (state.xp < 400) lv = Lab.t('\uD83D\uDC68\u200D\uD83D\uDD2C \u0623\u0633\u062A\u0627\u0630', 'Professor');
            else lv = Lab.t('\u2728 \u0639\u0628\u0642\u0631\u064A', 'Genius');
            levelDisplay.textContent = lv;
        }
    };

    Lab.addXP = function (amount) {
        Lab.state.xp += amount;
        Lab.updateUI();
        Lab.engine.checkAchievements();
    };

    /* ========== DELEGATED ALIASES ========== */
    Lab.saveSnapshot = function (t) { Lab.bench.saveSnapshot(t); };
    Lab.undoLastAction = function () { Lab.bench.undoLastAction(); };
    Lab.addToBench = function (d) { Lab.bench.addToBench(d); };
    Lab.removeFromBench = function (id) { Lab.bench.removeFromBench(id); };
    Lab.resetBench = function () { Lab.bench.resetBench(); };
    Lab.performMix = function () { Lab.engine.performMix(); };
    Lab.checkAchievements = function () { Lab.engine.checkAchievements(); };
    Lab.saveProgress = function () { Lab.engine.saveProgress(); };

    /* Plain-data snapshot of the session, for the Chemistry determination
       boundary (js/domain/chemistry.js). No DOM references cross this seam. */
    Lab.sessionSnapshot = function () {
        if (window.Laboratory && window.Laboratory.normalizeState) return window.Laboratory.normalizeState(Lab.state);
        return null;
    };

    /* ========== ASSIGNMENT CONTEXT ========== */
    function parseContext() {
        var params = new URLSearchParams(window.location.search);

        var asgId = params.get('asg');
        if (asgId && window.CHLDB && window.CHLDB.assignments) {
            var asg = window.CHLDB.assignments.getById(asgId);
            if (asg) {
                Lab.state.assignment = asg;
                showAssignmentBanner(asg);
                if (asg.type === 'lab' && asg.target) {
                    setTimeout(function () { Lab.engine.loadExperiment(asg.target); }, 600);
                    return 'lab';
                }
                if (asg.type === 'quiz') {
                    Lab.toast(Lab.t('\u0627\u0644\u0648\u0627\u062C\u0628 \u0627\u0644\u062D\u0627\u0644\u064A: \u0627\u062E\u062A\u0628\u0627\u0631 \u2014 \u0627\u0646\u062A\u0642\u0644 \u0625\u0644\u0649 \u0635\u0641\u062D\u0629 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631', 'Current assignment: Quiz — open the Quiz page'), 'info', '\uD83D\uDCDD');
                }
            }
        }

        var exp = params.get('exp');
        if (exp) {
            setTimeout(function () { Lab.engine.loadExperiment(exp); }, 600);
            return 'exp';
        }
        return null;
    }

    function showAssignmentBanner(asg) {
        var banner = document.getElementById('asgBanner');
        if (!banner) return;
        var lang = window.CHL.lang;
        var title = lang === 'en' ? (asg.titleEn || asg.title) : asg.title;
        banner.innerHTML = '\uD83C\uDF93 ' + Lab.t('\u0648\u0627\u062C\u0628 \u0645\u0643\u0644\u0641:', 'Assignment:') + ' ' + title +
            ' <span class="asg-status" id="asgStatus">' + (Lab.state.assignmentDone ? Lab.t('\u2705 \u0645\u0643\u0645\u0644', '\u2705 Completed') : Lab.t('\u23F3 \u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630', '\u23F3 In progress')) + '</span>';
        banner.style.display = 'block';
    }

    Lab.onReactionComplete = function (ids) {
        var asg = Lab.state.assignment;
        if (!asg || asg.type !== 'lab' || Lab.state.assignmentDone) return;
        var target = asg.target;
        if (!target) return;
        var sortedIds = ids.slice().sort().join('+');
        var sortedTarget = target.split('+').slice().sort().join('+');
        if (sortedIds === sortedTarget) {
            Lab.state.assignmentDone = true;
            var status = document.getElementById('asgStatus');
            if (status) status.textContent = Lab.t('\u2705 \u0645\u0643\u0645\u0644', '\u2705 Completed');
            if (window.CHLDB && window.CHLDB.submissions) {
                var existing = window.CHLDB.submissions.list().filter(function (s) { return s.assignmentId === asg.id && s.userId === Lab.profileId(); });
                if (existing.length === 0) {
                    window.CHLDB.submissions.upsert(window.CHLDB.uid(), {
                        id: window.CHLDB.uid(), assignmentId: asg.id, classId: asg.classId,
                        userId: Lab.profileId(), status: 'completed', result: target, submittedAt: Date.now()
                    });
                    Lab.addXP(10);
                    Lab.toast(Lab.t('\u0648\u0627\u062C\u0628 \u0645\u0643\u0645\u0644! +10 XP', 'Assignment completed! +10 XP'), 'success', '\uD83C\uDFC6');
                }
            }
            Lab.saveProgress();
        }
    };

    Lab.profileId = function () {
        var u = window.CHLAuth ? window.CHLAuth.currentUser() : null;
        if (u) return u.id;
        var g = window.CHLAuth ? window.CHLAuth.guest() : null;
        return g ? g.id : 'guest';
    };

    /* ========== EVENT WIRING ========== */
    function wireEvents() {
        var $ = function (id) { return document.getElementById(id); };

        var mixBtn = $('mixBtn'), resetBtn = $('resetBtn'), heatBtn = $('heatBtn'), stirBtn = $('stirBtn'),
            filterBtn = $('filterBtn'), coolBtn = $('coolBtn'), pressureBtn = $('pressureBtn'), undoBtn = $('undoBtn');

        if (mixBtn) mixBtn.addEventListener('click', function () { Lab.engine.performMix(); setTimeout(Lab.checkAchievements, 500); });
        if (resetBtn) resetBtn.addEventListener('click', Lab.resetBench);
        if (heatBtn) heatBtn.addEventListener('click', function () { Lab.engine.performHeat(); });
        if (stirBtn) stirBtn.addEventListener('click', function () { Lab.engine.performStir(); });
        if (filterBtn) filterBtn.addEventListener('click', function () { Lab.engine.performFilter(); });
        if (coolBtn) coolBtn.addEventListener('click', function () { Lab.engine.performCool(); });
        if (pressureBtn) pressureBtn.addEventListener('click', function () { Lab.engine.performPressure(); });
        if (undoBtn) undoBtn.addEventListener('click', Lab.undoLastAction);

        var applyQty = $('applyQty'), qtyInput = $('qtyInput'), qtyUnit = $('qtyUnit');
        if (applyQty) applyQty.addEventListener('click', function () {
            var val = parseFloat(qtyInput.value);
            if (isNaN(val) || val <= 0) { Lab.toast(Lab.t('\u0623\u062F\u062E\u0644 \u0643\u0645\u064A\u0629 \u0635\u062D\u064A\u062D\u0629', 'Enter valid quantity'), 'warning', '\u26A0\uFE0F'); return; }
            Lab.state.selectedQty = val;
            Lab.state.selectedUnit = qtyUnit.value;
            Lab.state.measurementsTaken = true;
            Lab.state.toolsUsed['measure'] = true;
            Lab.toast(Lab.t('\u0627\u0644\u0643\u0645\u064A\u0629: ', 'Quantity: ') + Lab.state.selectedQty + ' ' + Lab.state.selectedUnit, 'success', '\uD83D\uDCCF');
            Lab.checkAchievements();
        });
        if (qtyInput) qtyInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (applyQty) applyQty.click(); } });

        var zoomIn = $('zoomIn'), zoomOut = $('zoomOut'), zoomReset = $('zoomReset');
        if (zoomIn) zoomIn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); Lab.state.zoom = Math.min(2, Lab.state.zoom + 0.1); Lab.bench.applyZoom(); });
        if (zoomOut) zoomOut.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); Lab.state.zoom = Math.max(0.5, Lab.state.zoom - 0.1); Lab.bench.applyZoom(); });
        if (zoomReset) zoomReset.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); Lab.state.zoom = 1; Lab.bench.applyZoom(); });

        var detailClose = $('detailClose'), detailModal = $('detailModal');
        if (detailClose) detailClose.addEventListener('click', function () {
            if (window.CHLUI) window.CHLUI.closeModal('detailModal');
            else detailModal.classList.remove('active');
        });
        if (detailModal) detailModal.addEventListener('click', function (e) {
            if (e.target === this) {
                if (window.CHLUI) window.CHLUI.closeModal('detailModal');
                else this.classList.remove('active');
            }
        });

        var openFullLog = $('openFullLog'), fullLogModal = $('fullLogModal'), fullLogClose = $('fullLogClose');
        if (openFullLog) openFullLog.addEventListener('click', function (e) {
            e.preventDefault();
            Lab.engine.renderFullLog();
            if (window.CHLUI) window.CHLUI.openModal('fullLogModal');
            else fullLogModal.classList.add('active');
        });
        if (fullLogClose) fullLogClose.addEventListener('click', function () {
            if (window.CHLUI) window.CHLUI.closeModal('fullLogModal');
            else fullLogModal.classList.remove('active');
        });
        if (fullLogModal) fullLogModal.addEventListener('click', function (e) {
            if (e.target === this) {
                if (window.CHLUI) window.CHLUI.closeModal('fullLogModal');
                else this.classList.remove('active');
            }
        });

        var productClear = $('productClear');
        if (productClear) productClear.addEventListener('click', function () { var p = $('productPanel'); if (p) p.classList.remove('active'); });

        /* Language re-render (nav lang toggle) */
        document.addEventListener('click', function (e) {
            if (e.target && e.target.id === 'langToggle') {
                setTimeout(function () {
                    Lab.shelf.render();
                    Lab.shelf.initTooltips();
                    Lab.shelf.initSearch();
                    Lab.bench.updateBenchNames();
                    if (Lab.state.assignment) showAssignmentBanner(Lab.state.assignment);
                }, 60);
            }
        });
    }

    /* ========== KEYBOARD ========== */
    function wireKeyboard() {
        document.addEventListener('keydown', function (e) {
            var active = document.activeElement;
            var isInput = active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA');
            if (isInput) return;
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); Lab.engine.performMix(); setTimeout(Lab.checkAchievements, 500); }
            if (e.key === 'r' || e.key === 'R') { e.preventDefault(); Lab.resetBench(); }
            if (e.key === 'Escape') {
                ['fullLogModal', 'detailModal'].forEach(function (m) { var el = document.getElementById(m); if (el) el.classList.remove('active'); });
            }
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); Lab.undoLastAction(); }
            if (e.key === '+' || e.key === '=') { e.preventDefault(); Lab.state.zoom = Math.min(2, Lab.state.zoom + 0.1); Lab.bench.applyZoom(); }
            if (e.key === '-') { e.preventDefault(); Lab.state.zoom = Math.max(0.5, Lab.state.zoom - 0.1); Lab.bench.applyZoom(); }
            if (e.key === '0') { e.preventDefault(); Lab.state.zoom = 1; Lab.bench.applyZoom(); }
        });
    }

    /* ========== INIT ========== */
    function init() {
        window.CHLUI.initNav('lab');

        Lab.engine.loadProgress();

        var profile = window.CHLAuth ? window.CHLAuth.currentUser() : null;
        var name = profile ? profile.name : (window.CHLAuth ? window.CHLAuth.guest().name : '');
        var welcomeMsg = Lab.t('\u0645\u0631\u062D\u0628\u0627\u064B ' + name + '! ChemLabX 4.0 \u062C\u0627\u0647\u0632', 'Welcome ' + name + '! ChemLabX 4.0 ready');
        Lab.addLog(welcomeMsg, 'log-success');
        Lab.addLog(Lab.t('\u0627\u0633\u062D\u0628 2 \u0639\u0646\u0627\u0635\u0631 + Enter', 'Drag 2 materials + Enter'), 'log-warning');
        Lab.toast(Lab.t('\u0645\u0631\u062D\u0628\u0627\u064B ' + name + '!', 'Welcome ' + name + '!'), 'success', '\uD83E\uDDEA');

        Lab.shelf.render();
        Lab.shelf.initTooltips();
        Lab.shelf.initFilters();
        Lab.shelf.initSearch();
        Lab.bench.initDropZone();

        wireEvents();
        wireKeyboard();

        if (Lab.effects) Lab.effects.initField();

        Lab.updateUI();

        /* Context (assignment / experiment) — otherwise auto-load H2O + Na */
        var context = parseContext();
        if (!context) {
            var h2oInfo = materialDB['H2O'] || {};
            var naInfo = materialDB['Na'] || {};
            setTimeout(function () { Lab.addToBench({ material: 'H2O', name: Lab.matName(h2oInfo) || '\u0645\u0627\u0621', formula: 'H\u2082O', color: '#87CEEB' }); }, 500);
            setTimeout(function () { Lab.addToBench({ material: 'Na', name: Lab.matName(naInfo) || '\u0635\u0648\u062F\u064A\u0648\u0645', formula: 'Na', color: '#C0C0C0' }); }, 900);
            setTimeout(function () { Lab.addLog(Lab.t('\u062C\u0631\u0628 \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 + \u0627\u0644\u0645\u0627\u0621! \u0627\u0636\u063A\u0637 Enter', 'Try Sodium + Water! Press Enter'), 'log-purple'); }, 1200);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

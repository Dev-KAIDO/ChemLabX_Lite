/* ==========================================================================
   ChemLabX 4.0 — Lab Engine
   Reaction detection, mixing, tools (heat/cool/stir/filter/pressure),
   products panel (+3D viewer), reaction detail, experiments, achievements.
   ========================================================================== */
(function () {
    'use strict';

    var Lab = window.Lab = window.Lab || {};

    var experiments = {
        'Na+H2O': ['Na', 'H2O'], 'HCl+NaOH': ['HCl', 'NaOH'], 'Zn+HCl': ['Zn', 'HCl'],
        'CuSO4+Zn': ['CuSO4', 'Zn'], 'KMnO4+H2O2': ['KMnO4', 'H2O2'], 'AgNO3+Cu': ['AgNO3', 'Cu'],
        'CaCO3+HCl': ['CaCO3', 'HCl'], 'NH3+HCl': ['NH3', 'HCl'], 'FeCl3+NaOH': ['FeCl3', 'NaOH'],
        'CuSO4+NaOH': ['CuSO4', 'NaOH'], 'CaO+H2O': ['CaO', 'H2O'], 'AgNO3+NaCl': ['AgNO3', 'NaCl'],
        'H2SO4+H2O': ['H2SO4', 'H2O'], 'CH3COOH+NaHCO3': ['CH3COOH', 'NaHCO3'], 'K2Cr2O7+HCl': ['K2Cr2O7', 'HCl']
    };

    function chemistryVersion(key) {
        return (window.CHL && window.CHL.versions && window.CHL.versions[key]) || '';
    }

    function determinationProvenance() {
        return {
            chemistryDataVersion: chemistryVersion('CHEMISTRY_DATA_VERSION') || 'unvalidated-prototype',
            engineVersion: chemistryVersion('ENGINE_VERSION') || 'prototype'
        };
    }

    /* Determination lives in the Chemistry domain (js/domain/chemistry.js).
       This thin wrapper keeps the decision logic in one pure place and the
       dataset decision logic out of the session orchestration. */
    function findReaction(materialIds) {
        if (window.Chemistry && window.Chemistry.lookupReaction) {
            return window.Chemistry.lookupReaction(materialIds);
        }
        if (typeof reactions === 'undefined') return null;
        if (!materialIds || materialIds.length < 2) return null;
        var sorted = materialIds.slice().sort().join(',');
        if (reactions[sorted]) return reactions[sorted];
        var keys = Object.keys(reactions).filter(function (k) { return k !== 'default'; });
        for (var i = 0; i < keys.length; i++) {
            var parts = keys[i].split(',');
            var allPresent = parts.every(function (p) { return materialIds.indexOf(p) !== -1; });
            if (allPresent && parts.length >= 2) return reactions[keys[i]];
        }
        return null;
    }

    function determineMix(ids) {
        var snapshot = (window.Laboratory && window.Laboratory.normalizeState)
            ? window.Laboratory.normalizeState(Lab.state)
            : null;
        var input = snapshot || {
            materials: ids.map(function (m) { return { id: m }; }),
            temperature: Lab.state.temperature,
            ph: Lab.state.ph
        };
        if (window.Chemistry && window.Chemistry.determine) {
            return window.Chemistry.determine(input, chemistryVersion('CHEMISTRY_DATA_VERSION') || 'unvalidated-prototype', chemistryVersion('ENGINE_VERSION') || 'prototype');
        }
        return null;
    }

    /* ---------- MIX ---------- */
    function performMix() {
        if (Lab.state.isReacting) {
            Lab.toast(window.t('\u062A\u0641\u0639\u064A\u0644 \u0642\u064A\u062F \u0627\u0644\u062E\u0637...', 'Reaction in progress...'), 'warning', '\u23F3');
            return;
        }
        if (Lab.state.benchItems.length < 2) {
            Lab.toast(window.t('\u0623\u0636\u0641 2 \u0639\u0646\u0627\u0635\u0631 \u0639\u0644\u0649 \u0627\u0644\u0637\u0627\u0648\u0644\u0629!', 'Add at least 2 materials!'), 'warning', '\u26A0\uFE0F');
            return;
        }
        Lab.saveSnapshot('mix');
        Lab.state.isReacting = true;
        var ids = Lab.state.benchItems.map(function (b) { return b.material; });
        var determination = determineMix(ids);
        if (!determination || determination.status !== 'resolved') {
            /* FAIL-CLOSED (TASK-003/TASK-004/TASK-005): no validated entry exists
               for this mix. Explicit status, no products, no XP, nothing awarded.
               The determination (unknown-result) keeps its provenance stamp. */
            Lab.state.isReacting = false;
            Lab.state.lastResult = { status: 'unknown-result', reason: 'not-in-validated-dataset' };
            Lab.state.lastDetermination = determination || {
                status: 'unknown-result',
                reason: 'not-in-validated-dataset',
                provenance: determinationProvenance()
            };
            Lab.state.lastSafetyAssessment = null;
            Lab.toast(window.t('\u0647\u0630\u0627 \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062B\u0642\u0629 \u062D\u0627\u0644\u064A\u064B\u0627.', 'This reaction is not in the currently validated data set.'), 'warning', '\u2753');
            Lab.addLog(window.t('\u062A\u0641\u0627\u0639\u0644 \u063A\u064A\u0631 \u0645\u0648\u062B\u0642 \u0645\u0646 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A', 'Reaction not validated'), 'log-warning', null, 'unknown');
            Lab.updateUI();
            return;
        }

        /* ---- SAFETY GATE (TASK-005): single choke point before any state
           mutation, presentation, or reward. Safety consumes the normalized
           session + the DeterminationResult; it never re-looks-up reactions. */
        var session = (window.Laboratory && window.Laboratory.normalizeState)
            ? window.Laboratory.normalizeState(Lab.state)
            : null;
        var safety = (window.Safety && window.Safety.evaluate)
            ? window.Safety.evaluate(session, determination, determinationProvenance())
            : null;
        Lab.state.lastDetermination = determination;
        Lab.state.lastSafetyAssessment = safety;

        if (!safety || safety.gate.allowPresentation === false) {
            /* BLOCKED: unknown/unsupported/contradictory/incomplete — no
               outcome, no temperature/pH/XP mutation, no counters, no award. */
            if (Lab.state.isReacting === true) { Lab.state.isReacting = false; }
            Lab.state.lastResult = { status: 'unknown-result', reason: 'not-in-validated-dataset' };
            Lab.toast(window.t('\u0647\u0630\u0627 \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647 \u0633\u064A\u0627\u0633\u064A\u0627\u064B \u062D\u0627\u0644\u064A\u064B\u0627.', 'This interaction is currently not permitted by safety policy.'), 'warning', '\uD83D\uDEE1\uFE0F');
            Lab.addLog(window.t('\u062A\u0641\u0627\u0639\u0644 \u0645\u062D\u0638\u0648\u0631 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0633\u0644\u0627\u0645\u0629', 'Reaction blocked by safety policy'), 'log-danger', null, 'unknown');
            Lab.updateUI();
            return;
        }

        Lab.state.lastResult = { status: 'ok', reaction: ids.slice().sort().join(',') };
        var reaction = determination.reaction.record;
        Lab.state.temperature += reaction.tempChange || 0;
        Lab.state.ph += reaction.phChange || 0;
        Lab.state.ph = Math.min(14, Math.max(0, Lab.state.ph));

        /* Reward follows the Safety gate (TASK-005): dangerous reactions receive
           no XP; safe/caution reactions (gate.allowReward) get normal XP.
           A validated reaction is still counted as a valid experiment even when
           XP is withheld for a warn (dangerous) outcome. */
        var allowReward = !!(safety && safety.gate.allowReward);
        if (allowReward) Lab.addXP(reaction.xp || 5);
        Lab.state.experimentCount++;
        Lab.state.validExperiments++;
        Lab.state.experimentsDone.push(ids.slice().sort().join('+'));

        var effectText = window.CHL.lang === 'en' ? (reaction.effectEn || reaction.effect) : reaction.effect;
        var zone = document.getElementById('dropZone');
        if (reaction.danger) {
            Lab.state.dangerousReactions++;
            Lab.toast(window.t('\u062A\u0641\u0639\u064A\u0644 \u0639\u0646\u064A\u0641!', 'Dangerous reaction!'), 'danger', '\u2620\uFE0F');
            Lab.addLog(effectText, 'log-danger', reaction, 'danger');
            var bench = document.getElementById('workbench');
            if (bench) { bench.classList.add('shake'); setTimeout(function () { bench.classList.remove('shake'); }, 600); }
        } else {
            Lab.toast(effectText || window.t('\u062A\u0641\u0639\u064A\u0644 \u0645\u0643\u062A\u0645\u0644', 'Complete!'), 'success', '\u2705');
        }

        var logMsg = window.CHL.lang === 'en' ? (reaction.logEn || reaction.equation) : (reaction.log || reaction.equation);
        Lab.addLog(logMsg, 'log-success', reaction, 'mix');
        showProducts(reaction.products || [], reaction);

        if (Lab.effects) Lab.effects.reactionBurst(zone, !!reaction.danger);

        Lab.state.reactionTimeout = setTimeout(function () { Lab.state.isReacting = false; Lab.updateUI(); }, 3500);
        Lab.updateUI();
        setTimeout(function () { Lab.checkAchievements(); }, 400);
        if (typeof Lab.onReactionComplete === 'function') Lab.onReactionComplete(ids);
        /* TASK-006: persist a provenance-stamped ResultRecord for this resolved,
           presented outcome. Consumes the existing Determination + Safety
           snapshots; never re-derives them, never awards XP, never mutates
           safety state. Non-blocking: a persistence failure stays observable
           via CHLDB.storageStatus() but never breaks performMix. */
        if (window.Results && window.Results.build && window.Results.persist) {
            try {
                var persisted = window.Results.persist(window.Results.build({
                    session: session,
                    determination: determination,
                    safety: safety
                }));
                /* TASK-010: journal the sync-eligible ResultRecord change at
                   the SAME domain write boundary, only after Results.persist
                   succeeds. The journal entry references the immutable
                   ResultRecord by id; the Change Journal itself carries NO
                   chemistry/safety/results business logic. Defensive: a journal
                   failure (or absent module) never breaks performMix. */
                if (persisted && persisted.id && window.CHL && window.CHL.changeJournal &&
                    window.CHL.changeJournal.record) {
                    var actorId = 'system';
                    try {
                        var cur = (window.CHLAuth && window.CHLAuth.currentUser) ? window.CHLAuth.currentUser() : null;
                        if (cur && cur.id) actorId = cur.id;
                    } catch (err) { actorId = 'system'; }
                    window.CHL.changeJournal.record(
                        'result',
                        persisted.id,
                        'upsert',
                        { id: persisted.id, status: persisted.status },
                        actorId
                    );
                }
            } catch (err) { /* keep the lab responsive; persistence errors are observable */ }
        }
        Lab.saveProgress();
    }

    /* ---------- PRODUCTS PANEL (+3D molecule viewer) ---------- */
    function showProducts(products, reaction) {
        var panel = document.getElementById('productPanel');
        var list = document.getElementById('productList');
        var equation = document.getElementById('productEquation');
        var changes = document.getElementById('productChanges');
        if (panel) panel.classList.add('active');
        if (list) list.innerHTML = '';
        if (equation) equation.textContent = reaction && reaction.equation ? reaction.equation : '';
        if (changes && reaction) {
            var tc = reaction.tempChange || 0;
            var pc = reaction.phChange || 0;
            changes.innerHTML = '<div class="product-change"><div class="product-change-value" style="color:' + (tc > 20 ? 'var(--accent-red)' : 'var(--accent-green)') + '">' + (tc > 0 ? '+' : '') + tc.toFixed(0) + '</div><div class="product-change-label">' + window.t('\u0627\u0644\u062D\u0631\u0627\u0631\u0629', 'Temp') + '</div></div>' +
                '<div class="product-change"><div class="product-change-value" style="color:var(--accent-blue)">' + (pc > 0 ? '+' : '') + pc.toFixed(1) + '</div><div class="product-change-label">pH</div></div>' +
                '<div class="product-change"><div class="product-change-value" style="color:var(--accent-purple)">+' + (reaction.xp || 5) + '</div><div class="product-change-label">XP</div></div>';
        }
        var molWrap = document.getElementById('molecule3dWrap');
        var mol3d = document.getElementById('molecule3d');
        if (molWrap && mol3d && Lab.effects) {
            molWrap.style.display = 'none';
            if (products && products.length > 0) {
                Lab.effects.moleculeViewer(mol3d, products);
                molWrap.style.display = 'block';
            }
        }
        if (products.length === 0) {
            if (list) list.innerHTML = '<div style="color:var(--text-secondary);font-size:12px;text-align:center;padding:10px;">' + window.t('\u0644\u0627 \u0646\u0648\u0627\u062A\u062C \u0645\u062D\u062F\u062F\u0629', 'No products') + '</div>';
        } else {
            products.forEach(function (p) {
                var st = p.state || 'liquid';
                var stateLabel = window.CHL.lang === 'en' ? st.charAt(0).toUpperCase() + st.slice(1) : ({ gas: '\u063A\u0627\u0632', solid: '\u0645\u062A\u0648\u0633\u0637', liquid: '\u0633\u0627\u0626\u0644', aqueous: '\u0645\u062D\u0644\u0648\u0644' }[st] || st);
                var stateClass = st === 'gas' ? 'gas' : st === 'solid' ? 'solid' : st === 'liquid' ? 'liquid' : 'aqueous';
                var pname = window.CHL.lang === 'en' ? (p.nameEn || p.name) : p.name;
                var div = document.createElement('div');
                div.className = 'product-item';
                div.innerHTML = '<span class="dot" style="background:' + (p.color || 'var(--accent-green)') + '"></span><div class="product-item-info"><div class="product-item-name">' + (pname || '') + '</div><div class="product-item-formula">' + (p.formula || '') + '</div></div><span class="product-item-state ' + stateClass + '">' + stateLabel + '</span>';
                if (list) list.appendChild(div);
            });
        }
    }

    /* ---------- REACTION DETAIL MODAL ---------- */
    function showReactionDetail(data) {
        var overlay = document.getElementById('detailModal');
        var title = document.getElementById('detailTitle');
        var body = document.getElementById('detailBody');
        if (!overlay || !body) return;
        var lang = window.CHL.lang;
        title.textContent = lang === 'en' ? (data.effectEn || 'Reaction Details') : (data.effect || '\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062A\u0641\u0639\u064A\u0644');
        var productsHtml = '';
        if (data.products && data.products.length > 0) {
            data.products.forEach(function (p) {
                var pname = lang === 'en' ? (p.nameEn || p.name) : p.name;
                productsHtml += '<div class="detail-product"><span class="detail-product-dot" style="background:' + (p.color || '#888') + ';"></span><div class="detail-product-info"><div class="detail-product-name">' + (pname || 'Product') + '</div><div class="detail-product-formula">' + (p.formula || '') + '</div></div></div>';
            });
        } else {
            productsHtml = '<div style="color:var(--text-secondary);font-size:13px;">' + window.t('\u0644\u0627 \u0646\u0648\u0627\u062A\u062C \u0645\u062D\u062F\u062F\u0629', 'No specific products') + '</div>';
        }
        var tc = data.tempChange || 0;
        var pc = data.phChange || 0;
        body.innerHTML = '<div class="detail-section"><div class="detail-label">' + window.t('\u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0629', 'Equation') + '</div><div class="detail-equation">' + (data.equation || '-') + '</div></div>' +
            '<div class="detail-section"><div class="detail-label">' + window.t('\u0627\u0644\u0646\u0648\u0627\u062A\u062C', 'Products') + '</div>' + productsHtml + '</div>' +
            '<div class="detail-stats"><div class="detail-stat"><div class="detail-stat-value ' + (tc > 20 ? 'danger' : tc > 5 ? 'warning' : 'safe') + '">' + (tc > 0 ? '+' : '') + tc.toFixed(0) + ' \u00B0C</div><div class="detail-stat-label">' + window.t('\u0627\u0644\u062D\u0631\u0627\u0631\u0629', 'Temperature') + '</div></div>' +
            '<div class="detail-stat"><div class="detail-stat-value ' + (Math.abs(pc) > 2 ? 'danger' : 'info') + '">' + (pc > 0 ? '+' : '') + pc.toFixed(1) + '</div><div class="detail-stat-label">pH</div></div>' +
            '<div class="detail-stat"><div class="detail-stat-value safe">+' + (data.xp || 5) + ' XP</div><div class="detail-stat-label">' + window.t('\u0627\u0644\u062E\u0628\u0631\u0629', 'Experience') + '</div></div></div>' +
            (data.log ? '<div class="detail-section"><div class="detail-label">' + window.t('\u0645\u0644\u0627\u062D\u0638\u0627\u062A', 'Notes') + '</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.8;">' + (lang === 'en' ? (data.logEn || data.log) : data.log) + '</p></div>' : '') +
            (data.danger ? '<div class="detail-section"><div class="detail-label" style="color:var(--accent-red);">' + window.t('\u062A\u0646\u0628\u064A\u0647', 'Warning') + '</div><p style="font-size:13px;color:var(--accent-red);">' + window.t('\u0647\u0630\u0627 \u062A\u0641\u0639\u064A\u0644 \u0639\u0646\u064A\u0641!', 'This is a dangerous reaction!') + '</p></div>' : '');
        /* CHLUI supplies dialog semantics, focus trap, Escape and focus
           restore; the raw class toggle stays as a no-JS fallback. */
        if (window.CHLUI) window.CHLUI.openModal('detailModal');
        else overlay.classList.add('active');
    }

    /* ---------- TOOLS ---------- */
    function performHeat() {
        if (Lab.state.isReacting || Lab.state.benchItems.length === 0) return;
        Lab.saveSnapshot('heat');
        Lab.state.temperature += 20;
        Lab.state.toolsUsed['heat'] = true;
        var zone = document.getElementById('dropZone');
        if (Lab.effects) Lab.effects.toolDepthEffect(zone, 'tool-heat', 6, '\uD83D\uDD25');
        Lab.state.benchItems.forEach(function (item, i) {
            setTimeout(function () {
                item.element.style.transform = 'translateY(-8px)';
                setTimeout(function () { item.element.style.transform = ''; }, 400);
            }, i * 100);
        });
        if (Lab.state.temperature > 80) {
            Lab.state.highTempWarning = true;
            Lab.toast(window.t('\u062D\u0631\u0627\u0631\u0629 \u0639\u0627\u0644\u064A\u0629 \u062C\u062F\u064B\u0627!', 'Very high temperature!'), 'danger', '\uD83C\uDF21\uFE0F');
            Lab.addLog(window.t('\u062A\u0646\u0628\u064A\u0647: \u062D\u0631\u0627\u0631\u0629 \u0639\u0627\u0644\u064A\u0629', 'Warning: High temp'), 'log-danger', null, 'heat');
        } else {
            Lab.toast(window.t('\u062A\u0633\u062E\u064A\u0646 +20\u00B0C', 'Heated +20\u00B0C'), 'warning', '\uD83D\uDD25');
            Lab.addLog(window.t('\u062A\u0633\u062E\u064A\u0646', 'Heat') + ' \u2192 ' + Lab.state.temperature.toFixed(1) + '\u00B0C', 'log-warning', null, 'heat');
        }
        Lab.updateUI();
        setTimeout(function () { Lab.checkAchievements(); }, 200);
    }

    function performStir() {
        if (Lab.state.benchItems.length === 0) return;
        Lab.saveSnapshot('stir');
        Lab.state.toolsUsed['stir'] = true;
        Lab.toast(window.t('\u062A\u062D\u0631\u064A\u0643...', 'Stirring...'), 'success', '\uD83C\uDF00');
        Lab.addLog(window.t('\u062A\u062D\u0631\u064A\u0643 \u0627\u0644\u0645\u062D\u0644\u0648\u0644', 'Stirring'), 'log-blue', null, 'stir');
        var zone = document.getElementById('dropZone');
        if (Lab.effects) Lab.effects.toolDepthEffect(zone, 'tool-stir', 5, '\uD83C\uDF00');
        Lab.state.benchItems.forEach(function (item) {
            var count = 0;
            var interval = setInterval(function () {
                item.element.style.transform = 'translate(' + ((Math.random() - 0.5) * 16) + 'px, ' + ((Math.random() - 0.5) * 16) + 'px)';
                count++;
                if (count > 8) { clearInterval(interval); item.element.style.transform = ''; }
            }, 80);
        });
        Lab.updateUI();
        setTimeout(function () { Lab.checkAchievements(); }, 200);
    }

    function performCool() {
        if (Lab.state.benchItems.length === 0) return;
        Lab.saveSnapshot('cool');
        Lab.state.temperature -= 15;
        if (Lab.state.temperature < 0) Lab.state.temperature = 0;
        Lab.state.cooledAfterWarning = true;
        Lab.state.toolsUsed['cool'] = true;
        Lab.toast(window.t('\u062A\u0628\u0631\u064A\u062F -15\u00B0C', 'Cooled -15\u00B0C'), 'success', '\u2744\uFE0F');
        Lab.addLog(window.t('\u062A\u0628\u0631\u064A\u062F', 'Cool') + ' \u2192 ' + Lab.state.temperature.toFixed(1) + '\u00B0C', 'log-blue', null, 'cool');
        var zone = document.getElementById('dropZone');
        if (Lab.effects) Lab.effects.toolDepthEffect(zone, 'tool-cool', 5, '\u2744\uFE0F');
        Lab.state.benchItems.forEach(function (item, i) {
            setTimeout(function () {
                item.element.style.transform = 'scale(0.92)';
                item.element.style.filter = 'brightness(1.2) hue-rotate(30deg)';
                setTimeout(function () { item.element.style.transform = ''; item.element.style.filter = ''; }, 600);
            }, i * 100);
        });
        Lab.updateUI();
        setTimeout(function () { Lab.checkAchievements(); }, 200);
    }

    function performFilter() {
        if (Lab.state.benchItems.length === 0) return;
        Lab.saveSnapshot('filter');
        Lab.state.toolsUsed['filter'] = true;
        Lab.toast(window.t('\u062A\u0631\u0634\u064A\u062D...', 'Filtering...'), 'success', '\uD83E\uDDEB');
        Lab.addLog(window.t('\u062A\u0631\u0634\u064A\u062D', 'Filter'), 'log-purple', null, 'filter');
        var zone = document.getElementById('dropZone');
        if (Lab.effects) Lab.effects.toolDepthEffect(zone, 'tool-filter', 5, '\uD83D\uDCA7');
        var solids = Lab.state.benchItems.filter(function (b) {
            var info = materialDB[b.material];
            return info && (info.type === 'alkali' || info.type === 'alkaline' || info.type === 'transition' || info.type === 'metal');
        });
        solids.forEach(function (s, i) {
            setTimeout(function () {
                s.element.style.transform = 'translateY(20px) scale(0.5)';
                s.element.style.opacity = '0';
                setTimeout(function () { Lab.bench.removeFromBench(s.id); }, 300);
            }, i * 200);
        });
        Lab.updateUI();
        setTimeout(function () { Lab.checkAchievements(); }, 200);
    }

    function performPressure() {
        if (Lab.state.benchItems.length === 0) return;
        Lab.saveSnapshot('pressure');
        Lab.state.temperature += 8;
        Lab.state.toolsUsed['pressure'] = true;
        Lab.toast(window.t('\u0636\u063A\u0637 \u0639\u0627\u0644\u064A', 'High pressure'), 'warning', '\uD83C\uDF2C\uFE0F');
        Lab.addLog(window.t('\u0636\u063A\u0637 \u0639\u0627\u0644\u064A', 'Pressure'), 'log-pink', null, 'pressure');
        var zone = document.getElementById('dropZone');
        if (Lab.effects) Lab.effects.toolDepthEffect(zone, 'tool-pressure', 4, '\uD83D\uDCA8');
        Lab.state.benchItems.forEach(function (item, i) {
            setTimeout(function () {
                item.element.style.transform = 'scale(0.85)';
                item.element.style.boxShadow = '0 0 20px rgba(255,123,160,0.4)';
                setTimeout(function () { item.element.style.transform = ''; item.element.style.boxShadow = ''; }, 500);
            }, i * 100);
        });
        Lab.updateUI();
        setTimeout(function () { Lab.checkAchievements(); }, 200);
    }

    /* ---------- EXPERIMENTS ---------- */
    function loadExperiment(experimentId) {
        var mats = experiments[experimentId];
        if (!mats) return;
        Lab.bench.resetBench();
        setTimeout(function () {
            mats.forEach(function (m, i) {
                var info = materialDB[m];
                if (info) setTimeout(function () { Lab.bench.addToBench({ material: m, name: info.name, formula: info.formula, color: info.color }); }, i * 400);
            });
            Lab.toast(window.t('\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062A\u062C\u0631\u0628\u0629', 'Experiment loaded'), 'purple', '\uD83D\uDCDA');
        }, 300);
    }

    /* ---------- ACHIEVEMENTS ---------- */
    function checkAchievements() {
        if (typeof achievementDB === 'undefined') return;
        var newlyUnlocked = null;
        achievementDB.forEach(function (a) {
            if (Lab.state.unlockedAchievements[a.id]) return;
            var unlock = false;
            if (a.id === 'first_mix' && Lab.state.experimentCount >= 1) unlock = true;
            if (a.id === 'five_mixes' && Lab.state.experimentCount >= 5) unlock = true;
            if (a.id === 'ten_mixes' && Lab.state.experimentCount >= 10) unlock = true;
            if (a.id === 'xp_50' && Lab.state.xp >= 50) unlock = true;
            if (a.id === 'xp_100' && Lab.state.xp >= 100) unlock = true;
            if (a.id === 'xp_200' && Lab.state.xp >= 200) unlock = true;
            if (a.id === 'use_heat' && Lab.state.toolsUsed['heat']) unlock = true;
            if (a.id === 'use_stir' && Lab.state.toolsUsed['stir']) unlock = true;
            if (a.id === 'use_filter' && Lab.state.toolsUsed['filter']) unlock = true;
            if (a.id === 'use_cool' && Lab.state.toolsUsed['cool']) unlock = true;
            if (a.id === 'use_pressure' && Lab.state.toolsUsed['pressure']) unlock = true;
            if (a.id === 'all_tools' && Object.keys(Lab.state.toolsUsed).length >= 5) unlock = true;
            /* TASK-003: safe, education-focused achievements only.
               No achievement may depend on dangerous reactions, critical
               reactions, high temperature, hazardous outcomes, or an
               intentional safety failure. */
            if (a.id === 'valid_experiment' && Lab.state.validExperiments >= 1) unlock = true;
            if (a.id === 'safety_response' && Lab.state.highTempWarning && Lab.state.cooledAfterWarning) unlock = true;
            if (a.id === 'measurements' && Lab.state.measurementsTaken) unlock = true;
            if (unlock) { Lab.state.unlockedAchievements[a.id] = true; newlyUnlocked = a; }
        });
        if (newlyUnlocked) {
            var title = window.CHL.lang === 'en' ? newlyUnlocked.titleEn : newlyUnlocked.title;
            Lab.toast(window.t('\u0625\u0646\u062C\u0627\u0632 \u0645\u0641\u062A\u0648\u062D: ', 'Achievement unlocked: ') + title, 'purple', '\uD83C\uDFC6');
            Lab.addLog(window.t('\u0625\u0646\u062C\u0627\u0632', 'Achievement') + ': ' + title, 'log-purple');
            Lab.saveProgress();
        }
        Lab.updateUI();
    }

    /* ---------- FULL LOG ---------- */
    function renderFullLog() {
        var list = document.getElementById('fullLogList');
        var stats = document.getElementById('fullLogStats');
        if (!list || !stats) return;
        var logContainer = document.getElementById('logContainer');
        var entries = logContainer ? logContainer.querySelectorAll('.log-entry') : [];
        var importantActions = ['add', 'remove', 'mix', 'heat', 'cool', 'stir', 'filter', 'pressure', 'reset', 'danger'];
        var actionIcons = { add: '\u2795', remove: '\u2796', mix: '\uD83E\uDDEA', heat: '\uD83D\uDD25', cool: '\u2744\uFE0F', stir: '\uD83C\uDF00', filter: '\uD83E\uDDEB', pressure: '\uD83C\uDF2C\uFE0F', reset: '\uD83D\uDDD1\uFE0F', danger: '\u2620\uFE0F' };

        stats.innerHTML = '<div class="full-log-stat"><div class="full-log-stat-value" style="color:var(--accent-green)">' + Lab.state.experimentCount + '</div><div class="full-log-stat-label">' + window.t('\u062A\u0641\u0639\u064A\u0644\u0627\u062A', 'Reactions') + '</div></div>' +
            '<div class="full-log-stat"><div class="full-log-stat-value" style="color:var(--accent-purple)">' + Lab.state.xp + '</div><div class="full-log-stat-label">XP</div></div>' +
            '<div class="full-log-stat"><div class="full-log-stat-value" style="color:var(--accent-red)">' + Lab.state.dangerousReactions + '</div><div class="full-log-stat-label">' + window.t('\u0639\u0646\u0627\u064A\u0641', 'Danger') + '</div></div>' +
            '<div class="full-log-stat"><div class="full-log-stat-value" style="color:var(--accent-blue)">' + Lab.state.benchItems.length + '</div><div class="full-log-stat-label">' + window.t('\u0639\u0644\u0649 \u0627\u0644\u0637\u0627\u0648\u0644\u0629', 'On Bench') + '</div></div>';

        list.innerHTML = '';
        var count = 0;
        entries.forEach(function (entry) {
            var action = entry.dataset.action;
            if (!action || importantActions.indexOf(action) === -1) return;
            count++;
            var time = entry.querySelector('.time') ? entry.querySelector('.time').textContent : '--:--';
            var text = entry.querySelector('span:last-child') ? entry.querySelector('span:last-child').textContent : '';
            var reactionData = entry.dataset.reaction ? JSON.parse(entry.dataset.reaction) : null;
            var item = document.createElement('div');
            item.className = 'full-log-item';
            item.innerHTML = '<div class="full-log-icon">' + (actionIcons[action] || '\uD83D\uDCDD') + '</div><div class="full-log-info"><div class="full-log-action">' + text + '</div>' + (reactionData ? '<div class="full-log-detail">' + (reactionData.equation || '') + '</div>' : '') + '</div><span class="full-log-time">' + time + '</span>';
            if (reactionData) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', function () {
                    if (window.CHLUI) window.CHLUI.closeModal('fullLogModal');
                    else {
                        var modal = document.getElementById('fullLogModal');
                        if (modal) modal.classList.remove('active');
                    }
                    setTimeout(function () { showReactionDetail(reactionData); }, 300);
                });
            }
            list.appendChild(item);
        });
        if (count === 0) list.innerHTML = '<div class="full-log-empty">' + window.t('\u0644\u0627 \u0633\u062C\u0644\u0627\u062A \u0645\u0633\u062C\u0644\u0629. \u0627\u0628\u062F\u0623 \u062A\u0641\u0639\u064A\u0644\u0627\u064B!', 'No log entries. Start a reaction!') + '</div>';
    }

    /* ---------- Progress save (bridges to profile / guest) ---------- */
    function saveProgress() {
        if (window.CHLAuth) {
            var u = window.CHLAuth.currentUser();
            if (u) {
                var prog = Object.assign({}, u.progress, {
                    xp: Lab.state.xp,
                    experimentsDone: Lab.state.experimentsDone.slice(0, 50),
                    validExperiments: Lab.state.validExperiments,
                    dangerousReactions: Lab.state.dangerousReactions,
                    achievements: Object.assign({}, u.progress.achievements, Lab.state.unlockedAchievements)
                });
                window.CHLAuth.updateUser(u.id, { progress: prog });
            }
        }
    }

    function loadProgress() {
        if (window.CHLAuth) {
            var u = window.CHLAuth.currentUser();
            if (u && u.progress) {
                Lab.state.xp = u.progress.xp || 0;
                Lab.state.dangerousReactions = u.progress.dangerousReactions || 0;
                Lab.state.validExperiments = u.progress.validExperiments || 0;
                Lab.state.experimentsDone = (u.progress.experimentsDone || []).slice();
                Lab.state.unlockedAchievements = Object.assign({}, u.progress.achievements || {});
            }
        }
    }

    Lab.engine = {
        experiments: experiments,
        findReaction: findReaction,
        performMix: performMix,
        showProducts: showProducts,
        showReactionDetail: showReactionDetail,
        performHeat: performHeat,
        performStir: performStir,
        performCool: performCool,
        performFilter: performFilter,
        performPressure: performPressure,
        loadExperiment: loadExperiment,
        checkAchievements: checkAchievements,
        renderFullLog: renderFullLog,
        saveProgress: saveProgress,
        loadProgress: loadProgress
    };
})();

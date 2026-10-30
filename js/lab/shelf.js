/* ==========================================================================
   ChemLabX 4.0 — Material Shelf (left sidebar)
   Renders materials + tools, category filters, search, tooltips, drag source.
   ========================================================================== */
(function () {
    'use strict';

    var Lab = window.Lab = window.Lab || {};

    var categoryConfig = [
        { type: 'alkali',     icon: '\u26A1', labelAr: '\u0641\u0644\u0632\u0627\u062A \u0642\u0644\u0648\u064A\u0629',        labelEn: 'Alkali Metals' },
        { type: 'alkaline',   icon: '\uD83E\uDEA8', labelAr: '\u0641\u0644\u0632\u0627\u062A \u0642\u0644\u0648\u064A\u0629 \u062A\u0631\u0627\u0628\u064A\u0629', labelEn: 'Alkaline Earth' },
        { type: 'transition', icon: '\u2699\uFE0F', labelAr: '\u0641\u0644\u0632\u0627\u062A \u0627\u0646\u062A\u0642\u0627\u0644\u064A\u0629',   labelEn: 'Transition Metals' },
        { type: 'metal',      icon: '\uD83D\uDD29', labelAr: '\u0641\u0644\u0632\u0627\u062A \u0623\u062E\u0631\u0649',         labelEn: 'Other Metals' },
        { type: 'halogen',    icon: '\uD83E\uDDEA', labelAr: '\u0647\u0627\u0644\u0648\u062C\u064A\u0646\u0627\u062A',          labelEn: 'Halogens' },
        { type: 'noble',      icon: '\u2728', labelAr: '\u063A\u0627\u0632\u0627\u062A \u0646\u0628\u064A\u0644\u0629',        labelEn: 'Noble Gases' },
        { type: 'acid',       icon: '\uD83E\uDDF4', labelAr: '\u0623\u062D\u0645\u0627\u0636',              labelEn: 'Acids' },
        { type: 'base',       icon: '\uD83E\uDDF4', labelAr: '\u0642\u0648\u0627\u0639\u062F',              labelEn: 'Bases' },
        { type: 'salt',       icon: '\uD83E\uDDC2', labelAr: '\u0623\u0645\u0644\u0627\u062D',              labelEn: 'Salts' },
        { type: 'oxide',      icon: '\uD83D\uDD34', labelAr: '\u0623\u0643\u0627\u0633\u064A\u062F',             labelEn: 'Oxides' },
        { type: 'organic',    icon: '\uD83D\uDCA7', labelAr: '\u0633\u0648\u0627\u0626\u0644 \u0648\u0645\u0648\u0627\u062F \u0639\u0636\u0648\u064A\u0629',  labelEn: 'Liquids & Organic' }
    ];
    var toolsData = [
        { id: 'bunsen',  nameAr: '\u0645\u0648\u0642\u062F \u0628\u0646\u0632\u0646',     nameEn: 'Bunsen Burner',     subAr: '\u062A\u0633\u062E\u064A\u0646',     subEn: 'Heating',        color: '#FF4500' },
        { id: 'stirrer', nameAr: '\u0645\u062D\u0631\u0636 \u0645\u063A\u0646\u0627\u0637\u064A\u0633\u064A', nameEn: 'Magnetic Stirrer', subAr: '\u062A\u062D\u0631\u064A\u0643',   subEn: 'Stirring',        color: '#4682B4' },
        { id: 'burette', nameAr: '\u0633\u062D\u0627\u062D\u0629',         nameEn: 'Burette',            subAr: '\u0642\u064A\u0627\u0633 \u062F\u0642\u064A\u0642', subEn: 'Precise Measure', color: '#808080' },
        { id: 'pipette', nameAr: '\u0645\u0627\u0635\u0629',           nameEn: 'Pipette',            subAr: '\u0646\u0642\u0644 \u0633\u0648\u0627\u0626\u0644', subEn: 'Transfer',        color: '#87CEEB' },
        { id: 'funnel',  nameAr: '\u0642\u0627\u0631\u0648\u0631\u0629 \u062A\u0631\u0634\u064A\u062D',  nameEn: 'Funnel',            subAr: '\u062A\u0631\u0634\u064A\u062D',     subEn: 'Filtration',      color: '#B0C4DE' },
        { id: 'balance', nameAr: '\u0645\u0648\u0627\u0632\u0646\u0629',         nameEn: 'Balance',            subAr: '\u0648\u0632\u0646',       subEn: 'Weighing',        color: '#DAA520' }
    ];
    var stateLabels = {
        danger: { ar: '\u062E\u0637\u064A\u0631', en: 'Danger' },
        warning: { ar: '\u062A\u062D\u0630\u064A\u0631', en: 'Warning' },
        safe: { ar: '\u0622\u0645\u0646', en: 'Safe' }
    };
    var typeNames = {
        alkali: { ar: '\u0641\u0644\u0632 \u0642\u0644\u0648\u064A', en: 'Alkali Metal' },
        alkaline: { ar: '\u0641\u0644\u0632 \u0642\u0644\u0648\u064A \u062A\u0631\u0627\u0628\u064A', en: 'Alkaline Earth' },
        transition: { ar: '\u0641\u0644\u0632 \u0627\u0646\u062A\u0642\u0627\u0644\u064A', en: 'Transition Metal' },
        metal: { ar: '\u0641\u0644\u0632', en: 'Metal' },
        halogen: { ar: '\u0647\u0627\u0644\u0648\u062C\u064A\u0646', en: 'Halogen' },
        noble: { ar: '\u063A\u0627\u0632 \u0646\u0628\u064A\u0644', en: 'Noble Gas' },
        acid: { ar: '\u062D\u0645\u0636', en: 'Acid' },
        base: { ar: '\u0642\u0627\u0639\u062F\u0629', en: 'Base' },
        salt: { ar: '\u0645\u0644\u062D', en: 'Salt' },
        oxide: { ar: '\u0623\u0643\u0633\u064A\u062F', en: 'Oxide' },
        organic: { ar: '\u0639\u0636\u0648\u064A', en: 'Organic' }
    };
    var stateConfig = {
        danger: { ar: '\u062E\u0637\u064A\u0631', en: 'Dangerous', icon: '\u26A0\uFE0F', cls: 'danger' },
        warning: { ar: '\u062A\u062D\u0630\u064A\u0631', en: 'Caution', icon: '\u26A0\uFE0F', cls: 'warning' },
        safe: { ar: '\u0622\u0645\u0646', en: 'Safe', icon: '\u2705', cls: 'safe' }
    };

    function matName(m) { return (window.CHL.lang === 'en' && m.nameEn) ? m.nameEn : m.name; }

    function lightColor(color) {
        return ['#FFFFFF', '#FFFACD', '#F5F5DC', '#FFFFF0', '#E8F8FF', '#F0FFFF', '#F0E68C', '#FFB6C1', '#E0F0FF'].indexOf(color) !== -1;
    }

    function render() {
        var lang = window.CHL.lang;
        var container = document.getElementById('materialsContainer');
        var toolsContainer = document.getElementById('toolsContainer');
        if (!container) return;

        var html = '';
        categoryConfig.forEach(function (cat) {
            var mats = Object.keys(materialDB).filter(function (k) { return materialDB[k].type === cat.type; });
            if (mats.length === 0) return;
            html += '<div class="category-label">' + cat.icon + ' ' + (lang === 'en' ? cat.labelEn : cat.labelAr) + '</div>';
            mats.forEach(function (key) {
                var m = materialDB[key];
                var name = matName(m);
                var stateKey = m.state || 'safe';
                var stateLabel = stateLabels[stateKey] ? (lang === 'en' ? stateLabels[stateKey].en : stateLabels[stateKey].ar) : '';
                html += '<div class="material-item" draggable="true" data-material="' + key + '" data-formula="' + m.formula + '" data-name="' + name + '" data-color="' + m.color + '" data-state="' + stateKey + '">';
                html += '<span class="mat-color" style="background:' + m.color + (lightColor(m.color) ? ';border:1px solid #ccc;' : '') + ';"></span>';
                html += '<div class="mat-info"><div class="mat-name">' + name + '</div><div class="mat-formula">' + m.formula + '</div></div>';
                if (stateLabel) html += '<span class="mat-state ' + stateKey + '">' + stateLabel + '</span>';
                html += '</div>';
            });
        });
        container.innerHTML = html;

        if (toolsContainer) {
            var thtml = '<div style="margin-top:14px;border-top:1px solid var(--border-glass);padding-top:14px;">';
            thtml += '<div class="section-title" data-ar="\uD83D\uDD27 \u0627\u0644\u0623\u062F\u0648\u0627\u062A" data-en="\uD83D\uDD27 Tools">' + (lang === 'en' ? '\uD83D\uDD27 Tools' : '\uD83D\uDD27 \u0627\u0644\u0623\u062F\u0648\u0627\u062A') + '</div>';
            toolsData.forEach(function (tool) {
                thtml += '<div class="material-item" draggable="true" data-material="' + tool.id + '" data-name="' + (lang === 'en' ? tool.nameEn : tool.nameAr) + '" data-color="' + tool.color + '">';
                thtml += '<span class="mat-color" style="background:' + tool.color + ';border-radius:8px;"></span>';
                thtml += '<div class="mat-info"><div class="mat-name">' + (lang === 'en' ? tool.nameEn : tool.nameAr) + '</div><div class="mat-formula">' + (lang === 'en' ? tool.subEn : tool.subAr) + '</div></div>';
                thtml += '</div>';
            });
            thtml += '</div>';
            toolsContainer.innerHTML = thtml;
        }

        bindDragSource();
        updateCount();
    }

    function updateCount() {
        var count = document.querySelectorAll('.material-item').length;
        var countEl = document.getElementById('materialCount');
        if (countEl) countEl.textContent = window.t(count + ' \u0645\u0627\u062F\u0629', count + ' Materials');
    }

    function bindDragSource() {
        document.querySelectorAll('.material-item').forEach(function (item) {
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', function (e) {
                e.dataTransfer.setData('text/plain', this.dataset.material);
            });
            item.addEventListener('click', function () {
                Lab.addToBench({ material: this.dataset.material, name: this.dataset.name, formula: this.dataset.formula, color: this.dataset.color });
            });
        });
    }

    /* ---------- Tooltips ---------- */
    var tooltipEl = null;

    function initTooltips() {
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'material-tooltip';
            document.body.appendChild(tooltipEl);
        }
        document.querySelectorAll('.material-item').forEach(function (item) {
            item.addEventListener('mouseenter', function () {
                var info = materialDB[item.dataset.material];
                if (!info) return;
                var lang = window.CHL.lang;
                var name = lang === 'en' ? (info.nameEn || info.name) : info.name;
                var typeKey = info.type || 'metal';
                var stateKey = info.state || 'safe';
                var typeInfo = typeNames[typeKey] || { ar: typeKey, en: typeKey };
                var stateInfo = stateConfig[stateKey] || stateConfig.safe;
                var typeLabel = lang === 'en' ? typeInfo.en : typeInfo.ar;
                var stateLabel = lang === 'en' ? stateInfo.en : stateInfo.ar;
                var borderColor = info.color || '#888';
                tooltipEl.innerHTML =
                    '<div class="tooltip-header">' +
                        '<div class="tooltip-swatch" style="background:' + borderColor + ';box-shadow:0 4px 16px ' + borderColor + '44;"></div>' +
                        '<div class="tooltip-name-block">' +
                            '<div class="tooltip-name">' + name + '</div>' +
                            '<div class="tooltip-formula">' + info.formula + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="tooltip-body">' +
                        '<div class="tooltip-badges">' +
                            '<span class="tooltip-badge type">\uD83E\uDDEA ' + typeLabel + '</span>' +
                            '<span class="tooltip-badge ' + stateInfo.cls + '">' + stateInfo.icon + ' ' + stateLabel + '</span>' +
                        '</div>' +
                        '<div class="tooltip-divider"></div>' +
                        '<div class="tooltip-rows">' +
                            '<div class="tooltip-row"><span class="label">' + window.t('\u0627\u0644\u0644\u0648\u0646', 'Color') + '</span><span class="value" style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:3px;background:' + borderColor + ';display:inline-block;border:1px solid rgba(255,255,255,0.15);"></span>' + borderColor + '</span></div>' +
                            '<div class="tooltip-row"><span class="label">' + window.t('\u0627\u0644\u0635\u064A\u063A\u0629', 'Formula') + '</span><span class="value" style="font-family:var(--font-mono);direction:ltr;">' + info.formula + '</span></div>' +
                        '</div>' +
                    '</div>';
                tooltipEl.classList.add('visible');
                var rect = item.getBoundingClientRect();
                var tooltipW = 260;
                var left = (document.documentElement.dir === 'rtl') ? (rect.right + 12) : (rect.left - tooltipW - 12);
                if (left < 10) left = rect.right + 12;
                if (left + tooltipW > window.innerWidth) left = rect.left - tooltipW - 12;
                tooltipEl.style.left = left + 'px';
                tooltipEl.style.top = Math.max(10, rect.top - 10) + 'px';
            });
            item.addEventListener('mouseleave', function () {
                if (tooltipEl) tooltipEl.classList.remove('visible');
            });
        });
    }

    /* ---------- Category filters ---------- */
    function initFilters() {
        var catBtns = document.querySelectorAll('.cat-btn');
        var catMap = {
            'all': null,
            'metal': ['alkali', 'alkaline', 'transition', 'metal'],
            'acid': ['acid'], 'base': ['base'], 'salt': ['salt'],
            'oxide': ['oxide'], 'organic': ['organic']
        };
        catBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                catBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var types = catMap[btn.dataset.cat];
                document.querySelectorAll('.material-item').forEach(function (item) {
                    if (!types) { item.style.display = ''; return; }
                    var info = materialDB[item.dataset.material];
                    item.style.display = (info && types.indexOf(info.type) !== -1) ? '' : 'none';
                });
            });
        });
    }

    /* ---------- Search ---------- */
    function initSearch() {
        var search = document.getElementById('searchMaterials');
        if (!search) return;
        search.addEventListener('input', function () {
            var query = this.value.toLowerCase().trim();
            document.querySelectorAll('.material-item').forEach(function (item) {
                var name = (item.dataset.name || '').toLowerCase();
                var formula = (item.dataset.formula || '').toLowerCase();
                var material = (item.dataset.material || '').toLowerCase();
                item.style.display = (!query || name.indexOf(query) !== -1 || formula.indexOf(query) !== -1 || material.indexOf(query) !== -1) ? '' : 'none';
            });
        });
    }

    Lab.shelf = {
        render: render,
        updateCount: updateCount,
        initTooltips: initTooltips,
        initFilters: initFilters,
        initSearch: initSearch
    };
})();

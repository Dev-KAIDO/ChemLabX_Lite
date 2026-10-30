/* ==========================================================================
   ChemLabX 4.0 — Profile page (level, XP, achievements, experiments)
   ========================================================================== */
(function () {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function levelOf(xp) {
        if (xp < 30) return { ar: '\uD83E\uDD49 \u0645\u0628\u062A\u062F\u0626', en: '\uD83E\uDD49 Beginner' };
        if (xp < 80) return { ar: '\uD83E\uDD48 \u0645\u0633\u0627\u0639\u062F', en: '\uD83E\uDD48 Assistant' };
        if (xp < 150) return { ar: '\uD83E\uDD47 \u0643\u064A\u0645\u064A\u0627\u0626\u064A', en: '\uD83E\uDD47 Chemist' };
        if (xp < 250) return { ar: '\uD83C\uDFC6 \u062E\u0628\u064A\u0631', en: '\uD83C\uDFC6 Expert' };
        if (xp < 400) return { ar: '\uD83D\uDC68\u200D\uD83D\uDD2C \u0623\u0633\u062A\u0627\u0630', en: '\uD83D\uDC68\u200D\uD83D\uDD2C Professor' };
        return { ar: '\u2728 \u0639\u0628\u0642\u0631\u064A', en: '\u2728 Genius' };
    }
    function nextLevel(xp) {
        var thresholds = [30, 80, 150, 250, 400];
        for (var i = 0; i < thresholds.length; i++) if (xp < thresholds[i]) return thresholds[i];
        return 400;
    }

    var expTitles = {
        'Na+H2O': { ar: '\u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 + \u0645\u0627\u0621', en: 'Sodium + Water' },
        'HCl+NaOH': { ar: '\u062D\u0645\u0636 + \u0642\u0627\u0639\u062F\u0629', en: 'Acid + Base' },
        'Zn+HCl': { ar: '\u0632\u0646\u0643 + \u062D\u0645\u0636', en: 'Zinc + Acid' },
        'CuSO4+Zn': { ar: '\u0646\u062D\u0627\u0633 + \u0632\u0646\u0643', en: 'Copper + Zinc' },
        'KMnO4+H2O2': { ar: '\u0628\u0631\u0645\u0646\u063A\u0646\u0627\u062A + \u0628\u064A\u0631\u0648\u0643\u0633\u064A\u062F', en: 'Permanganate + Peroxide' },
        'AgNO3+Cu': { ar: '\u0641\u0636\u0629 + \u0646\u062D\u0627\u0633', en: 'Silver + Copper' },
        'CaCO3+HCl': { ar: '\u0643\u0631\u0628\u0648\u0646\u0627\u062A + \u062D\u0645\u0636', en: 'Carbonate + Acid' },
        'NH3+HCl': { ar: '\u0623\u0645\u0648\u0646\u064A\u0627 + \u062D\u0645\u0636', en: 'Ammonia + Acid' },
        'FeCl3+NaOH': { ar: '\u062D\u062F\u064A\u062F + \u0642\u0627\u0639\u062F\u0629', en: 'Iron + Base' },
        'CuSO4+NaOH': { ar: '\u0646\u062D\u0627\u0633 + \u0642\u0627\u0639\u062F\u0629', en: 'Copper + Base' },
        'CaO+H2O': { ar: '\u062C\u064A\u0631 + \u0645\u0627\u0621', en: 'Lime + Water' },
        'AgNO3+NaCl': { ar: '\u0641\u0636\u0629 + \u0645\u0644\u062D', en: 'Silver + Salt' },
        'H2SO4+H2O': { ar: '\u0643\u0628\u0631\u064A\u062A\u064A\u0643 + \u0645\u0627\u0621', en: 'Sulfuric + Water' },
        'CH3COOH+NaHCO3': { ar: '\u062E\u0644 + \u0635\u0648\u062F\u0627', en: 'Vinegar + Soda' },
        'K2Cr2O7+HCl': { ar: '\u062F\u064A\u0643\u0631\u0648\u0645\u064A\u062A + \u062D\u0645\u0636', en: 'Dichromate + Acid' }
    };

    function render(root) {
        window.CHLUI.initNav('profile');
        var user = window.CHLAuth ? window.CHLAuth.currentUser() : null;
        if (!user) { root.innerHTML = '<div class="empty-state"><p>' + window.t('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0644\u0641.', 'Please log in to view your profile.') + '</p></div>'; return; }

        var prog = user.progress || {};
        var xp = prog.xp || 0;
        var level = levelOf(xp);
        var next = nextLevel(xp);
        var pct = Math.min(100, Math.round((xp / 400) * 100));
        var lang = window.CHL.lang;
        var name = lang === 'en' && user.nameEn ? user.nameEn : user.name;
        var rl = window.CHLAuth.roleLabel(user.role);
        var achTotal = typeof window.achievementDB !== 'undefined' ? window.achievementDB.length : 15;
        var unlocked = prog.achievements || {};
        var achCount = Object.keys(unlocked).length;
        var experiments = prog.experimentsDone || [];
        var lessonCount = (prog.lessonsDone || []).length;

        var html = '<div class="profile-hero">';
        html += '<div class="profile-avatar">\uD83D\uDC68\u200D\uD83D\uDD2C</div>';
        html += '<div><h1 class="profile-name">' + esc(name) + '</h1>';
        html += '<div class="profile-meta"><span class="tag tag-purple">' + (lang === 'en' ? rl.en : rl.ar) + '</span>' +
            '<span>' + (lang === 'en' ? level.en : level.ar) + '</span></div></div>';
        html += '</div>';

        html += '<div class="profile-grid">';
        html += '<div class="stat-tile"><div class="stat-tile-icon purple">\u2B50</div><div><div class="stat-tile-value">' + xp + ' XP</div><div class="stat-tile-label">' + window.t('\u0646\u0642\u0627\u0637 \u0627\u0644\u062E\u0628\u0631\u0629', 'XP') + '</div></div></div>';
        html += '<div class="stat-tile"><div class="stat-tile-icon green">\uD83C\uDFC6</div><div><div class="stat-tile-value">' + achCount + '/' + achTotal + '</div><div class="stat-tile-label">' + window.t('\u0627\u0644\u0625\u0646\u062C\u0627\u0632\u0627\u062A', 'Achievements') + '</div></div></div>';
        html += '<div class="stat-tile"><div class="stat-tile-icon blue">\uD83D\uDCDD</div><div><div class="stat-tile-value">' + (prog.quizBest || 0) + '/10</div><div class="stat-tile-label">' + window.t('\u0623\u0641\u0636\u0644 \u0627\u062E\u062A\u0628\u0627\u0631', 'Best quiz') + '</div></div></div>';
        html += '<div class="stat-tile"><div class="stat-tile-icon orange">\u2697\uFE0F</div><div><div class="stat-tile-value">' + experiments.length + '</div><div class="stat-tile-label">' + window.t('\u062A\u062C\u0627\u0631\u0628', 'Experiments') + '</div></div></div>';
        html += '<div class="stat-tile"><div class="stat-tile-icon red">\uD83D\uDCD6</div><div><div class="stat-tile-value">' + lessonCount + '/6</div><div class="stat-tile-label">' + window.t('\u062F\u0631\u0648\u0633', 'Lessons') + '</div></div></div>';
        html += '</div>';

        html += '<div class="dash-section" style="margin-top:26px;"><div class="dash-section-head"><div class="dash-section-title">' + window.t('\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u0628\u0631\u0629', 'XP Progress') + '</div></div>' +
            '<div class="card level-meter"><div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;"><span>' + (lang === 'en' ? level.en : level.ar) + '</span><span>' + xp + ' / ' + next + ' XP</span></div>' +
            '<div class="progress-bar"><span style="width:' + pct + '%;"></span></div>' +
            '<div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">' + window.t('\u0631\u0627\u062A\u0628 \u0645\u0645\u062A\u0627\u0632 \u0645\u0646: 30 \u2192 80 \u2192 150 \u2192 250 \u2192 400 XP', 'Ranks at: 30 \u2192 80 \u2192 150 \u2192 250 \u2192 400 XP') + '</div></div></div>';

        html += '<div class="dash-section" style="margin-top:26px;"><div class="dash-section-head"><div class="dash-section-title">\uD83C\uDFC6 ' + window.t('\u0627\u0644\u0625\u0646\u062C\u0627\u0632\u0627\u062A', 'Achievements') + '</div></div>' +
            '<div class="ach-grid">';
        (typeof window.achievementDB !== 'undefined' ? window.achievementDB : []).forEach(function (a) {
            var isUnlocked = !!unlocked[a.id];
            var title = lang === 'en' ? (a.titleEn || a.title) : a.title;
            var desc = lang === 'en' ? (a.descEn || a.desc) : a.desc;
            html += '<div class="achievement-card' + (isUnlocked ? '' : ' locked') + '">' +
                '<span class="achievement-icon">' + a.icon + '</span>' +
                '<div><div class="achievement-title">' + esc(title) + '</div><div class="achievement-desc">' + esc(desc) + '</div></div>' +
                (isUnlocked ? '<span style="margin-inline-start:auto;color:var(--accent-green);">\u2705</span>' : '') +
                '</div>';
        });
        html += '</div></div>';

        if (experiments.length > 0) {
            html += '<div class="dash-section" style="margin-top:26px;"><div class="dash-section-head"><div class="dash-section-title">\u2697\uFE0F ' + window.t('\u0627\u0644\u062A\u062C\u0627\u0631\u0628 \u0627\u0644\u0645\u0646\u0641\u0630\u0629', 'Experiments done') + '</div></div><div class="assignment-list">';
            experiments.forEach(function (key) {
                var e = expTitles[key];
                var label = e ? (lang === 'en' ? e.en : e.ar) : key;
                html += '<div class="assignment-card done"><div class="assignment-icon">\u2697\uFE0F</div>' +
                    '<div class="assignment-main"><div class="assignment-title">' + esc(label) + '</div><div class="assignment-meta"><span class="tag tag-green">' + window.t('\u2705 \u0645\u0643\u0645\u0644\u0629', '\u2705 Done') + '</span></div></div></div>';
            });
            html += '</div></div>';
        }

        html += '<div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap;">' +
            '<a href="lab.html" class="btn btn-primary">\uD83E\uDDEA ' + window.t('\u0627\u0644\u0645\u0639\u0645\u0644', 'Lab') + '</a>' +
            '<a href="lessons.html" class="btn btn-purple">\uD83D\uDCD6 ' + window.t('\u0627\u0644\u062F\u0631\u0648\u0633', 'Lessons') + '</a>' +
            '<a href="quiz.html" class="btn">\uD83D\uDCDD ' + window.t('\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631', 'Quiz') + '</a>' +
            '</div>';

        root.innerHTML = html;
    }

    function init() {
        var root = document.getElementById('profileRoot');
        if (!root) return;
        render(root);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

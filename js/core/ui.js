/* ==========================================================================
   ChemLabX 4.0 — Shared UI (toast, modal, theme, navbar)
   ========================================================================== */
(function () {
    'use strict';

    var THEME_KEY = 'chemlabx_theme';
    var themeColors = { default: '#00E6B3', ocean: '#3B82F6', emerald: '#10B981', royal: '#C084FC', sunset: '#FB923C', light: '#059669' };
    var themeNames = {
        default: { ar: '\u0645\u062E\u0641\u064A \u0639\u0635\u0631\u064A', en: 'Dark Lab' },
        ocean: { ar: '\u0645\u062D\u064A\u0637\u064A \u0623\u0632\u0631\u0642', en: 'Ocean Blue' },
        emerald: { ar: '\u0632\u0645\u0631\u062F\u064A \u0623\u062E\u0636\u0631', en: 'Emerald' },
        royal: { ar: '\u0645\u0644\u0643\u064A \u0628\u0646\u0641\u0633\u062C\u064A', en: 'Royal Purple' },
        sunset: { ar: '\u063A\u0631\u0648\u0628 \u0628\u0631\u062A\u0642\u0627\u0644\u064A', en: 'Sunset' },
        light: { ar: '\u0641\u0627\u062A\u062D \u0623\u0646\u064A\u0642', en: 'Light Elegant' }
    };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function currentTheme() {
        return localStorage.getItem(THEME_KEY) || 'default';
    }

    function syncThemeUi() {
        var theme = currentTheme();
        var dot = document.getElementById('themeDot');
        if (dot) dot.style.background = themeColors[theme] || themeColors.default;
        var nameEl = document.getElementById('themeName');
        if (nameEl) nameEl.textContent = window.t(themeNames[theme].ar, themeNames[theme].en);
        var options = document.querySelectorAll('.theme-option');
        for (var i = 0; i < options.length; i++) {
            options[i].setAttribute('aria-pressed', options[i].getAttribute('data-theme') === theme ? 'true' : 'false');
        }
    }

    function applyTheme(theme, silent) {
        if (!theme || !themeNames[theme]) theme = 'default';
        if (theme === 'default') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', theme);
        if (!silent) localStorage.setItem(THEME_KEY, theme);
        syncThemeUi();
    }

    /* ---------- Toast ---------- */
    function toast(message, type, icon) {
        var container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');

        var el = document.createElement('div');
        el.className = 'toast ' + (type || 'success');
        if (type === 'danger' || type === 'error') el.setAttribute('role', 'alert');

        var iconEl = document.createElement('span');
        iconEl.className = 'icon';
        iconEl.textContent = icon || '';
        var msgEl = document.createElement('span');
        msgEl.className = 'msg';
        /* textContent, never innerHTML: user names and class codes end up here. */
        msgEl.textContent = String(message == null ? '' : message);

        el.appendChild(iconEl);
        el.appendChild(msgEl);
        container.appendChild(el);
        setTimeout(function () { el.classList.add('show'); }, 10);
        setTimeout(function () {
            el.classList.remove('show');
            setTimeout(function () { el.remove(); }, 300);
        }, 3200);
    }

    /* ---------- Modal (dialog semantics, focus trap, Escape) ---------- */
    var focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var modalStack = [];
    var lastFocused = null;
    var scrollLocks = 0;

    function topModal() {
        return modalStack.length ? document.getElementById(modalStack[modalStack.length - 1]) : null;
    }

    function dialogBox(overlay) {
        return overlay ? overlay.querySelector('.modal, .detail-card') : null;
    }

    function focusableIn(root) {
        return Array.prototype.filter.call(root.querySelectorAll(focusableSelector), function (el) {
            return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
        });
    }

    function lockScroll() {
        scrollLocks++;
        document.body.style.overflow = 'hidden';
    }
    function unlockScroll() {
        scrollLocks = Math.max(0, scrollLocks - 1);
        if (scrollLocks === 0) document.body.style.overflow = '';
    }

    function openModal(id) {
        var overlay = document.getElementById(id);
        if (!overlay) return;
        var box = dialogBox(overlay);
        if (!box) return;

        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        if (!box.id) box.id = id + 'Dialog';
        var heading = box.querySelector('h1, h2, h3');
        if (heading) {
            if (!heading.id) heading.id = id + 'Title';
            box.setAttribute('aria-labelledby', heading.id);
        } else {
            box.setAttribute('aria-label', window.t('\u0646\u0627\u0641\u0630\u0629', 'Dialog'));
        }

        if (modalStack.indexOf(id) === -1) modalStack.push(id);
        if (modalStack.length === 1) {
            lastFocused = document.activeElement;
            lockScroll();
        }

        var targets = focusableIn(box);
        if (targets.length) targets[0].focus();
        else {
            box.setAttribute('tabindex', '-1');
            box.focus();
        }
    }

    function closeModal(id) {
        var overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        var idx = modalStack.indexOf(id);
        if (idx !== -1) modalStack.splice(idx, 1);
        if (modalStack.length === 0) {
            unlockScroll();
            if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
            lastFocused = null;
        } else {
            var next = topModal();
            var nextBox = dialogBox(next);
            var targets = nextBox ? focusableIn(nextBox) : [];
            if (targets.length) targets[0].focus();
        }
    }

    document.addEventListener('keydown', function (e) {
        var overlay = topModal();
        if (!overlay) return;
        var box = dialogBox(overlay);
        if (!box) return;

        if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            closeModal(overlay.id);
            return;
        }
        if (e.key !== 'Tab') return;

        var targets = focusableIn(box);
        if (!targets.length) { e.preventDefault(); return; }
        var first = targets[0];
        var last = targets[targets.length - 1];
        if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });

    /* ---------- Shared navbar ---------- */
    var navItems = [
        { href: 'dashboard.html', key: 'dashboard', icon: '\uD83D\uDCC8', ar: '\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645', en: 'Dashboard' },
        { href: 'lab.html', key: 'lab', icon: '\uD83E\uDDEA', ar: '\u0627\u0644\u0645\u0639\u0645\u0644', en: 'Lab' },
        { href: 'experiments.html', key: 'experiments', icon: '\uD83D\uDCDA', ar: '\u0627\u0644\u062A\u062C\u0627\u0631\u0628', en: 'Experiments' },
        { href: 'lessons.html', key: 'lessons', icon: '\uD83D\uDCD6', ar: '\u0627\u0644\u062F\u0631\u0648\u0633', en: 'Lessons' },
        { href: 'quiz.html', key: 'quiz', icon: '\uD83D\uDCDD', ar: '\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631', en: 'Quiz' },
        { href: 'admin.html', key: 'admin', icon: '\uD83D\uDD27', ar: '\u0627\u0644\u0625\u062F\u0627\u0631\u0629', en: 'Admin', role: 'admin' },
        { href: 'profile.html', key: 'profile', icon: '\uD83D\uDC68\u200D\uD83D\uDD2C', ar: '\u0627\u0644\u0645\u0644\u0641', en: 'Profile' }
    ];

    /* Give the page a keyboard bypass and a focusable main landmark.
       Runs before the navbar markup is injected so tab order starts here. */
    function ensureSkipLink() {
        var main = document.querySelector('main');
        if (!main) return;
        if (!main.id) main.id = 'mainContent';
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
        var skip = document.querySelector('.skip-link');
        if (!skip) {
            skip = document.createElement('a');
            skip.className = 'skip-link';
            skip.href = '#' + main.id;
            document.body.insertBefore(skip, document.body.firstChild);
        }
        /* Keep the label in sync when the language toggle re-runs initNav. */
        skip.textContent = window.t('\u062A\u062E\u0637\u064A \u0625\u0644\u0649 \u0627\u0644\u0645\u062D\u062A\u0648\u0649', 'Skip to content');
    }

    function initNav(active, opts) {
        var target = document.getElementById('site-nav');
        if (!target) return;
        opts = opts || {};
        ensureSkipLink();

        var user = window.CHLAuth ? window.CHLAuth.currentUser() : null;
        /* Fail-closed role normalization (TASK-009): an unknown/arbitrary role
           collapses to 'user' so it can never surface admin/nav privileges. */
        var role = 'user';
        if (user && typeof user.role === 'string') {
            var A = window.CHL && window.CHL.authorization;
            role = A && typeof A.normalizeRole === 'function' ? A.normalizeRole(user.role) : (user.role || 'user');
        }
        var en = window.CHL.lang === 'en';

        var html = '<nav class="navbar" aria-label="' + (en ? 'Main navigation' : '\u0627\u0644\u062A\u0646\u0642\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A') + '">';
        html += '<a class="logo" href="dashboard.html"><span class="icon" aria-hidden="true">\uD83E\uDDEA</span> ChemLabX<span class="version">4.0</span></a>';
        html += '<div class="nav-links">';
        navItems.forEach(function (it) {
            if (it.role && it.role !== role) return;
            var label = en ? it.en : it.ar;
            var isActive = it.key === active;
            html += '<a href="' + it.href + '" class="' + (isActive ? 'active' : '') + '" aria-label="' + esc(label) + '"' +
                (isActive ? ' aria-current="page"' : '') + '>' +
                '<span class="nav-icon" aria-hidden="true">' + it.icon + '</span>' +
                '<span class="nav-label">' + esc(label) + '</span></a>';
        });
        html += '<button type="button" class="btn-lang" id="langToggle">' + (en ? '\u0639\u0631\u0628\u064A' : 'EN') + '</button>';
        html += '<div class="theme-wrap">';
        html += '<button type="button" class="btn-theme" id="themeToggle" aria-haspopup="true" aria-expanded="false" aria-label="' +
            (en ? 'Change theme' : '\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u062B\u064A\u0645') + '">' +
            '<span class="theme-dot" id="themeDot" aria-hidden="true"></span>' +
            '<span id="themeName">' + esc(window.t(themeNames[currentTheme()].ar, themeNames[currentTheme()].en)) + '</span>' +
            '<span aria-hidden="true">\u25BE</span></button>';
        html += '<div class="theme-dropdown" id="themeDropdown" role="group" aria-label="' +
            (en ? 'Theme' : '\u0627\u0644\u062B\u064A\u0645') + '">';
        ['default', 'ocean', 'emerald', 'royal', 'sunset', 'light'].forEach(function (th) {
            var c1 = themeColors[th];
            html += '<button type="button" class="theme-option" data-theme="' + th + '" aria-pressed="' +
                (th === currentTheme() ? 'true' : 'false') + '">' +
                '<span class="theme-dots" aria-hidden="true"><span style="background:' + c1 + ';"></span>' +
                '<span style="background:' + c1 + ';"></span><span style="background:' + c1 + ';"></span></span>' +
                '<span>' + esc(window.t(themeNames[th].ar, themeNames[th].en)) + '</span></button>';
        });
        html += '</div></div>';
        var uname = user ? (en && user.nameEn ? user.nameEn : user.name) : '';
        var rlabel = user && window.CHLAuth ? (en ? window.CHLAuth.roleLabel(role).en : window.CHLAuth.roleLabel(role).ar) : '';
        html += '<button type="button" class="btn-profile" id="btnProfile">' +
            '<span aria-hidden="true">\uD83D\uDC68\u200D\uD83D\uDD2C</span> ' + esc(uname) +
            (rlabel ? ' <span class="role-chip">' + esc(rlabel) + '</span>' : '') + '</button>';
        html += '<button type="button" class="btn-logout" id="btnLogout" aria-label="' +
            (en ? 'Log out' : '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C') +
            '"><span aria-hidden="true">\u26D4</span></button>';
        html += '</div></nav>';
        target.innerHTML = html;

        var lt = document.getElementById('langToggle');
        if (lt) lt.addEventListener('click', function () {
            window.CHL.setLang(window.CHL.lang === 'ar' ? 'en' : 'ar');
            initNav(active, opts);
        });
        var prof = document.getElementById('btnProfile');
        if (prof && user) prof.addEventListener('click', function () { window.location.href = 'profile.html'; });
        var lo = document.getElementById('btnLogout');
        if (lo) lo.addEventListener('click', function () { window.CHLAuth.logout(); });

        var dd = document.getElementById('themeDropdown');
        var toggle = document.getElementById('themeToggle');
        if (toggle && dd) {
            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                var open = dd.classList.toggle('show');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            document.addEventListener('click', function () {
                dd.classList.remove('show');
                toggle.setAttribute('aria-expanded', 'false');
            });
            dd.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' || e.key === 'Esc') {
                    dd.classList.remove('show');
                    toggle.setAttribute('aria-expanded', 'false');
                    toggle.focus();
                }
            });
            dd.querySelectorAll('.theme-option').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    applyTheme(this.getAttribute('data-theme'), false);
                    dd.classList.remove('show');
                    toggle.setAttribute('aria-expanded', 'false');
                    toast(window.t('\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u062B\u064A\u0645', 'Theme changed'), 'success', '\uD83C\uDFA8');
                });
            });
        }
        applyTheme(currentTheme(), true);
    }

    /* On DOM ready: seed theme from storage, apply i18n */
    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(currentTheme(), true);
        window.applyI18n && window.applyI18n();
    });

    /* Register service worker for offline / PWA support */
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('./sw.js').catch(function () {});
        });
    }

    window.CHLUI = {
        themeColors: themeColors,
        applyTheme: applyTheme,
        toast: toast,
        openModal: openModal,
        closeModal: closeModal,
        initNav: initNav,
        esc: esc
    };
})();

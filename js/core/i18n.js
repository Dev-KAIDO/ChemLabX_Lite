/* ==========================================================================
   ChemLabX 4.0 — i18n (AR/EN)
   ========================================================================== */
(function () {
    'use strict';

    window.CHL = window.CHL || {};
    window.CHL.lang = localStorage.getItem('chemlabx_lang') || 'ar';

    window.t = function (ar, en) { return window.CHL.lang === 'en' ? en : ar; };

    /* Replace the text of a leaf element only. Elements that wrap markup
       (icons, <br>, nested <span data-ar>) keep their structure and are
       translated through their own data-ar attributes instead of being
       flattened by textContent. */
    function setLeafText(el, value) {
        for (var i = 0; i < el.childNodes.length; i++) {
            if (el.childNodes[i].nodeType === 1) return false;
        }
        el.textContent = value;
        return true;
    }

    window.applyI18n = function () {
        var lang = window.CHL.lang;
        document.querySelectorAll('[data-ar]').forEach(function (el) {
            var v = el.getAttribute('data-' + lang);
            if (v !== null && v !== undefined) setLeafText(el, v);
        });
        document.querySelectorAll('[data-ar-placeholder]').forEach(function (el) {
            var v = el.getAttribute('data-' + lang + '-placeholder');
            if (v !== null && v !== undefined) el.placeholder = v;
        });
        document.querySelectorAll('[data-ar-aria-label]').forEach(function (el) {
            var v = el.getAttribute('data-' + lang + '-aria-label');
            if (v !== null && v !== undefined) el.setAttribute('aria-label', v);
        });
        var lt = document.getElementById('langToggle');
        if (lt) {
            lt.textContent = lang === 'ar' ? 'EN' : '\u0639\u0631\u0628\u064A';
            lt.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : '\u0627\u0644\u062A\u0628\u062F\u064A\u0644 \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0628\u064A\u0629');
        }
    };

    window.CHL.setLang = function (lang) {
        window.CHL.lang = lang === 'en' ? 'en' : 'ar';
        localStorage.setItem('chemlabx_lang', window.CHL.lang);
        document.documentElement.lang = window.CHL.lang;
        document.documentElement.dir = window.CHL.lang === 'ar' ? 'rtl' : 'ltr';
        window.applyI18n();
        /* Pages that render their own localized markup (quiz) re-render on this. */
        document.dispatchEvent(new CustomEvent('chl:langchange', { detail: { lang: window.CHL.lang } }));
    };

    document.documentElement.lang = window.CHL.lang;
    document.documentElement.dir = window.CHL.lang === 'ar' ? 'rtl' : 'ltr';
})();

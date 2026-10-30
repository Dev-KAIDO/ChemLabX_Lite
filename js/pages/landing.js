/* ==========================================================================
   ChemLabX 4.0 — Landing page logic
   ========================================================================== */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        window.applyI18n && window.applyI18n();

        var lt = document.getElementById('langToggle');
        if (lt) lt.addEventListener('click', function () {
            window.CHL.setLang(window.CHL.lang === 'ar' ? 'en' : 'ar');
            window.applyI18n();
        });

        /* Ambient 3D molecule field */
        var canvas = document.getElementById('landingCanvas');
        if (canvas && typeof window.CHLFX !== 'undefined' && !window.CHLFX.reduceMotion()) {
            new window.CHLFX.Field(canvas);
        }

        /* Guest redirection convenience: if already logged in, dashboard */
        if (window.CHLAuth && window.CHLAuth.isLoggedIn()) {
            var guestLinks = document.querySelectorAll('a[href="lab.html"]');
            guestLinks.forEach(function (a) {
                if (a.classList.contains('btn-ghost')) a.href = 'dashboard.html';
            });
        }

        /* Service worker (offline) */
        if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
            navigator.serviceWorker.register('sw.js').catch(function () {});
        }
    });
})();

/* ==========================================================================
   ChemLabX 4.0 — Auth pages (login / register)
   ========================================================================== */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        window.applyI18n && window.applyI18n();

        var canvas = document.getElementById('authCanvas');
        if (canvas && typeof window.CHLFX !== 'undefined' && !window.CHLFX.reduceMotion()) {
            new window.CHLFX.Field(canvas, ['0,230,179', '92,158,255', '168,123,255', '92,214,255']);
        }

        var errorBox = document.getElementById('authError');
        function fail(msg) {
            if (!errorBox) { window.CHLUI.toast(msg, 'danger', '⚠️'); return; }
            /* Re-announce the same message when it repeats (role=alert only
               fires on a DOM change). */
            errorBox.textContent = '';
            setTimeout(function () {
                errorBox.textContent = msg;
                errorBox.classList.add('show');
            }, 30);
            clearTimeout(errorBox._hideTimer);
            errorBox._hideTimer = setTimeout(function () { errorBox.classList.remove('show'); }, 3500);
        }
        function clearError() { if (errorBox) errorBox.classList.remove('show'); }

        /* Language toggle exists on the auth screens (no navbar there). */
        var langBtn = document.getElementById('langToggle');
        if (langBtn) langBtn.addEventListener('click', function () {
            window.CHL.setLang(window.CHL.lang === 'ar' ? 'en' : 'ar');
            window.applyI18n();
        });

        /* ---------- REGISTER PAGE ---------- */
        var submit = document.getElementById('authSubmit');
        var roleBtns = document.querySelectorAll('.role-opt');
        var regName = document.getElementById('regName');
        var regEmail = document.getElementById('regEmail');
        var regPassword = document.getElementById('regPassword');
        var regLevel = document.getElementById('regLevel');
        var regSchool = document.getElementById('regSchool');
        var schoolGroup = document.getElementById('schoolGroup');
        var selectedRole = 'user';

        if (submit && regEmail && regPassword && roleBtns.length > 0) {
            roleBtns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    roleBtns.forEach(function (b) {
                        b.classList.remove('active');
                        b.setAttribute('aria-pressed', 'false');
                    });
                    this.classList.add('active');
                    this.setAttribute('aria-pressed', 'true');
                    selectedRole = this.dataset.role;
                    schoolGroup.style.display = selectedRole === 'teacher' ? 'block' : 'none';
                    var lvl = document.getElementById('levelGroup');
                    if (lvl) lvl.style.display = selectedRole === 'student' ? 'none' : 'block';
                });
            });

            submit.addEventListener('click', function () {
                clearError();
                var res = window.CHLAuth.register({
                    name: regName ? regName.value.trim() : '',
                    email: regEmail.value,
                    password: regPassword.value,
                    role: selectedRole,
                    level: (regLevel && regLevel.value) || 'beginner',
                    school: regSchool ? regSchool.value.trim() : ''
                });
                if (res.error) { fail(res.error); return; }
                window.CHLDB.set('session', { userId: res.user.id, ts: Date.now() });
                window.CHLUI.toast(window.t('تم إنشاء الحساب!', 'Account created!'), 'success', '✅');
                setTimeout(function () { window.location.href = 'dashboard.html'; }, 600);
            });
            var fields = [regName, regEmail, regPassword];
            fields.forEach(function (f) { if (f) f.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit.click(); }); });
            return;
        }

        /* ---------- LOGIN PAGE ---------- */
        var email = document.getElementById('authEmail');
        var password = document.getElementById('authPassword');
        if (submit && email && password) {
            submit.addEventListener('click', function () {
                clearError();
                var res = window.CHLAuth.login(email.value, password.value);
                if (res.error) { fail(res.error); return; }
                window.CHLUI.toast(window.t('مرحباً ' + res.user.name + '!', 'Welcome ' + (res.user.nameEn || res.user.name) + '!'), 'success', '🧪');
                setTimeout(function () { window.location.href = 'dashboard.html'; }, 500);
            });
            [email, password].forEach(function (f) {
                f.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit.click(); });
            });
        }
    });
})();

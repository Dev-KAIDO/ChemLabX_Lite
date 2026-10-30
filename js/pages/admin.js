/* ==========================================================================
   ChemLabX 4.0 — Admin console
   Sections: users (archive/grant role), classes, assignments (monitor subs).
   ========================================================================== */
(function () {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function fmtDate(ts) {
        if (!ts) return '\u2014';
        var d = new Date(ts);
        return d.toLocaleDateString(window.t('ar', 'en-US'), { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function typeInfo(type) {
        var map = {
            lab: { ar: '\u062A\u062C\u0631\u0628\u0629', en: 'Lab', icon: '\u2697\uFE0F' },
            lesson: { ar: '\u062F\u0631\u0633', en: 'Lesson', icon: '\uD83D\uDCD6' },
            quiz: { ar: '\u0627\u062E\u062A\u0628\u0627\u0631', en: 'Quiz', icon: '\uD83D\uDCDD' }
        };
        return map[type] || map.lab;
    }
    function roleIcon(role) {
        return role === 'teacher' ? '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67' : role === 'student' ? '\uD83C\uDF93' : role === 'admin' ? '\uD83D\uDEE1\uFE0F' : '\uD83D\uDC64';
    }
    function nameOf(u) {
        return window.CHL.lang === 'en' && u.nameEn ? u.nameEn : u.name;
    }

    function renderTabs(root, active) {
        var tabs = [
            { id: 'users', icon: '\uD83D\uDC65', ar: '\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646', en: 'Users' },
            { id: 'classes', icon: '\uD83C\uDFEB', ar: '\u0627\u0644\u0641\u0635\u0648\u0644', en: 'Classes' },
            { id: 'assignments', icon: '\uD83D\uDCDD', ar: '\u0627\u0644\u0648\u0627\u062C\u0628\u0627\u062A', en: 'Assignments' }
        ];
        var html = '<div class="admin-tabs">';
        tabs.forEach(function (tb) {
            var label = window.CHL.lang === 'en' ? tb.en : tb.ar;
            html += '<button class="tab-btn' + (tb.id === active ? ' active' : '') + '" data-tab="' + tb.id + '">' + tb.icon + ' ' + label + '</button>';
        });
        html += '</div>';
        return html;
    }

    /* ---------- Users panel ---------- */
    function renderUsers() {
        var all = window.CHLDB.users.list();
        var html = '<div class="dash-section"><div class="dash-section-head"><div class="dash-section-title">' + window.t('\uD83D\uDC65 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 (' + all.length + ')', '\uD83D\uDC65 Users (' + all.length + ')') + '</div></div>';
        if (all.length === 0) { html += '<div class="admin-empty">' + window.t('\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646', 'No users yet') + '</div></div>'; return html; }
        all.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); }).forEach(function (u) {
            var rl = window.CHLAuth.roleLabel(u.role);
            var rlabel = window.CHL.lang === 'en' ? rl.en : rl.ar;
            var xp = u.progress ? (u.progress.xp || 0) : 0;
            html += '<div class="user-row' + (u.archived ? ' archived' : '') + '">' +
                '<div class="avatar">' + roleIcon(u.role) + '</div>' +
                '<div><div class="uname">' + esc(nameOf(u)) + (u.archived ? ' <span class="badge-archived">' + window.t('\u0645\u0639\u0637\u0644', 'Archived') + '</span>' : '') + '</div>' +
                '<div class="uemail">' + esc(u.email) + '</div></div>' +
                '<span class="mini-stat">' + xp + ' XP</span>' +
                '<div class="spacer"></div>' +
                '<select class="select-role" data-user="' + u.id + '"' + (u.id === (window.CHLAuth.currentUser() || {}).id ? ' disabled' : '') + '>' +
                ['admin', 'teacher', 'student', 'user'].map(function (r) {
                    var l = window.CHLAuth.roleLabel(r);
                    return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + (window.CHL.lang === 'en' ? l.en : l.ar) + '</option>';
                }).join('') +
                '</select>' +
                (u.archived
                    ? '<button class="btn btn-sm" data-act="unarchive" data-user="' + u.id + '">' + window.t('\u062A\u0641\u0639\u064A\u0644', 'Activate') + '</button>'
                    : '<button class="btn btn-sm btn-danger" data-act="archive" data-user="' + u.id + '">' + window.t('\u062A\u0639\u0637\u064A\u0644', 'Archive') + '</button>') +
                '</div>';
        });
        html += '</div>';
        return html;
    }

    /* ---------- Classes panel ---------- */
    function renderClasses() {
        var classes = window.CHLDB.classes.list();
        var html = '<div class="dash-section"><div class="dash-section-head"><div class="dash-section-title">' + window.t('\uD83C\uDFEB \u0627\u0644\u0641\u0635\u0648\u0644 (' + classes.length + ')', '\uD83C\uDFEB Classes (' + classes.length + ')') + '</div></div>';
        if (classes.length === 0) { html += '<div class="admin-empty">' + window.t('\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u0635\u0648\u0644', 'No classes') + '</div></div>'; return html; }
        classes.forEach(function (c) {
            var teacher = window.CHLDB.users.getById(c.teacherId);
            var tname = teacher ? nameOf(teacher) : '\u2014';
            var stCount = (c.studentIds || []).length;
            var asgCount = window.CHLDB.assignments.list().filter(function (a) { return a.classId === c.id; }).length;
            html += '<div class="class-card">' +
                '<div class="class-card-head"><div class="class-card-title">' + esc(window.CHL.lang === 'en' && c.nameEn ? c.nameEn : c.name) + '</div><span class="class-card-code">' + esc(c.code) + '</span></div>' +
                '<div class="class-card-meta"><span>\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 ' + esc(tname) + '</span><span>\uD83C\uDF93 ' + stCount + ' ' + window.t('\u0637\u0627\u0644\u0628', 'students') + '</span><span>\uD83D\uDCDD ' + asgCount + ' ' + window.t('\u0648\u0627\u062C\u0628', 'assignments') + '</span></div>' +
                '</div>';
        });
        html += '</div>';
        return html;
    }

    /* ---------- Assignments panel ---------- */
    function renderAssignments() {
        var asgs = window.CHLDB.assignments.list().slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        var subs = window.CHLDB.submissions.list();
        var html = '<div class="dash-section"><div class="dash-section-head"><div class="dash-section-title">' + window.t('\uD83D\uDCDD \u0627\u0644\u0648\u0627\u062C\u0628\u0627\u062A \u0648\u0627\u0644\u062A\u0633\u0644\u064A\u0645\u0627\u062A', '\uD83D\uDCDD Assignments & Submissions') + '</div></div>';
        if (asgs.length === 0) { html += '<div class="admin-empty">' + window.t('\u0644\u0627 \u062A\u0648\u062C\u062F \u0648\u0627\u062C\u0628\u0627\u062A', 'No assignments yet') + '</div></div>'; return html; }
        asgs.forEach(function (a) {
            var cls = window.CHLDB.classes.getById(a.classId);
            var teacher = window.CHLDB.users.getById(a.teacherId);
            var ti = typeInfo(a.type);
            var aSubs = subs.filter(function (s) { return s.assignmentId === a.id; });
            var html2 = '<div class="assignment-card">' +
                '<div class="assignment-icon">' + ti.icon + '</div>' +
                '<div class="assignment-main"><div class="assignment-title">' + esc(window.CHL.lang === 'en' && a.titleEn ? a.titleEn : a.title) + '</div>' +
                '<div class="assignment-meta"><span class="tag tag-green">' + (window.CHL.lang === 'en' ? ti.en : ti.ar) + '</span>' +
                '<span>\uD83C\uDFEB ' + esc(cls ? (window.CHL.lang === 'en' && cls.nameEn ? cls.nameEn : cls.name) : '\u2014') + '</span>' +
                '<span>\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 ' + esc(teacher ? nameOf(teacher) : '\u2014') + '</span>' +
                '<span>\u23F0 ' + fmtDate(a.dueDate) + '</span></div></div>' +
                '<div class="assignment-actions"><span class="tag tag-purple">' + aSubs.length + ' ' + window.t('\u062A\u0633\u0644\u064A\u0645', 'submissions') + '</span></div></div>';
            html += html2;
            if (aSubs.length > 0) {
                aSubs.forEach(function (s) {
                    var student = window.CHLDB.users.getById(s.studentId) || window.CHLDB.users.getById(s.userId);
                    var sname = student ? nameOf(student) : '?';
                    var res = s.result || {};
                    var resText = res.score !== undefined ? (res.score + '/' + (res.total || 10)) : (res.lesson ? '\uD83D\uDCD6 ' + res.lesson : '\u2697\uFE0F');
                    html += '<div class="submission-row" style="margin:-4px 0 10px 0;padding:10px 18px;">' +
                        '<span style="font-size:16px;">\uD83D\uDCE4</span><span class="name">' + esc(sname) + '</span>' +
                        '<span class="tag tag-blue">' + resText + '</span>' +
                        '<span class="tag tag-green">' + window.t('\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645', 'Submitted') + '</span>' +
                        '<span style="font-size:11px;color:var(--text-secondary);">' + fmtDate(s.submittedAt) + '</span></div>';
                });
            }
        });
        html += '</div>';
        return html;
    }

    function render(root, active) {
        window.CHLUI.initNav('admin');
        var user = window.CHLAuth.currentUser();
        /* Centralized authorization gate (TASK-009): admins only. Relies on the
           decision of the pure authorization module, not just on the role
           string or on UI hiding. Unknown/unauthenticated actors are denied. */
        var A = window.CHL && window.CHL.authorization;
        var allowed = !!user && (A ? A.requirePermission(user, 'users.roles.assign') : user.role === 'admin');
        if (!allowed) { root.innerHTML = '<div class="empty-state"><p>' + window.t('\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.', 'This page is for admins only.') + '</p></div>'; return; }

        var html = '<h1 style="font-size:24px;color:var(--text-primary);">\uD83D\uDD27 ' + window.t('\u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629', 'Admin Console') + '</h1>';
        html += renderTabs(root, active);

        html += '<div class="admin-panel' + (active === 'users' ? ' active' : '') + '" id="panel-users">' + renderUsers() + '</div>';
        html += '<div class="admin-panel' + (active === 'classes' ? ' active' : '') + '" id="panel-classes">' + renderClasses() + '</div>';
        html += '<div class="admin-panel' + (active === 'assignments' ? ' active' : '') + '" id="panel-assignments">' + renderAssignments() + '</div>';

        root.innerHTML = html;
        bind(root, active);
    }

    function bind(root, active) {
        root.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tab = this.dataset.tab;
                root.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                root.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('active'); });
                var panel = root.querySelector('#panel-' + tab);
                if (panel) panel.classList.add('active');
                window.location.hash = tab;
            });
        });

        /* Role change */
        root.addEventListener('change', function (e) {
            if (!e.target.classList.contains('select-role')) return;
            var uid = e.target.dataset.user;
            var role = e.target.value;
            if (!uid || !role) return;
            var updated = window.CHLAuth.grantRole(uid, role);
            if (updated) window.CHLUI.toast(window.t('\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u062F\u0648\u0631', 'Role updated'), 'success', '\uD83D\uDC65');
        });

        /* Archive / unarchive */
        root.addEventListener('click', function (e) {
            var act = e.target.closest('[data-act]');
            if (!act) return;
            var uid = act.dataset.user;
            if (act.dataset.act === 'archive') {
                var ar = window.CHLAuth.archiveUser(uid);
                if (ar) window.CHLUI.toast(window.t('\u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628', 'Account archived'), 'warning', '\u26D4');
                render(root, 'users');
            } else if (act.dataset.act === 'unarchive') {
                var ua = window.CHLAuth.unarchiveUser(uid);
                if (ua) window.CHLUI.toast(window.t('\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628', 'Account activated'), 'success', '\u2705');
                render(root, 'users');
            }
        });
    }

    function init() {
        var root = document.getElementById('adminRoot');
        if (!root) return;
        var active = (window.location.hash || '#users').replace('#', '');
        if (['users', 'classes', 'assignments'].indexOf(active) === -1) active = 'users';
        render(root, active);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

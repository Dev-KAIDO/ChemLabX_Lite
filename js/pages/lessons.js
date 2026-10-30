/* ==========================================================================
   ChemLabX 4.0 — Lessons page loader (TASK-008)
   Thin OFFLINE-FIRST loader. Lesson content now lives in the versioned,
   locale-structured content pack js/data/content/lessons.js and is read
   through the pure Content domain (js/domain/content.js). This module stays
   as the page loader during transition (CHEMLABX_ARCHITECTURE.md +28.3).
   The protected lessons.html cannot declare the packs, so this loader injects
   the local Content domain + manifest + pack <script> assets (app-shell served,
   offline-friendly) before rendering. Fail-closed: any missing pack/item throws
   via the Content domain (no fabricated/empty fallback).
   ========================================================================== */
(function () {
    'use strict';

    function loadScript(src, cb) {
        var existing = document.querySelector('script[data-content-src="' + src + '"]');
        if (existing) { cb(); return; }
        var s = document.createElement('script');
        s.src = src;
        s.setAttribute('data-content-src', src);
        /* Never pass the load Event to cb: callers treat any truthy argument
           as a load error, which silently skipped the content packs. */
        s.onload = function () { cb(); };
        s.onerror = function () { cb(new Error('failed to load ' + src)); };
        document.head.appendChild(s);
    }

    function ensureContent(cb) {
        if (window.CHL && window.CHL.content) {
            window.CHL.content.ensure(['lessons']).then(function () { cb(); }, function (e) { cb(e); });
            return;
        }
        loadScript('js/domain/content.js', function (err) {
            if (err) return cb(err);
            window.CHL.content.ensure(['lessons']).then(function () { cb(); }, function (e) { cb(e); });
        });
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function render(root, lessons) {
        window.CHLUI.initNav('lessons');
        var user = window.CHLAuth ? window.CHLAuth.currentUser() : null;
        var done = user && user.progress ? (user.progress.lessonsDone || []) : [];

        var html = '<div class="lessons-header">';
        html += '<h1>' + window.t('\uD83D\uDCD6 \u0627\u0644\u062F\u0631\u0648\u0633 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629', '\uD83D\uDCD6 Lessons') + '</h1>';
        html += '<p>' + window.t('\u062A\u0639\u0644\u0645 \u0623\u0633\u0627\u0633\u064A\u0627\u062A \u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0621 \u062B\u0645 \u0637\u0628\u0642\u0647\u0627 \u0641\u064A \u0627\u0644\u0645\u0639\u0645\u0644 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A.', 'Learn chemistry fundamentals, then apply them in the virtual lab.') + '</p>';
        html += '</div>';

        html += '<div class="lesson-grid">';
        lessons.forEach(function (l) {
            var isDone = done.indexOf(l.key) !== -1;
            var title = l.content.title;
            html += '<div class="lesson-card" data-lesson="' + l.key + '">' +
                '<div class="lesson-card-icon">' + l.icon + (isDone ? ' <span class="lesson-done">\u2705</span>' : '') + '</div>' +
                '<h3>' + esc(title) + '</h3>' +
                '<p>' + window.t('\u0627\u0636\u063A\u0637 \u0644\u0641\u062A\u062D \u0627\u0644\u062F\u0631\u0633', 'Click to open') + '</p>' +
                '<button class="btn btn-sm ' + (isDone ? '' : 'btn-primary') + '">' + (isDone ? window.t('\u2705 \u0645\u0643\u0645\u0644', '\u2705 Done') : window.t('\uD83D\uDCD6 \u0627\u0642\u0631\u0623', '\uD83D\uDCD6 Read')) + '</button>' +
                '</div>';
        });
        html += '</div>';

        root.innerHTML = html;

        root.querySelectorAll('.lesson-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var id = parseInt(card.dataset.lesson);
                showLesson(root, id);
            });
        });
    }

    function showLesson(root, id) {
        var lang = window.CHL.lang;
        var lesson = window.CHL.content.resolve('lessons', id, lang);
        var title = lesson.content.title;
        var content = lesson.content.body;

        var html = '<button class="btn btn-sm" id="lessonBack">\u2190 ' + window.t('\u0639\u0648\u062F\u0629 \u0644\u0644\u062F\u0631\u0648\u0633', 'Back to lessons') + '</button>';
        html += '<div class="card lesson-content"><h2 style="color:var(--accent-purple);margin-bottom:12px;">' + esc(title) + '</h2>';
        html += '<div style="line-height:1.9;color:var(--text-primary);">' + content + '</div>';
        html += '<div style="margin-top:20px;text-align:center;">';
        html += '<a href="lab.html" class="btn btn-primary">\uD83E\uDDEA ' + window.t('\u0627\u0630\u0647\u0628 \u0644\u0644\u0645\u0639\u0645\u0644', 'Go to Lab') + '</a>';
        html += '<button class="btn btn-purple" id="lessonMarkDone" style="margin-inline-start:10px;">\u2705 ' + window.t('\u0639\u0644\u0645\u062A \u0643\u0645\u0643\u0645\u0644', 'Mark as done') + '</button>';
        html += '</div></div>';

        root.innerHTML = html;

        document.getElementById('lessonBack').addEventListener('click', function () { renderPage(root); });
        document.getElementById('lessonMarkDone').addEventListener('click', function () {
            markDone(id);
            window.CHLUI.toast(window.t('\u062A\u0645 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062F\u0631\u0633! +10 XP', 'Lesson completed! +10 XP'), 'success', '\uD83C\uDFC6');
            renderPage(root);
        });
    }

    function markDone(id) {
        var user = window.CHLAuth ? window.CHLAuth.currentUser() : null;
        if (!user) return;
        var done = (user.progress.lessonsDone || []).slice();
        if (done.indexOf(id) === -1) done.push(id);
        var prog = Object.assign({}, user.progress, {
            lessonsDone: done,
            xp: (user.progress.xp || 0) + 10
        });
        window.CHLAuth.updateUser(user.id, { progress: prog });

        /* assignment (lesson type) */
        var params = new URLSearchParams(window.location.search);
        var asgId = params.get('asg');
        if (asgId && window.CHLDB) {
            var existing = window.CHLDB.submissions.list().filter(function (s) { return s.assignmentId === asgId && s.userId === user.id; });
            if (existing.length === 0) {
                var asg = window.CHLDB.assignments.getById(asgId);
                window.CHLDB.submissions.upsert(window.CHLDB.uid(), {
                    id: window.CHLDB.uid(), assignmentId: asgId, classId: asg ? asg.classId : null,
                    userId: user.id, studentId: user.id, status: 'submitted', result: { lesson: id }, submittedAt: Date.now()
                });
            }
        }
    }

    function renderPage(root) {
        var lang = window.CHL.lang;
        var lessons = window.CHL.content.resolveAll('lessons', lang);
        render(root, lessons);
    }

    function init() {
        var root = document.getElementById('lessonsRoot');
        if (!root) return;
        ensureContent(function (err) {
            if (err) {
                if (window.CHLUI) window.CHLUI.toast('Content unavailable', 'error', '\u26A0\uFE0F');
                return;
            }
            /* ?lesson=ID deep link (mirrors legacy init) */
            var params = new URLSearchParams(window.location.search);
            var lid = parseInt(params.get('lesson'));
            if (lid) showLesson(root, lid);
            else renderPage(root);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

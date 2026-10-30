/* ==========================================================================
   ChemLabX 4.0 — Quiz page loader (standalone, ported from legacy quiz.js)
   10 random questions, +15 XP each correct, progress saved to profile.
   TASK-008: the question bank now lives in the versioned, locale-structured
   content pack js/data/content/quiz.js and is read through the pure Content
   domain (js/domain/content.js). This module stays as the page loader during
   transition (CHEMLABX_ARCHITECTURE.md +28.3). The protected quiz.html cannot
   declare the packs, so this loader injects the local Content domain + manifest
   + quiz pack <script> assets (app-shell served, offline-friendly) before use.
   Fail-closed: unresolved/malformed content throws via the Content domain.
   ========================================================================== */
(function () {
    'use strict';

    var TOTAL = 10;
    var XP_PER_CORRECT = 15;

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
            window.CHL.content.ensure(['quiz']).then(function () { cb(); }, function (e) { cb(e); });
            return;
        }
        loadScript('js/domain/content.js', function (err) {
            if (err) return cb(err);
            window.CHL.content.ensure(['quiz']).then(function () { cb(); }, function (e) { cb(e); });
        });
    }

    var state = { current: 0, score: 0, xp: 0, answered: false, picked: null, timer: null, seconds: 0, questions: [] };
    var body, progress, scoreEl, numEl, xpEl, timerEl, nextBtn, idleMarkup = null;

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    function status(text) {
        var el = document.getElementById('quizStatus');
        if (el) el.textContent = text;
    }

    function startTimer() {
        state.seconds = 0;
        clearInterval(state.timer);
        if (timerEl) timerEl.textContent = '00:00';
        state.timer = setInterval(function () {
            state.seconds++;
            if (!timerEl) return;
            var m = Math.floor(state.seconds / 60).toString().padStart(2, '0');
            var s = (state.seconds % 60).toString().padStart(2, '0');
            timerEl.textContent = m + ':' + s;
        }, 1000);
    }
    function stopTimer() { clearInterval(state.timer); state.timer = null; }

    function updateProgress() {
        if (!progress) return;
        progress.innerHTML = '';
        for (var i = 0; i < state.questions.length; i++) {
            var dot = document.createElement('div');
            dot.className = 'quiz-progress-dot';
            dot.setAttribute('aria-hidden', 'true');
            if (i < state.current) dot.classList.add(state.questions[i]._correct ? 'done' : 'wrong');
            else if (i === state.current) dot.classList.add('current');
            progress.appendChild(dot);
        }
        progress.setAttribute('aria-valuemax', String(state.questions.length || TOTAL));
        progress.setAttribute('aria-valuenow', String(Math.min(state.current + 1, state.questions.length || TOTAL)));
        progress.setAttribute('aria-valuetext', (state.current + 1) + ' / ' + (state.questions.length || TOTAL));
        if (scoreEl) scoreEl.textContent = state.score;
        if (numEl) numEl.textContent = (state.current + 1) + '/' + state.questions.length;
        if (xpEl) xpEl.textContent = state.xp;
    }

    function nextLabel(answered) {
        var lang = window.CHL ? window.CHL.lang : 'ar';
        var last = state.current >= state.questions.length - 1;
        if (!answered) return lang === 'en' ? 'Next \u2192' : '\u0627\u0644\u062A\u0627\u0644\u064A \u2190';
        return lang === 'en'
            ? (last ? 'See result \u2192' : 'Next \u2192')
            : (last ? '\u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u2190' : '\u0627\u0644\u062A\u0627\u0644\u064A \u2190');
    }

    function answerStatus(isCorrect) {
        var lang = window.CHL ? window.CHL.lang : 'ar';
        return isCorrect
            ? (lang === 'en' ? 'Correct. Press Next to continue.' : '\u0625\u062C\u0627\u0628\u0629 \u0635\u062D\u064A\u062D\u0629. \u0627\u0636\u063A\u0637 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629.')
            : (lang === 'en' ? 'Incorrect. Press Next to continue.' : '\u0625\u062C\u0627\u0628\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u0627\u0636\u063A\u0637 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629.');
    }

    /* Re-apply the answered state to freshly rendered options (used after a
       language switch as well as right after the user answers). */
    function markAnswered() {
        var q = state.questions[state.current];
        var options = body.querySelectorAll('.quiz-option');
        for (var i = 0; i < options.length; i++) {
            var idx = parseInt(options[i].getAttribute('data-index'), 10);
            if (idx === state.picked) options[i].classList.add(idx === q.correct ? 'correct' : 'wrong');
            if (idx === q.correct) options[i].classList.add('correct');
            options[i].setAttribute('aria-disabled', 'true');
        }
        nextBtn.disabled = false;
        nextBtn.textContent = nextLabel(true);
        /* Re-announce in the current language after a language switch. */
        var wasCorrect = q._correct != null ? q._correct : (state.picked === q.correct);
        status(answerStatus(wasCorrect));
    }

    function renderQuestion() {
        var q = state.questions[state.current];
        var lang = window.CHL ? window.CHL.lang : 'ar';
        var letters = ['\u0623', '\u0628', '\u062C', '\u062F'];
        var questionText = q.content.q;
        var optionsText = q.content.options;
        var catText = q.content.cat;

        var html = '<div class="quiz-question-number">' + (lang === 'en' ? 'Question ' : '\u0627\u0644\u0633\u0624\u0627\u0644 ') + (state.current + 1) + '/' + state.questions.length;
        if (catText) html += ' <span class="quiz-cat">(' + catText + ')</span>';
        html += '</div>';
        html += '<div class="quiz-question" id="quizQuestionText">' + questionText + '</div>';
        html += '<div class="quiz-options" id="quizOptions" role="group" aria-labelledby="quizQuestionText">';
        for (var i = 0; i < optionsText.length; i++) {
            html += '<button type="button" class="quiz-option" data-index="' + i + '">';
            html += '<span class="quiz-option-letter" aria-hidden="true">' + letters[i] + '</span>';
            html += '<span class="quiz-option-text">' + optionsText[i] + '</span>';
            html += '</button>';
        }
        html += '</div>';

        body.innerHTML = html;
        if (state.answered) {
            markAnswered();
        } else {
            nextBtn.disabled = true;
            nextBtn.textContent = nextLabel(false);
            status((lang === 'en' ? 'Question ' : '\u0627\u0644\u0633\u0624\u0627\u0644 ') + (state.current + 1) +
                (lang === 'en' ? ' of ' : ' \u0645\u0646 ') + state.questions.length);
        }

        var options = body.querySelectorAll('.quiz-option');
        for (var j = 0; j < options.length; j++) {
            options[j].addEventListener('click', function () { handleAnswer(this); });
        }
        updateProgress();
    }

    function loadQuestion() {
        if (state.current >= state.questions.length) { showResult(); return; }
        state.answered = false;
        state.picked = null;
        renderQuestion();
    }

    function handleAnswer(el) {
        if (state.answered) return;
        state.answered = true;
        var idx = parseInt(el.getAttribute('data-index'), 10);
        var q = state.questions[state.current];
        var isCorrect = idx === q.correct;
        q._correct = isCorrect;
        state.picked = idx;
        if (isCorrect) { state.score++; state.xp += XP_PER_CORRECT; }

        markAnswered();
        updateProgress();
    }

    function saveBest() {
        var user = window.CHLAuth ? window.CHLAuth.currentUser() : null;
        if (!user) return;
        var best = Math.max(user.progress.quizBest || 0, state.score);
        var prog = Object.assign({}, user.progress, {
            xp: (user.progress.xp || 0) + state.xp,
            quizBest: best
        });
        window.CHLAuth.updateUser(user.id, { progress: prog });

        /* assignment submission (quiz type) */
        var params = new URLSearchParams(window.location.search);
        var asgId = params.get('asg');
        if (asgId && state.score >= 5 && window.CHLDB) {
            var existing = window.CHLDB.submissions.list().filter(function (s) { return s.assignmentId === asgId && s.userId === user.id; });
            if (existing.length === 0) {
                var asg = window.CHLDB.assignments.getById(asgId);
                window.CHLDB.submissions.upsert(window.CHLDB.uid(), {
                    id: window.CHLDB.uid(), assignmentId: asgId, classId: asg ? asg.classId : null,
                    userId: user.id, studentId: user.id, status: 'submitted', result: { score: state.score, total: state.questions.length }, submittedAt: Date.now()
                });
            }
        }
    }

    /* isRerender: only re-localize an existing result screen (language switch).
       It must not re-award XP, re-save the best score, toast, or move focus. */
    function showResult(isRerender) {
        stopTimer();
        var total = state.questions.length;
        var pct = Math.round((state.score / total) * 100);
        var lang = window.CHL ? window.CHL.lang : 'ar';
        var icon, title;
        if (pct >= 90) { icon = '\uD83C\uDFC6'; title = lang === 'en' ? 'Chemistry Genius!' : '\u0639\u0628\u0642\u0631\u064A \u0643\u064A\u0645\u064A\u0627\u0621!'; }
        else if (pct >= 70) { icon = '\uD83E\uDD47'; title = lang === 'en' ? 'Excellent!' : '\u0645\u0645\u062A\u0627\u0632!'; }
        else if (pct >= 50) { icon = '\uD83E\uDD48'; title = lang === 'en' ? 'Very Good!' : '\u062C\u064A\u062F \u062C\u062F\u064B\u0627!'; }
        else if (pct >= 30) { icon = '\uD83E\uDD49'; title = lang === 'en' ? 'Not bad, try again!' : '\u0644\u064A\u0633 \u0633\u064A\u0626\u0627\u064B!'; }
        else { icon = '\uD83D\uDCDA'; title = lang === 'en' ? 'Keep studying!' : '\u0627\u0633\u062A\u0645\u0631!'; }

        var mins = Math.floor(state.seconds / 60);
        var secs = state.seconds % 60;

        body.innerHTML =
            '<div class="quiz-result" role="group" aria-labelledby="quizResultTitle">' +
            '<div class="quiz-result-icon" aria-hidden="true">' + icon + '</div>' +
            '<h3 class="quiz-result-title" id="quizResultTitle" tabindex="-1">' + title + '</h3>' +
            '<div class="quiz-result-score">' + state.score + '/' + total + '</div>' +
            '<div class="quiz-result-details">' + (lang === 'en' ? 'Accuracy: ' : '\u0646\u0633\u0628\u0629 \u0627\u0644\u0635\u0648\u0627\u0628: ') + pct + '%<br>' + (lang === 'en' ? 'Time: ' : '\u0627\u0644\u0648\u0642\u062A: ') + mins + ' ' + (lang === 'en' ? 'min' : '\u062F\u0642\u064A\u0642\u0629') + ' ' + secs + ' ' + (lang === 'en' ? 'sec' : '\u062B\u0627\u0646\u064A\u0629') + '</div>' +
            '<div class="quiz-result-xp">+' + state.xp + ' XP</div>' +
            '<div class="quiz-result-buttons">' +
            '<button type="button" class="quiz-result-btn primary" id="quizRetry">' + (lang === 'en' ? 'Retry' : '\uD83D\uDD04 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629') + '</button>' +
            '<button type="button" class="quiz-result-btn secondary" id="quizBackHome">' + (lang === 'en' ? 'Dashboard' : '\u2705 \u0627\u0644\u0639\u0648\u062F\u0629') + '</button>' +
            '</div></div>';

        document.getElementById('quizRetry').addEventListener('click', function () { initQuiz(); });
        document.getElementById('quizBackHome').addEventListener('click', function () { window.location.href = 'dashboard.html'; });
        nextBtn.disabled = true;
        updateProgress();
        status((lang === 'en' ? 'Quiz complete. Score ' : '\u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631. \u0627\u0644\u0646\u062A\u064A\u062C\u0629 ') + state.score + '/' + total);
        if (isRerender) return;
        saveBest();
        var heading = document.getElementById('quizResultTitle');
        if (heading) heading.focus();
        if (window.CHLUI) window.CHLUI.toast('+' + state.xp + ' XP', 'success', '\uD83D\uDCDD');
    }

    function initQuiz() {
        stopTimer();
        var lang = window.CHL ? window.CHL.lang : 'ar';
        var bank = window.CHL.content.resolveAll('quiz', lang);
        state = { current: 0, score: 0, xp: 0, answered: false, picked: null, timer: null, seconds: 0, questions: shuffle(bank.slice()).slice(0, TOTAL) };
        startTimer();
        loadQuestion();
    }

    function advanceQuestion() {
        if (state.current < state.questions.length - 1) { state.current++; loadQuestion(); }
        else showResult();
    }

    function showIdle() {
        stopTimer();
        var lang = window.CHL ? window.CHL.lang : 'ar';
        body.innerHTML = idleMarkup;
        window.applyI18n && window.applyI18n();
        var start = document.getElementById('quizStart');
        if (start) start.addEventListener('click', initQuiz);
        if (nextBtn) nextBtn.disabled = true;
        if (progress) {
            progress.innerHTML = '';
            progress.setAttribute('aria-valuenow', '0');
            progress.setAttribute('aria-valuetext', '0 / ' + TOTAL);
        }
        var user = window.CHLAuth ? window.CHLAuth.currentUser() : null;
        var best = user && user.progress ? (user.progress.quizBest || 0) : 0;
        var bestEl = document.getElementById('quizBestInfo');
        if (bestEl) {
            bestEl.textContent = best > 0
                ? (lang === 'en' ? '\uD83C\uDFC6 Best: ' + best + '/' + TOTAL : '\uD83C\uDFC6 \u0623\u0641\u0636\u0644 \u0646\u062A\u064A\u062C\u0629: ' + best + '/' + TOTAL)
                : '';
        }
        status('');
    }

    function init() {
        ensureContent(function () {
            window.CHLUI.initNav('quiz');
            body = document.getElementById('quizBody');
            progress = document.getElementById('quizProgress');
            scoreEl = document.getElementById('quizScore');
            numEl = document.getElementById('quizQuestionNum');
            xpEl = document.getElementById('quizXP');
            timerEl = document.getElementById('quizTimer');
            nextBtn = document.getElementById('quizNext');
            idleMarkup = body ? body.innerHTML : '';

            showIdle();

            if (nextBtn) nextBtn.addEventListener('click', function () { if (!this.disabled) advanceQuestion(); });

            document.addEventListener('keydown', function (e) {
                if (!body || body.querySelector('.quiz-idle')) return;
                if (e.ctrlKey || e.metaKey || e.altKey) return;
                /* Space/Enter are left to the native button that has focus:
                   intercepting them here used to activate options twice and
                   jump to the next question from anywhere on the page. */
                if (state.answered) return;
                var optionIndex = -1;
                if (e.key === '1' || e.key === '\u0623') optionIndex = 0;
                else if (e.key === '2' || e.key === '\u0628') optionIndex = 1;
                else if (e.key === '3' || e.key === '\u062C') optionIndex = 2;
                else if (e.key === '4' || e.key === '\u062F') optionIndex = 3;
                if (optionIndex >= 0) {
                    var opt = body.querySelector('.quiz-option[data-index="' + optionIndex + '"]');
                    if (opt) handleAnswer(opt);
                }
            });

            /* Keep the quiz in one language: the navbar toggle re-renders the
               current screen instead of leaving stale labels behind. */
            document.addEventListener('chl:langchange', function () {
                if (!body || !body.children.length) return;
                if (body.querySelector('.quiz-idle')) { showIdle(); return; }
                if (body.querySelector('.quiz-result')) { showResult(true); return; }
                if (!state.questions.length) return;
                try {
                    var lang = window.CHL.lang;
                    /* resolveAll() exposes `key` (the item id), not `id`. Mapping
                       by id gave every question the same undefined key, so the
                       whole set collapsed onto the last item in the pack. */
                    var byKey = {};
                    window.CHL.content.resolveAll('quiz', lang).forEach(function (q) { byKey[String(q.key)] = q; });
                    state.questions = state.questions.map(function (q) {
                        var repl = byKey[String(q.key)];
                        if (!repl) return q;
                        repl._correct = q._correct;
                        return repl;
                    });
                } catch (err) { /* keep the already-resolved text on failure */ }
                renderQuestion();
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

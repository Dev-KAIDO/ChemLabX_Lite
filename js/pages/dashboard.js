/* ==========================================================================
   ChemLabX 4.0 — Role-based dashboard
   ========================================================================== */
(function () {
    'use strict';

    var DB = window.CHLDB;
    var Auth = window.CHLAuth;
    var t = window.t;

    var experimentTitles = {
        'Na+H2O': { ar: 'تفاعل الصوديوم مع الماء', en: 'Sodium + Water' },
        'HCl+NaOH': { ar: 'تعادل حمض-قاعدة', en: 'Acid-Base Neutralization' },
        'Zn+HCl': { ar: 'تفاعل الزنك مع الحمض', en: 'Zinc + Acid' },
        'CuSO4+Zn': { ar: 'ترسيب النحاس', en: 'Copper Deposition' },
        'KMnO4+H2O2': { ar: 'برمنغنات + بيروكسيد', en: 'Permanganate + Peroxide' },
        'AgNO3+Cu': { ar: 'ترسيب الفضة', en: 'Silver Deposition' },
        'CaCO3+HCl': { ar: 'كربونات + حمض', en: 'Carbonate + Acid' },
        'NH3+HCl': { ar: 'أمونيا + حمض', en: 'Ammonia + Acid' },
        'FeCl3+NaOH': { ar: 'هيدروكسيد الحديد', en: 'Iron Hydroxide' },
        'CuSO4+NaOH': { ar: 'هيدروكسيد النحاس', en: 'Copper Hydroxide' },
        'CaO+H2O': { ar: 'إخماد الجير', en: 'Slaking Lime' },
        'AgNO3+NaCl': { ar: 'ترسيب كلوريد الفضة', en: 'Silver Chloride' },
        'H2SO4+H2O': { ar: 'إثراء حمض كبريتيك', en: 'Sulfuric Acid Dilution' },
        'CH3COOH+NaHCO3': { ar: 'حمض خليك + بيكربونات', en: 'Acetic + Bicarbonate' },
        'K2Cr2O7+HCl': { ar: 'ثنائي كروميت + حمض', en: 'Dichromate + Acid' }
    };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function fmtDate(ts) {
        if (!ts) return '—';
        var d = new Date(ts);
        return d.toLocaleDateString(t('ar', 'en-US'), { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function typeInfo(type) {
        var map = {
            lab: { ar: 'تجربة معملية', en: 'Lab', icon: '⚗️', cls: 'tag-green' },
            lesson: { ar: 'درس', en: 'Lesson', icon: '📖', cls: 'tag-blue' },
            quiz: { ar: 'اختبار', en: 'Quiz', icon: '📝', cls: 'tag-purple' }
        };
        return map[type] || map.lab;
    }
    function statTile(icon, value, label, color, href) {
        var inner = '<div class="stat-tile-icon ' + (color || 'green') + '" aria-hidden="true">' + icon + '</div>' +
            '<div><div class="stat-tile-value">' + esc(value) + '</div><div class="stat-tile-label">' + esc(label) + '</div></div>';
        if (!href) return '<div class="stat-tile">' + inner + '</div>';
        return '<a class="stat-tile clickable" href="' + esc(href) + '">' + inner + '</a>';
    }
    function section(title, body) {
        return '<div class="dash-section"><div class="dash-section-head"><div class="dash-section-title">' + title + '</div></div>' + body + '</div>';
    }
    function fmtXp(u) { return (u.progress && u.progress.xp) ? u.progress.xp : 0; }
    function levelOf(xp) {
        if (xp < 30) return { ar: '🥉 مبتدئ', en: '🥉 Beginner' };
        if (xp < 80) return { ar: '🥈 مساعد', en: '🥈 Assistant' };
        if (xp < 150) return { ar: '🥇 كيميائي', en: '🥇 Chemist' };
        if (xp < 250) return { ar: '🏆 خبير', en: '🏆 Expert' };
        if (xp < 400) return { ar: '👨‍🔬 أستاذ', en: '👨‍🔬 Professor' };
        return { ar: '✨ عبقري', en: '✨ Genius' };
    }

    /* ---------- Assignment / submission helpers ---------- */
    function alreadySubmitted(asgId, userId) {
        return DB.submissions.list().some(function (s) { return s.assignmentId === asgId && s.studentId === userId; });
    }
    function submitAssignment(asgId, userId, result) {
        if (alreadySubmitted(asgId, userId)) return false;
        var asg = DB.assignments.getById(asgId);
        if (!asg) return false;
        var id = DB.uid();
        DB.submissions.upsert(id, {
            id: id, assignmentId: asgId, classId: asg.classId,
            studentId: userId, status: 'submitted', result: result || {}, submittedAt: Date.now()
        });
        return true;
    }
    function submissionsForClass(classId) {
        return DB.submissions.list().filter(function (s) { return s.classId === classId; });
    }
    function expTitle(id) {
        var e = experimentTitles[id];
        if (!e) return id;
        return window.CHL.lang === 'en' ? e.en : e.ar;
    }

    /* ---------- Renderers ---------- */
    function render() {
        /* Centralized authorization gate (TASK-009): any authenticated user in
           the canonical role vocabulary may view the dashboard. Refuses and
           redirects on unauthenticated or unknown/fail-closed identities. */
        var user = Auth.require(['admin', 'teacher', 'student', 'user']);
        if (!user) return;
        var A = window.CHL && window.CHL.authorization;
        if (A && !A.requirePermission(user, 'lab.run')) { window.location.href = 'login.html'; return; }
        var root = document.getElementById('dashRoot');
        if (!root) return;
        window.CHLUI.initNav('dashboard');

        var name = window.CHL.lang === 'en' && user.nameEn ? user.nameEn : user.name;
        var role = window.CHLAuth.roleLabel(user.role);
        var roleLabel = window.CHL.lang === 'en' ? role.en : role.ar;

        var html = '<h1 class="sr-only">' + t('لوحة التحكم', 'Dashboard') + '</h1>';
        html += '<div class="dash-welcome">';
        html += '<div style="display:flex;align-items:center;gap:16px;">';
        html += '<div class="dash-user-avatar">🧪</div>';
        html += '<div class="dash-user-info"><div class="dash-user-name">' + esc(name) + '</div>';
        var lvl = levelOf(fmtXp(user));
        html += '<div class="dash-user-meta"><span class="tag tag-purple">' + roleLabel + '</span><span>' + (window.CHL.lang === 'en' ? 'Level' : 'المستوى') + ': ' + (window.CHL.lang === 'en' ? lvl.en : lvl.ar) + '</span></div></div>';
        html += '</div>';
        html += '<a href="lab.html" class="btn btn-primary">🔬 ' + t('اذهب للمعمل', 'Go to Lab') + '</a>';
        html += '</div>';

        if (user.role === 'admin') html += renderAdmin(user);
        else if (user.role === 'teacher') html += renderTeacher(user);
        else if (user.role === 'student') html += renderStudent(user);
        else html += renderUser(user);

        root.innerHTML = html;
        bind();
    }

    function renderAdmin(user) {
        var all = DB.users.list();
        var counts = { teacher: 0, student: 0, user: 0, admin: 0 };
        all.forEach(function (u) { counts[u.role] = (counts[u.role] || 0) + 1; });
        var classList = DB.classes.list();
        var asgList = DB.assignments.list();
        var subList = DB.submissions.list();

        var html = '';
        html += section(t('📊 نظرة عامة', '📊 Overview'),
            '<div class="dash-grid">' +
            statTile('👥', all.length, t('إجمالي المستخدمين', 'Total users'), 'blue', 'admin.html#users') +
            statTile('👨‍🏫', counts.teacher || 0, t('معلمون', 'Teachers'), 'purple', 'admin.html#users') +
            statTile('🎓', counts.student || 0, t('طلاب', 'Students'), 'green', 'admin.html#users') +
            statTile('🏫', classList.length, t('الفصول', 'Classes'), 'orange', 'admin.html#classes') +
            statTile('📝', asgList.length, t('الواجبات', 'Assignments'), 'red', 'admin.html#assignments') +
            statTile('✅', subList.length, t('التسليمات', 'Submissions'), 'green', 'admin.html#assignments') +
            '</div>');

        html += section(t('⚡ إجراءات سريعة', '⚡ Quick actions'),
            '<div class="quick-links">' +
            '<a class="quick-link" href="admin.html#users"><span class="icon">👥</span><span class="name">' + t('إدارة المستخدمين', 'Manage users') + '</span><span class="sub">' + t('أدوار وحسابات', 'Roles & accounts') + '</span></a>' +
            '<a class="quick-link" href="admin.html#classes"><span class="icon">🏫</span><span class="name">' + t('الفصول', 'Classes') + '</span><span class="sub">' + t('إنشاء وتعديل', 'Create & edit') + '</span></a>' +
            '<a class="quick-link" href="admin.html#assignments"><span class="icon">📝</span><span class="name">' + t('الواجبات', 'Assignments') + '</span><span class="sub">' + t('نشر ومتابعة', 'Publish & track') + '</span></a>' +
            '<a class="quick-link" href="lab.html"><span class="icon">🔬</span><span class="name">' + t('المعمل', 'Lab') + '</span><span class="sub">' + t('جرّب بنفسك', 'Try it yourself') + '</span></a>' +
            '</div>');

        html += section(t('👥 أحدث المستخدمين', '👥 Recent users'),
            all.slice(-5).reverse().map(function (u) {
                var rl = window.CHLAuth.roleLabel(u.role);
                return '<div class="submission-row"><span style="font-size:20px;">' +
                    (u.role === 'teacher' ? '👨‍🏫' : u.role === 'student' ? '🎓' : u.role === 'admin' ? '🛡️' : '🧑‍🔬') +
                    '</span><span class="name">' + esc(window.CHL.lang === 'en' && u.nameEn ? u.nameEn : u.name) + '</span>' +
                    '<span class="tag tag-blue">' + (window.CHL.lang === 'en' ? rl.en : rl.ar) + '</span></div>';
            }).join(''));
        return html;
    }

    function renderTeacher(user) {
        var myClasses = DB.classes.list().filter(function (c) { return c.teacherId === user.id; });
        var students = 0;
        myClasses.forEach(function (c) { students += (c.studentIds || []).length; });
        var myAsgs = DB.assignments.list().filter(function (a) { return a.teacherId === user.id; });
        var subs = DB.submissions.list().filter(function (s) { return myAsgs.some(function (a) { return a.id === s.assignmentId; }); });

        var html = '';
        html += section(t('📊 ملخصك', '📊 Your summary'),
            '<div class="dash-grid">' +
            statTile('🏫', myClasses.length, t('فصولك', 'Your classes'), 'blue') +
            statTile('🎓', students, t('الطلاب', 'Students'), 'green') +
            statTile('📝', myAsgs.length, t('الواجبات', 'Assignments'), 'purple') +
            statTile('✅', subs.length, t('تسليمات', 'Submissions'), 'orange') +
            '</div>');

        /* Classes */
        var classHtml = '';
        if (myClasses.length === 0) {
            classHtml = '<div class="empty-state"><div class="icon">🏫</div><p>' + t('لا توجد فصول بعد. أنشئ أول فصل لك!', 'No classes yet. Create your first class!') + '</p></div>';
        } else {
            classHtml = '<div class="class-grid">' + myClasses.map(function (c) {
                var clsAssignments = DB.assignments.list().filter(function (a) { return a.classId === c.id; });
                var clsSubs = submissionsForClass(c.id);
                var stCount = (c.studentIds || []).length;
                return '<div class="class-card">' +
                    '<div class="class-card-head"><div class="class-card-title">' + esc(window.CHL.lang === 'en' && c.nameEn ? c.nameEn : c.name) + '</div>' +
                    '<span class="class-card-code" title="' + t('رمز انضمام الطلاب', 'Student join code') + '">' + esc(c.code) + '</span></div>' +
                    '<div class="class-card-desc">' + esc(window.CHL.lang === 'en' && c.descriptionEn ? c.descriptionEn : (c.description || '')) + '</div>' +
                    '<div class="class-card-meta"><span>🎓 ' + stCount + ' ' + t('طالب', 'students') + '</span><span>📝 ' + clsAssignments.length + ' ' + t('واجب', 'assignments') + '</span><span>✅ ' + clsSubs.length + ' ' + t('تسليم', 'submissions') + '</span></div>' +
                    '<div class="class-card-actions">' +
                    '<button class="btn btn-sm btn-primary" data-act="manage-class" data-id="' + c.id + '">' + t('إدارة الفصل', 'Manage') + '</button>' +
                    '<button class="btn btn-sm btn-purple" data-act="add-student" data-id="' + c.id + '">' + t('+ طالب', '+ Student') + '</button>' +
                    '<button class="btn btn-sm" data-act="create-asg" data-id="' + c.id + '">' + t('📝 واجب', '📝 Assignment') + '</button>' +
                    '</div></div>';
            }).join('') + '</div>';
        }
        html += section(t('🏫 فصولي', '🏫 My classes') + ' <button class="btn btn-sm btn-primary" id="btnNewClass">+ ' + t('فصل جديد', 'New class') + '</button>', classHtml);

        /* Assignments & submissions */
        if (myAsgs.length > 0) {
            html += section(t('📝 الواجبات المنشورة', '📝 Published assignments'),
                myAsgs.map(function (a) {
                    var cls = DB.classes.getById(a.classId);
                    var ti = typeInfo(a.type);
                    var subCount = DB.submissions.list().filter(function (s) { return s.assignmentId === a.id; }).length;
                    var stTotal = cls ? (cls.studentIds || []).length : 0;
                    return '<div class="assignment-card">' +
                        '<div class="assignment-icon">' + ti.icon + '</div>' +
                        '<div class="assignment-main"><div class="assignment-title">' + esc(window.CHL.lang === 'en' && a.titleEn ? a.titleEn : a.title) + '</div>' +
                        '<div class="assignment-meta"><span class="tag ' + ti.cls + '">' + (window.CHL.lang === 'en' ? ti.en : ti.ar) + '</span>' +
                        '<span>🏫 ' + esc(cls ? (window.CHL.lang === 'en' && cls.nameEn ? cls.nameEn : cls.name) : '—') + '</span>' +
                        '<span>⏰ ' + fmtDate(a.dueDate) + '</span></div></div>' +
                        '<div class="assignment-actions"><span class="tag tag-green">' + subCount + '/' + stTotal + ' ' + t('سلموا', 'submitted') + '</span></div></div>';
                }).join(''));
        }

        return html;
    }

    function renderStudent(user) {
        var classIds = user.classIds || [];
        var myClasses = DB.classes.list().filter(function (c) { return classIds.indexOf(c.id) !== -1; });
        var pendingAsgs = [], doneAsgs = [];
        DB.assignments.list().forEach(function (a) {
            if (classIds.indexOf(a.classId) === -1) return;
            if (alreadySubmitted(a.id, user.id)) doneAsgs.push(a); else pendingAsgs.push(a);
        });

        var html = '';
        html += section(t('📊 تقدمك', '📊 Your progress'),
            '<div class="dash-grid">' +
            statTile('🏫', myClasses.length, t('فصولي', 'My classes'), 'blue') +
            statTile('⏳', pendingAsgs.length, t('واجبات قادمة', 'Pending assignments'), 'orange') +
            statTile('✅', doneAsgs.length, t('أنجزتها', 'Completed'), 'green') +
            statTile('⭐', fmtXp(user) + ' XP', t('نقاط الخبرة', 'XP'), 'purple', 'profile.html') +
            '</div>');

        /* Join / classes */
        var classHtml = '<button class="btn btn-sm btn-primary" id="btnJoinClass">🔑 ' + t('الانضمام لفصل', 'Join a class') + '</button><div style="height:12px;"></div>';
        if (myClasses.length === 0) {
            classHtml += '<div class="empty-state"><div class="icon">🏫</div><p>' + t('لم تنضم لأي فصل بعد. اطلب من معلمك رمز الفصل.', 'You haven\'t joined any class. Ask your teacher for the class code.') + '</p></div>';
        } else {
            classHtml += '<div class="class-grid">' + myClasses.map(function (c) {
                var teacher = DB.users.getById(c.teacherId);
                var tname = teacher ? (window.CHL.lang === 'en' && teacher.nameEn ? teacher.nameEn : teacher.name) : '—';
                return '<div class="class-card"><div class="class-card-head"><div class="class-card-title">' + esc(window.CHL.lang === 'en' && c.nameEn ? c.nameEn : c.name) + '</div></div>' +
                    '<div class="class-card-desc">' + esc(window.CHL.lang === 'en' && c.descriptionEn ? c.descriptionEn : (c.description || '')) + '</div>' +
                    '<div class="class-card-meta"><span>👨‍🏫 ' + esc(tname) + '</span></div></div>';
            }).join('') + '</div>';
        }
        html += section(t('🏫 فصولي', '🏫 My classes'), classHtml);

        /* Assignments */
        if (pendingAsgs.length > 0 || doneAsgs.length > 0) {
            var list = '';
            pendingAsgs.concat(doneAsgs).forEach(function (a) {
                var ti = typeInfo(a.type);
                var cls = DB.classes.getById(a.classId);
                var done = alreadySubmitted(a.id, user.id);
                var href = a.type === 'lab' ? 'lab.html?exp=' + encodeURIComponent(a.target) + '&asg=' + a.id :
                    a.type === 'lesson' ? 'lessons.html?lesson=' + (a.target || 1) + '&asg=' + a.id : 'quiz.html?asg=' + a.id;
                var dueOver = a.dueDate && a.dueDate < Date.now() && !done;
                list += '<div class="assignment-card' + (done ? ' done' : '') + '">' +
                    '<div class="assignment-icon">' + ti.icon + '</div>' +
                    '<div class="assignment-main"><div class="assignment-title">' + esc(window.CHL.lang === 'en' && a.titleEn ? a.titleEn : a.title) + '</div>' +
                    '<div class="assignment-meta"><span class="tag ' + ti.cls + '">' + (window.CHL.lang === 'en' ? ti.en : ti.ar) + '</span>' +
                    '<span>🏫 ' + esc(cls ? (window.CHL.lang === 'en' && cls.nameEn ? cls.nameEn : cls.name) : '—') + '</span>' +
                    '<span>' + (done ? '✅ ' + t('تم الإنجاز', 'Completed') : (dueOver ? '🔴 ' + t('متأخر', 'Overdue') : '⏰ ' + fmtDate(a.dueDate))) + '</span></div>' +
                    (a.description ? '<div class="assignment-desc">' + esc(window.CHL.lang === 'en' && a.descriptionEn ? a.descriptionEn : a.description) + '</div>' : '') +
                    '</div>' +
                    '<div class="assignment-actions">' +
                    '<a class="btn btn-sm btn-purple" href="' + href + '">' + (done ? t('إعادة', 'Retry') : t('🚀 ابدأ', '🚀 Start')) + '</a>' +
                    (done ? '' : '<button class="btn btn-sm btn-primary" data-act="submit-asg" data-id="' + a.id + '">' + t('✔ أنجزت', '✔ Done') + '</button>') +
                    '</div></div>';
            });
            html += section(t('📝 الواجبات', '📝 Assignments'), '<div class="assignment-list">' + list + '</div>');
        }

        return html;
    }

    function renderUser(user) {
        var prog = user.progress || {};
        var achTotal = typeof window.achievementDB !== 'undefined' ? window.achievementDB.length : 0;
        var achUnlocked = Object.keys(prog.achievements || {}).length;
        var xp = prog.xp || 0;
        var maxXp = 400;
        var pct = Math.min(100, Math.round((xp / maxXp) * 100));

        /* TASK-007: dynamic experiment count — prefer the retained experiment
           catalog count exposed by the experiments page; otherwise fall back to
           a dynamic reaction-derived count. Never a hard-coded literal. */
        var expCount = (window.CHL && typeof window.CHL.experimentCount === 'number' && isFinite(window.CHL.experimentCount))
            ? window.CHL.experimentCount
            : (typeof reactions !== 'undefined' && reactions ? Object.keys(reactions).length : 0);

        var html = '';
        html += section(t('📊 تقدمك', '📊 Your progress'),
            '<div class="dash-grid">' +
            statTile('⭐', xp + ' XP', t('نقاط الخبرة', 'XP'), 'purple') +
            statTile('🏆', achUnlocked + '/' + achTotal, t('الإنجازات', 'Achievements'), 'green', 'profile.html') +
            statTile('📝', (prog.quizBest || 0) + '/10', t('أفضل اختبار', 'Best quiz'), 'blue', 'quiz.html') +
            statTile('⚗️', (prog.experimentsDone || []).length, t('تجارب منفذة', 'Experiments done'), 'orange', 'lab.html') +
            '</div>' +
            '<div class="card level-meter"><div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;"><span>' + levelOf(xp).ar + '</span><span>' + xp + ' / ' + maxXp + ' XP</span></div>' +
            '<div class="progress-bar"><span style="width:' + pct + '%;"></span></div></div>');

        html += section(t('⚡ ابدأ من هنا', '⚡ Start here'),
            '<div class="quick-links">' +
            '<a class="quick-link" href="lab.html"><span class="icon">⚗️</span><span class="name">' + t('المعمل', 'Lab') + '</span><span class="sub">' + t('185 مادة', '185 materials') + '</span></a>' +
            '<a class="quick-link" href="lessons.html"><span class="icon">📖</span><span class="name">' + t('الدروس', 'Lessons') + '</span><span class="sub">' + t('6 دروس', '6 lessons') + '</span></a>' +
            '<a class="quick-link" href="quiz.html"><span class="icon">📝</span><span class="name">' + t('الاختبار', 'Quiz') + '</span><span class="sub">' + t('20 سؤالاً', '20 questions') + '</span></a>' +
            '<a class="quick-link" href="experiments.html"><span class="icon">📚</span><span class="name">' + t('التجارب', 'Experiments') + '</span><span class="sub">' + t(expCount + ' تجربة', expCount + ' experiments') + '</span></a>' +
            '<a class="quick-link" href="profile.html"><span class="icon">🏆</span><span class="name">' + t('الإنجازات', 'Achievements') + '</span><span class="sub">' + t('ملفك الشخصي', 'Your profile') + '</span></a>' +
            '</div>');
        return html;
    }

    /* ---------- Bindings & modals ---------- */
    function bind() {
        var user = Auth.currentUser();
        var root = document.getElementById('dashRoot');

        /* New class */
        var btnNew = document.getElementById('btnNewClass');
        if (btnNew) btnNew.addEventListener('click', function () { window.CHLUI.openModal('classModal'); });
        var saveClass = document.getElementById('saveClass');
        if (saveClass) saveClass.addEventListener('click', function () {
            var name = document.getElementById('clsName').value.trim();
            if (!name) { window.CHLUI.toast(t('أدخل اسم الفصل', 'Enter class name'), 'warning', '⚠️'); return; }
            var code = 'CH' + Math.floor(100 + Math.random() * 900);
            DB.classes.upsert(DB.uid(), {
                id: DB.uid(), name: name, nameEn: name, code: code,
                teacherId: user.id, description: document.getElementById('clsDesc').value.trim(), descriptionEn: '',
                studentIds: [], createdAt: Date.now()
            });
            window.CHLUI.closeModal('classModal');
            window.CHLUI.toast(t('تم إنشاء الفصل! رمز الانضمام: ' + code, 'Class created! Join code: ' + code), 'success', '🏫');
            render();
        });

        /* Join class */
        var btnJoin = document.getElementById('btnJoinClass');
        if (btnJoin) btnJoin.addEventListener('click', function () { window.CHLUI.openModal('joinModal'); });
        var saveJoin = document.getElementById('saveJoin');
        if (saveJoin) saveJoin.addEventListener('click', function () {
            var code = document.getElementById('joinCode').value.trim().toUpperCase();
            var cls = DB.classes.list().filter(function (c) { return (c.code || '').toUpperCase() === code; })[0];
            if (!cls) { window.CHLUI.toast(t('رمز الفصل غير صحيح', 'Invalid class code'), 'danger', '⚠️'); return; }
            if ((user.classIds || []).indexOf(cls.id) !== -1) { window.CHLUI.toast(t('أنت عضو في هذا الفصل', 'Already in this class'), 'warning', 'ℹ️'); return; }
            if ((cls.studentIds || []).indexOf(user.id) === -1) {
                cls.studentIds = (cls.studentIds || []).concat([user.id]);
                DB.classes.upsert(cls.id, cls);
            }
            user.classIds = (user.classIds || []).concat([cls.id]);
            DB.users.upsert(user.id, user);
            window.CHLUI.closeModal('joinModal');
            window.CHLUI.toast(t('تم الانضمام للفصل!', 'Joined the class!'), 'success', '🎉');
            render();
        });

        /* Add student */
        var addStudentClassId = null;
        root.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-act="add-student"]');
            if (btn) {
                addStudentClassId = btn.dataset.id;
                document.getElementById('stdEmail').value = '';
                document.getElementById('stdName').value = '';
                window.CHLUI.openModal('addStudentModal');
            }
        });
        var saveAdd = document.getElementById('saveAddStudent');
        if (saveAdd) saveAdd.addEventListener('click', function () {
            if (!addStudentClassId) return;
            var cls = DB.classes.getById(addStudentClassId);
            if (!cls) return;
            var email = document.getElementById('stdEmail').value.trim().toLowerCase();
            if (!email) { window.CHLUI.toast(t('أدخل بريد الطالب', 'Enter student email'), 'warning', '⚠️'); return; }
            var student = DB.users.list().filter(function (u) { return u.email === email; })[0];
            if (!student) {
                var res = Auth.register({ name: document.getElementById('stdName').value.trim() || email.split('@')[0], email: email, password: document.getElementById('stdPass').value || 'student123', role: 'student' });
                if (res.error) { window.CHLUI.toast(res.error, 'danger', '⚠️'); return; }
                student = res.user;
                window.CHLUI.toast(t('تم إنشاء حساب الطالب: ' + email, 'Created student account: ' + email), 'success', '🎓');
            }
            if (student.role !== 'student' && student.role !== 'user') { window.CHLUI.toast(t('المستخدم ليس طالباً', 'User is not a student'), 'warning', '⚠️'); return; }
            if ((cls.studentIds || []).indexOf(student.id) === -1) {
                cls.studentIds = (cls.studentIds || []).concat([student.id]);
                DB.classes.upsert(cls.id, cls);
            }
            student.classIds = (student.classIds || []).concat([cls.id]);
            DB.users.upsert(student.id, student);
            window.CHLUI.closeModal('addStudentModal');
            window.CHLUI.toast(t('تمت إضافة الطالب للفصل!', 'Student added to class!'), 'success', '✅');
            render();
        });

        /* Remove student chip */
        root.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-act="remove-student"]');
            if (!btn) return;
            var clsId = btn.dataset.class, stdId = btn.dataset.student;
            var cls = DB.classes.getById(clsId);
            if (!cls) return;
            cls.studentIds = (cls.studentIds || []).filter(function (s) { return s !== stdId; });
            DB.classes.upsert(clsId, cls);
            var st = DB.users.getById(stdId);
            if (st) {
                st.classIds = (st.classIds || []).filter(function (c) { return c !== clsId; });
                DB.users.upsert(stdId, st);
            }
            window.CHLUI.toast(t('تمت إزالة الطالب', 'Student removed'), 'info', 'ℹ️');
            render();
        });

        /* Manage class (expand) */
        root.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-act="manage-class"]');
            if (!btn) return;
            var cls = DB.classes.getById(btn.dataset.id);
            if (!cls) return;
            var existing = root.querySelector('.class-detail[data-class="' + cls.id + '"]');
            if (existing) { existing.remove(); return; }
            var card = btn.closest('.class-card');
            var students = (cls.studentIds || []).map(function (id) { return DB.users.getById(id); }).filter(Boolean);
            var div = document.createElement('div');
            div.className = 'card class-detail';
            div.dataset.class = cls.id;
            div.style.marginTop = '14px';
            var chips = students.length === 0
                ? '<div style="font-size:12px;color:var(--text-secondary);padding:8px 0;">' + t('لا طلاب بعد. أضف طلاباً برمز الانضمام أو من زر "+ طالب".', 'No students yet. Add students via the join code or the "+ Student" button.') + '</div>'
                : students.map(function (s) {
                    var sn = window.CHL.lang === 'en' && s.nameEn ? s.nameEn : s.name;
                    return '<span class="student-chip">' + esc(sn) + '<button class="x" data-act="remove-student" data-class="' + cls.id + '" data-student="' + s.id + '" title="' + t('إزالة', 'Remove') + '">✕</button></span>';
                }).join('');
            div.innerHTML = '<div class="card-title">' + t('👥 طلاب الفصل', '👥 Class students') + ' <span class="tag tag-blue">' + cls.code + '</span></div>' + chips +
                '<div style="margin-top:10px;font-size:12px;color:var(--text-secondary);">' + t('شارك رمز الانضمام مع طلابك ليدخلوا بأنفسهم.', 'Share the join code with students so they can join themselves.') + '</div>';
            card.appendChild(div);
        });

        /* Create assignment */
        var createClassId = null;
        root.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-act="create-asg"]');
            if (btn) {
                createClassId = btn.dataset.id;
                openAsgModal();
            }
        });
        var saveAsg = document.getElementById('saveAssignment');
        if (saveAsg) saveAsg.addEventListener('click', function () {
            if (!createClassId) return;
            var title = document.getElementById('asgTitle').value.trim();
            if (!title) { window.CHLUI.toast(t('أدخل عنوان الواجب', 'Enter assignment title'), 'warning', '⚠️'); return; }
            var type = document.getElementById('asgType').value;
            var target = document.getElementById('asgTarget').value;
            var due = document.getElementById('asgDue').value;
            DB.assignments.upsert(DB.uid(), {
                id: DB.uid(), classId: createClassId, teacherId: user.id,
                title: title, titleEn: title, type: type, target: target,
                description: document.getElementById('asgDesc').value.trim(), descriptionEn: '',
                dueDate: due ? new Date(due).getTime() : null, createdAt: Date.now()
            });
            window.CHLUI.closeModal('assignmentModal');
            window.CHLUI.toast(t('تم نشر الواجب!', 'Assignment published!'), 'success', '📝');
            render();
        });

        /* Submit assignment */
        root.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-act="submit-asg"]');
            if (!btn) return;
            if (submitAssignment(btn.dataset.id, user.id, {})) {
                var prog = user.progress || {};
                prog.xp = (prog.xp || 0) + 10;
                DB.users.upsert(user.id, Object.assign({}, user, { progress: prog }));
                window.CHLUI.toast(t('+10 XP — تم تسجيل إنجازك!', '+10 XP — Progress recorded!'), 'success', '🏆');
                render();
            }
        });

        var closeBtns = {
            'closeClassModal': 'classModal', 'closeJoinModal': 'joinModal',
            'closeAssignmentModal': 'assignmentModal', 'closeAddStudentModal': 'addStudentModal'
        };
        Object.keys(closeBtns).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('click', function () { window.CHLUI.closeModal(closeBtns[id]); });
        });
        ['classModal', 'joinModal', 'assignmentModal', 'addStudentModal'].forEach(function (m) {
            var el = document.getElementById(m);
            if (el) el.addEventListener('click', function (e) {
                if (e.target === this) window.CHLUI.closeModal(m);
            });
        });

        /* Assignment type -> target options */
        var asgType = document.getElementById('asgType');
        if (asgType) asgType.addEventListener('change', fillAsgTarget);
    }

    function fillAsgTarget() {
        var type = document.getElementById('asgType').value;
        var sel = document.getElementById('asgTarget');
        var opts = [];
        if (type === 'lab') {
            Object.keys(experimentTitles).forEach(function (k) {
                var e = experimentTitles[k];
                opts.push('<option value="' + k + '">' + (window.CHL.lang === 'en' ? e.en : e.ar) + '</option>');
            });
        } else if (type === 'lesson') {
            for (var i = 1; i <= 6; i++) opts.push('<option value="' + i + '">' + t('الدرس ' + i, 'Lesson ' + i) + '</option>');
        } else {
            opts.push('<option value="default">' + t('اختبار كيمياء عام', 'General chemistry quiz') + '</option>');
        }
        sel.innerHTML = opts.join('');
    }
    function openAsgModal() {
        fillAsgTarget();
        window.CHLUI.openModal('assignmentModal');
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('dashRoot')) render();
    });
})();

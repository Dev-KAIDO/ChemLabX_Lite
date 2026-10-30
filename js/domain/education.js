/* ==========================================================================
   ChemLabX 4.0.0-foundation — Education Domain Foundation (TASK-011)
   Pure, UI-free, offline-first domain over the existing CHLDB persistence
   boundary: Teacher/Student profiles, Course, Class, Assignment (with
   lesson/experiment/quiz content references) and Submission.

   Scope fixed to the TASK-011 contract:
   - Identity stays as-is: a Teacher/Student PROFILE (keys 'teachers' /
     'students') is linked 1:1 to an existing CHLDB.users record by user.id.
     No new account system, no new login.
   - Courses are lightweight profile-style records (key 'courses'); a class
     may reference several courseIds (prototype only).
   - Class, Assignment and Submission REUSE the existing CHLDB collections
     (`classes`, `assignments`, `submissions`) so the delivered records stay
     page-compatible (teacherId code studentIds / teacherId title type target
     dueDate / studentId status submittedAt). Domain-only fields are ADDED
     (teacherIds[], courseIds[], lessonRefs[]…, status, orgId:null,
     entityVersion); never removed.
   - orgId is always null and inert. Non-null orgId input is REJECTED
     (this phase has no org identity; no org semantics are fabricated).
   - Lifecycle is archive-only: no destructive deletes of domain records.

   Authorization: NO new permission atoms are added to js/domain/
   authorization.js. Every mutation/read re-checks the existing canonical
   roles (admin/teacher/student/user) with CHL.authorization.normalizeRole
   and fails closed. The actor's real CHLDB.users role is preferred whenever
   the actor id resolves to a stored user (anti-spoof); otherwise the
   provided role string is normalized exactly like CHLAuth.guest() does.
   Like the rest of the client-side app, this is correctness hardening, not
   a server-grade control (see authorization.js security boundary).

   Change Journal: Class / Assignment / Submission writes are recorded as
   'upsert' changes (CHL.changeJournal.record) at the domain write boundary.
   Teacher / Student / Course profiles are NOT journalable in TASK-011: the
   journal ENTITY_TYPES contract is ['result','submission','assignment',
   'class'] and changing it is out of scope — the gap is deliberate and
   documented (spec section 19). A journal failure NEVER breaks a domain
   write; it stays observable via changeJournal.status().failures.

   Fail-closed (all invalid input THROWS EducationError):
   - unknown/missing entity, malformed input, empty required bilingual text
   - duplicate id, duplicate class/course code, duplicate profile
   - non-canonical status, non-null orgId
   - unknown content reference (when the content pack is loaded locally)
   - unauthorized actor, unlinked/unprofiled identity, invalid resultRef
   ========================================================================== */
(function () {
    'use strict';

    var CHL = window.CHL = window.CHL || {};
    var RULES_VERSION = 'prototype-education-v1';
    var ENTITY_TYPES = ['teacher', 'student', 'course', 'class', 'assignment', 'submission'];

    var DB = window.CHLDB;

    function fail(msg) { throw new Error('EducationError: ' + msg); }
    function requireDB() { if (!DB) fail('storage unavailable'); }
    function now() { return Date.now(); }
    function deepCopy(v) {
        if (v === null || v === undefined) return v;
        try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
    }
    function text(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }
    function arrayOf(v) { return Array.isArray(v) ? deepCopy(v) : []; }
    /* Multi-tenancy is out of scope: any non-null orgId input is rejected
       (fail closed) instead of being silently dropped. */
    function rejectOrgId(opts) {
        if (opts && opts.orgId !== undefined && opts.orgId !== null) {
            fail('orgId is not supported in this phase');
        }
    }

    function provenance() {
        try {
            if (CHL && typeof CHL.provenance === 'function') {
                return CHL.provenance({ eduRules: RULES_VERSION });
            }
        } catch (e) {}
        return null;
    }

    /* ---- status vocabulary (fail-closed on anything else) ---- */
    var STATUS = {
        teacher: ['active', 'archived'],
        student: ['active', 'archived'],
        course: ['active', 'archived'],
        class: ['active', 'archived'],
        assignment: ['draft', 'published', 'archived'],
        submission: ['submitted', 'returned']
    };
    function isValidStatus(entityType, status) {
        return !!STATUS[entityType] && STATUS[entityType].indexOf(status) !== -1;
    }

    /* ================= actor context ================= */
    var _actor = null;
    function setActor(actor) { var prev = _actor; _actor = actor || null; return prev; }
    function actor() { return _actor; }
    function actorId() { return (_actor && _actor.id) ? String(_actor.id) : null; }

    /* Resolve the acting role. When the actor id maps to a real stored user
       record its role wins (an explicit spoofed role cannot elevate);
       otherwise the provided role string is normalized fail-closed. */
    function roleOf(actorU) {
        var a = actorU || _actor;
        if (!a) return null;
        var role = null;
        if (a.id && DB && DB.users) {
            var u = DB.users.getById(a.id);
            if (u && typeof u.role === 'string') role = u.role;
        }
        if (role === null && typeof a.role === 'string') role = a.role;
        var A = CHL.authorization;
        if (A && typeof A.normalizeRole === 'function') return A.normalizeRole(role);
        return ['admin', 'teacher', 'student', 'user'].indexOf(role) !== -1 ? role : 'user';
    }
    function requireRole(allowed) {
        var role = roleOf();
        if (!role || allowed.indexOf(role) === -1) {
            fail('forbidden for role "' + (role || 'none') + '"');
        }
        return role;
    }

    /* ================= storage helpers ================= */
    function profiles(name) {
        requireDB();
        var m = DB.get(name, {});
        return (m && typeof m === 'object') ? m : {};
    }
    function saveProfile(name, rec) {
        var m = deepCopy(profiles(name));
        m[rec.id] = rec;
        DB.set(name, m);
        return rec;
    }
    function profileById(name, id) {
        var rec = profiles(name)[String(id)];
        return rec ? deepCopy(rec) : null;
    }
    function profileList(name) {
        var m = profiles(name);
        return Object.keys(m).map(function (k) { return deepCopy(m[k]); });
    }

    /* Record lifecycle: entityVersion starts at 1, monotonic; orgId is
       always null; timestamps are stamped at each write. */
    function baseRecord(extra) {
        var rec = deepCopy(extra || {});
        if (rec.orgId !== undefined && rec.orgId !== null) fail('orgId is not supported in this phase');
        rec.orgId = null;
        rec.entityVersion = (typeof rec.entityVersion === 'number') ? rec.entityVersion : 1;
        if (!rec.createdAt) rec.createdAt = now();
        rec.updatedAt = now();
        if (!rec.provenance) rec.provenance = provenance();
        return rec;
    }
    function bump(rec) {
        var copy = deepCopy(rec);
        copy.entityVersion = ((typeof copy.entityVersion === 'number') ? copy.entityVersion : 0) + 1;
        copy.updatedAt = now();
        return copy;
    }
    function generateId() {
        requireDB();
        return DB.uid();
    }
    function assertFreshId(coll, id) {
        if (typeof id !== 'string' || !id) fail('record id required');
        if (coll.getById(id)) fail('duplicate id "' + id + '"');
    }

    /* ================= change journal (class/assignment/submission ONLY) == */
    function journal(entityType, entityId, actor) {
        try {
            var CJ = CHL.changeJournal;
            if (CJ && typeof CJ.record === 'function' &&
                CJ.ENTITY_TYPES && CJ.ENTITY_TYPES.indexOf(entityType) !== -1) {
                CJ.record(entityType, entityId, 'upsert', { id: entityId }, actor || null);
            }
        } catch (e) { /* journal failure never breaks the domain write */ }
    }

    /* ================= content-reference validation ================= */
    function contentLoaded(name) {
        return !!(CHL.content && CHL.content.isLoaded && CHL.content.isLoaded(name));
    }
    function validateRefs(opts) {
        var lessonRefs = arrayOf(opts.lessonRefs);
        var experimentRefs = arrayOf(opts.experimentRefs);
        var quizRefs = arrayOf(opts.quizRefs);
        if (lessonRefs.length + experimentRefs.length + quizRefs.length === 0) {
            fail('assignment requires at least one content reference');
        }
        var checks = [
            ['lessons', lessonRefs],
            ['experiments', experimentRefs],
            ['quiz', quizRefs]
        ];
        for (var i = 0; i < checks.length; i++) {
            var pack = checks[i][0];
            var refs = checks[i][1];
            if (!contentLoaded(pack)) continue; /* lenient when the local pack is absent */
            var keys = CHL.content.keys(pack).map(String);
            for (var j = 0; j < refs.length; j++) {
                if (keys.indexOf(String(refs[j])) === -1) {
                    fail('unknown ' + pack + ' reference "' + refs[j] + '"');
                }
            }
        }
        return { lessonRefs: lessonRefs, experimentRefs: experimentRefs, quizRefs: quizRefs };
    }
    function deriveType(refs) {
        if (refs.experimentRefs.length) return { type: 'lab', target: String(refs.experimentRefs[0]) };
        if (refs.lessonRefs.length) return { type: 'lesson', target: String(refs.lessonRefs[0]) };
        return { type: 'quiz', target: String(refs.quizRefs[0] || '') };
    }

    /* ================= teacher / student / course profiles =============== */
    function linkedUser(userId, role) {
        requireDB();
        var u = DB.users.getById(userId);
        if (!u) fail('user record "' + userId + '" does not exist');
        if (u.role !== role) fail('user "' + userId + '" is not a ' + role);
        return u;
    }

    function createTeacher(opts) {
        requireRole(['admin']);
        requireDB();
        opts = opts || {};
        rejectOrgId(opts);
        var userId = text(opts.userId);
        if (!userId) fail('teacher userId required');
        if (profileById('teachers', userId)) fail('teacher profile already exists for "' + userId + '"');
        var u = linkedUser(userId, 'teacher');
        var rec = baseRecord({
            id: userId,
            userId: userId,
            name: u.name || '',
            nameEn: u.nameEn || '',
            email: u.email || '',
            role: 'teacher',
            status: 'active',
            school: opts.school != null ? String(opts.school) : '',
            schoolEn: opts.schoolEn != null ? String(opts.schoolEn) : ''
        });
        return saveProfile('teachers', rec);
    }
    function getTeacher(userId) { return profileById('teachers', userId); }
    function listTeachers() { return profileList('teachers'); }
    function archiveTeacher(userId) { return archiveProfile('teachers', userId); }

    function createStudent(opts) {
        requireRole(['admin']);
        requireDB();
        opts = opts || {};
        rejectOrgId(opts);
        var userId = text(opts.userId);
        if (!userId) fail('student userId required');
        if (profileById('students', userId)) fail('student profile already exists for "' + userId + '"');
        var u = linkedUser(userId, 'student');
        var rec = baseRecord({
            id: userId,
            userId: userId,
            name: u.name || '',
            nameEn: u.nameEn || '',
            email: u.email || '',
            role: 'student',
            status: 'active',
            level: opts.level || 'beginner',
            classIds: []
        });
        return saveProfile('students', rec);
    }
    function getStudent(userId) { return profileById('students', userId); }
    function listStudents() { return profileList('students'); }
    function archiveStudent(userId) { return archiveProfile('students', userId); }

    function createCourse(opts) {
        requireRole(['admin', 'teacher']);
        requireDB();
        opts = opts || {};
        rejectOrgId(opts);
        var name = text(opts.name);
        var nameEn = text(opts.nameEn);
        var code = text(opts.code);
        if (!name || !nameEn || !code) fail('course name/nameEn/code required');
        var dup = profileList('courses').filter(function (c) { return c.code === code; });
        if (dup.length) fail('duplicate course code "' + code + '"');
        var id = (opts.id !== undefined && opts.id !== null) ? String(opts.id) : generateId();
        assertFreshId({ getById: function (i) { return profileById('courses', i); } }, id);
        var rec = baseRecord({
            id: id,
            name: name,
            nameEn: nameEn,
            code: code,
            description: opts.description != null ? String(opts.description) : '',
            descriptionEn: opts.descriptionEn != null ? String(opts.descriptionEn) : '',
            gradeLevel: opts.gradeLevel != null ? String(opts.gradeLevel) : '',
            status: 'active'
        });
        return saveProfile('courses', rec);
    }
    function getCourse(id) { return profileById('courses', id); }
    function listCourses() { return profileList('courses'); }
    function archiveCourse(id) { return archiveProfile('courses', id); }

    function archiveProfile(name, id) {
        requireRole(['admin']);
        requireDB();
        var rec = profileById(name, id);
        if (!rec) fail('record "' + id + '" not found');
        if (rec.status === 'archived') fail('already archived');
        var updated = bump(rec);
        updated.status = 'archived';
        return saveProfile(name, updated);
    }

    /* ================= class ================= */
    function classById(id) {
        requireDB();
        var rec = DB.classes.getById(id);
        return rec ? deepCopy(rec) : null;
    }
    function listClasses() { requireDB(); return DB.classes.list().map(deepCopy); }
    function requireClassOwner(rec, role) {
        if (role === 'admin') return;
        if (!rec) fail('class not found');
        var tids = rec.teacherIds || [];
        if (tids.indexOf(actorId()) === -1) fail('not the teacher of this class');
    }
    function syncStudentClassIds(studentIds, classId, add) {
        requireDB();
        for (var i = 0; i < studentIds.length; i++) {
            var sid = studentIds[i];
            var st = profileById('students', sid);
            if (!st) continue;
            var list = st.classIds || [];
            var has = list.indexOf(classId) !== -1;
            if (add && !has) { st = bump(st); st.classIds = list.concat([classId]); saveProfile('students', st); }
            else if (!add && has) { st = bump(st); st.classIds = list.filter(function (x) { return x !== classId; }); saveProfile('students', st); }
        }
    }

    function createClass(opts) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        opts = opts || {};
        rejectOrgId(opts);
        var name = text(opts.name);
        var nameEn = text(opts.nameEn);
        var code = text(opts.code);
        if (!name || !nameEn || !code) fail('class name/nameEn/code required');
        var teacherId = text(opts.teacherId);
        if (!teacherId || !profileById('teachers', teacherId)) fail('teacher profile "' + teacherId + '" does not exist');
        if (role === 'teacher' && actorId() !== teacherId) fail('a teacher only opens classes for themselves');
        var studentIds = arrayOf(opts.studentIds);
        var courseIds = arrayOf(opts.courseIds);
        for (var i = 0; i < studentIds.length; i++) {
            if (!profileById('students', studentIds[i])) fail('student profile "' + studentIds[i] + '" does not exist');
        }
        for (var j = 0; j < courseIds.length; j++) {
            if (!profileById('courses', courseIds[j])) fail('course "' + courseIds[j] + '" does not exist');
        }
        var dup = DB.classes.list().filter(function (c) { return c.code === code; });
        if (dup.length) fail('duplicate class code "' + code + '"');
        var id = (opts.id !== undefined && opts.id !== null) ? String(opts.id) : generateId();
        assertFreshId(DB.classes, id);
        var rec = baseRecord({
            id: id,
            name: name,
            nameEn: nameEn,
            code: code,
            teacherId: teacherId,
            teacherIds: [teacherId],
            courseIds: courseIds,
            studentIds: studentIds,
            description: opts.description != null ? String(opts.description) : '',
            descriptionEn: opts.descriptionEn != null ? String(opts.descriptionEn) : '',
            status: 'active'
        });
        DB.classes.upsert(id, rec);
        journal('class', id, actorId());
        syncStudentClassIds(studentIds, id, true);
        return classById(id);
    }

    function updateClass(id, patch) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var rec = classById(id);
        if (!rec) fail('class "' + id + '" not found');
        requireClassOwner(rec, role);
        patch = patch || {};
        rejectOrgId(patch);
        var updated = bump(rec);
        var req = ['name', 'nameEn', 'code'];
        for (var f = 0; f < req.length; f++) {
            if (patch[req[f]] !== undefined) {
                var v = text(patch[req[f]]);
                if (!v) fail('class field "' + req[f] + '" required');
                updated[req[f]] = v;
            }
        }
        if (patch.description !== undefined) updated.description = String(patch.description);
        if (patch.descriptionEn !== undefined) updated.descriptionEn = String(patch.descriptionEn);
        if (updated.code !== rec.code) {
            var hasDup = DB.classes.list().some(function (c) { return c.id !== id && c.code === updated.code; });
            if (hasDup) fail('duplicate class code "' + updated.code + '"');
        }
        if (patch.courseIds !== undefined) {
            updated.courseIds = arrayOf(patch.courseIds);
            for (var i = 0; i < updated.courseIds.length; i++) {
                if (!profileById('courses', updated.courseIds[i])) fail('course "' + updated.courseIds[i] + '" does not exist');
            }
        }
        DB.classes.upsert(id, updated);
        journal('class', id, actorId());
        return classById(id);
    }

    function addStudentToClass(id, studentId) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var rec = classById(id);
        if (!rec) fail('class "' + id + '" not found');
        if (rec.status !== 'active') fail('class is not active');
        requireClassOwner(rec, role);
        if (!profileById('students', studentId)) fail('student profile "' + studentId + '" does not exist');
        var list = rec.studentIds || [];
        if (list.indexOf(studentId) !== -1) fail('student already enrolled');
        var updated = bump(rec);
        updated.studentIds = list.concat([studentId]);
        DB.classes.upsert(id, updated);
        journal('class', id, actorId());
        syncStudentClassIds([studentId], id, true);
        return classById(id);
    }

    function removeStudentFromClass(id, studentId) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var rec = classById(id);
        if (!rec) fail('class "' + id + '" not found');
        requireClassOwner(rec, role);
        var list = rec.studentIds || [];
        if (list.indexOf(studentId) === -1) fail('student not enrolled');
        var updated = bump(rec);
        updated.studentIds = list.filter(function (x) { return x !== studentId; });
        DB.classes.upsert(id, updated);
        journal('class', id, actorId());
        syncStudentClassIds([studentId], id, false);
        return classById(id);
    }

    function archiveClass(id) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var rec = classById(id);
        if (!rec) fail('class "' + id + '" not found');
        if (rec.status === 'archived') fail('already archived');
        requireClassOwner(rec, role);
        var updated = bump(rec);
        updated.status = 'archived';
        DB.classes.upsert(id, updated);
        journal('class', id, actorId());
        return classById(id);
    }

    /* ================= assignment ================= */
    function assignmentById(id) {
        requireDB();
        var rec = DB.assignments.getById(id);
        return rec ? deepCopy(rec) : null;
    }
    function listAssignments() { requireDB(); return DB.assignments.list().map(deepCopy); }

    function createAssignment(opts) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        opts = opts || {};
        rejectOrgId(opts);
        var classId = text(opts.classId);
        if (!classId) fail('assignment classId required');
        var cls = classById(classId);
        if (!cls) fail('class "' + classId + '" not found');
        if (cls.status !== 'active') fail('class is not active');
        requireClassOwner(cls, role);
        var title = text(opts.title);
        var titleEn = text(opts.titleEn);
        if (!title || !titleEn) fail('assignment title/titleEn required');
        var refs = validateRefs(opts);
        var derived = deriveType(refs);
        var courseId = (opts.courseId !== undefined && opts.courseId !== null) ? String(opts.courseId) :
            ((cls.courseIds && cls.courseIds[0]) || null);
        if (courseId && !profileById('courses', courseId)) fail('course "' + courseId + '" does not exist');
        var dueAt = (typeof opts.dueAt === 'number') ? opts.dueAt : null;
        var availableFrom = (typeof opts.availableFrom === 'number') ? opts.availableFrom : null;
        if (dueAt !== null && availableFrom !== null && availableFrom > dueAt) fail('availableFrom must be before dueAt');
        var id = (opts.id !== undefined && opts.id !== null) ? String(opts.id) : generateId();
        assertFreshId(DB.assignments, id);
        var teacherId = cls.teacherId || (cls.teacherIds && cls.teacherIds[0]) || null;
        var rec = baseRecord({
            id: id,
            classId: classId,
            courseId: courseId,
            teacherId: teacherId,
            createdBy: actorId(),
            title: title,
            titleEn: titleEn,
            type: derived.type,
            target: derived.target,
            lessonRefs: refs.lessonRefs,
            experimentRefs: refs.experimentRefs,
            quizRefs: refs.quizRefs,
            description: opts.description != null ? String(opts.description) : '',
            descriptionEn: opts.descriptionEn != null ? String(opts.descriptionEn) : '',
            availableFrom: availableFrom,
            dueAt: dueAt,
            dueDate: dueAt, /* page-compat alias */
            status: 'draft'
        });
        DB.assignments.upsert(id, rec);
        journal('assignment', id, actorId());
        return assignmentById(id);
    }

    function publishAssignment(id) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var rec = assignmentById(id);
        if (!rec) fail('assignment "' + id + '" not found');
        requireClassOwner(classById(rec.classId), role);
        if (rec.status !== 'draft') fail('only a draft assignment can be published');
        var updated = bump(rec);
        updated.status = 'published';
        DB.assignments.upsert(id, updated);
        journal('assignment', id, actorId());
        return assignmentById(id);
    }

    function archiveAssignment(id) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var rec = assignmentById(id);
        if (!rec) fail('assignment "' + id + '" not found');
        requireClassOwner(classById(rec.classId), role);
        if (rec.status === 'archived') fail('already archived');
        var updated = bump(rec);
        updated.status = 'archived';
        DB.assignments.upsert(id, updated);
        journal('assignment', id, actorId());
        return assignmentById(id);
    }

    /* ================= submission ================= */
    function submissionById(id) {
        requireDB();
        var rec = DB.submissions.getById(id);
        return rec ? deepCopy(rec) : null;
    }
    function listSubmissions() { requireDB(); return DB.submissions.list().map(deepCopy); }
    function nextAttempt(assignmentId, studentId) {
        var list = DB.submissions.list().filter(function (s) {
            return s.assignmentId === assignmentId && s.studentId === studentId;
        });
        var max = 0;
        for (var i = 0; i < list.length; i++) {
            var a = list[i].attempt;
            if (typeof a === 'number' && a > max) max = a;
        }
        return max + 1;
    }
    function normalizeResultRef(resultRef) {
        var v = String(resultRef);
        return v.indexOf('result:') === 0 ? v : 'result:' + v;
    }
    function resultResolves(resultRef) {
        var bare = String(resultRef).replace(/^result:/, '');
        return (DB.results.getById(bare) !== null) || (DB.results.getById(String(resultRef)) !== null);
    }

    function submitAssignment(opts) {
        var role = requireRole(['admin', 'student']);
        requireDB();
        opts = opts || {};
        rejectOrgId(opts);
        var assignmentId = text(opts.assignmentId);
        if (!assignmentId) fail('submission assignmentId required');
        var asg = assignmentById(assignmentId);
        if (!asg) fail('assignment "' + assignmentId + '" not found');
        if (asg.status !== 'published') fail('assignment is not published');
        if (asg.availableFrom && asg.availableFrom > now()) fail('assignment is not available yet');
        var cls = classById(asg.classId);
        if (!cls || cls.status !== 'active') fail('class is not active');
        var studentId = text(opts.studentId) || (role === 'student' ? actorId() : '');
        if (!studentId) fail('submission studentId required');
        if (role === 'student' && actorId() !== studentId) fail('a student only submits for themselves');
        if (!profileById('students', studentId)) fail('student profile "' + studentId + '" does not exist');
        var resultRef = null;
        if (opts.resultRef !== undefined && opts.resultRef !== null) {
            if (!resultResolves(opts.resultRef)) fail('resultRef does not resolve to a stored result');
            resultRef = normalizeResultRef(opts.resultRef);
        }
        var id = generateId();
        var rec = baseRecord({
            id: id,
            assignmentId: assignmentId,
            classId: asg.classId,
            studentId: studentId,
            userId: studentId, /* page-compat: pages dedupe by userId */
            status: 'submitted',
            result: opts.result !== undefined ? deepCopy(opts.result) : {},
            resultRef: resultRef,
            attempt: nextAttempt(assignmentId, studentId),
            submittedAt: now(),
            returnedAt: null
        });
        DB.submissions.upsert(id, rec);
        journal('submission', id, actorId());
        return submissionById(id);
    }

    function returnSubmission(id, feedback) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var rec = submissionById(id);
        if (!rec) fail('submission "' + id + '" not found');
        var cls = classById(rec.classId);
        requireClassOwner(cls, role);
        if (rec.status !== 'submitted') fail('submission is not in submitted state');
        var updated = bump(rec);
        updated.status = 'returned';
        updated.returnedAt = now();
        if (feedback !== undefined) updated.feedback = String(feedback);
        DB.submissions.upsert(id, updated);
        journal('submission', id, actorId());
        return submissionById(id);
    }

    /* ================= reads (role-scoped, fail closed) ================= */
    function submissionsForClass(classId) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var cls = classById(classId);
        if (!cls) fail('class "' + classId + '" not found');
        requireClassOwner(cls, role);
        return DB.submissions.list().filter(function (s) { return s.classId === classId; }).map(deepCopy);
    }
    function submissionsForAssignment(assignmentId) {
        var role = requireRole(['admin', 'teacher']);
        requireDB();
        var asg = assignmentById(assignmentId);
        if (!asg) fail('assignment "' + assignmentId + '" not found');
        requireClassOwner(classById(asg.classId), role);
        return DB.submissions.list().filter(function (s) { return s.assignmentId === assignmentId; }).map(deepCopy);
    }
    function submissionsForStudent(studentId) {
        var role = requireRole(['admin', 'teacher', 'student']);
        requireDB();
        if (role === 'student' && actorId() !== studentId) fail('a student only reads their own submissions');
        return DB.submissions.list().filter(function (s) { return s.studentId === studentId; }).map(deepCopy);
    }

    /* ================= public API ================= */
    function statusCopy() {
        var out = {};
        Object.keys(STATUS).forEach(function (k) { out[k] = STATUS[k].slice(); });
        return out;
    }

    CHL.education = window.Education = {
        RULES_VERSION: function () { return RULES_VERSION; },
        ENTITY_TYPES: ENTITY_TYPES.slice(),
        STATUS: statusCopy(),
        isValidStatus: isValidStatus,
        setActor: setActor,
        actor: actor,
        createTeacher: createTeacher,
        getTeacher: getTeacher,
        listTeachers: listTeachers,
        archiveTeacher: archiveTeacher,
        createStudent: createStudent,
        getStudent: getStudent,
        listStudents: listStudents,
        archiveStudent: archiveStudent,
        createCourse: createCourse,
        getCourse: getCourse,
        listCourses: listCourses,
        archiveCourse: archiveCourse,
        createClass: createClass,
        getClass: classById,
        listClasses: listClasses,
        updateClass: updateClass,
        addStudentToClass: addStudentToClass,
        removeStudentFromClass: removeStudentFromClass,
        archiveClass: archiveClass,
        createAssignment: createAssignment,
        getAssignment: assignmentById,
        listAssignments: listAssignments,
        publishAssignment: publishAssignment,
        archiveAssignment: archiveAssignment,
        submitAssignment: submitAssignment,
        returnSubmission: returnSubmission,
        getSubmission: submissionById,
        listSubmissions: listSubmissions,
        submissionsForClass: submissionsForClass,
        submissionsForAssignment: submissionsForAssignment,
        submissionsForStudent: submissionsForStudent
    };
})();
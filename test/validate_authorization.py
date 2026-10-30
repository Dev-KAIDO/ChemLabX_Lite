#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ChemLabX TASK-009 Authorization validator (deterministic, stdlib-only).

Validates the source invariants of js/domain/authorization.js WITHOUT running
JavaScript (mirrors test/validate_content.py's approach): the canonical role
vocabulary, the minimal permission vocabulary, the role->permission matrix, and
the fail-closed guarantees that this application relies on.

This is NOT a runtime test (runtime behavior is covered by the harness A-suite).
It is a deterministic source-contract check used as a fast regression gate.

Success criteria (constraints):
  - Canonical roles == exactly [admin, teacher, student, user].
  - Permission names are within the approved minimal vocabulary (no invented
    class/assignment "write" permissions).
  - Matrix is strict: only 'admin' may assign roles / archive / unarchive;
    teacher/student/user/guest are lab-capable but hold no user-management.
  - normalizeRole must reduce unknown roles to 'user' (never to a privileged
    role) and isValidRole must accept exactly the canonical set.
  - authorize must be fail-closed: unknown permission -> deny.

Exit code 0 = PASS, 1 = FAIL.
"""
import re
import sys

AUTHZ_SRC = 'js/domain/authorization.js'

EXPECTED_ROLES = ['admin', 'teacher', 'student', 'user']

# Approved minimal permission vocabulary (evidence-grounded only).
APPROVED_PERMISSIONS = {
    'users.read',
    'users.roles.assign',
    'users.archive',
    'users.unarchive',
    'users.update.self',
    'lab.run',
    'lab.mix',
    'results.attribute',
}

# Permissions only an admin may hold.
ADMIN_ONLY = {
    'users.roles.assign',
    'users.archive',
    'users.unarchive',
    'users.read',
}


def _src():
    with open(AUTHZ_SRC, 'r', encoding='utf-8') as f:
        return f.read()


def _extract_string_list(body):
    seen = []
    for m in re.finditer(r"'([^']+)'", body):
        val = m.group(1)
        if val not in seen:
            seen.append(val)
    return seen


def main():
    errors = []

    src = _src()

    # ---- 1. Canonical role vocabulary ----
    roles_block = re.search(r'var\s+ROLES\s*=\s*\[([^\]]*)\];', src)
    if not roles_block:
        errors.append('MISSING ROLES array')
        roles = []
    else:
        roles = _extract_string_list(roles_block.group(1))
    if roles != EXPECTED_ROLES:
        errors.append('ROLES != %s (got %s)' % (EXPECTED_ROLES, roles))

    # ---- 2. Permission vocabulary (subset of approved set) ----
    perms_block = re.search(r'var\s+PERMISSION_NAMES\s*=\s*\[([^\]]*)\];', src)
    if not perms_block:
        errors.append('MISSING PERMISSION_NAMES array')
        perms = []
    else:
        perms = _extract_string_list(perms_block.group(1))
    extra = [p for p in perms if p not in APPROVED_PERMISSIONS]
    if extra:
        errors.append('PERMISSIONS outside approved minimal vocabulary: %s' % extra)
    if len(set(perms)) != len(perms):
        errors.append('duplicate permissions in vocabulary')

    # ---- 3. Matrix: one row per canonical role ----
    matrix_block = re.search(r'var\s+PERMISSIONS\s*=\s*\{([^}]+)\}\s*;', src, re.S)
    if not matrix_block:
        errors.append('MISSING PERMISSIONS matrix')
        matrix = {}
    else:
        body = matrix_block.group(1)
        rows = re.finditer(
            r'(\w+)\s*:\s*\[([^\]]*)\]', body, re.S)
        matrix = {}
        for m in rows:
            rolename = m.group(1)
            matrix[rolename] = _extract_string_list(m.group(2))

    for r in EXPECTED_ROLES:
        if r not in matrix:
            errors.append('matrix missing row for role "%s"' % r)

    # ---- 4. Admin exclusivity & non-admin readonly lab ----
    for nonadmin in ['teacher', 'student', 'user']:
        row = set(matrix.get(nonadmin, []))
        over = row & ADMIN_ONLY
        if over:
            errors.append('non-admin "%s" holds admin-only permissions: %s'
                          % (nonadmin, sorted(over)))
        if 'lab.run' not in row:
            errors.append('non-admin "%s" should be lab-capable (lab.run)' % nonadmin)

    admin_row = set(matrix.get('admin', []))
    if not ADMIN_ONLY.issubset(admin_row):
        errors.append('admin row missing admin-only permissions: %s'
                      % sorted(ADMIN_ONLY - admin_row))

    # ---- 5. Fail-closed source guards ----
    if re.search(r"normalizeRole[^}]*return\s+'user'", src) is None:
        errors.append('normalizeRole missing fail-closed "return \'user\'" branch')
    if re.search(r'isValidPermission[^}]*return\s+false', src, re.S) is None:
        errors.append('authorize/isValidPermission missing fail-closed false path')
    # unknown role must NOT map to admin anywhere
    if re.search(r"normalizeRole[^}]*return\s+'admin'", src, re.S):
        errors.append('normalizeRole can elevate to admin (forbidden)')

    # ---- Report ----
    print('ChemLabX TASK-009 Authorization validator - results')
    print('  source        : %s' % AUTHZ_SRC)
    print('  roles         : %s' % roles)
    print('  permissions   : %d' % len(perms))
    print('  matrix rows   : %s' % sorted(matrix.keys()))
    if errors:
        print('ERRORS (%d):' % len(errors))
        for e in errors:
            print('  - %s' % e)
        print('RESULT: FAIL')
        return 1
    print('RESULT: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())

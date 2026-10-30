#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ChemLabX TASK-010 Change Journal validator (deterministic, stdlib-only).

Validates the source invariants of js/domain/changejournal.js WITHOUT running
JavaScript (mirrors test/validate_authorization.py / validate_content.py): the
ChangeRecord schema (all spec-required fields), the approved sync-eligible
entity vocabulary, fail-closed input rejection, version-driven ordering (not
wall-clock), idempotency by changeId, the orgId future-compatibility guarantee,
and the absence of any chemistry/safety/results/authorization business logic.

This is NOT a runtime test (runtime behavior is covered by the harness J-suite).
It is a deterministic source-contract check used as a fast regression gate.

Success criteria (constraints):
  - ChangeRecord must expose exactly the spec-required fields: changeId,
    entityType, entityId, op, baseVersion, version, payloadRef, wallClock,
    deviceId, actorId, orgId.
  - OPS == ['upsert', 'delete'].
  - ENTITY_TYPES is a fixed fail-closed set (sync-eligible persistent entities
    only) and does NOT include ephemeral/UI/session/theme/language state.
  - Invalid entityType / op / version / baseVersion (e.g. baseVersion > version)
    must be rejected (the module throws).
  - validate()/validChange must be present and enforce integer non-negative
    versions and version >= baseVersion.
  - Ordering is by per-entity version counter, NEVER wallClock: wallClock must
    never appear in comparison/sort/ordering logic.
  - orgId is always-null-by-default and never used in any decision logic.
  - Idempotency by immutable changeId (dedupe path).
  - Persistence reuses the existing CHLDB/DataPort boundary; no new store and
    no second persistence abstraction.
  - No chemistry/safety/lab/results/authorization business logic inside the
    module (must not fabricate results or make safety/award decisions).

Exit code 0 = PASS, 1 = FAIL.
"""
import re
import sys

JOURNAL_SRC = 'js/domain/changejournal.js'

REQUIRED_FIELDS = [
    'changeId', 'entityType', 'entityId', 'op', 'baseVersion', 'version',
    'payloadRef', 'wallClock', 'deviceId', 'actorId', 'orgId',
]

EXPECTED_OPS = ['upsert', 'delete']

# Approved, sync-eligible persistent entity types. Ephemeral/UI state
# (session, theme, language, temp lab state) must NOT appear.
APPROVED_TYPES = {'result', 'submission', 'assignment', 'class'}

FORBIDDEN_EPHEMERAL = {
    'theme', 'language', 'session', 'temp', 'timer', 'settings', 'ui', 'prefs',
    'achievement_cache', 'progress', 'xp',
}

# Domains whose business logic must NOT leak into the journal.
FORBIDDEN_DOMAIN_TERMS = [
    'CHEMLABX_REACTIONS', 'allowReward', 'allowPresentation', 'RULES_VERSION',
    'SAFETY_MODEL', 'UNMATCHED_REACTION', 'CONTRADICT_META', 'MAX_RECORDS',
    'normalizeRole', 'authorize', 'grantRole', 'users.archive',
]


def _src():
    with open(JOURNAL_SRC, 'r', encoding='utf-8') as f:
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

    # ---- 1. All required schema fields present in the module ----
    for field in REQUIRED_FIELDS:
        # field must be a literal object key of the returned ChangeRecord shape
        if re.search(r'\b%s\s*:' % re.escape(field), src) is None:
            errors.append('ChangeRecord missing required field: %s' % field)

    # ---- 2. OPS vocabulary ----
    ops_block = re.search(r'var\s+OPS\s*=\s*\[([^\]]*)\];', src)
    if not ops_block:
        errors.append('MISSING OPS array')
        ops = []
    else:
        ops = _extract_string_list(ops_block.group(1))
    if ops != EXPECTED_OPS:
        errors.append('OPS != %s (got %s)' % (EXPECTED_OPS, ops))

    # ---- 3. ENTITY_TYPES: fixed fail-closed, sync-eligible only ----
    types_block = re.search(r"var\s+ENTITY_TYPES\s*=\s*\[([^\]]*)\];", src)
    if not types_block:
        errors.append('MISSING ENTITY_TYPES array')
        types = []
    else:
        types = _extract_string_list(types_block.group(1))
    unknown = [t for t in types if t not in APPROVED_TYPES]
    if unknown:
        errors.append('ENTITY_TYPES outside approved sync-eligible set: %s' % unknown)
    for t in FORBIDDEN_EPHEMERAL:
        if re.search(r"\b%s\b" % t, types_block.group(1)) if types_block else False:
            errors.append('ephemeral/UI entity type present: %s' % t)
    if len(set(types)) != len(types):
        errors.append('duplicate entity types in vocabulary')

    # ---- 4. Fail-closed validation ----
    if re.search(r'function\s+validChange', src) is None:
        errors.append('MISSING validChange() guard')
    if re.search(r"ENTITY_TYPES\.indexOf\(c\.entityType\)\s*===\s*-1", src) is None and \
       re.search(r"ENTITY_TYPES\.indexOf\(c\.entityType\)\s*=== -1", src) is None:
        errors.append('validChange missing entityType reject (indexOf === -1)')
    if re.search(r'c\.version\s*<\s*c\.baseVersion', src) is None:
        errors.append('validChange missing version >= baseVersion guard')
    if re.search(r"OPS\.indexOf\(c\.op\)\s*===-1", src) is None and \
       re.search(r"OPS\.indexOf\(c\.op\)\s*=== -1", src) is None and \
       re.search(r"OPS\.indexOf\(c\.op\)\s*===\s*-1", src) is None:
        errors.append('validChange missing op reject')
    # createChange must reject bad inputs by throwing
    if re.search(r"throw new Error\('ChangeJournal: invalid entityType'\)", src) is None:
        errors.append('createChange missing invalid-entityType throw (fail closed)')
    if re.search(r"throw new Error\('ChangeJournal: invalid op'\)", src) is None:
        errors.append('createChange missing invalid-op throw (fail closed)')
    if re.search(r"throw new Error\('ChangeJournal: invalid version'\)", src) is None:
        errors.append('createChange missing invalid-version throw (fail closed)')

    # ---- 5. Ordering by version, NEVER wallClock ----
    # wallClock may only be assigned, never compared/sorted for ordering.
    if re.search(r'wallClock\s*[<>]=?', src) is not None:
        errors.append('wallClock used in an ordering comparison')
    if re.search(r'\.sort\s*\([^)]*wallClock', src, re.S) is not None:
        errors.append('wallClock used in a sort (ordering violation)')

    # ---- 6. orgId future-compat only, never a decision input ----
    org_uses = len(re.findall(r'\borgId\b', src))
    if org_uses < 3:
        errors.append('orgId should appear as a field default/type guard (future-compat)')
    if re.search(r'orgId:\s*null\b', src) is None and \
       re.search(r'\borgId\s*:\s*\([^)]*\)\s*\?\s*[^:]*\s*:\s*null\b', src) is None:
        errors.append('orgId default should be null (no org behavior)')
    # orgId must never participate in entity indexing or version/cursor math.
    if re.search(r'entityKey[^}]*orgId', src, re.S) is not None or \
       re.search(r'versionOf[^}]*orgId', src, re.S) is not None:
        errors.append('orgId participates in identity/versioning (must be inert this phase)')

    # ---- 7. Idempotency by changeId ----
    if re.search(r'function\s+append\b', src) is None:
        errors.append('MISSING append() (idempotency core)')
    if re.search(r'\bS\.byId\s*\[\s*change\.changeId\s*\]', src) is None and \
       re.search(r'\bS\.byId\s*\[\s*[\w.]+\s*\]', src) is None:
        errors.append('append missing changeId dedupe lookup')

    # ---- 8. Persistence via existing CHLDB/DataPort boundary ----
    if re.search(r'\bCHLDB\.set\b', src) is None and \
       re.search(r'\bCHLDB\s*\.\s*set', src) is None:
        errors.append('MISSING persistence via existing CHLDB.set boundary')
    if re.search(r'\bwindow\.DataPort\b', src) is not None:
        errors.append('second persistence abstraction (DataPort used directly); '
                      'must reuse CHLDB only')

    # ---- 9. No domain business logic leak ----
    for term in FORBIDDEN_DOMAIN_TERMS:
        if re.search(r'\b%s\b' % re.escape(term), src, re.I):
            errors.append('Change Journal references domain business term: %s' % term)

    # ---- Report ----
    print('ChemLabX TASK-010 Change Journal validator - results')
    print('  source         : %s' % JOURNAL_SRC)
    print('  ops            : %s' % ops)
    print('  entity types   : %s' % types)
    print('  required fields: %d' % len(REQUIRED_FIELDS))
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

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ChemLabX TASK-007 chemistry dataset validator.

Deterministic, build/test-time validation of:
    js/data/materials.js
    js/data/reactions.js
    js/pages/experiments.js
    js/pages/dashboard.js

FAIL CLOSED: any validation error => verdict FAIL. CHEMSITRY_DATA_VERSION must
NOT be promoted to 'validated-v1' while this reports FAIL.

Runs with the standard library only (no runtime dependencies). Inspects source
TEXT for duplicate object keys because evaluating JavaScript first would hide
earlier definitions (last-write-wins).
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_VERSION = 'pre-validated-prototype'  # CHL.versions.CHEMISTRY_DATA_VERSION stays as-is
EXPECTED_EXPERIMENT_COUNT = 14

VALID_MATERIAL_TYPES = {
    'alkali', 'alkaline', 'transition', 'metal', 'halogen', 'noble',
    'acid', 'base', 'salt', 'oxide', 'organic',
}
VALID_MATERIAL_STATES = {'safe', 'warning', 'danger'}

# The 28 validated reaction source keys in exact source order (TASK-003/004
# contract). K2Cr2O7+HCl has NO validated reaction and is excluded.
EXPECTED_REACTION_KEYS = [
    'Li,H2O', 'Na,H2O', 'K,H2O', 'Ca,H2O', 'Mg,H2O',
    'HCl,NaOH', 'HCl,KOH', 'H2SO4,NaOH', 'CH3COOH,NaOH', 'Zn,HCl',
    'Fe,HCl', 'Mg,HCl', 'Zn,H2SO4', 'Fe,H2SO4', 'CuSO4,Zn',
    'AgNO3,Cu', 'AgNO3,NaCl', 'KMnO4,H2O2', 'CH3COOH,NaHCO3', 'CaCO3,HCl',
    'NH3,HCl', 'CaO,H2O', 'HCl,H2O2', 'FeCl3,NaOH', 'CuSO4,NaOH',
    'H2SO4,H2O', 'NaCl,H2O', 'CuSO4,H2O',
]

# Retained experiment catalog keys (after removing K2Cr2O7+HCl). Order
# preserved from source.
EXPECTED_EXPERIMENT_KEYS = [
    'Na+H2O', 'HCl+NaOH', 'Zn+HCl', 'CuSO4+Zn', 'KMnO4+H2O2',
    'AgNO3+Cu', 'CaCO3+HCl', 'NH3+HCl', 'FeCl3+NaOH', 'CuSO4+NaOH',
    'CaO+H2O', 'AgNO3+NaCl', 'H2SO4+H2O', 'CH3COOH+NaHCO3',
]


def read(path):
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def brace_objects(text):
    """Yield {key: [(line, body)]} for top-level '{' object literals whose
    key starts at a line beginning. Detects duplicates BEFORE last-write-wins."""
    out = {}
    key_re = re.compile(r"(?m)^\s*'([^']+)'\s*:\s*\{")
    n = len(text)
    for m in key_re.finditer(text):
        k = m.group(1)
        start = text.find('{', m.start())
        line = text.count('\n', 0, m.start()) + 1
        depth = 0
        j = start
        inquote = False
        while j < n:
            c = text[j]
            if c == '"' and not inquote:
                inquote = True
            elif c == '"' and inquote:
                inquote = False
            if not inquote:
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        break
            j += 1
        out.setdefault(k, []).append({'line': line, 'body': text[start:j + 1]})
    return out


def obj_fields(body, numeric=('tempChange', 'phChange', 'xp')):
    if isinstance(body, dict):
        body = body['body']
    f = {}
    for m in re.finditer(r"(\w+)\s*:\s*('[^']*'|[+-]?\d+(?:\.\d+)?|true|false)", body):
        k = m.group(1)
        v = m.group(2)
        if v.startswith("'"):
            v = v[1:-1]
        elif v == 'true':
            v = True
        elif v == 'false':
            v = False
        else:
            v = float(v) if ('.' in v or '+' in v) else int(v)
        f[k] = v
    return f


def strlist_fields(body, field):
    """Extract a string array field like products: [{ ... }] -> list of dicts."""
    m = re.search(field + r"\s*:\s*\[(.*?)\]", body, re.S)
    if not m:
        return []
    items = []
    for o in re.finditer(r"\{([^{}]*)\}", m.group(1), re.S):
        items.append(obj_fields(o.group(1)))
    return items


def main():
    errors, warnings = [], []

    mat_src = read(os.path.join(ROOT, 'js', 'data', 'materials.js'))
    rx_src = read(os.path.join(ROOT, 'js', 'data', 'reactions.js'))
    exp_src = read(os.path.join(ROOT, 'js', 'pages', 'experiments.js'))
    dash_src = read(os.path.join(ROOT, 'js', 'pages', 'dashboard.js'))

    files = ['materials.js', 'reactions.js', 'experiments.js', 'dashboard.js']

    # ---------- MATERIALS ----------
    m_objs = brace_objects(mat_src)
    dup_materials = {k: len(v) for k, v in m_objs.items() if len(v) > 1}
    if dup_materials:
        errors.append('duplicate material source keys: %s' % sorted(dup_materials.keys()))

    # effective materialDB = last occurrence (mirrors JS last-write-wins used
    # by the runtime). Effective uniqueness == number of unique keys.
    eff_materials = {}
    for k, occs in m_objs.items():
        eff_materials[k] = obj_fields(occs[-1])

    material_count = len(eff_materials)
    warnings.append('effective unique material keys: %d' % material_count)

    required_mat = ('name', 'nameEn', 'formula', 'type', 'state', 'color')
    for k, f in eff_materials.items():
        missing = [x for x in required_mat if x not in f]
        if missing:
            errors.append('material %s missing fields: %s' % (k, missing))
        if 'type' in f and f['type'] not in VALID_MATERIAL_TYPES:
            errors.append('material %s invalid type: %s' % (k, f['type']))
        if 'state' in f and f['state'] not in VALID_MATERIAL_STATES:
            errors.append('material %s invalid state: %s' % (k, f['state']))
        if 'formula' in f and not f['formula']:
            errors.append('material %s empty formula' % k)

    # ---------- REACTIONS ----------
    r_objs = brace_objects(rx_src)
    if 'default' in r_objs:
        errors.append("dead 'default' reaction still present")

    rx_src_keys = [k for k in r_objs.keys() if k != 'default']
    if rx_src_keys != EXPECTED_REACTION_KEYS:
        errors.append('reaction source keys changed (order/content mismatch). '
                      'Expected %d, got %d' % (len(EXPECTED_REACTION_KEYS), len(rx_src_keys)))
    else:
        warnings.append('reaction source keys stable (%d, no reorder)' % len(rx_src_keys))

    # canonical-ID/key stability: no two source keys collapse to same canonical
    seen_canon = {}
    for k in rx_src_keys:
        canon = ','.join(sorted(k.split(',')))
        if canon in seen_canon:
            errors.append('canonical collision %s <-> %s' % (seen_canon[canon], k))
        seen_canon[canon] = k

    rx_eff = {}
    for k in rx_src_keys:
        rx_eff[k] = obj_fields(r_objs[k][-1])

    for k, f in rx_eff.items():
        for nf in ('tempChange', 'phChange', 'xp'):
            if not isinstance(f.get(nf), (int, float)):
                errors.append('reaction %s non-numeric %s: %r' % (k, nf, f.get(nf)))
        if not isinstance(f.get('danger'), bool):
            errors.append('reaction %s non-boolean danger: %r' % (k, f.get('danger')))

    # reaction -> material references
    for k in rx_src_keys:
        for part in k.split(','):
            if part not in eff_materials:
                errors.append('reaction %s references missing material %s' % (k, part))

    # ---------- EXPERIMENTS (catalog keys from experiments.js source) ----------
    exp_keys = re.findall(r"(?m)^\s*'([^+']+\+[^']+)'\s*:\s*\{", exp_src)
    retained = []
    for e in exp_keys:
        if e not in retained:
            retained.append(e)
    if retained != EXPECTED_EXPERIMENT_KEYS:
        errors.append('experiment catalog keys mismatch. Expected %d (%s), got %d (%s)' % (
            len(EXPECTED_EXPERIMENT_KEYS), EXPECTED_EXPERIMENT_KEYS, len(retained), retained))
    else:
        warnings.append('retained experiment count == %d' % len(retained))

    if 'K2Cr2O7+HCl' in retained:
        errors.append('K2Cr2O7+HCl must be removed/excluded from experiment catalog')

    # '+' vs ',' mismatch: every retained experiment must resolve to a validated
    # reaction via the same subset-matching used by the runtime.
    def resolve_reaction(parts):
        s = ','.join(sorted(parts))
        if s in rx_eff:
            return s
        for k in rx_src_keys:
            kp = k.split(',')
            if len(kp) >= 2 and all(p in parts for p in kp):
                return k
        return None

    for e in retained:
        parts = e.split('+')
        for p in parts:
            if p not in eff_materials:
                errors.append('experiment %s references missing material %s' % (e, p))
        resolved = resolve_reaction(parts)
        if resolved is None:
            errors.append('experiment %s does NOT resolve to a validated reaction' % e)
        else:
            warnings.append('experiment %s resolves to reaction %s' % (e, resolved))

    # KMnO4+H2O2 danger must be true (reactions.js authoritative)
    kmn = resolve_reaction('KMnO4+H2O2'.split('+'))
    if kmn is None or not rx_eff[kmn].get('danger'):
        errors.append('KMnO4+H2O2 must resolve to a danger:true reaction')

    # experiment danger/XP are derived from reactions (no duplicated catalog copy)
    exp_body = exp_src
    for e in retained:
        # catalog entries must NOT retain their own danger: / xp: copies
        m = re.search(r"(?m)^\s*'" + re.escape(e) + r"'\s*:\s*\{([^}]*)\}", exp_body)
        if m:
            entry = m.group(1)
            if re.search(r"\bdanger\s*:", entry) or re.search(r"\bxp\s*:", entry):
                errors.append('experiment %s still keeps a duplicated danger/xp copy' % e)

    # ---------- DASHBOARD (no hard-coded counts) ----------
    if '15 تجربة' in dash_src or '15 experiments' in dash_src:
        errors.append('dashboard still hard-codes "15 experiments"')
    if re.search(r"achievementDB\.length\s*\|\|\s*15", dash_src):
        errors.append('dashboard still has achievement fallback || 15')
    if not re.search(r"experimentCount", dash_src):
        errors.append('dashboard does not use dynamic CHL.experimentCount')
    if not re.search(r"experimentCount", exp_src):
        errors.append('experiments.js does not expose CHL.experimentCount')

    # ---------- EXPECTED COUNT ----------
    if len(retained) != EXPECTED_EXPERIMENT_COUNT:
        errors.append('expected experiment count %d, actual %d' % (EXPECTED_EXPERIMENT_COUNT, len(retained)))

    verdict = 'PASS' if not errors else 'FAIL'
    report = {
        'datasetVersion': DATASET_VERSION,
        'verdict': verdict,
        'files': files,
        'counts': {
            'rawMaterialTokens': len(m_objs),
            'effectiveMaterialKeys': material_count,
            'reactionKeys': len(rx_src_keys),
            'experimentKeys': len(retained),
        },
        'duplicateMaterialKeys': dup_materials,
        'schemaErrors': [],
        'danglingReferences': [],
        'canonicalIdErrors': [],
        'experimentMismatches': [],
        'dangerContradictions': [],
        'invalidRecords': errors,
        'warnings': warnings,
    }

    print(json.dumps(report, ensure_ascii=False, indent=2))
    print('\n--- HUMAN READABLE SUMMARY ---')
    print('Verdict: %s' % verdict)
    print('Effective materials: %d (unique keys, no duplicates)' % material_count)
    print('Reaction keys: %d (default removed, source order stable)' % len(rx_src_keys))
    print('Retained experiments: %d (K2Cr2O7+HCl excluded)' % len(retained))
    print('Errors (%d):' % len(errors))
    for e in errors:
        print('  [ERROR] %s' % e)
    print('Warnings (%d):' % len(warnings))
    for w in warnings:
        print('  [INFO] %s' % w)
    if verdict == 'FAIL':
        print('\nFAIL CLOSED: CHEMISTRY_DATA_VERSION must NOT be promoted to validated-v1.')
        return 1
    print('\nClean: dataset is safe to promote to validated-v1.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ChemLabX TASK-008 — Content domain & content-pack validator (stdlib only).

Deterministic, fail-closed validation of the pure Content domain and the
versioned 'content' content packs (lessons, quiz, experiments descriptor),
and their binding to chemistry/laboratory validated data:

  * In-file schema / ar-en completeness / id-key validity / count consistency.
  * Manifest (DatasetManifest) validity: schemaVersion, datasetId, version,
    contentHash, provenance, editions, pack counts/ids/keys.
  * CONTENT_VERSION binding consistency (js/core/versions.js -> manifest.version).
  * contentHash determinism (SHA-256 over concatenated pack bytes, fixed order).
  * experiments pack-descriptor exactly matches the ''+''-separated catalog
    retained in js/pages/experiments.js (single source, no silent drift).
  * Cross-checks every experiment key resolves via the validated chemistry /
    reaction dataset (fail-closed: any unreferenced key FAILS).

Any violation produces a FAIL verdict and a non-zero exit code.
Usage:  python test/validate_content.py   (needs PYTHONIOENCODING=utf-8)
"""
import hashlib
import io
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = os.path.join(ROOT, "js", "pages", "experiments.js")
DOMAIN = os.path.join(ROOT, "js", "domain", "content.js")
VERSIONS = os.path.join(ROOT, "js", "core", "versions.js")
MANIFEST = os.path.join(ROOT, "js", "data", "content", "manifest.js")
PACKS = {
    "lessons": os.path.join(ROOT, "js", "data", "content", "lessons.js"),
    "quiz": os.path.join(ROOT, "js", "data", "content", "quiz.js"),
    "experiments": os.path.join(ROOT, "js", "data", "content", "experiments.js"),
}
MATERIALS = os.path.join(ROOT, "js", "data", "materials.js")
REACTIONS = os.path.join(ROOT, "js", "data", "reactions.js")

CANONICAL_EXP_KEYS = [
    "Na+H2O", "HCl+NaOH", "Zn+HCl", "CuSO4+Zn", "KMnO4+H2O2", "AgNO3+Cu",
    "CaCO3+HCl", "NH3+HCl", "FeCl3+NaOH", "CuSO4+NaOH", "CaO+H2O",
    "AgNO3+NaCl", "H2SO4+H2O", "CH3COOH+NaHCO3",
]

# Keyed exactly like the content-pack atom contract (domain REQUIRED_LOCALE_FIELDS).
REQUIRED = {
    "lessons": ["title", "body"],
    "quiz": ["q", "options", "cat"],
    "experiments": ["title", "desc"],
}

_failures = []
_checks = []


def check(cond, label, detail=""):
    _checks.append((label, bool(cond), detail))
    if not cond:
        _failures.append("%s :: %s" % (label, detail))


def read(path):
    with io.open(path, "r", encoding="utf-8") as f:
        return f.read()


# ---------------------------------------------------------------------------
# Minimal, deterministic JS *data-value* parser (stdlib only). Handles the
# pure-JSON-like object literals that the content packs/manifest use:
#   - objects { k: v, 'k': v }
#   - arrays [ ... ]
#   - strings '...' and "..." (incl. \uXXXX)
#   - numbers, booleans, null
# This is intentionally narrow and applied only to our authored data files.
# ---------------------------------------------------------------------------
class _Parser:
    def __init__(self, s):
        self.s = s
        self.i = 0
        self.n = len(s)

    def _skip_ws(self):
        while self.i < self.n and self.s[self.i] in " \t\r\n":
            self.i += 1

    def _peek(self):
        return self.s[self.i] if self.i < self.n else ""

    def _parse_string(self):
        self.i += 1  # opening quote
        buf = []
        while self.i < self.n:
            c = self.s[self.i]
            if c in "'\"":
                self.i += 1
                return "".join(buf)
            if c == "\\" and self.i + 1 < self.n:
                nxt = self.s[self.i + 1]
                if nxt == "u":
                    hexs = self.s[self.i + 2:self.i + 6]
                    buf.append(chr(int(hexs, 16)))
                    self.i += 6
                    continue
                mapping = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", "'": "'", '"': '"', "0": "\0"}
                buf.append(mapping.get(nxt, nxt))
                self.i += 2
                continue
            buf.append(c)
            self.i += 1
        raise ValueError("unterminated string")

    def _parse_value(self):
        self._skip_ws()
        c = self._peek()
        if c in "'\"":
            return self._parse_string()
        if c == "{":
            return self._parse_object()
        if c == "[":
            return self._parse_array()
        if c.isdigit() or c == "-":
            m = re.match(r"-?\d+(\.\d+)?([eE][+-]?\d+)?", self.s[self.i:])
            self.i += m.end()
            return float(m.group(0)) if ("." in m.group(0) or "e" in m.group(0).lower()) else int(m.group(0))
        # bare identifier (booleans/null or a bare key handled by caller)
        m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", self.s[self.i:])
        if not m:
            raise ValueError("unexpected char '%s'" % c)
        self.i += m.end()
        return {"true": True, "false": False, "null": None, "undefined": None}[m.group(0)]

    def _parse_object(self):
        self.i += 1  # {
        obj = {}
        self._skip_ws()
        if self._peek() == "}":
            self.i += 1
            return obj
        while True:
            self._skip_ws()
            c = self._peek()
            if c in "'\"":
                key = self._parse_string()
            else:
                m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", self.s[self.i:])
                if not m:
                    raise ValueError("expected object key")
                key = m.group(0)
                self.i += m.end()
            self._skip_ws()
            if self._peek() != ":":
                raise ValueError("expected ':' after key '%s' (at %r)" % (key, self.s[self.i:self.i + 20]))
            self.i += 1
            self._skip_ws()
            val = self._parse_value()
            if val is not None:
                obj[key] = val
            self._skip_ws()
            c = self._peek()
            if c == ",":
                self.i += 1
                if self._peek() == "}":
                    # trailing comma
                    self.i += 1
                    return obj
                continue
            if c == "}":
                self.i += 1
                return obj
            raise ValueError("expected ',' or '}' after value of key '%s' (at %r)" % (key, self.s[self.i:self.i + 20]))

    def _parse_array(self):
        self.i += 1  # [
        arr = []
        self._skip_ws()
        if self._peek() == "]":
            self.i += 1
            return arr
        while True:
            self._skip_ws()
            arr.append(self._parse_value())
            self._skip_ws()
            c = self._peek()
            if c == ",":
                self.i += 1
                continue
            if c == "]":
                self.i += 1
                return arr
            raise ValueError("expected ',' or ']'")


def strip_comments(text):
    """Remove /* ... */ and // ... comments.

    Safe for our authored data files: every special/structural character in
    string values is emitted as a \\u escape, so no literal '//' or '/*' can
    appear inside a string literal. Applied only to the extracted object body.
    """
    out = []
    i = 0
    n = len(text)
    while i < n:
        if text.startswith("/*", i):
            j = text.find("*/", i + 2)
            i = n if j == -1 else j + 2
            out.append(" ")
            continue
        if text.startswith("//", i):
            j = text.find("\n", i + 2)
            i = n if j == -1 else j
            out.append(" ")
            continue
        out.append(text[i])
        i += 1
    return "".join(out)


def parse_js_object(text, name):
    """Extract the object assigned as `NAME = {....};` and parse it to a dict."""
    m = re.search(r"\b%s\s*=\s*\{" % re.escape(name), text)
    if not m:
        return None
    parser = _Parser(strip_comments(text[m.end() - 1:]))  # start at '{'
    return parser._parse_object()


def parse_js_array(text, name):
    m = re.search(r"\b%s\s*=\s*\[" % re.escape(name), text)
    if not m:
        return None
    parser = _Parser(strip_comments(text[m.end() - 1:]))  # start at '['
    return parser._parse_array()


def norm(s):
    if not isinstance(s, str):
        return s
    # compare visually without NFC/NFD differences
    return unicodedata.normalize("NFC", s)


def main():
    io_enc = sys.stdout.encoding or ""
    if "utf" not in io_enc.lower():
        # fall back to a UTF-8 writer if the console cannot echo Arabic safely
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

    # ---- 1. Manifest ------------------------------------------------------
    man_txt = read(MANIFEST)
    man = parse_js_object(man_txt, "CHL.contentManifest")
    check(man is not None, "M1", "manifest parsed: datasetId='content' version='content-v1'")
    if man is not None:
        check(man.get("datasetId") == "content", "M2", "datasetId=%r" % (man.get("datasetId"),))
        check(man.get("version") == "content-v1", "M3", "version=%r" % (man.get("version"),))
        check(man.get("schemaVersion") == 2, "M4", "schemaVersion=%r" % (man.get("schemaVersion"),))
        ch = man.get("contentHash")
        check(isinstance(ch, str) and re.fullmatch(r"[0-9a-f]{64}", ch), "M5",
              "contentHash=%r" % (ch,))
        check(man.get("publishedAt") and man.get("provenance") and man.get("editions"), "M6",
              "missing publishedAt/provenance/editions")
        ed = man.get("editions") or {}
        check(isinstance(ed, dict) and "ar" in ed and "en" in ed, "M7", "editions keys=%r" % (list(ed.keys()) if isinstance(ed, dict) else ed))
        packs = man.get("packs") or {}
        check(set(packs.keys()) == {"lessons", "quiz", "experiments"}, "M8",
              "packs=%r" % (list(packs.keys()) if isinstance(packs, dict) else packs))
        man_pack_counts = {}
        for pk in ("lessons", "quiz", "experiments"):
            p = packs.get(pk) or {}
            man_pack_counts[pk] = p.get("count")
        check(man_pack_counts == {"lessons": 6, "quiz": 20, "experiments": 14}, "M9",
              "manifest pack counts=%r" % (man_pack_counts,))

    # ---- 2. CONTENT_VERSION binding --------------------------------------
    ver_txt = read(VERSIONS)
    binding_ok = ("contentManifest" in ver_txt and "CONTENT_VERSION" in ver_txt and
                  "get CONTENT_VERSION" in ver_txt and "window.CHL.contentManifest.version" in ver_txt)
    check(binding_ok, "V1", "CONTENT_VERSION getter bound to window.CHL.contentManifest.version")
    check("SCHEMA_VERSION: 2" in ver_txt and "CHEMISTRY_DATA_VERSION: 'validated-v1'" in ver_txt, "V2",
          "SCHEMA_VERSION=2 / CHEMISTRY_DATA_VERSION='validated-v1' must be preserved")

    # ---- 3. Read pack + page sources -------------------------------------
    pack_txt = {k: read(v) for k, v in PACKS.items()}
    pages_txt = read(PY)
    domain_txt = read(DOMAIN)

    # ---- 4. Domain sanity -------------------------------------------------
    check("KNOWN_PACKS" in domain_txt and "['lessons', 'quiz', 'experiments']" in domain_txt, "D1",
          "Content domain lists KNOWN_PACKS = lessons, quiz, experiments")
    check("fail-closed" in domain_txt.lower() or "fail(" in domain_txt, "D2",
          "Content domain is fail-closed by design")

    # ---- 5. Lessons pack --------------------------------------------------
    lessons = parse_js_object(pack_txt["lessons"], "CHL.contentPacks.lessons")
    check(lessons is not None, "L1", "lessons pack parsed with %d items" % (len(lessons.get("items") or []) if lessons else 0))
    l_items = (lessons or {}).get("items") or []
    check(len(l_items) == 6, "L2", "lessons count=%d" % len(l_items))
    if l_items:
        ids = [it.get("id") for it in l_items]
        check(ids == [1, 2, 3, 4, 5, 6], "L3", "lessons ids=%r" % (ids,))
        check(len(set(ids)) == 6, "L4", "duplicate lesson ids")
        missing = []
        for it in l_items:
            cont = it.get("content") or {}
            for loc in ("ar", "en"):
                for atom in REQUIRED["lessons"]:
                    if not (cont.get(loc) or {}).get(atom):
                        missing.append("%s:%s.%s" % (it.get("id"), loc, atom))
        check(not missing, "L5", "incomplete lessons atoms=%r" % (missing,))

    # ---- 6. Quiz pack -----------------------------------------------------
    quiz = parse_js_object(pack_txt["quiz"], "CHL.contentPacks.quiz")
    check(quiz is not None, "Q1", "quiz pack parsed with %d items" % (len(quiz.get("items") or []) if quiz else 0))
    q_items = (quiz or {}).get("items") or []
    check(len(q_items) == 20, "Q2", "quiz count=%d" % len(q_items))
    if q_items:
        qids = [it.get("id") for it in q_items]
        check(qids == list(range(1, 21)), "Q3", "quiz ids=%r" % (qids,))
        check(len(set(qids)) == 20, "Q4", "duplicate quiz ids")
        bad = []
        for it in q_items:
            cont = it.get("content") or {}
            corr = it.get("correct")
            for loc in ("ar", "en"):
                c = cont.get(loc) or {}
                if not c.get("q") or not isinstance(c.get("options"), list) or len(c.get("options")) < 2 or c.get("cat") is None:
                    bad.append("%s:%s.missing" % (it.get("id"), loc))
                    continue
                if not (isinstance(corr, int) and 0 <= corr < len(c.get("options"))):
                    bad.append("%s:correct-mismatch" % (it.get("id"),))
        check(not bad, "Q5", "quiz atom/correct issues=%r" % (bad,))

    # ---- 7. Experiments descriptor pack ----------------------------------
    exp_desc = parse_js_object(pack_txt["experiments"], "CHL.contentPacks.experiments")
    check(exp_desc is not None, "E1", "experiments descriptor parsed with %d items" % (len(exp_desc.get("items") or []) if exp_desc else 0))
    e_items = (exp_desc or {}).get("items") or []
    check(len(e_items) == 14, "E2", "experiments descriptor count=%d" % len(e_items))
    e_keys = [it.get("key") for it in e_items]
    check(e_keys == CANONICAL_EXP_KEYS, "E3", "experiment keys/order mismatch=%r" % (e_keys,))
    check(len(set(e_keys)) == 14, "E4", "duplicate experiment keys")
    e_bad = []
    for it in e_items:
        cont = it.get("content") or {}
        for loc in ("ar", "en"):
            for atom in REQUIRED["experiments"]:
                if not (cont.get(loc) or {}).get(atom):
                    e_bad.append("%s:%s.%s" % (it.get("key"), loc, atom))
    check(not e_bad, "E5", "descriptor incomplete atoms=%r" % (e_bad,))

    # ---- 8. Descriptor <-> js/pages/experiments.js catalog cross-check ----
    # The page retains the ''+''-separated catalog literal as `experimentTitles`.
    # Parse it with the same deterministic JS parser for an exact comparison.
    page_cat = parse_js_object(pages_txt, "experimentTitles")
    check(page_cat is not None, "C1", "page catalog (experimentTitles) parsed with %d keys" % (len(page_cat or {}) if page_cat is not None else 0))
    if page_cat is not None:
        check(set(page_cat.keys()) == set(CANONICAL_EXP_KEYS), "C1b",
              "page catalog keys mismatch from canonical=%r" % (sorted(set(page_cat.keys()) ^ set(CANONICAL_EXP_KEYS)),))
        cross_issues = []
        for it in e_items:
            key = it.get("key")
            cont = it.get("content") or {}
            ar = cont.get("ar") or {}
            en = cont.get("en") or {}
            page = page_cat.get(key) or {}
            if norm(page.get("ar")) != norm(ar.get("title")):
                cross_issues.append("%s ar.title" % key)
            if norm(page.get("en")) != norm(en.get("title")):
                cross_issues.append("%s en.title" % key)
            if norm(page.get("descAr")) != norm(ar.get("desc")):
                cross_issues.append("%s ar.desc" % key)
            if norm(page.get("descEn")) != norm(en.get("desc")):
                cross_issues.append("%s en.desc" % key)
        check(not cross_issues, "C2", "descriptor<->page catalog drift=%r" % (cross_issues,))

    # ---- 9. Experiment keys resolve through validated reactions ----------
    rx_txt = read(REACTIONS)
    # reaction keys are stored comma-joined: 'Na,H2O': {...}. Strip quotes/space.
    rx_keys = set()
    for m in re.finditer(r"""^\s*'([^']+)'\s*:\s*""", rx_txt, re.M):
        rx_keys.add(m.group(1))
    unresolved = []
    for key in CANONICAL_EXP_KEYS:
        ids = sorted(key.split("+"))
        joined = ",".join(ids)
        if joined not in rx_keys:
            # subset-matching fallback (any 2+ part reaction containing all ids)
            hit = next((r for r in rx_keys if r.split(",") and len(r.split(",")) == len(ids)
                        and set(r.split(",")) == set(ids)), None)
            if hit is None:
                unresolved.append(key)
    check(not unresolved, "X1", "experiment keys not present in validated reactions=%r" % (unresolved,))
    check("K2Cr2O7+HCl" not in CANONICAL_EXP_KEYS and "K2Cr2O7,HCl" not in rx_keys, "X2",
          "K2Cr2O7+HCl must remain excluded")

    # ---- 10. materials referenced by experiments exist --------------------
    mat_txt = read(MATERIALS)
    mat_ids = set()
    for m in re.finditer(r"""['"]?([A-Za-z0-9_]+)['"]?\s*:\s*\{""", mat_txt):
        mat_ids.add(m.group(1))
    unknown_mats = []
    for key in CANONICAL_EXP_KEYS:
        for pid in key.split("+"):
            if pid not in mat_ids:
                unknown_mats.append(pid)
    check(not unknown_mats, "MA1", "experiment material ids missing from materials=%r" % (unknown_mats,))

    # ---- 11. contentHash determinism --------------------------------------
    fixed_order = ["lessons", "quiz", "experiments"]
    blob = b"".join(pack_txt[k].encode("utf-8") for k in fixed_order)
    computed = hashlib.sha256(blob).hexdigest()
    check(computed == man.get("contentHash") if man else False, "H1",
          "contentHash recomputed=%s man=%s" % (computed, (man or {}).get("contentHash")))
    check(len(pack_txt["lessons"].encode("utf-8")) > 0 and len(pack_txt["quiz"].encode("utf-8")) > 0, "H2",
          "pack sources non-empty for hash")

    # ---- 12. pack version/schema consistency ------------------------------
    ver_ok = True
    for pk in ("lessons", "quiz", "experiments"):
        obj = {"lessons": lessons, "quiz": quiz, "experiments": exp_desc}[pk]
        if not obj or obj.get("version") != "1.0.0" or obj.get("schemaVersion") != 2:
            ver_ok = False
    check(ver_ok, "PV1", "each pack must be version 1.0.0, schemaVersion 2")

    # ---- Summary ----------------------------------------------------------
    print("=" * 72)
    print("ChemLabX TASK-008 Content validator — results")
    print("=" * 72)
    for label, passed, detail in _checks:
        print("  [%s] %-28s %s" % ("PASS" if passed else "FAIL", label, detail))
    print("-" * 72)
    print("  TOTAL: %d  PASS: %d  FAIL: %d" % (len(_checks), len(_checks) - len(_failures), len(_failures)))
    if _failures:
        print("\nFAILED CHECKS:")
        for f in _failures:
            print("   * " + f)
        print("\nRESULT: FAIL (fail-closed — content pipeline must not ship)")
        return 1
    print("\nRESULT: PASS — content packs, manifest, binding, hash, and")
    print("         chemistry cross-checks are all consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

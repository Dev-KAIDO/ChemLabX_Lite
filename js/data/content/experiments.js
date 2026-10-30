/* ==========================================================================
   ChemLabX 4.0 — Content pack: experiments (TASK-008) — pack descriptor
   The experiments catalog is a *descriptive* content-pack lane (title/desc/icon
   ONLY; no equation/xp/danger — those stay in js/data/reactions.js as the single
   source of truth, and the catalog display metadata lives in js/pages/experiments.js
   which the TASK-007 validator requires to keep the '+' separated literals).

   This file is the versioned, schema-validated PACK DESCRIPTOR for that lane:
   it pins the version, schema, exact ordered key list and item count, and the
   localized display strings for the 14 retained experiments. test/validate_content.py
   verifies that this descriptor exactly matches the catalog exposed by
   js/pages/experiments.js (single source), so the two cannot silently drift.

   Versioned under the 'content' DatasetManifest (js/data/content/manifest.js).
   ========================================================================== */
(function () {
    'use strict';
    var CHL = window.CHL = window.CHL || {};

    CHL.contentPacks = CHL.contentPacks || {};

    /* Canonical descriptive catalog. This mirrors js/pages/experiments.js and is
       cross-validated against it by test/validate_content.py (fail-closed). */
    CHL.contentPacks.experiments = {
        packName: 'experiments',
        version: '1.0.0',
        schemaVersion: 2,
        /* only descriptive display metadata per item */
        items: [
            { key: 'Na+H2O',         icon: '\uD83D\uDD25', content: { ar: { title: '\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 \u0645\u0639 \u0627\u0644\u0645\u0627\u0621', desc: '\u062A\u0641\u0627\u0639\u0644 \u0639\u0646\u064A\u0641 \u064A\u0646\u062A\u062C \u0647\u064A\u062F\u0631\u0648\u062C\u064A\u0646 \u0648\u0647\u064A\u062F\u0631\u0648\u0643\u0633\u064A\u062F \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645' }, en: { title: 'Sodium + Water', desc: 'Vigorous reaction producing hydrogen + sodium hydroxide' } } },
            { key: 'HCl+NaOH',       icon: '\uD83E\uDDCA', content: { ar: { title: '\u062A\u0639\u0627\u062F\u0644 \u062D\u0645\u0636-\u0642\u0627\u0639\u062F\u0629', desc: '\u062A\u0641\u0627\u0639\u0644 \u062A\u0639\u0627\u062F\u0644 \u064A\u0646\u062A\u062C \u0645\u0644\u062D \u0648\u0645\u0627\u0621' }, en: { title: 'Acid-Base Neutralization', desc: 'Neutralization producing salt and water' } } },
            { key: 'Zn+HCl',         icon: '\uD83D\uDCA8', content: { ar: { title: '\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0632\u0646\u0643 \u0645\u0639 \u0627\u0644\u062D\u0645\u0636', desc: '\u0625\u0646\u062A\u0627\u062C \u063A\u0627\u0632 \u0627\u0644\u0647\u064A\u062F\u0631\u0648\u062C\u064A\u0646' }, en: { title: 'Zinc + Acid', desc: 'Hydrogen gas evolution' } } },
            { key: 'CuSO4+Zn',       icon: '\uD83D\uDD34', content: { ar: { title: '\u062A\u0631\u0633\u064A\u0628 \u0627\u0644\u0646\u062D\u0627\u0633', desc: '\u062A\u0631\u0633\u064A\u0628 \u0627\u0644\u0646\u062D\u0627\u0633 \u0639\u0644\u0649 \u0627\u0644\u0632\u0646\u0643' }, en: { title: 'Copper Deposition', desc: 'Copper deposited on zinc' } } },
            { key: 'KMnO4+H2O2',     icon: '\uD83D\uDCA5', content: { ar: { title: '\u0628\u0631\u0645\u0646\u063A\u0646\u0627\u062A + \u0628\u064A\u0631\u0648\u0643\u0633\u064A\u062F', desc: '\u062A\u0641\u0627\u0639\u0644 \u0623\u0643\u0633\u062F\u0629 \u0645\u0644\u0648\u0646 \u064A\u0646\u062A\u062C \u0623\u0643\u0633\u062C\u064A\u0646' }, en: { title: 'Permanganate + Peroxide', desc: 'Colorful oxidation producing oxygen' } } },
            { key: 'AgNO3+Cu',       icon: '\u26AA', content: { ar: { title: '\u062A\u0631\u0633\u064A\u0628 \u0627\u0644\u0641\u0636\u0629', desc: '\u062A\u0631\u0633\u064A\u0628 \u0627\u0644\u0641\u0636\u0629 \u0639\u0644\u0649 \u0627\u0644\u0646\u062D\u0627\u0633' }, en: { title: 'Silver Deposition', desc: 'Silver crystals on copper' } } },
            { key: 'CaCO3+HCl',      icon: '\uD83E\uDEE7', content: { ar: { title: '\u0643\u0631\u0628\u0648\u0646\u0627\u062A + \u062D\u0645\u0636', desc: '\u0641\u0648\u0631\u0627\u0646 \u063A\u0627\u0632 \u062B\u0627\u0646\u064A \u0623\u0643\u0633\u064A\u062F \u0627\u0644\u0643\u0631\u0628\u0648\u0646' }, en: { title: 'Carbonate + Acid', desc: 'Carbon dioxide effervescence' } } },
            { key: 'NH3+HCl',        icon: '\u2601\uFE0F', content: { ar: { title: '\u0623\u0645\u0648\u0646\u064A\u0627 + \u062D\u0645\u0636', desc: '\u062F\u062E\u0627\u0646 \u0623\u0628\u064A\u0636 \u0645\u0646 \u0643\u0644\u0648\u0631\u064A\u062F \u0627\u0644\u0623\u0645\u0648\u0646\u064A\u0648\u0645' }, en: { title: 'Ammonia + Acid', desc: 'White smoke of ammonium chloride' } } },
            { key: 'FeCl3+NaOH',     icon: '\uD83E\uDEE4', content: { ar: { title: '\u0647\u064A\u062F\u0631\u0648\u0643\u0633\u064A\u062F \u0627\u0644\u062D\u062F\u064A\u062F', desc: '\u0631\u0627\u0633\u0628 \u0628\u0646\u064A \u0645\u062D\u0645\u0631' }, en: { title: 'Iron Hydroxide', desc: 'Brown-red precipitate' } } },
            { key: 'CuSO4+NaOH',     icon: '\uD83D\uDD35', content: { ar: { title: '\u0647\u064A\u062F\u0631\u0648\u0643\u0633\u064A\u062F \u0627\u0644\u0646\u062D\u0627\u0633', desc: '\u0631\u0627\u0633\u0628 \u0623\u0632\u0631\u0642 \u0645\u0632\u0631\u0642' }, en: { title: 'Copper Hydroxide', desc: 'Blue precipitate' } } },
            { key: 'CaO+H2O',        icon: '\uD83D\uDD25', content: { ar: { title: '\u0625\u062E\u0645\u0627\u062F \u0627\u0644\u062C\u064A\u0631', desc: '\u062A\u0641\u0627\u0639\u0644 \u0637\u0627\u0631\u062F \u0644\u0644\u062D\u0631\u0627\u0631\u0629' }, en: { title: 'Slaking Lime', desc: 'Exothermic slaking reaction' } } },
            { key: 'AgNO3+NaCl',     icon: '\u26AA', content: { ar: { title: '\u062A\u0631\u0633\u064A\u0628 \u0643\u0644\u0648\u0631\u064A\u062F \u0627\u0644\u0641\u0636\u0629', desc: '\u0631\u0627\u0633\u0628 \u0623\u0628\u064A\u0636 \u0645\u0646 \u0643\u0644\u0648\u0631\u064A\u062F \u0627\u0644\u0641\u0636\u0629' }, en: { title: 'Silver Chloride', desc: 'White silver chloride precipitate' } } },
            { key: 'H2SO4+H2O',      icon: '\uD83D\uDCA7', content: { ar: { title: '\u062A\u0645\u062F\u064A\u062F \u062D\u0645\u0636 \u0627\u0644\u0643\u0628\u0631\u064A\u062A\u064A\u0643', desc: '\u062A\u0641\u0627\u0639\u0644 \u0634\u062F\u064A\u062F \u0627\u0644\u062D\u0631\u0627\u0631\u0629 \u2014 \u062A\u0646\u0628\u064A\u0647: \u0623\u0636\u0641 \u0627\u0644\u062D\u0645\u0636 \u0625\u0644\u0649 \u0627\u0644\u0645\u0627\u0621' }, en: { title: 'Sulfuric Acid Dilution', desc: 'Highly exothermic \u2014 add acid to water' } } },
            { key: 'CH3COOH+NaHCO3', icon: '\uD83C\uDF0B', content: { ar: { title: '\u062E\u0644 + \u0628\u064A\u0643\u0631\u0628\u0648\u0646\u0627\u062A', desc: '\u0641\u0648\u0631\u0627\u0646 \u063A\u0627\u0632 \u062B\u0627\u0646\u064A \u0623\u0643\u0633\u064A\u062F \u0627\u0644\u0643\u0631\u0628\u0648\u0646 \u0627\u0644\u0645\u0623\u0644\u0648\u0641' }, en: { title: 'Vinegar + Baking Soda', desc: 'Classic CO\u2082 volcano' } } }
        ]
    };
})();

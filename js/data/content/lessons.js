/* ==========================================================================
   ChemLabX 4.0 — Content pack: lessons (TASK-008)
   Locale-structured, versioned lesson catalog. Each item:
     { id, icon, content: { ar: { title, body }, en: { title, body } } }
   The `body` field carries HTML (as in the legacy curriculum). This pack is
   the single source of truth for lesson content; js/pages/lessons.js is a
   THIN LOADER that reads it through the Content domain (js/domain/content.js).
   Versioned under the 'content' DatasetManifest (js/data/content/manifest.js).
   ========================================================================== */
(function () {
    'use strict';
    var CHL = window.CHL = window.CHL || {};
    CHL.contentPacks = CHL.contentPacks || {};

    CHL.contentPacks.lessons = {
        packName: 'lessons',
        version: '1.0.0',
        schemaVersion: 2,
        items: [
            {
                id: 1,
                icon: '\uD83E\uDDEA',
                content: {
                    ar: {
                        title: '\uD83D\uDCD6 \u0627\u0644\u062F\u0631\u0633 1: \u0623\u0633\u0627\u0633\u064A\u0627\u062A \u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0621',
                        body: '<h3>\u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0648\u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062A</h3><p>\u0627\u0644\u0639\u0646\u0635\u0631 \u0647\u0648 \u0645\u0627\u062F\u0629 \u0646\u0642\u064A\u0629 \u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u062D\u0644\u0644\u0647\u0627 \u0643\u064A\u0645\u064A\u0627\u0626\u064A\u0627\u064B. \u0645\u062B\u0644: \u0627\u0644\u0647\u064A\u062F\u0631\u0648\u062C\u064A\u0646 (H)\u060C \u0627\u0644\u0623\u0643\u0633\u062C\u064A\u0646 (O)\u060C \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 (Na).</p><h3>\u0627\u0644\u062A\u0641\u0627\u0639\u0644\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629</h3><p>\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u062A\u062D\u0644\u0644 (Decomposition): A \u2192 B + C</p><p>\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 (Combination): A + B \u2192 AB</p><p>\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0627\u0633\u062A\u0628\u062F\u0627\u0644 (Displacement): A + BC \u2192 AC + B</p><h3>\u0627\u0644\u062A\u062C\u0627\u0631\u0628 \u0627\u0644\u0639\u0645\u0644\u064A\u0629</h3><p>\u062C\u0631\u0651\u0628 \u062E\u0644\u0637 \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 \u0645\u0639 \u0627\u0644\u0645\u0627\u0621 \u0641\u064A \u0627\u0644\u0645\u0639\u0645\u0644 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A!</p>'
                    },
                    en: {
                        title: '\uD83D\uDCD6 Lesson 1: Chemistry Basics',
                        body: '<h3>Elements &amp; Compounds</h3><p>An element is a pure substance that cannot be broken down chemically. Examples: Hydrogen (H), Oxygen (O), Sodium (Na).</p><h3>Basic Reactions</h3><p>Decomposition: A \u2192 B + C</p><p>Combination: A + B \u2192 AB</p><p>Displacement: A + BC \u2192 AC + B</p><h3>Practice</h3><p>Try mixing Sodium with Water in the virtual lab!</p>'
                    }
                }
            },
            {
                id: 2,
                icon: '\uD83E\uDDF4',
                content: {
                    ar: {
                        title: '\uD83D\uDCD6 \u0627\u0644\u062F\u0631\u0633 2: \u0627\u0644\u0623\u062D\u0645\u0627\u0636 \u0648\u0627\u0644\u0642\u0648\u0627\u0639\u062F',
                        body: '<h3>\u0645\u0627 \u0647\u0648 \u0627\u0644\u0623\u062D\u0645\u0627\u0636 \u0648\u0627\u0644\u0642\u0648\u0627\u0639\u062F\u061F</h3><p><strong>\u0627\u0644\u0623\u062D\u0645\u0627\u0636</strong>: pH &lt; 7. \u0645\u062B\u0644: HCl (\u062D\u0645\u0636 \u0627\u0644\u0647\u064A\u062F\u0631\u0648\u0643\u0644\u0648\u0631\u064A\u0643)\u060C H\u2082SO\u2084 (\u062D\u0645\u0636 \u0627\u0644\u0643\u0628\u0631\u064A\u062A\u064A\u0643)</p><p><strong>\u0627\u0644\u0642\u0648\u0627\u0639\u062F</strong>: pH &gt; 7. \u0645\u062B\u0644: NaOH (\u0647\u064A\u062F\u0631\u0648\u0643\u0633\u064A\u062F \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645)\u060C KOH</p><h3>\u0645\u0642\u064A\u0627\u0633 pH</h3><p>0-3: \u062D\u0645\u0636 \u0642\u0648\u064A | 4-6: \u062D\u0645\u0636 \u0636\u0639\u064A\u0641 | 7: \u0645\u062A\u0639\u0627\u062F\u0644 | 8-10: \u0642\u0627\u0639\u062F\u0629 \u0636\u0639\u064A\u0641\u0629 | 11-14: \u0642\u0627\u0639\u062F\u0629 \u0642\u0648\u064A\u0629</p><h3>\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u062A\u0639\u0627\u062F\u0644</h3><p>\u062D\u0645\u0636 + \u0642\u0627\u0639\u062F\u0629 \u2192 \u0645\u0627\u0621 + \u0645\u0644\u062D</p><p>HCl + NaOH \u2192 NaCl + H\u2082O</p>'
                    },
                    en: {
                        title: '\uD83D\uDCD6 Lesson 2: Acids &amp; Bases',
                        body: '<h3>What are Acids &amp; Bases?</h3><p><strong>Acids</strong>: pH &lt; 7. Examples: HCl (Hydrochloric acid), H\u2082SO\u2084 (Sulfuric acid)</p><p><strong>Bases</strong>: pH &gt; 7. Examples: NaOH (Sodium hydroxide), KOH</p><h3>pH Scale</h3><p>0-3: Strong acid | 4-6: Weak acid | 7: Neutral | 8-10: Weak base | 11-14: Strong base</p><h3>Neutralization</h3><p>Acid + Base \u2192 Water + Salt</p><p>HCl + NaOH \u2192 NaCl + H\u2082O</p>'
                    }
                }
            },
            {
                id: 3,
                icon: '\uD83E\uDDF0',
                content: {
                    ar: {
                        title: '\uD83D\uDCD6 \u0627\u0644\u062F\u0631\u0633 3: \u0627\u0644\u0623\u0643\u0633\u062F\u0629 \u0648\u0627\u0644\u0627\u062E\u062A\u0632\u0627\u0644',
                        body: '<h3>\u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0623\u0643\u0633\u062F\u0629 \u0648\u0627\u0644\u0627\u062E\u062A\u0632\u0627\u0644</h3><p><strong>\u0627\u0644\u0623\u0643\u0633\u062F\u0629</strong>: \u0641\u0642\u062F\u0627\u0646 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u0627\u062A (\u0632\u064A\u0627\u062F\u0629 \u0631\u0642\u0645 \u0627\u0644\u0623\u0643\u0633\u062F\u0629)</p><p><strong>\u0627\u0644\u0627\u062E\u062A\u0632\u0627\u0644</strong>: \u0627\u0643\u062A\u0633\u0627\u0628 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u0627\u062A (\u0627\u0646\u062E\u0641\u0627\u0636 \u0631\u0642\u0645 \u0627\u0644\u0623\u0643\u0633\u062F\u0629)</p><h3>\u062A\u0641\u0627\u0639\u0644\u0627\u062A \u0645\u0647\u0645\u0629</h3><p>Fe\u2082O\u2083 + 3CO \u2192 2Fe + 3CO\u2082 (\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u062D\u062F\u064A\u062F)</p><p>Zn + CuSO\u2084 \u2192 ZnSO\u2084 + Cu</p><h3>\u0627\u0644\u062A\u062C\u0627\u0631\u0628</h3><p>\u062C\u0631\u0651\u0628 \u062A\u0633\u062E\u064A\u0646 \u0627\u0644\u062D\u062F\u064A\u062F \u0648\u0634\u0627\u0647\u062F \u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0623\u0643\u0633\u062F\u0629!</p>'
                    },
                    en: {
                        title: '\uD83D\uDCD6 Lesson 3: Oxidation &amp; Reduction',
                        body: '<h3>Oxidation &amp; Reduction Defined</h3><p><strong>Oxidation</strong>: Loss of electrons (increase in oxidation number)</p><p><strong>Reduction</strong>: Gain of electrons (decrease in oxidation number)</p><h3>Key Reactions</h3><p>Fe\u2082O\u2083 + 3CO \u2192 2Fe + 3CO\u2082 (Iron smelting)</p><p>Zn + CuSO\u2084 \u2192 ZnSO\u2084 + Cu</p><h3>Experiments</h3><p>Try heating iron and observe the oxidation reaction!</p>'
                    }
                }
            },
            {
                id: 4,
                icon: '\u2697\uFE0F',
                content: {
                    ar: {
                        title: '\uD83D\uDCD6 \u0627\u0644\u062F\u0631\u0633 4: \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u0627\u062A \u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0626\u064A\u0629',
                        body: '<h3>\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u0627\u062A</h3><p>1. \u062A\u0641\u0627\u0639\u0644 \u0623\u0643\u0633\u062F\u0629-\u0627\u062E\u062A\u0632\u0627\u0644 (Redox)</p><p>2. \u062A\u0641\u0627\u0639\u0644 \u062A\u062D\u0644\u0644 (Decomposition)</p><p>3. \u062A\u0641\u0627\u0639\u0644 \u0627\u062A\u0635\u0627\u0644 (Synthesis)</p><p>4. \u062A\u0641\u0627\u0639\u0644 \u0627\u0633\u062A\u0628\u062F\u0627\u0644 (Displacement)</p><p>5. \u062A\u0641\u0627\u0639\u0644 \u0627\u0633\u062A\u0628\u062F\u0627\u0644 \u0645\u0632\u062F\u0648\u062C (Double displacement)</p><h3>\u0645\u0639\u062F\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644</h3><p>\u064A\u062A\u0623\u062B\u0631 \u0628\u0640: \u0627\u0644\u062D\u0631\u0627\u0631\u0629\u060C \u0627\u0644\u062A\u0631\u0643\u064A\u0632\u060C \u0627\u0644\u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0633\u0637\u062D\u064A\u0629\u060C \u0648\u062C\u0648\u062F \u0627\u0644\u0645\u062D\u0641\u0632</p>'
                    },
                    en: {
                        title: '\uD83D\uDCD6 Lesson 4: Chemical Reactions',
                        body: '<h3>Types of Reactions</h3><p>1. Redox reaction</p><p>2. Decomposition</p><p>3. Synthesis</p><p>4. Displacement</p><p>5. Double displacement</p><h3>Reaction Rate</h3><p>Affected by: Temperature, concentration, surface area, presence of catalyst</p>'
                    }
                }
            },
            {
                id: 5,
                icon: '\uD83E\uDDF1',
                content: {
                    ar: {
                        title: '\uD83D\uDCD6 \u0627\u0644\u062F\u0631\u0633 5: \u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0621 \u0627\u0644\u0639\u0636\u0648\u064A\u0629',
                        body: '<h3>\u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062A \u0627\u0644\u0639\u0636\u0648\u064A\u0629</h3><p>\u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0630\u0631\u0629 \u0627\u0644\u0643\u0631\u0628\u0648\u0646 (C). \u062A\u0634\u0645\u0644:</p><p>\u2022 \u0627\u0644\u0647\u064A\u062F\u0631\u0648\u0643\u0631\u0628\u0648\u0646\u0627\u062A: CH\u2084 (\u0645\u064A\u062B\u0627\u0646)\u060C C\u2082H\u2086 (\u0625\u064A\u062B\u0627\u0646)</p><p>\u2022 \u0627\u0644\u0643\u062D\u0648\u0644\u0627\u062A: CH\u2083OH (\u0645\u064A\u062B\u0627\u0646\u0648\u0644)\u060C C\u2082H\u2085OH (\u0625\u064A\u062B\u0627\u0646\u0648\u0644)</p><p>\u2022 \u0627\u0644\u0623\u062D\u0645\u0627\u0636 \u0627\u0644\u0639\u0636\u0648\u064A\u0629: CH\u2083COOH (\u062E\u0644)</p><h3>\u0627\u0644\u062A\u0641\u0627\u0639\u0644\u0627\u062A</h3><p>CH\u2084 + 2O\u2082 \u2192 CO\u2082 + 2H\u2082O (\u0627\u062D\u062A\u0631\u0627\u0642 \u0627\u0644\u0645\u064A\u062B\u0627\u0646)</p>'
                    },
                    en: {
                        title: '\uD83D\uDCD6 Lesson 5: Organic Chemistry',
                        body: '<h3>Organic Compounds</h3><p>Based on Carbon (C). Include:</p><p>\u2022 Hydrocarbons: CH\u2084 (Methane), C\u2082H\u2086 (Ethane)</p><p>\u2022 Alcohols: CH\u2083OH (Methanol), C\u2082H\u2085OH (Ethanol)</p><p>\u2022 Organic acids: CH\u2083COOH (Acetic acid/Vinegar)</p><h3>Reactions</h3><p>CH\u2084 + 2O\u2082 \u2192 CO\u2082 + 2H\u2082O (Methane combustion)</p>'
                    }
                }
            },
            {
                id: 6,
                icon: '\uD83D\uDEE1\uFE0F',
                content: {
                    ar: {
                        title: '\uD83D\uDCD6 \u0627\u0644\u062F\u0631\u0633 6: \u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0645\u062E\u062A\u0628\u0631',
                        body: '<h3>\u0642\u0648\u0627\u0639\u062F \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629</h3><p>1. \u0627\u0631\u062A\u062F\u0627\u0621 \u0627\u0644\u0646\u0638\u0627\u0631\u0627\u062A \u0627\u0644\u0648\u0627\u0642\u064A\u0629 \u062F\u0627\u0626\u0645\u0627\u064B</p><p>2. \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0642\u0641\u0627\u0632\u0627\u062A \u0639\u0646\u062F \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639 \u0627\u0644\u0623\u062D\u0645\u0627\u0636</p><p>3. \u0639\u062F\u0645 \u062A\u0630\u0648\u0642 \u0623\u064A \u0645\u0648\u0627\u062F \u0643\u064A\u0645\u064A\u0627\u0626\u064A\u0629</p><p>4. \u0645\u0639\u0631\u0641\u0629 \u0645\u0648\u0642\u0639 \u0637\u0641\u0627\u064A\u0629 \u0627\u0644\u062D\u0631\u064A\u0642</p><p>5. \u0627\u0644\u062A\u062E\u0644\u0635 \u0627\u0644\u0635\u062D\u064A\u062D \u0645\u0646 \u0627\u0644\u0646\u0641\u0627\u064A\u0627\u062A \u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0626\u064A\u0629</p><h3>\u0641\u064A \u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0637\u0648\u0627\u0631\u0626</h3><p>\u2022 \u062D\u0645\u0636 \u0639\u0644\u0649 \u0627\u0644\u062C\u0644\u062F: \u0627\u0634\u0637\u0641 \u0628\u0627\u0644\u0645\u0627\u0621 \u0641\u0648\u0631\u0627\u064B</p><p>\u2022 \u062D\u0645\u0636 \u0641\u064A \u0627\u0644\u0639\u064A\u0646: \u0627\u0634\u0637\u0641 15 \u062F\u0642\u064A\u0642\u0629 \u0628\u0627\u0644\u0645\u0627\u0621</p><p>\u2022 \u062A\u0633\u0631\u064A\u0628 \u063A\u0627\u0632: \u0627\u0641\u062A\u062D \u0627\u0644\u0646\u0648\u0627\u0641\u0630 \u0641\u0648\u0631\u0627\u064B</p>'
                    },
                    en: {
                        title: '\uD83D\uDCD6 Lesson 6: Lab Safety',
                        body: '<h3>Basic Safety Rules</h3><p>1. Always wear safety goggles</p><p>2. Use gloves when handling acids</p><p>3. Never taste any chemicals</p><p>4. Know fire extinguisher location</p><p>5. Proper chemical waste disposal</p><h3>Emergency Procedures</h3><p>\u2022 Acid on skin: Rinse with water immediately</p><p>\u2022 Acid in eyes: Rinse for 15 minutes with water</p><p>\u2022 Gas leak: Open windows immediately</p>'
                    }
                }
            }
        ]
    };
})();

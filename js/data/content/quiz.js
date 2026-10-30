/* ==========================================================================
   ChemLabX 4.0 — Content pack: quiz (TASK-008)
   Locale-structured, versioned quiz item bank. Each item:
     { id, content: { ar: { q, options, cat }, en: { q, options, cat } }, correct }
   `correct` is the zero-based index into the option array (same contract as
   the legacy quiz) and sits at the ITEM top level (a sibling of `content`),
   exactly as the Content domain resolves it. This pack is the single source of
   truth; js/pages/quiz.js is a THIN LOADER that reads it through the Content
   domain. Versioned under the 'content' DatasetManifest (js/data/content/manifest.js).
   ========================================================================== */
(function () {
    'use strict';
    var CHL = window.CHL = window.CHL || {};
    CHL.contentPacks = CHL.contentPacks || {};

    CHL.contentPacks.quiz = {
        packName: 'quiz',
        version: '1.0.0',
        schemaVersion: 2,
        items: [
            {
                id: 1,
                content: {
                    ar: { q: '\u0645\u0627 \u0646\u0627\u062A\u062C \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0635\u0648\u062F\u064A\u0648\u0645 (Na) \u0645\u0639 \u0627\u0644\u0645\u0627\u0621 (H\u2082O)\u061F', options: ['NaOH + H\u2082', 'NaCl + H\u2082O', 'Na\u2082O + H\u2082', 'Na + OH'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'What is the product of Sodium + Water?', options: ['NaOH + H\u2082', 'NaCl + H\u2082O', 'Na\u2082O + H\u2082', 'Na + OH'], cat: 'Basic' }
                },
                correct: 0
            },
            {
                id: 2,
                content: {
                    ar: { q: '\u0645\u0627 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0647\u064A\u062F\u0631\u0648\u062C\u064A\u0646\u064A (pH) \u0644\u0644\u0645\u0627\u0621 \u0627\u0644\u0646\u0642\u064A \u0639\u0646\u062F 25\u00B0C\u061F', options: ['5.0', '7.0', '9.0', '14.0'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'What is the pH of pure water at 25\u00B0C?', options: ['5.0', '7.0', '9.0', '14.0'], cat: 'Basic' }
                },
                correct: 1
            },
            {
                id: 3,
                content: {
                    ar: { q: '\u0623\u064A \u0645\u0646 \u0627\u0644\u062A\u0627\u0644\u064A \u062D\u0645\u0636 \u0642\u0648\u064A\u061F', options: ['CH\u2083COOH', 'HCl', 'NH\u2083', 'H\u2082O'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'Which is a strong acid?', options: ['CH\u2083COOH', 'HCl', 'NH\u2083', 'H\u2082O'], cat: 'Basic' }
                },
                correct: 1
            },
            {
                id: 4,
                content: {
                    ar: { q: '\u0645\u0627 \u0627\u0644\u063A\u0627\u0632 \u0627\u0644\u0646\u0627\u062C\u062C \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0632\u0646\u0643 \u0645\u0639 HCl\u061F', options: ['O\u2082', 'CO\u2082', 'H\u2082', 'N\u2082'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'What gas is produced when zinc reacts with HCl?', options: ['O\u2082', 'CO\u2082', 'H\u2082', 'N\u2082'], cat: 'Basic' }
                },
                correct: 2
            },
            {
                id: 5,
                content: {
                    ar: { q: '\u0645\u0627 \u0644\u0648\u0646 \u0643\u0628\u0631\u064A\u062A\u0627\u062A \u0627\u0644\u0646\u062D\u0627\u0633 (CuSO\u2084) \u0627\u0644\u0645\u0627\u0626\u064A\u0629\u061F', options: ['\u0623\u062D\u0645\u0631', '\u0623\u0632\u0631\u0642', '\u0623\u062E\u0636\u0631', '\u0623\u0635\u0641\u0631'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'What color is copper sulfate solution?', options: ['Red', 'Blue', 'Green', 'Yellow'], cat: 'Basic' }
                },
                correct: 1
            },
            {
                id: 6,
                content: {
                    ar: { q: '\u0645\u0627 \u0627\u0633\u0645 \u0645\u0631\u0643\u0628 NaOH\u061F', options: ['\u062D\u0645\u0636 \u0647\u064A\u062F\u0631\u0648\u0643\u0644\u0648\u0631\u064A\u0643', '\u0647\u064A\u062F\u0631\u0648\u0643\u0633\u064A\u062F \u0635\u0648\u062F\u064A\u0648\u0645', '\u0643\u0644\u0648\u0631\u064A\u062F \u0635\u0648\u062F\u064A\u0648\u0645', '\u0643\u0628\u0631\u064A\u062A\u0627\u062A \u0646\u062D\u0627\u0633'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'What is the name of NaOH?', options: ['Hydrochloric Acid', 'Sodium Hydroxide', 'Sodium Chloride', 'Copper Sulfate'], cat: 'Basic' }
                },
                correct: 1
            },
            {
                id: 7,
                content: {
                    ar: { q: '\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0645\u0636 \u0645\u0639 \u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u064A\u0633\u0645\u0649:', options: ['\u0623\u0643\u0633\u062F\u0629', '\u0627\u062E\u062A\u0632\u0627\u0644', '\u062A\u0639\u0627\u0636\u0644', '\u062A\u0631\u0633\u064A\u0628'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'Acid + base reaction is called:', options: ['Oxidation', 'Reduction', 'Neutralization', 'Precipitation'], cat: 'Basic' }
                },
                correct: 2
            },
            {
                id: 8,
                content: {
                    ar: { q: '\u0623\u064A \u063A\u0627\u0632 \u064A\u0646\u062A\u062C \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0643\u0627\u0644\u0633\u064A\u0648\u0645 \u0645\u0639 \u0627\u0644\u0645\u0627\u0621\u061F', options: ['\u0623\u0643\u0633\u062C\u064A\u0646', '\u0647\u064A\u062F\u0631\u0648\u062C\u064A\u0646', '\u0646\u064A\u062A\u0631\u0648\u062C\u064A\u0646', 'CO\u2082'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'What gas does calcium produce with water?', options: ['Oxygen', 'Hydrogen', 'Nitrogen', 'CO\u2082'], cat: 'Basic' }
                },
                correct: 1
            },
            {
                id: 9,
                content: {
                    ar: { q: '\u0645\u0627 \u0647\u0648 \u0627\u0644\u0645\u0644\u062D \u0627\u0644\u0646\u0627\u062A\u062C \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 HCl \u0645\u0639 NaOH\u061F', options: ['Na\u2082SO\u2084', 'NaCl', 'KCl', 'CaCl\u2082'], cat: '\u0645\u0644\u062D' },
                    en: { q: 'What salt is produced from HCl + NaOH?', options: ['Na\u2082SO\u2084', 'NaCl', 'KCl', 'CaCl\u2082'], cat: 'Salt' }
                },
                correct: 1
            },
            {
                id: 10,
                content: {
                    ar: { q: '\u0623\u064A \u0645\u0639\u062F\u0646 \u064A\u062A\u0631\u0633\u0628 \u0639\u0646\u062F \u062A\u0641\u0639\u064A\u0644 CuSO\u2084 \u0645\u0639 \u0627\u0644\u0632\u0646\u0643\u061F', options: ['\u062D\u062F\u064A\u062F', '\u0646\u062D\u0627\u0633', '\u0641\u0636\u0629', '\u0630\u0647\u0628'], cat: '\u062A\u0631\u0633\u064A\u0628' },
                    en: { q: 'Which metal precipitates when CuSO\u2084 reacts with zinc?', options: ['Iron', 'Copper', 'Silver', 'Gold'], cat: 'Precipitation' }
                },
                correct: 1
            },
            {
                id: 11,
                content: {
                    ar: { q: '\u062A\u0641\u0639\u064A\u0644 \u062A\u0631\u0633\u064A\u0628 AgNO\u2083 \u0645\u0639 NaCl \u064A\u0624\u062F\u064A \u0631\u0627\u0633\u0628:', options: ['\u0623\u0628\u064A\u0636', '\u0623\u062D\u0645\u0631', '\u0623\u0632\u0631\u0642', '\u0623\u0635\u0641\u0631'], cat: '\u062A\u0631\u0633\u064A\u0628' },
                    en: { q: 'AgNO\u2083 + NaCl produces a precipitate that is:', options: ['White', 'Red', 'Blue', 'Yellow'], cat: 'Precipitation' }
                },
                correct: 0
            },
            {
                id: 12,
                content: {
                    ar: { q: '\u0645\u0627 \u0646\u0627\u062A\u062C \u062A\u0641\u0639\u064A\u0644 CaCO\u2083 \u0645\u0639 HCl\u061F', options: ['CaCl\u2082 + H\u2082O + CO\u2082', 'CaO + H\u2082O', 'Ca(OH)\u2082', 'Ca + Cl\u2082'], cat: '\u063A\u0627\u0632' },
                    en: { q: 'What does CaCO\u2083 + HCl produce?', options: ['CaCl\u2082 + H\u2082O + CO\u2082', 'CaO + H\u2082O', 'Ca(OH)\u2082', 'Ca + Cl\u2082'], cat: 'Gas' }
                },
                correct: 0
            },
            {
                id: 13,
                content: {
                    ar: { q: '\u063A\u0627\u0632 NH\u2083 \u0645\u0639 HCl \u064A\u0624\u062F\u064A:', options: ['N\u2082 + H\u2082', 'NH\u2084Cl (\u062F\u062E\u0627\u0646 \u0623\u0628\u064A\u0636)', 'HNO\u2083', 'NH\u2084OH'], cat: '\u063A\u0627\u0632' },
                    en: { q: 'NH\u2083 gas + HCl produces:', options: ['N\u2082 + H\u2082', 'NH\u2084Cl (white smoke)', 'HNO\u2083', 'NH\u2084OH'], cat: 'Gas' }
                },
                correct: 1
            },
            {
                id: 14,
                content: {
                    ar: { q: '\u0645\u0627 \u0647\u0648 \u0623\u0643\u0633\u064A\u062F \u0627\u0644\u062D\u062F\u064A\u062F (III)\u061F', options: ['FeO', 'Fe\u2082O\u2083', 'Fe\u2083O\u2084', 'FeO\u2082'], cat: '\u0623\u0643\u0633\u064A\u062F' },
                    en: { q: 'What is iron(III) oxide?', options: ['FeO', 'Fe\u2082O\u2083', 'Fe\u2083O\u2084', 'FeO\u2082'], cat: 'Oxide' }
                },
                correct: 1
            },
            {
                id: 15,
                content: {
                    ar: { q: '\u0623\u064A \u0645\u0646 \u0627\u0644\u062A\u0627\u0644\u064A \u062D\u0645\u0636 \u0636\u0639\u064A\u0641\u061F', options: ['HCl', 'H\u2082SO\u2084', 'CH\u2083COOH', 'HNO\u2083'], cat: '\u062D\u0645\u0636' },
                    en: { q: 'Which is a weak acid?', options: ['HCl', 'H\u2082SO\u2084', 'CH\u2083COOH', 'HNO\u2083'], cat: 'Acid' }
                },
                correct: 2
            },
            {
                id: 16,
                content: {
                    ar: { q: 'pH \u0627\u0644\u0645\u062D\u0644\u0648\u0644 \u0627\u0644\u062D\u0645\u0636\u064A \u064A\u0643\u0648\u0646:', options: ['\u0623\u0643\u0628\u0631 \u0645\u0646 7', '\u064A\u0633\u0627\u0648\u064A 7', '\u0623\u0635\u063A\u0631 \u0645\u0646 7', '\u064A\u0633\u0627\u0648\u064A 14'], cat: '\u0623\u0633\u0627\u0633\u064A' },
                    en: { q: 'The pH of an acidic solution is:', options: ['Greater than 7', 'Equal to 7', 'Less than 7', 'Equal to 14'], cat: 'Basic' }
                },
                correct: 2
            },
            {
                id: 17,
                content: {
                    ar: { q: '\u062A\u0641\u0639\u064A\u0644 KMnO\u2084 \u0645\u0639 H\u2082O\u2082 \u064A\u0624\u062F\u064A:', options: ['O\u2082 + MnO\u2082', 'CO\u2082', 'H\u2082', 'Cl\u2082'], cat: '\u0623\u0643\u0633\u062F\u0629' },
                    en: { q: 'KMnO\u2084 + H\u2082O\u2082 produces:', options: ['O\u2082 + MnO\u2082', 'CO\u2082', 'H\u2082', 'Cl\u2082'], cat: 'Oxidation' }
                },
                correct: 0
            },
            {
                id: 18,
                content: {
                    ar: { q: '\u0627\u0644\u0641\u0636\u0629 (Ag) \u062A\u062A\u0631\u0633\u0628 \u0645\u0646 \u062A\u0641\u0639\u064A\u0644\u0647\u0627 \u0645\u0639:', options: ['NaOH', 'HCl', 'Cu', 'H\u2082O'], cat: '\u062A\u0631\u0633\u064A\u0628' },
                    en: { q: 'Silver precipitates from reaction with:', options: ['NaOH', 'HCl', 'Cu', 'H\u2082O'], cat: 'Precipitation' }
                },
                correct: 1
            },
            {
                id: 19,
                content: {
                    ar: { q: '\u0627\u0644\u063A\u0627\u0632 \u0627\u0644\u0646\u0628\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0627\u0644\u0628\u0627\u0644\u0648\u0646\u0627\u062A:', options: ['\u0647\u064A\u0644\u064A\u0648\u0645', '\u0646\u064A\u0648\u0646', '\u0623\u0631\u062C\u0648\u0646', '\u0632\u064A\u0646\u0648\u0646'], cat: '\u0639\u0646\u0627\u0635\u0631' },
                    en: { q: 'Noble gas used in balloons:', options: ['Helium', 'Neon', 'Argon', 'Xenon'], cat: 'Elements' }
                },
                correct: 0
            },
            {
                id: 20,
                content: {
                    ar: { q: '\u0644\u0648\u0646 \u063A\u0627\u0632 \u0627\u0644\u0643\u0644\u0648\u0631 \u0647\u0648:', options: ['\u0623\u0635\u0641\u0631', '\u0623\u062E\u0636\u0631', '\u0623\u062D\u0645\u0631', '\u0623\u0632\u0631\u0642'], cat: '\u0639\u0646\u0627\u0635\u0631' },
                    en: { q: 'The color of chlorine gas is:', options: ['Yellow', 'Green', 'Red', 'Blue'], cat: 'Elements' }
                },
                correct: 1
            }
        ]
    };
})();

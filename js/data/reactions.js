var reactions = {
    'Li,H2O': {
        equation: '2Li + 2H\u2082O \u2192 2LiOH + H\u2082\u2191',
        products: [{ name: 'هيدروكسيد ليثيوم', nameEn: 'Lithium Hydroxide', formula: 'LiOH', color: '#4A9EFF' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83E\uDDE3 انفجار!', effectEn: 'Explosion!', danger: true, tempChange: +50, phChange: +5.0, xp: 30,
        log: 'تفاعل عنيف! ليثيوم + ماء', logEn: 'Vigorous reaction! Lithium + Water'
    },
    'Na,H2O': {
        equation: '2Na + 2H\u2082O \u2192 2NaOH + H\u2082\u2191',
        products: [{ name: 'هيدروكسيد صوديوم', nameEn: 'Sodium Hydroxide', formula: 'NaOH', color: '#4A9EFF' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83E\uDDE3 انفجار!', effectEn: 'Explosion!', danger: true, tempChange: +45, phChange: +4.5, xp: 25,
        log: 'صوديوم + ماء \u2192 انفجار!', logEn: 'Sodium + Water \u2192 Explosion!'
    },
    'K,H2O': {
        equation: '2K + 2H\u2082O \u2192 2KOH + H\u2082\u2191',
        products: [{ name: 'هيدروكسيد بوتاسيوم', nameEn: 'Potassium Hydroxide', formula: 'KOH', color: '#4A9EFF' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83E\uDDE3 انفجار شديد!', effectEn: 'Violent explosion!', danger: true, tempChange: +55, phChange: +5.5, xp: 35,
        log: 'بوتاسيوم + ماء \u2192 انفجار عنيف!', logEn: 'Potassium + Water \u2192 Violent explosion!'
    },
    'Ca,H2O': {
        equation: 'Ca + 2H\u2082O \u2192 Ca(OH)\u2082 + H\u2082\u2191',
        products: [{ name: 'هيدروكسيد كالسيوم', nameEn: 'Calcium Hydroxide', formula: 'Ca(OH)\u2082', color: '#87CEEB' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83D\uDCA8 فوران غازي', effectEn: 'Gas evolution', danger: false, tempChange: +20, phChange: +3.5, xp: 15,
        log: 'كالسيوم + ماء \u2192 Ca(OH)\u2082 + H\u2082', logEn: 'Calcium + Water \u2192 Ca(OH)\u2082 + H\u2082'
    },
    'Mg,H2O': {
        equation: 'Mg + 2H\u2082O \u2192 Mg(OH)\u2082 + H\u2082\u2191',
        products: [{ name: 'هيدروكسيد مغنيسيوم', nameEn: 'Magnesium Hydroxide', formula: 'Mg(OH)\u2082', color: '#B0C4DE' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83E\uDEE7 فقاعات بطيئة', effectEn: 'Slow bubbling', danger: false, tempChange: +5, phChange: +2.0, xp: 10,
        log: 'مغنيسيوم + ماء \u2192 فقاعات بطيئة', logEn: 'Magnesium + Water \u2192 Slow bubbling'
    },
    'HCl,NaOH': {
        equation: 'HCl + NaOH \u2192 NaCl + H\u2082O',
        products: [{ name: 'كلوريد صوديوم', nameEn: 'Sodium Chloride', formula: 'NaCl', color: '#FFFFFF' }, { name: 'ماء', nameEn: 'Water', formula: 'H\u2082O', color: '#87CEEB' }],
        effect: '\uD83E\uDDCA تعادل كامل', effectEn: 'Neutralization', danger: false, tempChange: +8, phChange: -1.0, xp: 15,
        log: 'حمض + قاعدة \u2192 ملح + ماء', logEn: 'Acid + Base \u2192 Salt + Water'
    },
    'HCl,KOH': {
        equation: 'HCl + KOH \u2192 KCl + H\u2082O',
        products: [{ name: 'كلوريد بوتاسيوم', nameEn: 'Potassium Chloride', formula: 'KCl', color: '#FFFFFF' }, { name: 'ماء', nameEn: 'Water', formula: 'H\u2082O', color: '#87CEEB' }],
        effect: '\uD83E\uDDCA تعادل', effectEn: 'Neutralization', danger: false, tempChange: +7, phChange: -1.0, xp: 15,
        log: 'HCl + KOH \u2192 KCl + H\u2082O', logEn: 'HCl + KOH \u2192 KCl + H\u2082O'
    },
    'H2SO4,NaOH': {
        equation: 'H\u2082SO\u2084 + 2NaOH \u2192 Na\u2082SO\u2084 + 2H\u2082O',
        products: [{ name: 'كبريتات صوديوم', nameEn: 'Sodium Sulfate', formula: 'Na\u2082SO\u2084', color: '#F5F5DC' }, { name: 'ماء', nameEn: 'Water', formula: 'H\u2082O', color: '#87CEEB' }],
        effect: '\uD83E\uDDCA تعادل قوي', effectEn: 'Strong neutralization', danger: false, tempChange: +12, phChange: -1.5, xp: 20,
        log: 'H\u2082SO\u2084 + NaOH \u2192 Na\u2082SO\u2084 + H\u2082O', logEn: 'H\u2082SO\u2084 + NaOH \u2192 Na\u2082SO\u2084 + H\u2082O'
    },
    'CH3COOH,NaOH': {
        equation: 'CH\u2083COOH + NaOH \u2192 CH\u2083COONa + H\u2082O',
        products: [{ name: 'خلات صوديوم', nameEn: 'Sodium Acetate', formula: 'CH\u2083COONa', color: '#FFE4B5' }, { name: 'ماء', nameEn: 'Water', formula: 'H\u2082O', color: '#87CEEB' }],
        effect: '\uD83E\uDDCA تعادل', effectEn: 'Neutralization', danger: false, tempChange: +5, phChange: -0.8, xp: 12,
        log: 'حمض خليك + NaOH \u2192 خلات + ماء', logEn: 'Acetic Acid + NaOH \u2192 Sodium Acetate + Water'
    },
    'Zn,HCl': {
        equation: 'Zn + 2HCl \u2192 ZnCl\u2082 + H\u2082\u2191',
        products: [{ name: 'كلوريد زنك', nameEn: 'Zinc Chloride', formula: 'ZnCl\u2082', color: '#D3D3D3' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83D\uDCA8 تصاعد غاز الهيدروجين', effectEn: 'Hydrogen gas evolution', danger: true, tempChange: +12, phChange: -0.5, xp: 20,
        log: 'زنك + HCl \u2192 ZnCl\u2082 + H\u2082', logEn: 'Zinc + HCl \u2192 ZnCl\u2082 + H\u2082'
    },
    'Fe,HCl': {
        equation: 'Fe + 2HCl \u2192 FeCl\u2082 + H\u2082\u2191',
        products: [{ name: 'كلوريد حديدوز', nameEn: 'Iron(II) Chloride', formula: 'FeCl\u2082', color: '#98FB98' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83D\uDCA8 تصاعد غاز', effectEn: 'Gas evolution', danger: false, tempChange: +8, phChange: -0.3, xp: 15,
        log: 'حديد + HCl \u2192 FeCl\u2082 + H\u2082', logEn: 'Iron + HCl \u2192 FeCl\u2082 + H\u2082'
    },
    'Mg,HCl': {
        equation: 'Mg + 2HCl \u2192 MgCl\u2082 + H\u2082\u2191',
        products: [{ name: 'كلوريد مغنيسيوم', nameEn: 'Magnesium Chloride', formula: 'MgCl\u2082', color: '#FFFFF0' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83D\uDCA8 فوران غازي', effectEn: 'Gas evolution', danger: false, tempChange: +10, phChange: -0.4, xp: 14,
        log: 'مغنيسيوم + HCl \u2192 MgCl\u2082 + H\u2082', logEn: 'Magnesium + HCl \u2192 MgCl\u2082 + H\u2082'
    },
    'Zn,H2SO4': {
        equation: 'Zn + H\u2082SO\u2084 \u2192 ZnSO\u2084 + H\u2082\u2191',
        products: [{ name: 'كبريتات زنك', nameEn: 'Zinc Sulfate', formula: 'ZnSO\u2084', color: '#F5F5DC' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83D\uDCA8 فوران غازي', effectEn: 'Gas evolution', danger: false, tempChange: +10, phChange: -0.4, xp: 16,
        log: 'زنك + H\u2082SO\u2084 \u2192 ZnSO\u2084 + H\u2082', logEn: 'Zinc + H\u2082SO\u2084 \u2192 ZnSO\u2084 + H\u2082'
    },
    'Fe,H2SO4': {
        equation: 'Fe + H\u2082SO\u2084 \u2192 FeSO\u2084 + H\u2082\u2191',
        products: [{ name: 'كبريتات حديدوز', nameEn: 'Iron(II) Sulfate', formula: 'FeSO\u2084', color: '#98FB98' }, { name: 'هيدروجين', nameEn: 'Hydrogen', formula: 'H\u2082', color: '#90EE90' }],
        effect: '\uD83D\uDCA8 فوران', effectEn: 'Gas evolution', danger: false, tempChange: +8, phChange: -0.3, xp: 14,
        log: 'حديد + H\u2082SO\u2084 \u2192 FeSO\u2084 + H\u2082', logEn: 'Iron + H\u2082SO\u2084 \u2192 FeSO\u2084 + H\u2082'
    },
    'CuSO4,Zn': {
        equation: 'CuSO\u2084 + Zn \u2192 ZnSO\u2084 + Cu\u2193',
        products: [{ name: 'كبريتات زنك', nameEn: 'Zinc Sulfate', formula: 'ZnSO\u2084', color: '#F5F5DC' }, { name: 'نحاس', nameEn: 'Copper', formula: 'Cu', color: '#D2691E' }],
        effect: '\uD83D\uDD34 ترسيب نحاس', effectEn: 'Copper precipitate', danger: false, tempChange: +5, phChange: 0.0, xp: 20,
        log: 'ترسيب النحاس! CuSO\u2084 + Zn \u2192 Cu', logEn: 'Copper precipitates! CuSO\u2084 + Zn \u2192 Cu'
    },
    'AgNO3,Cu': {
        equation: '2AgNO\u2083 + Cu \u2192 Cu(NO\u2083)\u2082 + 2Ag\u2193',
        products: [{ name: 'نترات نحاس', nameEn: 'Copper Nitrate', formula: 'Cu(NO\u2083)\u2082', color: '#4169E1' }, { name: 'فضة', nameEn: 'Silver', formula: 'Ag', color: '#E8E8E8' }],
        effect: '\u26AA ترسيب فضة', effectEn: 'Silver precipitate', danger: false, tempChange: +3, phChange: 0.0, xp: 25,
        log: 'ترسيب الفضة!', logEn: 'Silver precipitates!'
    },
    'AgNO3,NaCl': {
        equation: 'AgNO\u2083 + NaCl \u2192 AgCl\u2193 + NaNO\u2083',
        products: [{ name: 'كلوريد فضة', nameEn: 'Silver Chloride', formula: 'AgCl', color: '#F5F5F5' }, { name: 'نترات صوديوم', nameEn: 'Sodium Nitrate', formula: 'NaNO\u2083', color: '#FFFFE0' }],
        effect: '\u26AA راسب أبيض', effectEn: 'White precipitate', danger: false, tempChange: +2, phChange: 0.0, xp: 18,
        log: 'ترسيب كلوريد الفضة!', logEn: 'Silver chloride precipitates!'
    },
    'KMnO4,H2O2': {
        equation: '2KMnO\u2084 + 3H\u2082O\u2082 \u2192 2MnO\u2082\u2193 + 2KOH + 3O\u2082\u2191',
        products: [{ name: 'أكسيد منغنيز', nameEn: 'Manganese Dioxide', formula: 'MnO\u2082', color: '#8B4513' }, { name: 'أكسجين', nameEn: 'Oxygen', formula: 'O\u2082', color: '#ADD8E6' }],
        effect: '\uD83D\uDCA5 تفاعل أكسدة عنيف!', effectEn: 'Vigorous oxidation!', danger: true, tempChange: +30, phChange: +2.0, xp: 35,
        log: 'KMnO\u2084 + H\u2082O\u2082 \u2192 MnO\u2082 + KOH + O\u2082', logEn: 'KMnO\u2084 + H\u2082O\u2082 \u2192 MnO\u2082 + KOH + O\u2082'
    },
    'CH3COOH,NaHCO3': {
        equation: 'CH\u2083COOH + NaHCO\u2083 \u2192 CH\u2083COONa + H\u2082O + CO\u2082\u2191',
        products: [{ name: 'خلات صوديوم', nameEn: 'Sodium Acetate', formula: 'CH\u2083COONa', color: '#FFE4B5' }, { name: 'CO\u2082', nameEn: 'Carbon Dioxide', formula: 'CO\u2082', color: '#D3D3D3' }],
        effect: '\uD83E\uDEE7 فوران CO\u2082', effectEn: 'CO\u2082 evolution', danger: false, tempChange: +4, phChange: -0.5, xp: 12,
        log: 'حمض خليك + بيكربونات \u2192 CO\u2082', logEn: 'Acetic acid + Bicarbonate \u2192 CO\u2082'
    },
    'CaCO3,HCl': {
        equation: 'CaCO\u2083 + 2HCl \u2192 CaCl\u2082 + H\u2082O + CO\u2082\u2191',
        products: [{ name: 'كلوريد كالسيوم', nameEn: 'Calcium Chloride', formula: 'CaCl\u2082', color: '#F5F5DC' }, { name: 'CO\u2082', nameEn: 'Carbon Dioxide', formula: 'CO\u2082', color: '#D3D3D3' }],
        effect: '\uD83E\uDEE7 فوران CO\u2082', effectEn: 'CO\u2082 evolution', danger: false, tempChange: +6, phChange: -0.6, xp: 14,
        log: 'CaCO\u2083 + HCl \u2192 CaCl\u2082 + CO\u2082', logEn: 'CaCO\u2083 + HCl \u2192 CaCl\u2082 + CO\u2082'
    },
    'NH3,HCl': {
        equation: 'NH\u2083 + HCl \u2192 NH\u2084Cl',
        products: [{ name: 'كلوريد أمونيوم', nameEn: 'Ammonium Chloride', formula: 'NH\u2084Cl', color: '#FFFFFF' }],
        effect: '\u2601\uFE0F دخان أبيض', effectEn: 'White smoke', danger: false, tempChange: +6, phChange: -0.4, xp: 16,
        log: 'أمونيا + HCl \u2192 دخان أبيض NH\u2084Cl', logEn: 'Ammonia + HCl \u2192 White smoke NH\u2084Cl'
    },
    'CaO,H2O': {
        equation: 'CaO + H\u2082O \u2192 Ca(OH)\u2082',
        products: [{ name: 'هيدروكسيد كالسيوم', nameEn: 'Calcium Hydroxide', formula: 'Ca(OH)\u2082', color: '#FFFFF0' }],
        effect: '\uD83D\uDD25 تفاعل حراري شديد!', effectEn: 'Exothermic reaction!', danger: true, tempChange: +40, phChange: +5.0, xp: 20,
        log: 'CaO + H\u2082O \u2192 حرارة عالية!', logEn: 'CaO + H\u2082O \u2192 High heat!'
    },
    'HCl,H2O2': {
        equation: '2HCl + H\u2082O\u2082 \u2192 Cl\u2082\u2191 + 2H\u2082O',
        products: [{ name: 'غاز الكلور', nameEn: 'Chlorine Gas', formula: 'Cl\u2082', color: '#50E050' }, { name: 'ماء', nameEn: 'Water', formula: 'H\u2082O', color: '#87CEEB' }],
        effect: '\uD83D\uDCA8 غاز كلور سام!', effectEn: 'Toxic chlorine gas!', danger: true, tempChange: +15, phChange: -1.0, xp: 20,
        log: 'HCl + H\u2082O\u2082 \u2192 Cl\u2082 + H\u2082O', logEn: 'HCl + H\u2082O\u2082 \u2192 Cl\u2082 + H\u2082O'
    },
    'FeCl3,NaOH': {
        equation: 'FeCl\u2083 + 3NaOH \u2192 Fe(OH)\u2083\u2193 + 3NaCl',
        products: [{ name: 'هيدروكسيد حديد', nameEn: 'Iron(III) Hydroxide', formula: 'Fe(OH)\u2083', color: '#8B4513' }, { name: 'كلوريد صوديوم', nameEn: 'Sodium Chloride', formula: 'NaCl', color: '#FFFFFF' }],
        effect: '\uD83E\uDEE4 راسب بني', effectEn: 'Brown precipitate', danger: false, tempChange: +3, phChange: +0.5, xp: 16,
        log: 'FeCl\u2083 + NaOH \u2192 Fe(OH)\u2083\u2193 + NaCl', logEn: 'FeCl\u2083 + NaOH \u2192 Fe(OH)\u2083\u2193 + NaCl'
    },
    'CuSO4,NaOH': {
        equation: 'CuSO\u2084 + 2NaOH \u2192 Cu(OH)\u2082\u2193 + Na\u2082SO\u2084',
        products: [{ name: 'هيدروكسيد نحاس', nameEn: 'Copper Hydroxide', formula: 'Cu(OH)\u2082', color: '#4169E1' }, { name: 'كبريتات صوديوم', nameEn: 'Sodium Sulfate', formula: 'Na\u2082SO\u2084', color: '#F5F5DC' }],
        effect: '\uD83D\uDD35 راسب أزرق', effectEn: 'Blue precipitate', danger: false, tempChange: +3, phChange: +0.8, xp: 16,
        log: 'CuSO\u2084 + NaOH \u2192 Cu(OH)\u2082\u2193', logEn: 'CuSO\u2084 + NaOH \u2192 Cu(OH)\u2082\u2193'
    },
    'H2SO4,H2O': {
        equation: 'H\u2082SO\u2084 + H\u2082O \u2192 (dilute)',
        products: [{ name: 'حمض مخفف', nameEn: 'Dilute Acid', formula: 'H\u2082SO\u2084(aq)', color: '#FFE0E0' }],
        effect: '\uD83D\uDD25 إثراء حمض!', effectEn: 'Acid dilution!', danger: true, tempChange: +30, phChange: -2.0, xp: 15,
        log: 'إثراء حمض كبريتيك \u2014 يجب إضافة الحمض للماء!', logEn: 'Diluting sulfuric acid \u2014 Add acid to water!'
    },
    'NaCl,H2O': {
        equation: 'NaCl(s) \u2192 Na\u207A(aq) + Cl\u207B(aq)',
        products: [{ name: 'محلول ملحي', nameEn: 'Salt Solution', formula: 'Na\u207A + Cl\u207B', color: '#E0F0FF' }],
        effect: '\uD83D\uDCA7 ذوبان', effectEn: 'Dissolving', danger: false, tempChange: -1, phChange: 0, xp: 3,
        log: 'ذوبان كلوريد الصوديوم في الماء', logEn: 'Sodium chloride dissolves in water'
    },
    'CuSO4,H2O': {
        equation: 'CuSO\u2084(s) \u2192 CuSO\u2084(aq)',
        products: [{ name: 'محلول أزرق', nameEn: 'Blue Solution', formula: 'CuSO\u2084(aq)', color: '#4169E1' }],
        effect: '\uD83D\uDD35 محلول أزرق', effectEn: 'Blue solution', danger: false, tempChange: -2, phChange: 0, xp: 5,
        log: 'ذوبان كبريتات النحاس \u2192 محلول أزرق', logEn: 'Copper sulfate dissolves \u2192 Blue solution'
    }
};


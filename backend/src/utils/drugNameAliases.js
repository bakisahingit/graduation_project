// backend/src/utils/drugNameAliases.js
/**
 * Türkçe İlaç İsmi Eşleştirmeleri
 * Ticari isimler, markalar ve Türkçe yazımlar → Jenerik isim
 */

// Türkçe/Ticari isim → İngilizce jenerik isim eşleştirmesi
const DRUG_ALIASES = {
    // Ağrı Kesiciler
    'parol': 'paracetamol',
    'tylol': 'paracetamol',
    'parasetamol': 'paracetamol',
    'asetaminofen': 'acetaminophen',
    'tylenol': 'paracetamol',
    'vermidon': 'paracetamol',
    'minoset': 'paracetamol',
    'arveles': 'dexketoprofen',
    'majezik': 'flurbiprofen',
    'nurofen': 'ibuprofen',
    'advil': 'ibuprofen',
    'brufen': 'ibuprofen',
    'apranax': 'naproxen',
    'naprosyn': 'naproxen',
    'diklofenak': 'diclofenac',
    'voltaren': 'diclofenac',

    // Antibiyotikler
    'largopen': 'amoxicillin',
    'amoklavin': 'amoxicillin-clavulanate',
    'augmentin': 'amoxicillin-clavulanate',
    'azitromisin': 'azithromycin',
    'zitromax': 'azithromycin',
    'klaritromisin': 'clarithromycin',
    'klacid': 'clarithromycin',
    'siprofloksasin': 'ciprofloxacin',
    'cipro': 'ciprofloxacin',
    'levofloksasin': 'levofloxacin',
    'tavanic': 'levofloxacin',

    // PPI'lar
    'nexium': 'esomeprazole',
    'esomeprazol': 'esomeprazole',
    'losec': 'omeprazole',
    'omeprazol': 'omeprazole',
    'pantpas': 'pantoprazole',
    'pantoprazol': 'pantoprazole',
    'controloc': 'pantoprazole',

    // Kalp / Tansiyon
    'coumadin': 'warfarin',
    'orfarin': 'warfarin',
    'plavix': 'clopidogrel',
    'klopidogrel': 'clopidogrel',
    'beloc': 'metoprolol',
    'metoprolol': 'metoprolol',
    'norvasc': 'amlodipine',
    'amlodipin': 'amlodipine',
    'cozaar': 'losartan',
    'diovan': 'valsartan',
    'zestril': 'lisinopril',
    'enalapril': 'enalapril',
    'ramipril': 'ramipril',
    'delix': 'ramipril',

    // Diyabet
    'glucophage': 'metformin',
    'glukomin': 'metformin',
    'diamicron': 'gliclazide',
    'gliklazit': 'gliclazide',
    'amaryl': 'glimepiride',
    'glimepirid': 'glimepiride',
    'januvia': 'sitagliptin',

    // Statinler
    'lipitor': 'atorvastatin',
    'atorvastatin': 'atorvastatin',
    'crestor': 'rosuvastatin',
    'rosuvastatin': 'rosuvastatin',
    'zocor': 'simvastatin',
    'simvastatin': 'simvastatin',

    // Psikiyatri
    'lustral': 'sertraline',
    'sertralin': 'sertraline',
    'zoloft': 'sertraline',
    'cipralex': 'escitalopram',
    'essitalopram': 'escitalopram',
    'prozac': 'fluoxetine',
    'fluoksetin': 'fluoxetine',
    'xanax': 'alprazolam',
    'alprazolam': 'alprazolam',

    // Solunum
    'ventolin': 'salbutamol',
    'salbutamol': 'salbutamol',
    'pulmicort': 'budesonide',
    'budesonid': 'budesonide',
    'singulair': 'montelukast',
    'montelukast': 'montelukast',

    // PDE5 İnhibitörleri
    'viagra': 'sildenafil',
    'sildenafil': 'sildenafil',
    'cialis': 'tadalafil',
    'tadalafil': 'tadalafil',

    // Tiroid
    'euthyrox': 'levothyroxine',
    'levotiroksin': 'levothyroxine',
    'tefor': 'levothyroxine',

    // Antiepileptikler
    'tegretol': 'carbamazepine',
    'karbamazepin': 'carbamazepine',
    'depakin': 'valproate',
    'valproat': 'valproate',
    'valproik_asit': 'valproic_acid',

    // Diğer
    'aspirin': 'aspirin',
    'coraspin': 'aspirin',
    'ecopirin': 'aspirin',
    'tramadol': 'tramadol',
    'contramal': 'tramadol',
    'ultram': 'tramadol',
    'lansor': 'lansoprazole',
    'lansoprazol': 'lansoprazole',

    // --- GENİŞLETİLMİŞ LİSTE ---
    // Akne
    'roaccutane': 'isotretinoin',
    'zoretanin': 'isotretinoin',
    'aknetrent': 'isotretinoin',
    'acnegen': 'isotretinoin',
    'azelderm': 'azelaic_acid',
    'benzamycin': 'erythromycin_benzoyl_peroxide',
    'cleocin': 'clindamycin',

    // Ağrı / İnflamasyon (NSAID & Analjezik)
    'majezik': 'flurbiprofen',
    'maximus': 'flurbiprofen',
    'arveles': 'dexketoprofen',
    'dexday': 'dexketoprofen',
    'deksalgin': 'dexketoprofen',
    'dolorex': 'diclofenac',
    'dikloron': 'diclofenac',
    'etol': 'etodolac',
    'tilcotil': 'tenoxicam',
    'felden': 'piroxicam',
    'aprolojik': 'naproxen',
    'calpol': 'paracetamol',
    'a-ferin': 'paracetamol_chlorpheniramine',
    'theraflu': 'paracetamol_phenylephrine',
    'nurofen_cold': 'ibuprofen_pseudoephedrine',
    'kataflam': 'diclofenac',
    'buscopan': 'hyoscine',

    // Antibiyotikler
    'augmentin': 'amoxicillin_clavulanate',
    'klavunat': 'amoxicillin_clavulanate',
    'bioment': 'amoxicillin_clavulanate',
    'kroksileks': 'amoxicillin_clavulanate',
    'cipro': 'ciprofloxacin',
    'ciprasid': 'ciprofloxacin',
    'infex': 'cefpodoxime',
    'sefak': 'cefaclor',
    'ceftinex': 'cefdinir',
    'monodoks': 'doxycycline',
    'tetradox': 'doxycycline',
    'azitro': 'azithromycin',
    'largopen': 'amoxicillin',
    'alfoxil': 'amoxicillin',
    'bactrim': 'sulfamethoxazole_trimethoprim',

    // Mide / GİS
    'gaviscon': 'alginic_acid',
    'rennie': 'calcium_carbonate',
    'talcid': 'hydrotalcite',
    'motilium': 'domperidone',
    'metpamid': 'metoclopramide',
    'pulcet': 'pantoprazole',
    'nexium': 'esomeprazole',
    'lansor': 'lansoprazole',
    'famodin': 'famotidine',
    'ulcuran': 'ranitidine', // Note: Recalled in many places but still known

    // Psikiyatri
    'cipram': 'citalopram',
    'efexor': 'venlafaxine',
    'venegis': 'venlafaxine',
    'paxil': 'paroxetine',
    'faverin': 'fluvoxamine',
    'remeron': 'mirtazapine',
    'desyrel': 'trazodone',
    'gyrex': 'quetiapine',
    'seroquel': 'quetiapine',
    'risperdal': 'risperidone',
    'abilify': 'aripiprazole',
    'concerta': 'methylphenidate',
    'ritalin': 'methylphenidate',
    'atarax': 'hydroxyzine',
    'passiflora': 'passion_flower',

    // Diyabet
    'glucophage': 'metformin',
    'matofin': 'metformin',
    'diaformin': 'metformin',
    'jardiance': 'empagliflozin',
    'forziga': 'dapagliflozin',
    'galvus': 'vildagliptin',
    'lantus': 'insulin_glargine',
    'humalog': 'insulin_lispro',
    'novorapid': 'insulin_aspart',

    // Kardiyovasküler
    'beloc': 'metoprolol',
    'saneloc': 'metoprolol',
    'diltizem': 'diltiazem',
    'isoptin': 'verapamil',
    'cordarone': 'amiodarone',
    'coraspin': 'aspirin',
    'ecopirin': 'aspirin',
    'plavix': 'clopidogrel',
    'pingel': 'clopidogrel',
    'brilinta': 'ticagrelor',
    'xarelto': 'rivaroxaban',
    'eliquis': 'apixaban',
    'pradaxa': 'dabigatran',
    'lasix': 'furosemide',
    'desal': 'furosemide',
    'aldactazide': 'spironolactone_hydrochlorothiazide',

    // Solunum / Allerji
    'aerius': 'desloratadine',
    'zyrtec': 'cetirizine',
    'crebros': 'levocetirizine',
    'airfest': 'montelukast',
    'notta': 'montelukast',
    'ventolin': 'salbutamol',
    'seretide': 'salmeterol_fluticasone',
    'symbicort': 'formoterol_budesonide',
    'nasonex': 'mometasone',

    // Vitamin / Mineral
    'benexol': 'vitamin_b_complex',
    'apikobal': 'vitamin_b_complex',
    'dodex': 'vitamin_b12',
    'devit': 'vitamin_d',
    'ferro_sanol': 'ferrous_sulfate',
    'gyno_ferro_sanol': 'ferrous_sulfate_folic_acid',
    'magnecalcine': 'calcium_magnesium',
    'zinco': 'zinc_sulfate',

    // Akne (İzotretinoin)
    'izotretinoin': 'isotretinoin',
    'isotretinoin': 'isotretinoin',
};

/**
 * İlaç ismini normalize et ve jenerik isme çevir
 * @param {string} drugName - Türkçe veya ticari ilaç ismi
 * @returns {string} - İngilizce jenerik ilaç ismi
 */
export function normalizeToGeneric(drugName) {
    if (!drugName) return '';

    const normalized = drugName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zçğıöşü0-9_-]/gi, '')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u');

    // Alias'ta varsa dönüştür
    if (DRUG_ALIASES[normalized]) {
        return DRUG_ALIASES[normalized];
    }

    // Yoksa orijinali döndür
    return normalized;
}

/**
 * Birden fazla ilaç ismini normalize et
 * @param {string[]} drugNames - İlaç isimleri listesi
 * @returns {string[]} - Normalize edilmiş ilaç isimleri
 */
export function normalizeMultipleDrugs(drugNames) {
    return drugNames.map(name => normalizeToGeneric(name));
}

/**
 * İlaç isminin bilinen bir isim olup olmadığını kontrol et
 * @param {string} drugName - İlaç ismi
 * @returns {boolean}
 */
export function isKnownDrug(drugName) {
    const normalized = normalizeToGeneric(drugName);
    return Object.values(DRUG_ALIASES).includes(normalized) ||
        Object.keys(DRUG_ALIASES).includes(normalized.toLowerCase());
}

export { DRUG_ALIASES };

export default {
    normalizeToGeneric,
    normalizeMultipleDrugs,
    isKnownDrug,
    DRUG_ALIASES
};

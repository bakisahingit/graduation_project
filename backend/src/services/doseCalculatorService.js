// backend/src/services/doseCalculatorService.js
/**
 * Doz Hesaplayıcı Servisi
 * CKD-EPI 2021 + Cockcroft-Gault formülleri
 * Türkçe ilaç isimleri desteklenir
 */

import { normalizeToGeneric } from '../utils/drugNameAliases.js';

const PEDIATRIC_FORMULAS = {
    youngs: (age, adultDose) => (age / (age + 12)) * adultDose,
    clarks: (weight, adultDose) => (weight / 70) * adultDose,
    frieds: (ageMonths, adultDose) => (ageMonths / 150) * adultDose,
    bsa: (bsa, adultDose) => (bsa / 1.73) * adultDose,
};

const PEDIATRIC_DOSES = {
    'paracetamol': { dose: 15, unit: 'mg/kg', frequency: '4-6 saatte bir', maxDaily: 60, notes: 'Maks 4g/gün' },
    'ibuprofen': { dose: 10, unit: 'mg/kg', frequency: '6-8 saatte bir', maxDaily: 40, notes: '6 aydan büyük' },
    'amoxicillin': { dose: 25, unit: 'mg/kg', frequency: '8 saatte bir', maxDaily: 100, notes: 'Yüksek doz 80-90mg/kg' },
    'azithromycin': { dose: 10, unit: 'mg/kg', frequency: 'Günde tek doz', maxDaily: 10, notes: '1. gün, sonra 5mg/kg' },
    'cefalexin': { dose: 25, unit: 'mg/kg', frequency: '6-8 saatte bir', maxDaily: 100, notes: '' },
    'clarithromycin': { dose: 7.5, unit: 'mg/kg', frequency: '12 saatte bir', maxDaily: 15, notes: 'Maks 500mg x2' },
    'prednisolone': { dose: 1, unit: 'mg/kg', frequency: 'Günde tek doz', maxDaily: 2, notes: 'Kısa süreli' },
    'ondansetron': { dose: 0.15, unit: 'mg/kg', frequency: '8 saatte bir', maxDaily: 0.45, notes: 'Maks 8mg/doz' },
    'cetirizine': { dose: 0.25, unit: 'mg/kg', frequency: 'Günde tek doz', maxDaily: 0.25, notes: 'Maks 10mg' },
    'omeprazole': { dose: 1, unit: 'mg/kg', frequency: 'Günde tek doz', maxDaily: 1, notes: 'Maks 20mg' },
};

const RENAL_ADJUSTMENTS = {
    'metformin': { normal: '100%', mild: '100%', moderate: '50%', severe: 'Kontraendike', notes: 'Laktik asidoz' },
    'gabapentin': { normal: '300-600mg x3', mild: '200-700mg x2', moderate: '200-700mg/gün', severe: '100-300mg/gün', notes: 'Aralık ayarlayın' },
    'pregabalin': { normal: '150-300mg x2', mild: '75-150mg x2', moderate: '25-75mg x2', severe: '25-75mg/gün', notes: 'Düşük başla' },
    'amoxicillin': { normal: '100%', mild: '100%', moderate: '50-75%', severe: '25-50%', notes: 'Aralık uzat' },
    'ciprofloxacin': { normal: '100%', mild: '100%', moderate: '50-75%', severe: '50%', notes: 'Her 18-24s' },
    'levofloxacin': { normal: '100%', mild: '100%', moderate: '50%', severe: '25%', notes: 'QT izle' },
    'acyclovir': { normal: '100%', mild: '100%', moderate: '50% 12-24s', severe: '50% 24s', notes: 'IV dikkatli' },
    'digoxin': { normal: '0.125-0.25mg', mild: '0.125mg', moderate: '0.0625-0.125mg', severe: '0.0625mg gün aşırı', notes: 'Düzey takibi' },
    'methotrexate': { normal: '100%', mild: '75%', moderate: '50%', severe: 'Kontraendike', notes: 'Toksisite' },
    'lithium': { normal: '100%', mild: '75%', moderate: '50%', severe: 'Kontraendike', notes: 'Düzey takibi' },
    'allopurinol': { normal: '300mg', mild: '200mg', moderate: '100mg', severe: '100mg gün aşırı', notes: 'Birikim' },
    'atenolol': { normal: '100%', mild: '50%', moderate: '25-50%', severe: '25%', notes: 'Bradikardi' },
    'lisinopril': { normal: '100%', mild: '75%', moderate: '50%', severe: '25-50%', notes: 'Hiperkalemi' },
    'spironolactone': { normal: '100%', mild: 'Dikkatli', moderate: 'Kaçının', severe: 'Kontraendike', notes: 'Hiperkalemi' },
    'nsaid': { normal: '100%', mild: 'Dikkatli', moderate: 'Kaçının', severe: 'Kontraendike', notes: 'Böbrek hasarı' },
    'morphine': { normal: '100%', mild: '75%', moderate: '50%', severe: '25-50%', notes: 'Metabolit birikir' },
    'tramadol': { normal: '100%', mild: '100%', moderate: '50%', severe: '25%', notes: 'Nöbet riski' },
};

const HEPATIC_ADJUSTMENTS = {
    'paracetamol': { childA: '2g/gün', childB: '2g/gün kısa', childC: 'Kaçının', notes: 'Hepatotoksisite' },
    'diazepam': { childA: '%50', childB: '%25-50', childC: 'Kaçının', notes: 'Birikim' },
    'warfarin': { childA: 'INR takibi', childB: 'Düşük doz', childC: 'Kaçının', notes: 'Faktör azalmış' },
    'statins': { childA: 'Azaltılmış', childB: 'Kaçının', childC: 'Kontraendike', notes: 'Hepatotoksisite' },
    'metformin': { childA: 'Normal', childB: 'Dikkatli', childC: 'Kontraendike', notes: 'Laktik asidoz' },
    'tramadol': { childA: 'Normal', childB: '50mg 12s', childC: 'Kullanmayın', notes: 'Metabolizma' },
    'opioids': { childA: '%50-75', childB: '%25-50', childC: '%25', notes: 'Ensefalopati' },
    'nsaid': { childA: 'Dikkatli', childB: 'Kaçının', childC: 'Kontraendike', notes: 'GI kanama ve hepatotoksisite' },
    'dexketoprofen': { childA: 'Dikkatli', childB: 'Kaçının', childC: 'Kontraendike', notes: 'NSAID - GI kanama riski' },
    'ibuprofen': { childA: 'Düşük doz', childB: 'Kaçının', childC: 'Kontraendike', notes: 'NSAID - hepatotoksisite' },
    'naproxen': { childA: 'Düşük doz', childB: 'Kaçının', childC: 'Kontraendike', notes: 'NSAID - GI kanama' },
    'diclofenac': { childA: 'Kaçının', childB: 'Kontraendike', childC: 'Kontraendike', notes: 'Hepatotoksisite yüksek' },
    'flurbiprofen': { childA: 'Dikkatli', childB: 'Kaçının', childC: 'Kontraendike', notes: 'NSAID - Majezik' },
    'omeprazole': { childA: 'Normal', childB: '%50', childC: '%25', notes: 'Hepatik metabolizma' },
    'pantoprazole': { childA: 'Normal', childB: 'Normal', childC: '%50', notes: 'PPI - güvenli' },
};


export function calculateBSA(weightKg, heightCm) {
    return Math.sqrt((heightCm * weightKg) / 3600);
}

export function calculateCrCl(age, weightKg, serumCreatinine, isFemale = false) {
    let crcl = ((140 - age) * weightKg) / (72 * serumCreatinine);
    if (isFemale) crcl *= 0.85;
    return Math.round(crcl);
}

export function calculateEGFR(age, serumCreatinine, isFemale = false) {
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const scr_k = serumCreatinine / kappa;
    let egfr = scr_k <= 1
        ? 142 * Math.pow(scr_k, alpha) * Math.pow(0.9938, age)
        : 142 * Math.pow(scr_k, -1.200) * Math.pow(0.9938, age);
    if (isFemale) egfr *= 1.012;
    return Math.round(egfr);
}

export function getRenalCategory(gfr) {
    if (gfr >= 90) return 'normal';
    if (gfr >= 60) return 'mild';
    if (gfr >= 30) return 'moderate';
    return 'severe';
}

export function calculatePediatricDose(drugName, weightKg) {
    const normalized = drugName.toLowerCase().replace(/\s+/g, '_');
    const drugInfo = PEDIATRIC_DOSES[normalized];
    if (!drugInfo) return { found: false, message: `${drugName} için pediatrik doz bulunamadı.` };

    const singleDose = weightKg * drugInfo.dose;
    return {
        found: true,
        drugName,
        weight: weightKg,
        calculatedDose: Math.round(singleDose * 10) / 10,
        unit: 'mg',
        frequency: drugInfo.frequency,
        maxDailyTotal: Math.round(weightKg * drugInfo.maxDaily),
        notes: drugInfo.notes,
        formula: `${drugInfo.dose} ${drugInfo.unit} x ${weightKg}kg`
    };
}

export function calculateRenalDose(drugName, gfr) {
    const normalized = normalizeToGeneric(drugName);
    let adj = RENAL_ADJUSTMENTS[normalized];
    if (!adj && ['ibuprofen', 'naproxen', 'diclofenac', 'dexketoprofen', 'flurbiprofen'].includes(normalized)) adj = RENAL_ADJUSTMENTS['nsaid'];
    if (!adj) return { found: false, message: `${drugName} için böbrek doz bilgisi bulunamadı.` };

    const category = getRenalCategory(gfr);
    return { found: true, drugName, gfr, category, recommendation: adj[category], notes: adj.notes };
}

export function calculateHepaticDose(drugName, childPughClass) {
    const normalized = normalizeToGeneric(drugName);
    const adj = HEPATIC_ADJUSTMENTS[normalized];
    if (!adj) return { found: false, message: `${drugName} için karaciğer doz bilgisi bulunamadı.` };

    const childPughMap = { 'A': 'childA', 'B': 'childB', 'C': 'childC' };
    const classKey = childPughMap[childPughClass.split(' ')[0]] || 'childA';

    return { found: true, drugName, childPughClass, recommendation: adj[classKey], notes: adj.notes };
}

export function calculateComprehensiveDose(params) {
    const { drugName, weight, age, height, serumCreatinine, isFemale, childPughClass, isPediatric } = params;
    const result = { drugName, calculations: {} };

    if (isPediatric && weight) result.calculations.pediatric = calculatePediatricDose(drugName, weight);
    if (age && serumCreatinine) {
        const egfr = calculateEGFR(age, serumCreatinine, isFemale);
        result.calculations.renal = calculateRenalDose(drugName, egfr);
        result.calculations.eGFR = egfr;
        if (weight) result.calculations.crCl = calculateCrCl(age, weight, serumCreatinine, isFemale);
    }
    if (childPughClass) result.calculations.hepatic = calculateHepaticDose(drugName, childPughClass);
    if (weight && height) result.calculations.bsa = Math.round(calculateBSA(weight, height) * 100) / 100;

    return result;
}

export default {
    calculateBSA, calculateCrCl, calculateEGFR, getRenalCategory,
    calculatePediatricDose, calculateRenalDose, calculateHepaticDose, calculateComprehensiveDose,
    PEDIATRIC_DOSES, RENAL_ADJUSTMENTS, HEPATIC_ADJUSTMENTS
};

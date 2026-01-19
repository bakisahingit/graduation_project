// backend/src/services/drugInteractionService.js
/**
 * İlaç-İlaç Etkileşim Kontrol Servisi
 * RxNorm API + OpenFDA + Yerel veritabanı entegrasyonu
 * Türkçe ilaç isimleri desteklenir
 */

import { httpClient } from '../config/index.js';
import redisClient from './redisService.js';
import rxNormService from './rxNormService.js';
import openFdaService from './openFdaService.js';
import { normalizeToGeneric } from '../utils/drugNameAliases.js';

// Cache süresi (6 saat)
const CACHE_TTL = 6 * 60 * 60;

// Bilinen ilaç etkileşimleri veritabanı (fallback)
const DRUG_INTERACTIONS = {
    'warfarin': {
        'aspirin': { severity: 'serious', mechanism: 'Kanama riski artışı', action: 'Birlikte kullanmaktan kaçının' },
        'ibuprofen': { severity: 'serious', mechanism: 'NSAID\'ler warfarin metabolizmasını etkiler', action: 'Paracetamol tercih edin' },
        'naproxen': { severity: 'serious', mechanism: 'NSAID\'ler kanama riskini artırır', action: 'Birlikte kullanmayın' },
        'fluconazole': { severity: 'serious', mechanism: 'CYP2C9 inhibisyonu', action: 'Warfarin dozunu azaltın, INR takibi' },
    },
    'metformin': {
        'alcohol': { severity: 'serious', mechanism: 'Laktik asidoz riski', action: 'Alkol tüketimini sınırlayın' },
    },
    'ssri': {
        'maoi': { severity: 'contraindicated', mechanism: 'Serotonin sendromu', action: 'Kesinlikle birlikte kullanmayın' },
        'tramadol': { severity: 'serious', mechanism: 'Serotonin sendromu riski', action: 'Dikkatli kullanın' },
    },
    'ace_inhibitor': {
        'potassium': { severity: 'serious', mechanism: 'Hiperkalemi riski', action: 'Potasyum seviyelerini izleyin' },
        'lithium': { severity: 'serious', mechanism: 'Lityum toksisitesi', action: 'Lityum seviyelerini izleyin' },
    },
    'digoxin': {
        'amiodarone': { severity: 'serious', mechanism: 'Digoksin seviyesi artar', action: 'Digoksin dozunu yarıya indirin' },
        'verapamil': { severity: 'serious', mechanism: 'Bradikardi riski', action: 'Kalp hızı takibi' },
    },
    'statin': {
        'gemfibrozil': { severity: 'serious', mechanism: 'Rabdomiyoliz riski', action: 'Fenofibrat tercih edin' },
        'clarithromycin': { severity: 'serious', mechanism: 'CYP3A4 inhibisyonu', action: 'Azitromisin tercih edin' },
    },
    'sildenafil': {
        'nitrate': { severity: 'contraindicated', mechanism: 'Ciddi hipotansiyon', action: 'Kesinlikle birlikte kullanmayın' },
    },
};

// İlaç sınıfları eşleştirmesi
const DRUG_CLASSES = {
    'aspirin': ['nsaid', 'antiplatelet'],
    'ibuprofen': ['nsaid'],
    'naproxen': ['nsaid'],
    'warfarin': ['anticoagulant'],
    'fluoxetine': ['ssri'],
    'sertraline': ['ssri'],
    'paroxetine': ['ssri'],
    'escitalopram': ['ssri'],
    'phenelzine': ['maoi'],
    'lisinopril': ['ace_inhibitor'],
    'enalapril': ['ace_inhibitor'],
    'ramipril': ['ace_inhibitor'],
    'atorvastatin': ['statin'],
    'simvastatin': ['statin'],
    'rosuvastatin': ['statin'],
    'sildenafil': ['pde5_inhibitor'],
    'tadalafil': ['pde5_inhibitor'],
    'nitroglycerin': ['nitrate'],
    'isosorbide': ['nitrate'],
    'amiodarone': ['antiarrhythmic'],
    'digoxin': ['cardiac_glycoside'],
    'verapamil': ['calcium_blocker'],
    'tramadol': ['opioid'],
    'lithium': ['mood_stabilizer'],
};

// Alternatif ilaç önerileri
const ALTERNATIVES = {
    'ibuprofen': ['paracetamol', 'topical NSAID'],
    'aspirin': ['paracetamol'],
    'omeprazole': ['pantoprazole', 'famotidine'],
    'clarithromycin': ['azithromycin'],
    'gemfibrozil': ['fenofibrate'],
};

function normalizeDrugName(name) {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').trim();
}

function getDrugClasses(drugName) {
    return DRUG_CLASSES[normalizeDrugName(drugName)] || [];
}

function checkPairInteractionLocal(drug1, drug2) {
    const d1 = normalizeDrugName(drug1);
    const d2 = normalizeDrugName(drug2);

    if (DRUG_INTERACTIONS[d1]?.[d2]) {
        return { ...DRUG_INTERACTIONS[d1][d2], pair: [drug1, drug2], source: 'Farmakolojik Literatür' };
    }
    if (DRUG_INTERACTIONS[d2]?.[d1]) {
        return { ...DRUG_INTERACTIONS[d2][d1], pair: [drug2, drug1], source: 'Farmakolojik Literatür' };
    }

    const classes1 = getDrugClasses(d1);
    const classes2 = getDrugClasses(d2);

    for (const c1 of classes1) {
        for (const c2 of classes2) {
            if (DRUG_INTERACTIONS[c1]?.[d2]) return { ...DRUG_INTERACTIONS[c1][d2], pair: [drug1, drug2], source: 'Farmakolojik Literatür' };
            if (DRUG_INTERACTIONS[d1]?.[c2]) return { ...DRUG_INTERACTIONS[d1][c2], pair: [drug1, drug2], source: 'Farmakolojik Literatür' };
            if (DRUG_INTERACTIONS[c1]?.[c2]) return { ...DRUG_INTERACTIONS[c1][c2], pair: [drug1, drug2], source: 'Farmakolojik Literatür' };
        }
    }
    return null;
}

function getCacheKey(drugs) {
    return `drug_interaction:${[...drugs].sort().join('|')}`;
}

async function checkInteractionsRxNorm(drugs) {
    try {
        console.log('[DrugInteraction] RxNorm API sorgulanıyor:', drugs);
        const result = await rxNormService.checkInteractionsByNames(drugs);

        if (!result.found || result.error) return null;

        const interactions = (result.interactions || []).map(i => ({
            pair: [i.drug1 || drugs[0], i.drug2 || drugs[1]],
            severity: mapRxNormSeverity(i.severity),
            mechanism: i.description || 'RxNorm tarafından tespit edildi',
            action: 'Detaylar için eczacınıza danışın',
            source: 'RxNorm API'
        }));

        return { found: true, interactions, source: 'RxNorm API', notFound: result.notFound || [] };
    } catch (error) {
        console.error('[DrugInteraction] RxNorm hatası:', error.message);
        return null;
    }
}

async function checkInteractionsOpenFDA(drugs) {
    try {
        console.log('[DrugInteraction] OpenFDA sorgulanıyor:', drugs);
        const interactions = [];

        for (const drug of drugs) {
            const result = await openFdaService.getDrugInteractionsFromFDA(drug);
            if (result.found && result.interactionText) {
                interactions.push({
                    pair: [drug, 'diğer ilaçlar'],
                    severity: 'moderate',
                    mechanism: result.interactionText.substring(0, 500),
                    action: 'FDA prospektüsünü inceleyin',
                    source: 'OpenFDA'
                });
            }
        }

        return interactions.length > 0 ? { found: true, interactions, source: 'OpenFDA' } : null;
    } catch (error) {
        console.error('[DrugInteraction] OpenFDA hatası:', error.message);
        return null;
    }
}

function mapRxNormSeverity(severity) {
    const mapping = { 'high': 'serious', 'moderate': 'moderate', 'low': 'minor', 'N/A': 'moderate' };
    return mapping[severity] || 'moderate';
}

export async function checkMultipleDrugInteractions(drugs) {
    // Türkçe ve ticari isimleri jenerik isimlere çevir
    const normalizedDrugs = drugs
        .map(d => normalizeToGeneric(d))
        .filter(d => d.length > 0);

    // Orijinal isimleri de sakla (görüntüleme için)
    const originalNames = drugs.map(d => d.toLowerCase().trim()).filter(d => d.length > 0);

    if (normalizedDrugs.length < 2) {
        return { drugs: originalNames, interactions: [], overallRisk: 'low', interactionCount: 0, summary: 'En az 2 ilaç girilmelidir.', source: 'Farmakolojik Literatür' };
    }


    const cacheKey = getCacheKey(normalizedDrugs);
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) { /* Redis unavailable */ }

    let interactions = [];
    let source = 'Farmakolojik Literatür';
    let notFoundDrugs = [];

    // 1. RxNorm API
    const rxnormResult = await checkInteractionsRxNorm(normalizedDrugs);
    if (rxnormResult?.found && rxnormResult.interactions.length > 0) {
        interactions = rxnormResult.interactions;
        source = rxnormResult.source;
        notFoundDrugs = rxnormResult.notFound || [];
    }

    // 2. OpenFDA fallback
    if (interactions.length === 0) {
        const fdaResult = await checkInteractionsOpenFDA(normalizedDrugs);
        if (fdaResult?.found && fdaResult.interactions.length > 0) {
            interactions = fdaResult.interactions;
            source = fdaResult.source;
        }
    }

    // 3. Local fallback
    if (interactions.length === 0) {
        for (let i = 0; i < normalizedDrugs.length; i++) {
            for (let j = i + 1; j < normalizedDrugs.length; j++) {
                const interaction = checkPairInteractionLocal(normalizedDrugs[i], normalizedDrugs[j]);
                if (interaction) interactions.push(interaction);
            }
        }
        source = 'Farmakolojik Literatür';
    }

    const severityOrder = { 'contraindicated': 0, 'serious': 1, 'moderate': 2, 'minor': 3 };
    interactions.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

    let overallRisk = 'low';
    if (interactions.some(i => i.severity === 'contraindicated')) overallRisk = 'critical';
    else if (interactions.some(i => i.severity === 'serious')) overallRisk = 'high';
    else if (interactions.some(i => i.severity === 'moderate')) overallRisk = 'moderate';

    const result = {
        drugs: normalizedDrugs,
        interactions,
        overallRisk,
        interactionCount: interactions.length,
        summary: generateInteractionSummary(interactions),
        source,
        notFoundDrugs
    };

    try { await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(result)); } catch (err) { /* ignore */ }

    return result;
}

function generateInteractionSummary(interactions) {
    if (interactions.length === 0) return 'Girilen ilaçlar arasında bilinen bir etkileşim tespit edilmedi.';

    const contra = interactions.filter(i => i.severity === 'contraindicated').length;
    const serious = interactions.filter(i => i.severity === 'serious').length;
    const moderate = interactions.filter(i => i.severity === 'moderate').length;

    let summary = '';
    if (contra > 0) summary += `⛔ ${contra} KONTRAENDİKE etkileşim! `;
    if (serious > 0) summary += `🔴 ${serious} ciddi etkileşim. `;
    if (moderate > 0) summary += `🟠 ${moderate} orta düzey etkileşim.`;

    return summary.trim();
}

export function getAlternatives(drugName) {
    return ALTERNATIVES[normalizeDrugName(drugName)] || [];
}

export function getInteractionContext(drugs, interactions) {
    return `İlaç Listesi: ${drugs.join(', ')}\nKaynak: ${interactions[0]?.source || 'local'}\n\nEtkileşimler:\n${interactions.map(i => `- ${i.pair.join(' + ')}: ${i.severity} - ${i.mechanism}`).join('\n')}`;
}

export default {
    checkMultipleDrugInteractions,
    getAlternatives,
    getInteractionContext,
    getDrugClasses
};

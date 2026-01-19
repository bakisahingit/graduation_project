// backend/src/services/pregnancySafetyService.js
/**
 * Hamilelik ve Emzirme Döneminde İlaç Güvenliği Servisi
 * OpenFDA API + Yerel veritabanı entegrasyonu
 * Türkçe ilaç isimleri desteklenir
 */

import openFdaService from './openFdaService.js';
import redisClient from './redisService.js';
import { normalizeToGeneric } from '../utils/drugNameAliases.js';

const CACHE_TTL = 6 * 60 * 60; // 6 saat

// FDA Hamilelik Kategorileri
const FDA_CATEGORIES = {
    'A': { risk: 'Güvenli', description: 'Kontrollü insan çalışmalarında fetal risk yok', color: 'green' },
    'B': { risk: 'Muhtemelen Güvenli', description: 'Hayvan çalışmalarında risk yok', color: 'green' },
    'C': { risk: 'Dikkatli Kullanım', description: 'Fayda riskten fazlaysa kullanılabilir', color: 'yellow' },
    'D': { risk: 'Riskli', description: 'Fetal risk var, dikkatli kullanılabilir', color: 'orange' },
    'X': { risk: 'Kontraendike', description: 'Kesinlikle kullanılmamalı', color: 'red' },
    'N': { risk: 'Sınıflandırılmamış', description: 'Henüz sınıflandırılmamış', color: 'gray' }
};

// Yerel veritabanı (fallback)
const PREGNANCY_DATA = {
    'folic_acid': { category: 'A', lactation: 'safe', notes: 'Gebelikte önerilir' },
    'levothyroxine': { category: 'A', lactation: 'safe', notes: 'Hipotiroidi tedavisi devam etmeli' },
    'paracetamol': { category: 'B', lactation: 'safe', notes: 'Gebelikte ilk tercih ağrı kesici' },
    'acetaminophen': { category: 'B', lactation: 'safe', notes: 'Paracetamol ile aynı' },
    'metformin': { category: 'B', lactation: 'safe', notes: 'Gestasyonel diyabette kullanılabilir' },
    'amoxicillin': { category: 'B', lactation: 'safe', notes: 'Penisilinler güvenli' },
    'azithromycin': { category: 'B', lactation: 'safe', notes: 'Makrolidler tercih edilir' },
    'insulin': { category: 'B', lactation: 'safe', notes: 'Gebelik diyabetinde ilk tercih' },
    'aspirin': { category: 'C', lactation: 'caution', notes: '3. trimesterde kaçınılmalı' },
    'ibuprofen': { category: 'C', lactation: 'safe', notes: '3. trimesterde kontraendike' },
    'omeprazole': { category: 'C', lactation: 'safe', notes: 'Gerekirse kullanılabilir' },
    'sertraline': { category: 'C', lactation: 'safe', notes: 'SSRI\'lar içinde güvenli' },
    'labetalol': { category: 'C', lactation: 'safe', notes: 'Gebelik hipertansiyonunda tercih' },
    'sildenafil': { category: 'B', lactation: 'unknown', notes: 'Pulmoner hipertansiyonda kullanılabilir, cinsel amaçlı kullanımda veri sınırlı' },
    'tadalafil': { category: 'B', lactation: 'unknown', notes: 'Sildenafil ile benzer' },
    'lisinopril': { category: 'D', lactation: 'caution', notes: 'ACE inhibitörleri 2-3. trimesterde kontraendike' },
    'losartan': { category: 'D', lactation: 'caution', notes: 'ARB\'ler gebelikte kontraendike' },
    'valproic_acid': { category: 'D', lactation: 'caution', notes: 'Nöral tüp defekti riski yüksek' },
    'phenytoin': { category: 'D', lactation: 'safe', notes: 'Fetal hidantoin sendromu riski' },
    'isotretinoin': { category: 'X', lactation: 'contraindicated', notes: 'Ciddi teratojen' },
    'warfarin': { category: 'X', lactation: 'safe', notes: 'Warfarin embriyopatisi' },
    'methotrexate': { category: 'X', lactation: 'contraindicated', notes: 'Fetotoksik ve teratojenik' },
    'atorvastatin': { category: 'X', lactation: 'contraindicated', notes: 'Statinler gebelikte kontraendike' },
    'simvastatin': { category: 'X', lactation: 'contraindicated', notes: 'Statinler gebelikte kullanılmaz' },
};

const LACTATION_CATEGORIES = {
    'safe': { description: 'Emzirmede güvenle kullanılabilir', color: 'green' },
    'caution': { description: 'Dikkatli kullanılmalı', color: 'yellow' },
    'contraindicated': { description: 'Emzirmede kullanılmamalı', color: 'red' },
    'unknown': { description: 'Yeterli veri yok', color: 'gray' }
};

// Türkçe ticari isimleri jenerik isimlere çevir
function normalizeDrugName(name) {
    return normalizeToGeneric(name);
}

/**
 * OpenFDA'dan hamilelik bilgisi al
 */
async function getPregnancyFromFDA(drugName) {
    try {
        const result = await openFdaService.getPregnancyInfoFromFDA(drugName);
        if (result.found) {
            return {
                found: true,
                source: 'OpenFDA',
                pregnancyInfo: result.pregnancy,
                nursingInfo: result.nursingMothers,
                pediatricInfo: result.pediatricUse
            };
        }
        return null;
    } catch (error) {
        console.error('[PregnancySafety] OpenFDA hatası:', error.message);
        return null;
    }
}

/**
 * İlaç güvenlik bilgisi getir
 */
export async function getPregnancySafety(drugName, trimester = null) {
    const normalized = normalizeToGeneric(drugName);

    // 1. Try OpenFDA First using the normalized generic name
    /* API-First logic: We prefer live data from FDA label */
    const fdaData = await getPregnancyFromFDA(normalized);

    // 2. Local Database (Reference Only)
    // We treat this as "supplementary" or "quick lookup" but rely on FDA for truth if available
    const localData = PREGNANCY_DATA[normalized];

    if (!fdaData && !localData) {
        return {
            found: false,
            drugName,
            message: `Bu ilaç (${drugName} -> ${normalized}) için veritabanlarında bilgi bulunamadı.`
        };
    }

    // Prioritize FDA info if available, otherwise fall back to local category
    // Note: FDA stopped using A/B/C/D/X letter categories in 2015 (PLLR rule), 
    // but we can infer or use local DB to provide that specific letter for user familiarity
    // while showing the full FDA narrative text.

    const category = localData?.category || 'N';

    return {
        found: true,
        drugName,
        // Show category from local DB if we have it, otherwise N
        category: category,
        categoryInfo: FDA_CATEGORIES[category] || FDA_CATEGORIES['N'],
        lactation: localData?.lactation || 'unknown',
        lactationInfo: LACTATION_CATEGORIES[localData?.lactation || 'unknown'],

        // This is the key change: Always pass FDA text if we have it
        fdaInfo: fdaData?.pregnancyInfo || 'FDA verisi çekilemedi veya metin mevcut değil.',
        nursingInfo: fdaData?.nursingInfo || 'FDA verisi çekilemedi.',

        source: fdaData ? 'FDA (OpenFDA)' : 'Farmakolojik Literatür',
        recommendation: generateRecommendation(category)
    };
}

function generateRecommendation(category) {
    const recommendations = {
        'A': 'Bu ilaç gebelikte güvenle kullanılabilir (Kategori A).',
        'B': 'Bu ilaç gebelikte muhtemelen güvenlidir (Kategori B).',
        'C': 'Fayda/risk değerlendirmesi yapılmalı (Kategori C). Doktorunuza danışın.',
        'D': '⚠️ Ciddi riskler taşır (Kategori D). Yalnızca hayati durumlarda.',
        'X': '🚫 KESİNLİKLE KULLANILMAMALIDIR (Kategori X). Teratojenik risk.',
        'N': 'Mevcut sınıflandırma bilgisi yok. FDA metnini inceleyiniz.'
    };
    return recommendations[category] || recommendations['N'];
}

/**
 * Çoklu ilaç kontrolü
 */
export async function checkMultiplePregnancySafety(drugs, trimester = null) {
    const results = await Promise.all(drugs.map(drug => getPregnancySafety(drug, trimester)));

    const categoryRisk = { 'X': 5, 'D': 4, 'C': 3, 'B': 2, 'A': 1, 'N': 0 };
    let highestRisk = { category: 'A', drug: null };

    results.forEach(r => {
        if (r.found && categoryRisk[r.category] > categoryRisk[highestRisk.category]) {
            highestRisk = { category: r.category, drug: r.drugName };
        }
    });

    const xDrugs = results.filter(r => r.found && r.category === 'X');
    const dDrugs = results.filter(r => r.found && r.category === 'D');

    let summary = '✅ Kritik hamilelik riski tespit edilmedi.';
    if (xDrugs.length > 0) {
        summary = `🚫 KRİTİK: ${xDrugs.map(d => d.drugName).join(', ')} gebelikte kontraendikedir!`;
    } else if (dDrugs.length > 0) {
        summary = `⚠️ DİKKAT: ${dDrugs.map(d => d.drugName).join(', ')} gebelikte risklidir.`;
    }

    return {
        drugs: results,
        overallRisk: highestRisk.category,
        highRiskDrug: highestRisk.drug,
        summary
    };
}

export { FDA_CATEGORIES, LACTATION_CATEGORIES };

export default {
    getPregnancySafety,
    checkMultiplePregnancySafety,
    FDA_CATEGORIES,
    LACTATION_CATEGORIES
};

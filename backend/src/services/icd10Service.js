// backend/src/services/icd10Service.js
/**
 * ICD-10 Hastalık Kodlaması Servisi
 * WHO ICD-11 API + Yerel veritabanı entegrasyonu
 */

import { httpClient } from '../config/index.js';
import redisClient from './redisService.js';

// WHO ICD-11 API
const WHO_ICD_API = 'https://id.who.int/icd/release/11/2024-01/mms';
const CACHE_TTL = 24 * 60 * 60; // 24 saat

// Yerel ICD-10 veritabanı (hızlı erişim)
const ICD10_DATABASE = {
    // Kardiyovasküler
    'I10': { code: 'I10', name: 'Esansiyel hipertansiyon', category: 'Kardiyovasküler', drugs: ['amlodipine', 'lisinopril', 'losartan', 'metoprolol'] },
    'I11': { code: 'I11', name: 'Hipertansif kalp hastalığı', category: 'Kardiyovasküler', drugs: ['carvedilol', 'furosemid', 'ace inhibitors'] },
    'I20': { code: 'I20', name: 'Angina pektoris', category: 'Kardiyovasküler', drugs: ['nitroglycerin', 'isosorbide', 'beta-blockers'] },
    'I21': { code: 'I21', name: 'Akut miyokard enfarktüsü', category: 'Kardiyovasküler', drugs: ['aspirin', 'clopidogrel', 'heparin'] },
    'I48': { code: 'I48', name: 'Atriyal fibrilasyon', category: 'Kardiyovasküler', drugs: ['warfarin', 'dabigatran', 'rivaroxaban', 'digoxin'] },
    'I50': { code: 'I50', name: 'Kalp yetmezliği', category: 'Kardiyovasküler', drugs: ['furosemid', 'spironolactone', 'carvedilol', 'ramipril'] },

    // Endokrin
    'E10': { code: 'E10', name: 'Tip 1 diabetes mellitus', category: 'Endokrin', drugs: ['insulin', 'insulin lispro', 'insulin glargine'] },
    'E11': { code: 'E11', name: 'Tip 2 diabetes mellitus', category: 'Endokrin', drugs: ['metformin', 'glimepiride', 'sitagliptin', 'empagliflozin'] },
    'E03': { code: 'E03', name: 'Hipotiroidizm', category: 'Endokrin', drugs: ['levothyroxine'] },
    'E05': { code: 'E05', name: 'Hipertiroidizm', category: 'Endokrin', drugs: ['methimazole', 'propylthiouracil', 'propranolol'] },
    'E78': { code: 'E78', name: 'Dislipidemi', category: 'Endokrin', drugs: ['atorvastatin', 'rosuvastatin', 'fenofibrate'] },

    // Solunum
    'J06': { code: 'J06', name: 'Akut üst solunum yolu enfeksiyonu', category: 'Solunum', drugs: ['paracetamol', 'ibuprofen', 'amoxicillin'] },
    'J18': { code: 'J18', name: 'Pnömoni', category: 'Solunum', drugs: ['amoxicillin-clavulanate', 'azithromycin', 'levofloxacin'] },
    'J44': { code: 'J44', name: 'KOAH', category: 'Solunum', drugs: ['tiotropium', 'salbutamol', 'budesonide', 'formoterol'] },
    'J45': { code: 'J45', name: 'Astım', category: 'Solunum', drugs: ['salbutamol', 'budesonide', 'montelukast', 'fluticasone'] },

    // Sindirim
    'K21': { code: 'K21', name: 'GERD', category: 'Sindirim', drugs: ['omeprazole', 'pantoprazole', 'esomeprazole'] },
    'K25': { code: 'K25', name: 'Gastrik ülser', category: 'Sindirim', drugs: ['omeprazole', 'sucralfate', 'misoprostol'] },
    'K29': { code: 'K29', name: 'Gastrit', category: 'Sindirim', drugs: ['omeprazole', 'antacids', 'h2 blockers'] },

    // Nörolojik
    'G20': { code: 'G20', name: 'Parkinson hastalığı', category: 'Nörolojik', drugs: ['levodopa', 'carbidopa', 'pramipexole'] },
    'G30': { code: 'G30', name: 'Alzheimer hastalığı', category: 'Nörolojik', drugs: ['donepezil', 'memantine', 'rivastigmine'] },
    'G40': { code: 'G40', name: 'Epilepsi', category: 'Nörolojik', drugs: ['valproate', 'carbamazepine', 'levetiracetam'] },
    'G43': { code: 'G43', name: 'Migren', category: 'Nörolojik', drugs: ['sumatriptan', 'propranolol', 'topiramate'] },

    // Psikiyatrik
    'F32': { code: 'F32', name: 'Depresif episod', category: 'Psikiyatrik', drugs: ['sertraline', 'escitalopram', 'fluoxetine', 'venlafaxine'] },
    'F41': { code: 'F41', name: 'Anksiyete bozuklukları', category: 'Psikiyatrik', drugs: ['sertraline', 'escitalopram', 'alprazolam', 'buspirone'] },

    // Böbrek
    'N17': { code: 'N17', name: 'Akut böbrek yetmezliği', category: 'Böbrek', drugs: ['furosemide', 'dopamine'] },
    'N18': { code: 'N18', name: 'Kronik böbrek hastalığı', category: 'Böbrek', drugs: ['erythropoietin', 'sevelamer', 'calcitriol'] },
    'N39': { code: 'N39', name: 'Üriner sistem enfeksiyonu', category: 'Enfeksiyon', drugs: ['nitrofurantoin', 'trimethoprim', 'ciprofloxacin'] },

    // Enfeksiyon
    'A09': { code: 'A09', name: 'Gastroenterit', category: 'Enfeksiyon', drugs: ['oral rehydration', 'loperamide', 'ondansetron'] },

    // Kas-iskelet
    'M05': { code: 'M05', name: 'Romatoid artrit', category: 'Kas-iskelet', drugs: ['methotrexate', 'sulfasalazine', 'adalimumab'] },
    'M15': { code: 'M15', name: 'Osteoartrit', category: 'Kas-iskelet', drugs: ['paracetamol', 'ibuprofen', 'topical NSAIDs'] },
    'M81': { code: 'M81', name: 'Osteoporoz', category: 'Kas-iskelet', drugs: ['alendronate', 'calcium', 'vitamin D'] },
};

// Türkçe hastalık isimleri → ICD-10 kodları eşleştirmesi
const TURKISH_DISEASE_ALIASES = {
    'diyabet': ['E10', 'E11'],
    'şeker hastalığı': ['E10', 'E11'],
    'seker hastaligi': ['E10', 'E11'],
    'tip 1 diyabet': ['E10'],
    'tip 2 diyabet': ['E11'],
    'tansiyon': ['I10', 'I11'],
    'hipertansiyon': ['I10', 'I11'],
    'yüksek tansiyon': ['I10'],
    'yuksek tansiyon': ['I10'],
    'kalp': ['I20', 'I21', 'I48', 'I50'],
    'kalp yetmezliği': ['I50'],
    'kalp yetmezligi': ['I50'],
    'kalp krizi': ['I21'],
    'enfarktüs': ['I21'],
    'enfarkus': ['I21'],
    'ritim bozukluğu': ['I48'],
    'aritmi': ['I48'],
    'göğüs ağrısı': ['I20'],
    'angina': ['I20'],
    'tiroid': ['E03', 'E05'],
    'hipotiroidi': ['E03'],
    'hipertiroidi': ['E05'],
    'guatr': ['E03', 'E05'],
    'kolesterol': ['E78'],
    'astım': ['J45'],
    'astim': ['J45'],
    'bronşit': ['J44'],
    'bronsit': ['J44'],
    'koah': ['J44'],
    'akciğer': ['J44', 'J45', 'J18'],
    'zatürre': ['J18'],
    'pnömoni': ['J18'],
    'grip': ['J06'],
    'soğuk algınlığı': ['J06'],
    'mide': ['K21', 'K25', 'K29'],
    'gastrit': ['K29'],
    'ülser': ['K25'],
    'reflü': ['K21'],
    'gerd': ['K21'],
    'depresyon': ['F32'],
    'anksiyete': ['F41'],
    'panik': ['F41'],
    'epilepsi': ['G40'],
    'sara': ['G40'],
    'migren': ['G43'],
    'baş ağrısı': ['G43'],
    'parkinson': ['G20'],
    'alzheimer': ['G30'],
    'bunama': ['G30'],
    'böbrek': ['N17', 'N18'],
    'böbrek yetmezliği': ['N17', 'N18'],
    'idrar yolu enfeksiyonu': ['N39'],
    'sistit': ['N39'],
    'romatizma': ['M05'],
    'artrit': ['M05', 'M15'],
    'eklem ağrısı': ['M05', 'M15'],
    'kemik erimesi': ['M81'],
    'osteoporoz': ['M81'],
    'ishal': ['A09'],
    'kusma': ['A09'],
    'gastroenterit': ['A09'],
};

/**
 * ICD-10 kodu ara (Türkçe destekli)
 */
export function searchICD10(query) {
    const normalizedQuery = query.toLowerCase().trim()
        .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');

    const results = [];
    const addedCodes = new Set();

    // Türkçe alias eşleştirmesi
    for (const [alias, codes] of Object.entries(TURKISH_DISEASE_ALIASES)) {
        const normalizedAlias = alias.toLowerCase()
            .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
            .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');

        if (normalizedAlias.includes(normalizedQuery) || normalizedQuery.includes(normalizedAlias)) {
            for (const code of codes) {
                if (!addedCodes.has(code) && ICD10_DATABASE[code]) {
                    results.push({ ...ICD10_DATABASE[code], relatedDrugs: ICD10_DATABASE[code].drugs || [] });
                    addedCodes.add(code);
                }
            }
        }
    }

    // Doğrudan veritabanı araması
    for (const [code, data] of Object.entries(ICD10_DATABASE)) {
        if (addedCodes.has(code)) continue;

        const normalizedName = data.name.toLowerCase()
            .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
            .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');

        if (code.toLowerCase().includes(normalizedQuery) || normalizedName.includes(normalizedQuery)) {
            results.push({ ...data, relatedDrugs: data.drugs || [] });
            addedCodes.add(code);
        }
    }

    return {
        found: results.length > 0,
        count: results.length,
        results,
        source: 'ICD-10 Yerel Veritabanı'
    };
}

/**
 * WHO ICD-11 API'den ara (geliştirilmiş)
 */
export async function searchWHOICD(query) {
    const cacheKey = `icd_who:${query.toLowerCase()}`;

    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) { /* Redis unavailable */ }

    try {
        // WHO ICD API - requires OAuth token in production
        // For now, fallback to local database
        console.log('[ICD10] WHO API not configured, using local database');
        return null;
    } catch (error) {
        console.error('[ICD10] WHO API hatası:', error.message);
        return null;
    }
}

/**
 * ICD-10 kodundan hastalık bilgisi al
 */
export function getICD10ByCode(code) {
    const upperCode = code.toUpperCase();

    if (ICD10_DATABASE[upperCode]) {
        return {
            found: true,
            ...ICD10_DATABASE[upperCode],
            relatedDrugs: ICD10_DATABASE[upperCode].drugs || []
        };
    }

    // Partial match
    const partialMatches = Object.entries(ICD10_DATABASE)
        .filter(([c]) => c.startsWith(upperCode))
        .map(([c, data]) => ({ ...data, relatedDrugs: data.drugs || [] }));

    if (partialMatches.length > 0) {
        return { found: true, partialMatch: true, results: partialMatches };
    }

    return { found: false, message: 'ICD-10 kodu bulunamadı' };
}

/**
 * Kategoriye göre hastalıkları listele
 */
export function getByCategory(category) {
    const normalizedCat = category.toLowerCase();
    const results = Object.entries(ICD10_DATABASE)
        .filter(([_, data]) => data.category.toLowerCase().includes(normalizedCat))
        .map(([_, data]) => ({ ...data, relatedDrugs: data.drugs || [] }));

    return { found: results.length > 0, category, count: results.length, results };
}

/**
 * Tüm kategorileri listele
 */
export function getCategories() {
    const categories = [...new Set(Object.values(ICD10_DATABASE).map(d => d.category))];
    return { categories, count: categories.length };
}

/**
 * Hastalık için ilaçları öner
 */
export function getDrugsForDisease(icdCode) {
    const upperCode = icdCode.toUpperCase();
    const disease = ICD10_DATABASE[upperCode];

    if (!disease || !disease.drugs) {
        return { found: false, message: 'Bu hastalık için ilaç önerisi bulunamadı' };
    }

    return {
        found: true,
        icdCode: upperCode,
        diseaseName: disease.name,
        drugs: disease.drugs,
        note: 'Bu öneriler genel bilgi amaçlıdır. Tedavi kararları hekim tarafından verilmelidir.'
    };
}

export default {
    searchICD10,
    searchWHOICD,
    getICD10ByCode,
    getByCategory,
    getCategories,
    getDrugsForDisease,
    DATABASE: ICD10_DATABASE
};

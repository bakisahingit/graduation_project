// backend/src/services/titckService.js
/**
 * T.C. Sağlık Bakanlığı TİTCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu) Servisi
 * Türkiye'ye özgü ilaç bilgileri
 */

import { httpClient } from '../config/index.js';

// TİTCK resmi web sitesi
const TITCK_BASE_URL = 'https://www.titck.gov.tr';

// Türkiye'de ruhsatlı ilaçlar veritabanı (yerel cache)
const TURKISH_DRUG_DATABASE = {
    // Antibiyotikler
    'amoksisilin': {
        name: 'Amoksisilin',
        brandNames: ['Largopen', 'Alfoxil', 'Amoklavin', 'Augmentin'],
        atcCode: 'J01CA04',
        form: 'Tablet, Süspansiyon',
        activeIngredient: 'Amoksisilin trihidrat',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699569030092',
        manufacturer: 'Çeşitli',
        indication: 'Bakteriyel enfeksiyonlar',
        contraindications: ['Penisilin alerjisi'],
        warnings: ['Böbrek yetmezliğinde doz ayarlaması gerekli'],
        turkishNotes: 'Reçeteli ilaçtır. SGK tarafından ödenir.'
    },
    'parasetamol': {
        name: 'Parasetamol',
        brandNames: ['Parol', 'Tylol', 'Minoset', 'Tamol', 'Geralgine-K'],
        atcCode: 'N02BE01',
        form: 'Tablet, Şurup, Supozituar',
        activeIngredient: 'Parasetamol',
        prescription: false,
        reimbursed: true,
        sgkCode: '8699569030108',
        manufacturer: 'Çeşitli',
        indication: 'Ateş ve ağrı kesici',
        contraindications: ['Ağır karaciğer yetmezliği'],
        warnings: ['Günlük 4g aşılmamalı', 'Alkol kullanımı hepatotoksisiteyi artırır'],
        turkishNotes: 'Reçetesiz satılır. Eczanelerde yaygın olarak bulunur.'
    },
    'ibuprofen': {
        name: 'İbuprofen',
        brandNames: ['Advil', 'Nurofen', 'Dolgit', 'Brufen'],
        atcCode: 'M01AE01',
        form: 'Tablet, Jel, Şurup',
        activeIngredient: 'İbuprofen',
        prescription: false,
        reimbursed: true,
        sgkCode: '8699569030115',
        manufacturer: 'Çeşitli',
        indication: 'NSAİİ - Ağrı, ateş, inflamasyon',
        contraindications: ['Aktif peptik ülser', 'Ağır kalp yetmezliği', 'Son trimester gebelik'],
        warnings: ['Kardiyovasküler risk', 'GİS kanama riski'],
        turkishNotes: '400mg altı dozlar reçetesiz, üstü reçeteli.'
    },
    'metformin': {
        name: 'Metformin',
        brandNames: ['Glucophage', 'Gluformin', 'Matofin', 'Diaformin'],
        atcCode: 'A10BA02',
        form: 'Tablet',
        activeIngredient: 'Metformin hidroklorür',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699569030122',
        manufacturer: 'Çeşitli',
        indication: 'Tip 2 Diyabet',
        contraindications: ['Böbrek yetmezliği (eGFR<30)', 'Metabolik asidoz', 'Akut dehidrasyon'],
        warnings: ['Kontrast madde öncesi kesilmeli', 'B12 eksikliği izlenmeli'],
        turkishNotes: 'Diyabet hastalarında ilk tercih ilaç.'
    },
    'omeprazol': {
        name: 'Omeprazol',
        brandNames: ['Losec', 'Omeprol', 'Omeprazol-Sandoz', 'Nexium (Esomeprazol)'],
        atcCode: 'A02BC01',
        form: 'Kapsül, Enterik tablet',
        activeIngredient: 'Omeprazol',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699569030139',
        manufacturer: 'Çeşitli',
        indication: 'GÖRH, Peptik ülser, H. pylori eradikasyonu',
        contraindications: ['Hipersensitivite'],
        warnings: ['Uzun süreli kullanımda Mg eksikliği', 'C. difficile riski'],
        turkishNotes: '14 güne kadar reçetesiz verilebilir (OTC).'
    },
    'aspirin': {
        name: 'Asetilsalisilik Asit',
        brandNames: ['Aspirin', 'Ecopirin', 'Coraspin', 'Kardio-ASA'],
        atcCode: 'B01AC06',
        form: 'Tablet',
        activeIngredient: 'Asetilsalisilik asit',
        prescription: false,
        reimbursed: true,
        sgkCode: '8699569030146',
        manufacturer: 'Bayer, Çeşitli',
        indication: 'Antiplatelet, Ağrı kesici',
        contraindications: ['Aktif kanama', 'Aspirin alerjisi', 'Son trimester gebelik'],
        warnings: ['GİS kanama', 'Reye sendromu (çocuklarda)'],
        turkishNotes: 'Düşük doz (100mg) kardiyak koruma için yaygın kullanılır.'
    },
    'warfarin': {
        name: 'Warfarin',
        brandNames: ['Coumadin', 'Orfarin'],
        atcCode: 'B01AA03',
        form: 'Tablet',
        activeIngredient: 'Warfarin sodyum',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699569030153',
        manufacturer: 'Bristol-Myers Squibb',
        indication: 'Antikoagülan - AF, DVT, PE, mekanik kapak',
        contraindications: ['Aktif kanama', 'Gebelik', 'Ağır hipertansiyon'],
        warnings: ['INR takibi zorunlu', 'Çok sayıda ilaç etkileşimi', 'K vitamini diyet etkileşimi'],
        turkishNotes: 'INR hedefi genelde 2-3. Sıkı takip gerektirir.'
    },
    'amlodipin': {
        name: 'Amlodipin',
        brandNames: ['Norvasc', 'Amlodis', 'Amlopin', 'Amlokard'],
        atcCode: 'C08CA01',
        form: 'Tablet',
        activeIngredient: 'Amlodipin besilat',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699569030160',
        manufacturer: 'Pfizer, Çeşitli',
        indication: 'Hipertansiyon, Anjina',
        contraindications: ['Kardiyojenik şok', 'Ağır aort stenozu'],
        warnings: ['Periferik ödem', 'Greyfurt etkileşimi'],
        turkishNotes: 'Türkiye\'de en sık kullanılan antihipertansiflerden.'
    },
    'losartan': {
        name: 'Losartan',
        brandNames: ['Cozaar', 'Losacar', 'Eklips', 'Sarvas'],
        atcCode: 'C09CA01',
        form: 'Tablet',
        activeIngredient: 'Losartan potasyum',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699569030177',
        manufacturer: 'MSD, Çeşitli',
        indication: 'Hipertansiyon, Diyabetik nefropati, Kalp yetmezliği',
        contraindications: ['Gebelik', 'Bilateral renal arter stenozu'],
        warnings: ['Hiperkalemi riski', 'İlk doz hipotansiyonu'],
        turkishNotes: 'ARB sınıfı. ACE inhibitörlerine öksürük nedeniyle geçilir.'
    },
    'sertralin': {
        name: 'Sertralin',
        brandNames: ['Lustral', 'Selectra', 'Sertra'],
        atcCode: 'N06AB06',
        form: 'Tablet',
        activeIngredient: 'Sertralin hidroklorür',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699569030184',
        manufacturer: 'Pfizer, Çeşitli',
        indication: 'Depresyon, OKB, Panik bozukluk, TSSB',
        contraindications: ['MAO inhibitörleri ile birlikte', 'Pimozid ile birlikte'],
        warnings: ['İntihar düşüncesi (başlangıçta)', 'Serotonin sendromu'],
        turkishNotes: 'Türkiye\'de en sık reçete edilen antidepresanlardan.'
    },
    'flurbiprofen': {
        name: 'Flurbiprofen',
        brandNames: ['Majezik', 'Maximus', 'Fiera'],
        atcCode: 'M01AE09',
        form: 'Tablet, Oral Sprey, Gargara',
        activeIngredient: 'Flurbiprofen',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699514010111',
        manufacturer: 'Sanovel',
        indication: 'Analjezik, Antiinflamatuar, Boğaz ağrısı',
        contraindications: ['Peptik ülser', 'Gebelik (3. trimester)', 'NSAİİ aşırı duyarlılığı'],
        warnings: ['GİS kanama riski'],
        turkishNotes: 'Boğaz spreyi formu (Majezik Sprey) çok yaygın kullanılır.'
    },
    'isotretinoin': {
        name: 'İzotretinoin',
        brandNames: ['Roaccutane', 'Zoretanin', 'Aknetrent', 'Acnegen'],
        atcCode: 'D10BA01',
        form: 'Kapsül',
        activeIngredient: 'İzotretinoin',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699693150075',
        manufacturer: 'Roche',
        indication: 'Şiddetli akne',
        contraindications: ['Gebelik (Kategori X)', 'Emzirme', 'Tetrasiklinlerle kullanım'],
        warnings: ['Teratojenik (Doğum kusuru)', 'Depresyon riski', 'Karaciğer enzimleri'],
        turkishNotes: 'Reçetelidir ve özel izleme tabidir. Gebelik testi zorunludur.'
    },
    'deksketoprofen': {
        name: 'Deksketoprofen',
        brandNames: ['Arveles', 'Dexday', 'Deksalgın', 'Leodex'],
        atcCode: 'M01AE17',
        form: 'Tablet, Ampul',
        activeIngredient: 'Deksketoprofen trometamol',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699514090123',
        manufacturer: 'Menarini',
        indication: 'Akut ağrı, Dismenore, Diş ağrısı',
        contraindications: ['GİS kanama', 'Astım', 'Orta-ağır böbrek yetmezliği'],
        warnings: ['Kalp yetmezliğinde dikkat', 'Uzun süreli kullanma'],
        turkishNotes: 'Hızlı etkili ağrı kesici olarak çok tercih edilir.'
    },
    'amoksiklav': {
        name: 'Amoksisilin + Klavulanik Asit',
        brandNames: ['Augmentin', 'Klavunat', 'Amoklavin', 'Croxilex'],
        atcCode: 'J01CR02',
        form: 'Tablet, Süspansiyon',
        activeIngredient: 'Amoksisilin ve enzim inhibitörü',
        prescription: true,
        reimbursed: true,
        sgkCode: '8699525090146',
        manufacturer: 'GSK',
        indication: 'Bakteriyel Sinüzit, Otit, Pnömoni',
        contraindications: ['Penisilin alerjisi', 'Karaciğer fonksiyon bozukluğu'],
        warnings: ['Yemekle birlikte alınmalı', 'İshal yapabilir'],
        turkishNotes: 'Geniş spektrumlu antibiyotiktir.'
    }
};

// SGK geri ödeme kuralları
const SGK_RULES = {
    'J01': { category: 'Antibiyotik', maxDays: 10, requiresProvisioning: false },
    'A10': { category: 'Antidiyabetik', maxDays: 90, requiresProvisioning: true },
    'C09': { category: 'RAS blokörleri', maxDays: 90, requiresProvisioning: true },
    'C08': { category: 'Kalsiyum kanal blokörleri', maxDays: 90, requiresProvisioning: true },
    'N06': { category: 'Psikoanalepitikler', maxDays: 30, requiresProvisioning: true }
};

/**
 * Türkiye ilaç veritabanında ara
 * @param {string} query - İlaç adı veya etken madde
 */
export function searchTurkishDrug(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const results = [];

    for (const [key, drug] of Object.entries(TURKISH_DRUG_DATABASE)) {
        if (key.includes(normalizedQuery) ||
            drug.name.toLowerCase().includes(normalizedQuery) ||
            drug.brandNames.some(b => b.toLowerCase().includes(normalizedQuery)) ||
            drug.activeIngredient.toLowerCase().includes(normalizedQuery)) {
            results.push(drug);
        }
    }

    return {
        found: results.length > 0,
        count: results.length,
        results,
        source: 'TİTCK Yerel Veritabanı'
    };
}

/**
 * İlaç detay bilgisi al
 * @param {string} drugName - İlaç adı
 */
export function getDrugDetails(drugName) {
    const normalizedName = drugName.toLowerCase().trim();

    // Etken madde ile ara
    if (TURKISH_DRUG_DATABASE[normalizedName]) {
        return {
            found: true,
            ...TURKISH_DRUG_DATABASE[normalizedName],
            sgkRules: getSGKRules(TURKISH_DRUG_DATABASE[normalizedName].atcCode)
        };
    }

    // Ticari isim ile ara
    for (const [_, drug] of Object.entries(TURKISH_DRUG_DATABASE)) {
        if (drug.brandNames.some(b => b.toLowerCase() === normalizedName)) {
            return {
                found: true,
                ...drug,
                sgkRules: getSGKRules(drug.atcCode)
            };
        }
    }

    return { found: false, message: 'İlaç bulunamadı' };
}

/**
 * SGK geri ödeme kurallarını al
 * @param {string} atcCode - ATC kodu
 */
function getSGKRules(atcCode) {
    const prefix = atcCode?.substring(0, 3);
    return SGK_RULES[prefix] || { category: 'Diğer', maxDays: 30, requiresProvisioning: false };
}

/**
 * Reçeteli/reçetesiz ilaçları listele
 * @param {boolean} prescriptionRequired - Reçete gereksinimi
 */
export function listByPrescription(prescriptionRequired) {
    const results = Object.values(TURKISH_DRUG_DATABASE)
        .filter(drug => drug.prescription === prescriptionRequired);

    return {
        found: results.length > 0,
        prescriptionRequired,
        count: results.length,
        results
    };
}

/**
 * SGK tarafından ödenen ilaçları listele
 */
export function listReimbursedDrugs() {
    const results = Object.values(TURKISH_DRUG_DATABASE)
        .filter(drug => drug.reimbursed);

    return {
        found: results.length > 0,
        count: results.length,
        results,
        note: 'Bu ilaçlar SGK tarafından karşılanır. Provizyon koşullarına dikkat edilmelidir.'
    };
}

/**
 * Türkiye'ye özgü ilaç uyarılarını al
 * @param {string} drugName - İlaç adı
 */
export function getTurkishWarnings(drugName) {
    const drug = getDrugDetails(drugName);

    if (!drug.found) {
        return { found: false, message: 'İlaç bulunamadı' };
    }

    return {
        found: true,
        drugName: drug.name,
        turkishNotes: drug.turkishNotes,
        warnings: drug.warnings,
        prescription: drug.prescription ? 'Reçeteli ilaç' : 'Reçetesiz ilaç (OTC)',
        sgk: drug.reimbursed ? 'SGK tarafından ödenir' : 'SGK kapsamı dışında',
        sgkRules: drug.sgkRules
    };
}

/**
 * ATC koduna göre ilaç ara
 * @param {string} atcCode - ATC kodu
 */
export function searchByATC(atcCode) {
    const normalizedATC = atcCode.toUpperCase();

    const results = Object.values(TURKISH_DRUG_DATABASE)
        .filter(drug => drug.atcCode?.startsWith(normalizedATC));

    return {
        found: results.length > 0,
        atcCode: normalizedATC,
        count: results.length,
        results
    };
}

export default {
    searchTurkishDrug,
    getDrugDetails,
    listByPrescription,
    listReimbursedDrugs,
    getTurkishWarnings,
    searchByATC,
    DATABASE: TURKISH_DRUG_DATABASE
};

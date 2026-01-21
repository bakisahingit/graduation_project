// frontend/js/services/pharmacyService.js
/**
 * Eczacılık Özellikleri API İstemci Servisi
 */

const API_BASE = '/api/pharmacy';

/**
 * İlaç etkileşimi kontrolü
 */
export async function checkDrugInteractions(drugs, withAiAnalysis = false) {
    const response = await fetch(`${API_BASE}/interactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({ drugs, withAiAnalysis })
    });
    return await response.json();
}

/**
 * Hamilelik güvenliği kontrolü
 */
export async function checkPregnancySafety(drug, trimester = null) {
    const url = trimester
        ? `${API_BASE}/pregnancy/${encodeURIComponent(drug)}?trimester=${trimester}`
        : `${API_BASE}/pregnancy/${encodeURIComponent(drug)}`;

    const response = await fetch(url);
    return await response.json();
}

/**
 * Çoklu hamilelik kontrolü
 */
export async function checkMultiplePregnancySafety(drugs, trimester = null) {
    const response = await fetch(`${API_BASE}/pregnancy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs, trimester })
    });
    return await response.json();
}

/**
 * Pediatrik doz hesaplama
 */
export async function calculatePediatricDose(drug, weight, ageYears = null) {
    const response = await fetch(`${API_BASE}/dose/pediatric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug, weight, ageYears })
    });
    return await response.json();
}

/**
 * Böbrek yetmezliği doz hesaplama
 */
export async function calculateRenalDose(drug, params) {
    const response = await fetch(`${API_BASE}/dose/renal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug, ...params })
    });
    return await response.json();
}

/**
 * Karaciğer yetmezliği doz hesaplama
 */
export async function calculateHepaticDose(drug, childPughClass) {
    const response = await fetch(`${API_BASE}/dose/hepatic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug, childPughClass })
    });
    return await response.json();
}

/**
 * Alternatif ilaç önerileri
 */
export async function getAlternatives(drug) {
    const response = await fetch(`${API_BASE}/alternatives/${encodeURIComponent(drug)}`);
    return await response.json();
}

// ============= FDA API =============

/**
 * FDA ilaç etiketi bilgisi
 */
export async function getFdaLabel(drug) {
    const response = await fetch(`${API_BASE}/fda/label/${encodeURIComponent(drug)}`);
    return await response.json();
}

/**
 * FDA yan etki raporları
 */
export async function getFdaAdverseEvents(drug) {
    const response = await fetch(`${API_BASE}/fda/adverse/${encodeURIComponent(drug)}`);
    return await response.json();
}

/**
 * FDA etkileşim bilgileri
 */
export async function getFdaInteractions(drug) {
    const response = await fetch(`${API_BASE}/fda/interactions/${encodeURIComponent(drug)}`);
    return await response.json();
}

/**
 * FDA hamilelik bilgileri
 */
export async function getFdaPregnancy(drug) {
    const response = await fetch(`${API_BASE}/fda/pregnancy/${encodeURIComponent(drug)}`);
    return await response.json();
}

/**
 * FDA geri çağırma bilgileri
 */
export async function getFdaRecalls(drug) {
    const response = await fetch(`${API_BASE}/fda/recalls/${encodeURIComponent(drug)}`);
    return await response.json();
}

// ============= RxNorm API =============

/**
 * RxNorm ilaç arama
 */
export async function searchRxNorm(drug) {
    const response = await fetch(`${API_BASE}/rxnorm/search/${encodeURIComponent(drug)}`);
    return await response.json();
}

/**
 * RxNorm etkileşim kontrolü
 */
export async function checkRxNormInteractions(drugs) {
    const response = await fetch(`${API_BASE}/rxnorm/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs })
    });
    return await response.json();
}

/**
 * Kapsamlı ilaç kontrolü (tüm kaynaklar)
 */
export async function comprehensiveCheck(drugs, options = {}) {
    const response = await fetch(`${API_BASE}/comprehensive-check`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({
            drugs,
            includeFda: options.includeFda !== false,
            includeRxNorm: options.includeRxNorm !== false
        })
    });
    return await response.json();
}

/**
 * Auth header helper
 */
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ============= ICD-10 API =============

/**
 * ICD-10 hastalık kodu ara
 */
export async function searchICD10(query) {
    const response = await fetch(`${API_BASE}/icd10/search/${encodeURIComponent(query)}`);
    return await response.json();
}

/**
 * ICD-10 kod detayı
 */
export async function getICD10Code(code) {
    const response = await fetch(`${API_BASE}/icd10/code/${encodeURIComponent(code)}`);
    return await response.json();
}

/**
 * Hastalık kategorileri
 */
export async function getICD10Categories() {
    const response = await fetch(`${API_BASE}/icd10/categories`);
    return await response.json();
}

/**
 * Hastalık için ilaç önerileri
 */
export async function getDrugsForDisease(icdCode) {
    const response = await fetch(`${API_BASE}/icd10/drugs/${encodeURIComponent(icdCode)}`);
    return await response.json();
}

// ============= TİTCK API =============

/**
 * Türkiye ilaç ara
 */
export async function searchTurkishDrug(query) {
    const response = await fetch(`${API_BASE}/titck/search/${encodeURIComponent(query)}`);
    return await response.json();
}

/**
 * Türkiye ilaç detayı
 */
export async function getTurkishDrugDetails(drug) {
    const response = await fetch(`${API_BASE}/titck/drug/${encodeURIComponent(drug)}`);
    return await response.json();
}

/**
 * Türkiye'ye özgü ilaç uyarıları
 */
export async function getTurkishWarnings(drug) {
    const response = await fetch(`${API_BASE}/titck/warnings/${encodeURIComponent(drug)}`);
    return await response.json();
}

/**
 * SGK'lı ilaçlar
 */
export async function getReimbursedDrugs() {
    const response = await fetch(`${API_BASE}/titck/reimbursed`);
    return await response.json();
}

export default {
    checkDrugInteractions,
    checkPregnancySafety,
    checkMultiplePregnancySafety,
    calculatePediatricDose,
    calculateRenalDose,
    calculateHepaticDose,
    getAlternatives,
    // FDA
    getFdaLabel,
    getFdaAdverseEvents,
    getFdaInteractions,
    getFdaPregnancy,
    getFdaRecalls,
    // RxNorm
    searchRxNorm,
    checkRxNormInteractions,
    // Comprehensive
    comprehensiveCheck,
    // ICD-10
    searchICD10,
    getICD10Code,
    getICD10Categories,
    getDrugsForDisease,
    // TİTCK
    searchTurkishDrug,
    getTurkishDrugDetails,
    getTurkishWarnings,
    getReimbursedDrugs
};

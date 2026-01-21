// backend/src/services/openFdaService.js
/**
 * OpenFDA API Entegrasyonu
 * FDA onaylı ilaç verileri - ücretsiz, kayıt gerektirmez
 * https://open.fda.gov/apis/
 */

import { httpClient } from '../config/index.js';

const OPENFDA_BASE_URL = 'https://api.fda.gov';

/**
 * İlaç etiketi/prospektüs bilgilerini ara
 * @param {string} drugName - İlaç adı (generic veya brand)
 */
export async function searchDrugLabel(drugName) {
    try {
        // Build query to search both brand and generic name
        const q = `openfda.brand_name:"${drugName}"+openfda.generic_name:"${drugName}"+openfda.brand_name:${drugName}+openfda.generic_name:${drugName}`;

        const response = await httpClient.get(`${OPENFDA_BASE_URL}/drug/label.json`, {
            params: {
                search: `openfda.brand_name:"${drugName}"+openfda.generic_name:"${drugName}"`, // keep original if unsure about syntax, but let's trust simple search first or catch error
                limit: 5
            },
            timeout: 10000
        });

        if (!response.data?.results?.length) {
            return { found: false, message: 'İlaç bulunamadı' };
        }

        const results = response.data.results.map(drug => ({
            brandName: drug.openfda?.brand_name?.[0] || 'Bilinmiyor',
            genericName: drug.openfda?.generic_name?.[0] || 'Bilinmiyor',
            manufacturer: drug.openfda?.manufacturer_name?.[0] || 'Bilinmiyor',
            route: drug.openfda?.route?.[0] || 'Bilinmiyor',
            warnings: drug.warnings?.[0]?.substring(0, 500) || null,
            contraindications: drug.contraindications?.[0]?.substring(0, 500) || null,
            drugInteractions: drug.drug_interactions?.[0]?.substring(0, 1000) || null,
            pregnancy: drug.pregnancy?.[0]?.substring(0, 500) || null,
            nursingMothers: drug.nursing_mothers?.[0]?.substring(0, 500) || null,
            pediatricUse: drug.pediatric_use?.[0]?.substring(0, 500) || null,
            geriatricUse: drug.geriatric_use?.[0]?.substring(0, 500) || null,
            adverseReactions: drug.adverse_reactions?.[0]?.substring(0, 1000) || null,
            dosageAndAdministration: drug.dosage_and_administration?.[0]?.substring(0, 500) || null
        }));

        return {
            found: true,
            count: results.length,
            drugs: results,
            source: 'OpenFDA'
        };
    } catch (error) {
        // OpenFDA returns 404 for 'no matches found', which is not a system error
        if (error.response?.status === 404) {
            return { found: false, message: 'İlaç bulunamadı (404)' };
        }
        console.error('OpenFDA search error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * İlaç yan etkilerini sorgula (FAERS veritabanı)
 * @param {string} drugName - İlaç adı
 */
export async function getAdverseEvents(drugName) {
    try {
        const response = await httpClient.get(`${OPENFDA_BASE_URL}/drug/event.json`, {
            params: {
                search: `patient.drug.medicinalproduct:"${drugName}"`,
                count: 'patient.reaction.reactionmeddrapt.exact',
                limit: 20
            },
            timeout: 10000
        });

        if (!response.data?.results?.length) {
            return { found: false, message: 'Yan etki verisi bulunamadı' };
        }

        const reactions = response.data.results.map(r => ({
            reaction: r.term,
            count: r.count
        }));

        // En sık bildirilen yan etkileri sırala
        reactions.sort((a, b) => b.count - a.count);

        return {
            found: true,
            drugName,
            adverseEvents: reactions.slice(0, 15),
            totalReports: reactions.reduce((sum, r) => sum + r.count, 0),
            source: 'FDA Adverse Event Reporting System (FAERS)'
        };
    } catch (error) {
        console.error('OpenFDA adverse events error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * İlaç etkileşim bilgilerini FDA etiketinden çek
 * @param {string} drugName - İlaç adı
 */
export async function getDrugInteractionsFromFDA(drugName) {
    try {
        const labelData = await searchDrugLabel(drugName);

        if (!labelData.found || !labelData.drugs?.length) {
            return { found: false, message: 'Etkileşim bilgisi bulunamadı' };
        }

        const drug = labelData.drugs[0];

        if (!drug.drugInteractions) {
            return {
                found: false,
                message: 'Bu ilaç için FDA etiketinde etkileşim bilgisi yok',
                drugName: drug.genericName
            };
        }

        return {
            found: true,
            drugName: drug.genericName,
            brandName: drug.brandName,
            interactionText: drug.drugInteractions,
            warnings: drug.warnings,
            contraindications: drug.contraindications,
            source: 'FDA Drug Label'
        };
    } catch (error) {
        console.error('FDA interaction lookup error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * Hamilelik güvenlik bilgilerini FDA etiketinden çek
 * @param {string} drugName - İlaç adı
 */
export async function getPregnancyInfoFromFDA(drugName) {
    try {
        const labelData = await searchDrugLabel(drugName);

        if (!labelData.found || !labelData.drugs?.length) {
            return { found: false, message: 'Hamilelik bilgisi bulunamadı' };
        }

        const drug = labelData.drugs[0];

        return {
            found: true,
            drugName: drug.genericName,
            brandName: drug.brandName,
            pregnancy: drug.pregnancy || 'Bilgi yok',
            nursingMothers: drug.nursingMothers || 'Bilgi yok',
            pediatricUse: drug.pediatricUse || 'Bilgi yok',
            geriatricUse: drug.geriatricUse || 'Bilgi yok',
            source: 'FDA Drug Label'
        };
    } catch (error) {
        console.error('FDA pregnancy lookup error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * İlaç geri çağırma (recall) bilgilerini sorgula
 * @param {string} drugName - İlaç adı
 */
export async function getDrugRecalls(drugName) {
    try {
        const response = await httpClient.get(`${OPENFDA_BASE_URL}/drug/enforcement.json`, {
            params: {
                search: `product_description:"${drugName}"`,
                limit: 10
            },
            timeout: 10000
        });

        if (!response.data?.results?.length) {
            return { found: false, message: 'Geri çağırma kaydı yok' };
        }

        const recalls = response.data.results.map(r => ({
            recallNumber: r.recall_number,
            status: r.status,
            classification: r.classification, // Class I, II, III
            reason: r.reason_for_recall,
            initiationDate: r.recall_initiation_date,
            productDescription: r.product_description?.substring(0, 200)
        }));

        return {
            found: true,
            drugName,
            recalls,
            source: 'FDA Enforcement Reports'
        };
    } catch (error) {
        console.error('FDA recalls error:', error.message);
        return { found: false, error: error.message };
    }
}

export default {
    searchDrugLabel,
    getAdverseEvents,
    getDrugInteractionsFromFDA,
    getPregnancyInfoFromFDA,
    getDrugRecalls
};

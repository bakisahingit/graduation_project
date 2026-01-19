// backend/src/services/rxNormService.js
/**
 * RxNorm API Entegrasyonu
 * NLM (National Library of Medicine) ilaç isimlendirme standardı
 * https://lhncbc.nlm.nih.gov/RxNav/APIs/
 * Ücretsiz, kayıt gerektirmez
 */

import { httpClient } from '../config/index.js';

const RXNORM_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

/**
 * İlaç adından RxCUI (benzersiz tanımlayıcı) bul
 * @param {string} drugName - İlaç adı
 */
export async function getRxCUI(drugName) {
    try {
        const response = await httpClient.get(`${RXNORM_BASE_URL}/rxcui.json`, {
            params: { name: drugName },
            timeout: 10000
        });

        const rxcuiGroup = response.data?.idGroup;

        if (!rxcuiGroup?.rxnormId?.length) {
            // Yaklaşık eşleşme dene
            return await getApproximateMatch(drugName);
        }

        return {
            found: true,
            rxcui: rxcuiGroup.rxnormId[0],
            name: rxcuiGroup.name
        };
    } catch (error) {
        console.error('RxNorm RxCUI error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * Yaklaşık isim eşleştirme
 * @param {string} drugName - İlaç adı
 */
export async function getApproximateMatch(drugName) {
    try {
        const response = await httpClient.get(`${RXNORM_BASE_URL}/approximateTerm.json`, {
            params: { term: drugName, maxEntries: 5 },
            timeout: 10000
        });

        const candidates = response.data?.approximateGroup?.candidate;

        if (!candidates?.length) {
            return { found: false, message: 'Eşleşme bulunamadı' };
        }

        return {
            found: true,
            matches: candidates.map(c => ({
                rxcui: c.rxcui,
                name: c.name || drugName,
                score: c.score
            }))
        };
    } catch (error) {
        console.error('RxNorm approximate match error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * İlaç etkileşimlerini RxNorm üzerinden sorgula
 * @param {string[]} rxcuiList - RxCUI listesi
 */
export async function getInteractions(rxcuiList) {
    try {
        if (!rxcuiList || rxcuiList.length < 2) {
            return { found: false, message: 'En az 2 ilaç gerekli' };
        }

        const response = await httpClient.get(`${RXNORM_BASE_URL}/interaction/list.json`, {
            params: { rxcuis: rxcuiList.join('+') },
            timeout: 15000
        });

        const interactionGroups = response.data?.fullInteractionTypeGroup;

        if (!interactionGroups?.length) {
            return {
                found: true,
                interactions: [],
                message: 'Bilinen etkileşim bulunamadı',
                source: 'RxNorm/DrugBank'
            };
        }

        const interactions = [];

        for (const group of interactionGroups) {
            const source = group.sourceName;

            for (const interactionType of group.fullInteractionType || []) {
                for (const pair of interactionType.interactionPair || []) {
                    interactions.push({
                        severity: pair.severity || 'N/A',
                        description: pair.description,
                        drug1: pair.interactionConcept?.[0]?.minConceptItem?.name,
                        drug2: pair.interactionConcept?.[1]?.minConceptItem?.name,
                        source
                    });
                }
            }
        }

        return {
            found: true,
            interactionCount: interactions.length,
            interactions,
            source: 'RxNorm Interaction API'
        };
    } catch (error) {
        if (error.response?.status === 404) {
            // 404 often implies no interactions found for the given list
            return {
                found: true,
                interactions: [],
                message: 'Bilinen etkileşim bulunamadı',
                source: 'RxNorm/DrugBank (No Match)'
            };
        }
        console.error('RxNorm interactions error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * İlaç sınıfını bul (ATC, pharmacologic class vb.)
 * @param {string} rxcui - RxCUI
 */
export async function getDrugClass(rxcui) {
    try {
        const response = await httpClient.get(`${RXNORM_BASE_URL}/rxclass/class/byRxcui.json`, {
            params: { rxcui },
            timeout: 10000
        });

        const classInfo = response.data?.rxclassDrugInfoList?.rxclassDrugInfo;

        if (!classInfo?.length) {
            return { found: false, message: 'Sınıf bilgisi bulunamadı' };
        }

        const classes = classInfo.map(c => ({
            className: c.rxclassMinConceptItem?.className,
            classType: c.rxclassMinConceptItem?.classType,
            classId: c.rxclassMinConceptItem?.classId
        }));

        // Unique sınıfları filtrele
        const uniqueClasses = [...new Map(classes.map(c => [c.className, c])).values()];

        return {
            found: true,
            rxcui,
            classes: uniqueClasses,
            source: 'RxClass'
        };
    } catch (error) {
        console.error('RxNorm drug class error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * İlaç isimlerinden etkileşim kontrolü (kolay kullanım)
 * @param {string[]} drugNames - İlaç isimleri listesi
 */
export async function checkInteractionsByNames(drugNames) {
    try {
        // Önce tüm ilaçların RxCUI'lerini bul
        const rxcuiPromises = drugNames.map(name => getRxCUI(name));
        const rxcuiResults = await Promise.all(rxcuiPromises);

        const rxcuiList = [];
        const notFound = [];

        rxcuiResults.forEach((result, index) => {
            if (result.found && result.rxcui) {
                rxcuiList.push(result.rxcui);
            } else if (result.found && result.matches?.length) {
                rxcuiList.push(result.matches[0].rxcui);
            } else {
                notFound.push(drugNames[index]);
            }
        });

        if (rxcuiList.length < 2) {
            return {
                found: false,
                message: `Yeterli ilaç bulunamadı. Bulunamayan: ${notFound.join(', ')}`,
                notFound
            };
        }

        // Etkileşimleri sorgula
        const interactions = await getInteractions(rxcuiList);

        return {
            ...interactions,
            checkedDrugs: drugNames.filter(d => !notFound.includes(d)),
            notFound
        };
    } catch (error) {
        console.error('RxNorm check by names error:', error.message);
        return { found: false, error: error.message };
    }
}

/**
 * İlaç bilgilerini getir (isim, form, güç vb.)
 * @param {string} rxcui - RxCUI
 */
export async function getDrugProperties(rxcui) {
    try {
        const response = await httpClient.get(`${RXNORM_BASE_URL}/rxcui/${rxcui}/properties.json`, {
            timeout: 10000
        });

        const props = response.data?.properties;

        if (!props) {
            return { found: false, message: 'Özellikler bulunamadı' };
        }

        return {
            found: true,
            rxcui,
            name: props.name,
            synonym: props.synonym,
            tty: props.tty, // Term Type (SBD, SCD, etc.)
            language: props.language,
            source: 'RxNorm'
        };
    } catch (error) {
        console.error('RxNorm properties error:', error.message);
        return { found: false, error: error.message };
    }
}

export default {
    getRxCUI,
    getApproximateMatch,
    getInteractions,
    getDrugClass,
    checkInteractionsByNames,
    getDrugProperties
};

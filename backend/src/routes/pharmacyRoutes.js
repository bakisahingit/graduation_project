// backend/src/routes/pharmacyRoutes.js
/**
 * Eczacılık Özellikleri API Route'ları
 * İlaç etkileşimi, hamilelik güvenliği, doz hesaplama
 */

import express from 'express';
import {
    checkMultipleDrugInteractions,
    getAlternatives,
    getInteractionContext
} from '../services/drugInteractionService.js';
import {
    getPregnancySafety,
    checkMultiplePregnancySafety,
    FDA_CATEGORIES
} from '../services/pregnancySafetyService.js';
import {
    calculatePediatricDose,
    calculateRenalDose,
    calculateHepaticDose,
    calculateCrCl,
    calculateComprehensiveDose
} from '../services/doseCalculatorService.js';
import { optionalAuth } from '../middleware/auth.js';
import { getChatCompletion } from '../services/llmService.js';

const router = express.Router();

// ============= İLAÇ ETKİLEŞİMİ =============

/**
 * POST /api/pharmacy/interactions - Çoklu ilaç etkileşim kontrolü
 */
router.post('/interactions', optionalAuth, async (req, res) => {
    try {
        const { drugs, withAiAnalysis = false } = req.body;

        if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'En az 2 ilaç gerekli'
            });
        }

        const result = checkMultipleDrugInteractions(drugs);

        // İsteğe bağlı AI analizi
        if (withAiAnalysis && result.interactions.length > 0) {
            try {
                const context = getInteractionContext(drugs, result.interactions);
                const messages = [
                    { role: 'system', content: 'Sen uzman bir klinik eczacısın. İlaç etkileşimlerini analiz edip Türkçe olarak özetliyorsun.' },
                    { role: 'user', content: `Aşağıdaki ilaç etkileşimlerini analiz et ve eczacı için pratik öneriler sun:\n\n${context}` }
                ];

                const completion = await getChatCompletion(messages);
                result.aiAnalysis = completion.choices[0].message.content;
            } catch (e) {
                console.error('AI analysis error:', e);
            }
        }

        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Interaction check error:', error);
        res.status(500).json({ success: false, message: 'Etkileşim kontrolü sırasında hata' });
    }
});

/**
 * GET /api/pharmacy/alternatives/:drug - Alternatif ilaç önerileri
 */
router.get('/alternatives/:drug', async (req, res) => {
    try {
        const { drug } = req.params;
        const alternatives = getAlternatives(drug);

        res.json({
            success: true,
            drug,
            alternatives,
            hasAlternatives: alternatives.length > 0
        });
    } catch (error) {
        console.error('Alternatives error:', error);
        res.status(500).json({ success: false, message: 'Alternatif önerileri alınırken hata' });
    }
});

// ============= HAMİLELİK GÜVENLİĞİ =============

/**
 * GET /api/pharmacy/pregnancy/:drug - Tek ilaç hamilelik güvenliği
 */
router.get('/pregnancy/:drug', async (req, res) => {
    try {
        const { drug } = req.params;
        const { trimester } = req.query;

        const result = getPregnancySafety(drug, trimester);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Pregnancy safety error:', error);
        res.status(500).json({ success: false, message: 'Hamilelik güvenliği sorgulanırken hata' });
    }
});

/**
 * POST /api/pharmacy/pregnancy - Çoklu ilaç hamilelik kontrolü
 */
router.post('/pregnancy', async (req, res) => {
    try {
        const { drugs, trimester } = req.body;

        if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'En az 1 ilaç gerekli'
            });
        }

        const result = await checkMultiplePregnancySafety(drugs, trimester);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Multiple pregnancy check error:', error);
        res.status(500).json({ success: false, message: 'Hamilelik kontrolü sırasında hata' });
    }
});

/**
 * GET /api/pharmacy/pregnancy-categories - FDA kategorileri listesi
 */
router.get('/pregnancy-categories', (req, res) => {
    res.json({ success: true, categories: FDA_CATEGORIES });
});

// ============= DOZ HESAPLAMA =============

/**
 * POST /api/pharmacy/dose/pediatric - Pediatrik doz hesaplama
 */
router.post('/dose/pediatric', async (req, res) => {
    try {
        const { drug, weight, ageYears, ageMonths } = req.body;

        if (!drug || !weight) {
            return res.status(400).json({
                success: false,
                message: 'İlaç adı ve vücut ağırlığı gerekli'
            });
        }

        const result = calculatePediatricDose(drug, weight, ageYears, ageMonths);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Pediatric dose error:', error);
        res.status(500).json({ success: false, message: 'Pediatrik doz hesaplanırken hata' });
    }
});

/**
 * POST /api/pharmacy/dose/renal - Böbrek yetmezliğinde doz
 */
router.post('/dose/renal', async (req, res) => {
    try {
        const { drug, crCl, age, weight, serumCreatinine, isFemale } = req.body;

        let calculatedCrCl = crCl;

        // CrCl verilmemişse hesapla
        if (!calculatedCrCl && age && weight && serumCreatinine) {
            calculatedCrCl = calculateCrCl(age, weight, serumCreatinine, isFemale);
        }

        if (!drug || !calculatedCrCl) {
            return res.status(400).json({
                success: false,
                message: 'İlaç adı ve CrCl değeri (veya hesaplama parametreleri) gerekli'
            });
        }

        const result = calculateRenalDose(drug, calculatedCrCl);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Renal dose error:', error);
        res.status(500).json({ success: false, message: 'Renal doz hesaplanırken hata' });
    }
});

/**
 * POST /api/pharmacy/dose/hepatic - Karaciğer yetmezliğinde doz
 */
router.post('/dose/hepatic', async (req, res) => {
    try {
        const { drug, childPughClass } = req.body;

        if (!drug || !childPughClass) {
            return res.status(400).json({
                success: false,
                message: 'İlaç adı ve Child-Pugh sınıfı gerekli'
            });
        }

        const result = calculateHepaticDose(drug, childPughClass);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Hepatic dose error:', error);
        res.status(500).json({ success: false, message: 'Hepatik doz hesaplanırken hata' });
    }
});

/**
 * POST /api/pharmacy/dose/comprehensive - Kapsamlı doz hesaplama
 */
router.post('/dose/comprehensive', async (req, res) => {
    try {
        const result = calculateComprehensiveDose(req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Comprehensive dose error:', error);
        res.status(500).json({ success: false, message: 'Doz hesaplanırken hata' });
    }
});

// ============= OPENFDA API (Güvenilir Kaynaklar) =============

import openFdaService from '../services/openFdaService.js';
import rxNormService from '../services/rxNormService.js';

/**
 * GET /api/pharmacy/fda/label/:drug - FDA ilaç etiketi bilgileri
 */
router.get('/fda/label/:drug', async (req, res) => {
    try {
        const { drug } = req.params;
        const result = await openFdaService.searchDrugLabel(drug);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('FDA label error:', error);
        res.status(500).json({ success: false, message: 'FDA verisi alınırken hata' });
    }
});

/**
 * GET /api/pharmacy/fda/adverse/:drug - FDA yan etki raporları
 */
router.get('/fda/adverse/:drug', async (req, res) => {
    try {
        const { drug } = req.params;
        const result = await openFdaService.getAdverseEvents(drug);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('FDA adverse events error:', error);
        res.status(500).json({ success: false, message: 'Yan etki verisi alınırken hata' });
    }
});

/**
 * GET /api/pharmacy/fda/interactions/:drug - FDA etkileşim bilgileri
 */
router.get('/fda/interactions/:drug', async (req, res) => {
    try {
        const { drug } = req.params;
        const result = await openFdaService.getDrugInteractionsFromFDA(drug);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('FDA interactions error:', error);
        res.status(500).json({ success: false, message: 'FDA etkileşim verisi alınırken hata' });
    }
});

/**
 * GET /api/pharmacy/fda/pregnancy/:drug - FDA hamilelik bilgileri
 */
router.get('/fda/pregnancy/:drug', async (req, res) => {
    try {
        const { drug } = req.params;
        const result = await openFdaService.getPregnancyInfoFromFDA(drug);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('FDA pregnancy error:', error);
        res.status(500).json({ success: false, message: 'FDA hamilelik verisi alınırken hata' });
    }
});

/**
 * GET /api/pharmacy/fda/recalls/:drug - FDA geri çağırma bilgileri
 */
router.get('/fda/recalls/:drug', async (req, res) => {
    try {
        const { drug } = req.params;
        const result = await openFdaService.getDrugRecalls(drug);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('FDA recalls error:', error);
        res.status(500).json({ success: false, message: 'Geri çağırma verisi alınırken hata' });
    }
});

// ============= RXNORM API =============

/**
 * GET /api/pharmacy/rxnorm/search/:drug - RxNorm ilaç arama
 */
router.get('/rxnorm/search/:drug', async (req, res) => {
    try {
        const { drug } = req.params;
        const result = await rxNormService.getRxCUI(drug);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('RxNorm search error:', error);
        res.status(500).json({ success: false, message: 'RxNorm araması başarısız' });
    }
});

/**
 * POST /api/pharmacy/rxnorm/interactions - RxNorm etkileşim kontrolü
 */
router.post('/rxnorm/interactions', async (req, res) => {
    try {
        const { drugs } = req.body;

        if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
            return res.status(400).json({ success: false, message: 'En az 2 ilaç gerekli' });
        }

        const result = await rxNormService.checkInteractionsByNames(drugs);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('RxNorm interactions error:', error);
        res.status(500).json({ success: false, message: 'RxNorm etkileşim kontrolü başarısız' });
    }
});

/**
 * GET /api/pharmacy/rxnorm/class/:rxcui - İlaç sınıfı bilgisi
 */
router.get('/rxnorm/class/:rxcui', async (req, res) => {
    try {
        const { rxcui } = req.params;
        const result = await rxNormService.getDrugClass(rxcui);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('RxNorm class error:', error);
        res.status(500).json({ success: false, message: 'İlaç sınıfı alınırken hata' });
    }
});

/**
 * POST /api/pharmacy/comprehensive-check - Kapsamlı ilaç kontrolü (tüm kaynaklar)
 */
router.post('/comprehensive-check', optionalAuth, async (req, res) => {
    try {
        const { drugs, includeFda = true, includeRxNorm = true } = req.body;

        if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
            return res.status(400).json({ success: false, message: 'En az 1 ilaç gerekli' });
        }

        const results = {
            localDatabase: null,
            fdaData: null,
            rxNormInteractions: null
        };

        // Yerel veritabanı kontrolü
        if (drugs.length >= 2) {
            results.localDatabase = await checkMultipleDrugInteractions(drugs);
        }

        // FDA verileri (ilk ilaç için)
        if (includeFda && drugs.length > 0) {
            try {
                results.fdaData = await openFdaService.searchDrugLabel(drugs[0]);
            } catch (e) {
                results.fdaData = { found: false, error: 'FDA bağlantı hatası' };
            }
        }

        // RxNorm etkileşimleri
        if (includeRxNorm && drugs.length >= 2) {
            try {
                results.rxNormInteractions = await rxNormService.checkInteractionsByNames(drugs);
            } catch (e) {
                results.rxNormInteractions = { found: false, error: 'RxNorm bağlantı hatası' };
            }
        }

        res.json({
            success: true,
            drugs,
            sources: ['Local Database', 'OpenFDA', 'RxNorm/DrugBank'],
            ...results
        });
    } catch (error) {
        console.error('Comprehensive check error:', error);
        res.status(500).json({ success: false, message: 'Kapsamlı kontrol başarısız' });
    }
});

// ============= ICD-10 API =============

import icd10Service from '../services/icd10Service.js';

/**
 * GET /api/pharmacy/icd10/search/:query - ICD-10 kod arama
 */
router.get('/icd10/search/:query', (req, res) => {
    try {
        const { query } = req.params;
        const result = icd10Service.searchICD10(query);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('ICD-10 search error:', error);
        res.status(500).json({ success: false, message: 'ICD-10 araması başarısız' });
    }
});

/**
 * GET /api/pharmacy/icd10/code/:code - ICD-10 kod detayı
 */
router.get('/icd10/code/:code', (req, res) => {
    try {
        const { code } = req.params;
        const result = icd10Service.getICD10ByCode(code);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('ICD-10 code error:', error);
        res.status(500).json({ success: false, message: 'ICD-10 kodu alınamadı' });
    }
});

/**
 * GET /api/pharmacy/icd10/category/:category - Kategoriye göre hastalıklar
 */
router.get('/icd10/category/:category', (req, res) => {
    try {
        const { category } = req.params;
        const result = icd10Service.getByCategory(category);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('ICD-10 category error:', error);
        res.status(500).json({ success: false, message: 'Kategori alınamadı' });
    }
});

/**
 * GET /api/pharmacy/icd10/categories - Tüm kategoriler
 */
router.get('/icd10/categories', (req, res) => {
    try {
        const result = icd10Service.getCategories();
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('ICD-10 categories error:', error);
        res.status(500).json({ success: false, message: 'Kategoriler alınamadı' });
    }
});

/**
 * GET /api/pharmacy/icd10/drugs/:code - Hastalık için ilaç önerileri
 */
router.get('/icd10/drugs/:code', (req, res) => {
    try {
        const { code } = req.params;
        const result = icd10Service.getDrugsForDisease(code);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('ICD-10 drugs error:', error);
        res.status(500).json({ success: false, message: 'İlaç önerileri alınamadı' });
    }
});

// ============= TİTCK (Türkiye İlaç) API =============

import titckService from '../services/titckService.js';

/**
 * GET /api/pharmacy/titck/search/:query - Türkiye ilaç arama
 */
router.get('/titck/search/:query', (req, res) => {
    try {
        const { query } = req.params;
        const result = titckService.searchTurkishDrug(query);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('TİTCK search error:', error);
        res.status(500).json({ success: false, message: 'TİTCK araması başarısız' });
    }
});

/**
 * GET /api/pharmacy/titck/drug/:name - İlaç detayı
 */
router.get('/titck/drug/:name', (req, res) => {
    try {
        const { name } = req.params;
        const result = titckService.getDrugDetails(name);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('TİTCK drug error:', error);
        res.status(500).json({ success: false, message: 'İlaç detayı alınamadı' });
    }
});

/**
 * GET /api/pharmacy/titck/warnings/:drug - Türkiye'ye özgü uyarılar
 */
router.get('/titck/warnings/:drug', (req, res) => {
    try {
        const { drug } = req.params;
        const result = titckService.getTurkishWarnings(drug);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('TİTCK warnings error:', error);
        res.status(500).json({ success: false, message: 'Uyarılar alınamadı' });
    }
});

/**
 * GET /api/pharmacy/titck/otc - Reçetesiz ilaçlar
 */
router.get('/titck/otc', (req, res) => {
    try {
        const result = titckService.listByPrescription(false);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('TİTCK OTC error:', error);
        res.status(500).json({ success: false, message: 'OTC listesi alınamadı' });
    }
});

/**
 * GET /api/pharmacy/titck/reimbursed - SGK'lı ilaçlar
 */
router.get('/titck/reimbursed', (req, res) => {
    try {
        const result = titckService.listReimbursedDrugs();
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('TİTCK reimbursed error:', error);
        res.status(500).json({ success: false, message: 'SGK listesi alınamadı' });
    }
});

/**
 * GET /api/pharmacy/titck/atc/:code - ATC koduna göre ara
 */
router.get('/titck/atc/:code', (req, res) => {
    try {
        const { code } = req.params;
        const result = titckService.searchByATC(code);
        res.json({ success: result.found, ...result });
    } catch (error) {
        console.error('TİTCK ATC error:', error);
        res.status(500).json({ success: false, message: 'ATC araması başarısız' });
    }
});

export default router;

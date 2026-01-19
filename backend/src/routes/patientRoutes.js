// backend/src/routes/patientRoutes.js
/**
 * Hasta Profili Yönetimi API Route'ları
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    createPatient,
    getPatient,
    getPatientsByUser,
    updatePatient,
    deletePatient,
    addMedication,
    removeMedication,
    addAllergy,
    addChronicCondition,
    checkPatientMedications
} from '../services/patientService.js';
import { checkMultipleDrugInteractions } from '../services/drugInteractionService.js';

const router = express.Router();

// Tüm route'lar auth gerektiriyor
router.use(authenticateToken);

/**
 * GET /api/patients - Kullanıcının tüm hastalarını getir
 */
router.get('/', async (req, res) => {
    try {
        const patients = await getPatientsByUser(req.user.id);
        res.json({ success: true, patients });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({ success: false, message: 'Hastalar alınırken hata' });
    }
});

/**
 * POST /api/patients - Yeni hasta oluştur
 */
router.post('/', async (req, res) => {
    try {
        const { name, birthDate, gender, weight, height, allergies, chronicConditions, notes } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Hasta adı gerekli' });
        }

        const patient = await createPatient(req.user.id, {
            name, birthDate, gender, weight, height, allergies, chronicConditions, notes
        });

        res.status(201).json({ success: true, patient });
    } catch (error) {
        console.error('Create patient error:', error);
        res.status(500).json({ success: false, message: 'Hasta oluşturulurken hata' });
    }
});

/**
 * GET /api/patients/:id - Hasta detayı
 */
router.get('/:id', async (req, res) => {
    try {
        const patient = await getPatient(req.params.id);

        if (!patient) {
            return res.status(404).json({ success: false, message: 'Hasta bulunamadı' });
        }

        if (patient.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
        }

        res.json({ success: true, patient });
    } catch (error) {
        console.error('Get patient error:', error);
        res.status(500).json({ success: false, message: 'Hasta alınırken hata' });
    }
});

/**
 * PUT /api/patients/:id - Hasta güncelle
 */
router.put('/:id', async (req, res) => {
    try {
        const patient = await getPatient(req.params.id);

        if (!patient) {
            return res.status(404).json({ success: false, message: 'Hasta bulunamadı' });
        }

        if (patient.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
        }

        const updatedPatient = await updatePatient(req.params.id, req.body);
        res.json({ success: true, patient: updatedPatient });
    } catch (error) {
        console.error('Update patient error:', error);
        res.status(500).json({ success: false, message: 'Hasta güncellenirken hata' });
    }
});

/**
 * DELETE /api/patients/:id - Hasta sil
 */
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await deletePatient(req.user.id, req.params.id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Hasta bulunamadı veya silinemedi' });
        }

        res.json({ success: true, message: 'Hasta silindi' });
    } catch (error) {
        console.error('Delete patient error:', error);
        res.status(500).json({ success: false, message: 'Hasta silinirken hata' });
    }
});

// ============= İLAÇ YÖNETİMİ =============

/**
 * POST /api/patients/:id/medications - Hastaya ilaç ekle
 */
router.post('/:id/medications', async (req, res) => {
    try {
        const patient = await getPatient(req.params.id);

        if (!patient || patient.userId !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Hasta bulunamadı' });
        }

        const { name, dosage, frequency, notes } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'İlaç adı gerekli' });
        }

        const updatedPatient = await addMedication(req.params.id, { name, dosage, frequency, notes });
        res.json({ success: true, patient: updatedPatient });
    } catch (error) {
        console.error('Add medication error:', error);
        res.status(500).json({ success: false, message: 'İlaç eklenirken hata' });
    }
});

/**
 * DELETE /api/patients/:id/medications/:medicationId - İlacı kaldır
 */
router.delete('/:id/medications/:medicationId', async (req, res) => {
    try {
        const patient = await getPatient(req.params.id);

        if (!patient || patient.userId !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Hasta bulunamadı' });
        }

        const updatedPatient = await removeMedication(req.params.id, req.params.medicationId);
        res.json({ success: true, patient: updatedPatient });
    } catch (error) {
        console.error('Remove medication error:', error);
        res.status(500).json({ success: false, message: 'İlaç kaldırılırken hata' });
    }
});

/**
 * POST /api/patients/:id/check-medication - Yeni ilaç uyumluluğunu kontrol et
 */
router.post('/:id/check-medication', async (req, res) => {
    try {
        const patient = await getPatient(req.params.id);

        if (!patient || patient.userId !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Hasta bulunamadı' });
        }

        const { drug } = req.body;

        if (!drug) {
            return res.status(400).json({ success: false, message: 'İlaç adı gerekli' });
        }

        // Alerji ve mevcut ilaç kontrolü
        const checkResult = await checkPatientMedications(req.params.id, drug);

        // Etkileşim kontrolü
        let interactions = null;
        if (checkResult.drugsToCheck && checkResult.drugsToCheck.length > 1) {
            interactions = checkMultipleDrugInteractions(checkResult.drugsToCheck);
        }

        res.json({
            success: true,
            ...checkResult,
            interactions
        });
    } catch (error) {
        console.error('Check medication error:', error);
        res.status(500).json({ success: false, message: 'İlaç kontrolü sırasında hata' });
    }
});

// ============= ALERJİ YÖNETİMİ =============

/**
 * POST /api/patients/:id/allergies - Alerji ekle
 */
router.post('/:id/allergies', async (req, res) => {
    try {
        const patient = await getPatient(req.params.id);

        if (!patient || patient.userId !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Hasta bulunamadı' });
        }

        const { substance, reaction, severity } = req.body;

        if (!substance) {
            return res.status(400).json({ success: false, message: 'Alerjen madde adı gerekli' });
        }

        const updatedPatient = await addAllergy(req.params.id, { substance, reaction, severity });
        res.json({ success: true, patient: updatedPatient });
    } catch (error) {
        console.error('Add allergy error:', error);
        res.status(500).json({ success: false, message: 'Alerji eklenirken hata' });
    }
});

// ============= KRONİK HASTALIK YÖNETİMİ =============

/**
 * POST /api/patients/:id/conditions - Kronik hastalık ekle
 */
router.post('/:id/conditions', async (req, res) => {
    try {
        const patient = await getPatient(req.params.id);

        if (!patient || patient.userId !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Hasta bulunamadı' });
        }

        const { name, diagnosisDate, notes } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Hastalık adı gerekli' });
        }

        const updatedPatient = await addChronicCondition(req.params.id, { name, diagnosisDate, notes });
        res.json({ success: true, patient: updatedPatient });
    } catch (error) {
        console.error('Add condition error:', error);
        res.status(500).json({ success: false, message: 'Kronik hastalık eklenirken hata' });
    }
});

export default router;

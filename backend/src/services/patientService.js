// backend/src/services/patientService.js
/**
 * Hasta Profili Yönetim Servisi
 * Redis tabanlı hasta kaydı ve ilaç geçmişi yönetimi
 */

import { v4 as uuidv4 } from 'uuid';
import redisClient from './redisService.js';

/**
 * Yeni hasta oluştur
 */
export async function createPatient(userId, patientData) {
    const patientId = uuidv4();

    const patient = {
        id: patientId,
        userId, // Bu hastayı oluşturan eczacı
        name: patientData.name,
        birthDate: patientData.birthDate || null,
        gender: patientData.gender || null, // 'male', 'female'
        weight: patientData.weight || null, // kg
        height: patientData.height || null, // cm
        allergies: patientData.allergies || [],
        chronicConditions: patientData.chronicConditions || [],
        medications: [], // Aktif ilaç listesi
        medicationHistory: [],
        notes: patientData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Redis'e kaydet
    await redisClient.set(`patient:${patientId}`, JSON.stringify(patient));

    // Kullanıcının hasta listesine ekle
    const patientListKey = `user:${userId}:patients`;
    await redisClient.sAdd(patientListKey, patientId);

    return patient;
}

/**
 * Hasta bilgilerini getir
 */
export async function getPatient(patientId) {
    const patientData = await redisClient.get(`patient:${patientId}`);
    return patientData ? JSON.parse(patientData) : null;
}

/**
 * Kullanıcının tüm hastalarını getir
 */
export async function getPatientsByUser(userId) {
    const patientIds = await redisClient.sMembers(`user:${userId}:patients`);

    if (!patientIds || patientIds.length === 0) {
        return [];
    }

    const patients = [];
    for (const patientId of patientIds) {
        const patient = await getPatient(patientId);
        if (patient) {
            patients.push(patient);
        }
    }

    return patients;
}

/**
 * Hasta bilgilerini güncelle
 */
export async function updatePatient(patientId, updates) {
    const patient = await getPatient(patientId);
    if (!patient) return null;

    const updatedPatient = {
        ...patient,
        ...updates,
        id: patient.id, // ID değiştirilemesin
        userId: patient.userId, // Sahip değiştirilemesin
        updatedAt: new Date().toISOString()
    };

    await redisClient.set(`patient:${patientId}`, JSON.stringify(updatedPatient));
    return updatedPatient;
}

/**
 * Hastaya ilaç ekle
 */
export async function addMedication(patientId, medication) {
    const patient = await getPatient(patientId);
    if (!patient) return null;

    const newMedication = {
        id: uuidv4(),
        name: medication.name,
        dosage: medication.dosage || '',
        frequency: medication.frequency || '',
        startDate: medication.startDate || new Date().toISOString(),
        endDate: medication.endDate || null,
        prescribedBy: medication.prescribedBy || '',
        notes: medication.notes || '',
        isActive: true
    };

    patient.medications.push(newMedication);
    patient.updatedAt = new Date().toISOString();

    await redisClient.set(`patient:${patientId}`, JSON.stringify(patient));
    return patient;
}

/**
 * İlacı kaldır (geçmişe taşı)
 */
export async function removeMedication(patientId, medicationId) {
    const patient = await getPatient(patientId);
    if (!patient) return null;

    const medIndex = patient.medications.findIndex(m => m.id === medicationId);
    if (medIndex === -1) return patient;

    const medication = patient.medications[medIndex];
    medication.isActive = false;
    medication.endDate = new Date().toISOString();

    // Aktif listeden kaldır, geçmişe ekle
    patient.medicationHistory.push(medication);
    patient.medications.splice(medIndex, 1);
    patient.updatedAt = new Date().toISOString();

    await redisClient.set(`patient:${patientId}`, JSON.stringify(patient));
    return patient;
}

/**
 * Alerji ekle
 */
export async function addAllergy(patientId, allergy) {
    const patient = await getPatient(patientId);
    if (!patient) return null;

    const allergyData = {
        id: uuidv4(),
        substance: allergy.substance,
        reaction: allergy.reaction || '',
        severity: allergy.severity || 'unknown', // 'mild', 'moderate', 'severe', 'life-threatening'
        addedAt: new Date().toISOString()
    };

    patient.allergies.push(allergyData);
    patient.updatedAt = new Date().toISOString();

    await redisClient.set(`patient:${patientId}`, JSON.stringify(patient));
    return patient;
}

/**
 * Kronik hastalık ekle
 */
export async function addChronicCondition(patientId, condition) {
    const patient = await getPatient(patientId);
    if (!patient) return null;

    const conditionData = {
        id: uuidv4(),
        name: condition.name,
        diagnosisDate: condition.diagnosisDate || null,
        notes: condition.notes || '',
        addedAt: new Date().toISOString()
    };

    patient.chronicConditions.push(conditionData);
    patient.updatedAt = new Date().toISOString();

    await redisClient.set(`patient:${patientId}`, JSON.stringify(patient));
    return patient;
}

/**
 * Hastanın aktif ilaçlarını kontrol et (alerji ve etkileşim)
 */
export async function checkPatientMedications(patientId, newDrug) {
    const patient = await getPatient(patientId);
    if (!patient) return { error: 'Hasta bulunamadı' };

    const warnings = [];

    // Alerji kontrolü
    const drugNameLower = newDrug.toLowerCase();
    for (const allergy of patient.allergies) {
        if (drugNameLower.includes(allergy.substance.toLowerCase()) ||
            allergy.substance.toLowerCase().includes(drugNameLower)) {
            warnings.push({
                type: 'allergy',
                severity: allergy.severity,
                message: `⚠️ ALERJİ UYARISI: Bu hastanın ${allergy.substance} alerjisi var!`,
                reaction: allergy.reaction
            });
        }
    }

    // Mevcut ilaçlarla etkileşim kontrolü için liste oluştur
    const currentDrugs = patient.medications.map(m => m.name);

    return {
        patient: {
            name: patient.name,
            allergies: patient.allergies,
            medications: patient.medications
        },
        warnings,
        drugsToCheck: [...currentDrugs, newDrug]
    };
}

/**
 * Hastayı sil
 */
export async function deletePatient(userId, patientId) {
    const patient = await getPatient(patientId);
    if (!patient || patient.userId !== userId) return false;

    await redisClient.del(`patient:${patientId}`);
    await redisClient.sRem(`user:${userId}:patients`, patientId);

    return true;
}

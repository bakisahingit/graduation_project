// src/handlers/chatHandler.js

// YENİLİKLER:
// - Redis ve LLM servisleri ADMET ön kontrolü için import edildi.
// - `handleAdmetTool` fonksiyonuna, görevi kuyruğa atmadan önce Redis'i kontrol eden bir bölüm eklendi.
//   Eğer sonuç cache'te varsa, kuyruk ve worker adımları atlanarak direkt senkron cevap dönülüyor.
// - `handleComparisonRequest` fonksiyonu, molekül çözümlemelerini paralel yapmak için `Promise.all` kullanacak şekilde yeniden yazıldı.

import { randomUUID } from 'crypto';
import { sendTaskToQueue } from '../services/queueService.js';
import redisClient from '../services/redisService.js';
import { extractChemicalWithLLM, translateWithLLM, getChatCompletion } from '../services/llmService.js';
import { getSmilesFromName   } from '../services/pubchemService.js';
import { admetContextPrompt } from '../utils/constants.js';
import { formatAdmetReport } from '../utils/formatters.js';
import { extractChemicalNameByRegex } from '../utils/nameResolvers.js';

/**
 * Sadece SMILES formatını çıkarmak için kullanılan fonksiyon
 * ADMET analizi yapmaz, sadece molekül isminden SMILES bulur
 */
export async function extractSmilesOnly(message, model = null) {
    let smiles = null;
    let chemicalName = null;

    // Önce LLM ile kimyasal maddeyi çıkar
    const extractedEntity = await extractChemicalWithLLM(message, model);

    if (extractedEntity.type === 'smiles') {
        smiles = extractedEntity.value;
    } else if (extractedEntity.type === 'name') {
        chemicalName = extractedEntity.value;
    } else {
        chemicalName = extractChemicalNameByRegex(message);
    }

    if (chemicalName && !smiles) {
        // Önce direkt olarak kimyasal ismi dene
        smiles = await getSmilesFromName(chemicalName);
        
        // Eğer başarısız olursa, çeviri yap
        if (!smiles) {
            const englishName = await translateWithLLM(chemicalName, model);
            if (englishName !== chemicalName) {
                console.log(`Translated "${chemicalName}" to "${englishName}"`);
                smiles = await getSmilesFromName(englishName);
            }
        }
    }

    return {
        smiles,
        chemicalName,
        success: !!smiles,
        message: smiles ? `SMILES bulundu: ${smiles}` : 'Geçerli bir molekül bulunamadı'
    };
}

async function getAdmetDataForIdentifier(identifier) {
    let smiles = null;
    let name = identifier; // Keep original identifier as name for now

    // Always attempt translation if it's not a known SMILES
    // (We don't have a robust way to check if it's a valid SMILES without trying PubChem)
    const englishName = await translateWithLLM(identifier);
    if (englishName !== identifier) {
        console.log(`LLM translated "${identifier}" to "${englishName}" for comparison.`);
        name = englishName; // Use the translated name for PubChem query
    } else {
        // If LLM didn't translate, use the original identifier as name
        name = identifier;
    }

    const foundSmiles = await getSmilesFromName(name); // Try to get SMILES from the (translated) name
    if (foundSmiles) {
        smiles = foundSmiles;
    } else {
        // If PubChem couldn't find SMILES from the name, it might be a direct SMILES string
        // Or it's just not a valid molecule name/SMILES
        // For now, we'll assume if getSmilesFromName failed, it's not a valid name.
        // We could add a more robust SMILES validation here if needed.
        return { identifier, error: 'Could not resolve to a valid molecule.' };
    }
    
    const admetData = await getAdmetPredictions(smiles, name || identifier);
    if (!admetData) {
        return { identifier, error: 'ADMET analysis failed.' };
    }
    return { identifier, data: admetData };
}

async function handleAdmetTool(message, model = null, properties = null) {
    let smiles = null;
    let chemicalName = null;

    // 1. Extract chemical name or SMILES
    // Strategy: Try Regex first, then fallback to LLM.
    chemicalName = extractChemicalNameByRegex(message);
    
    if (!chemicalName) {
        console.log("Regex extraction failed, trying LLM-based extraction...");
        const extractedEntity = await extractChemicalWithLLM(message, model);
        if (extractedEntity.type === 'smiles') {
            smiles = extractedEntity.value;
            chemicalName = extractedEntity.value; // Use SMILES as name if no name is found
        } else if (extractedEntity.type === 'name') {
            chemicalName = extractedEntity.value;
        }
    }

    if (chemicalName && !smiles) {
        smiles = await getSmilesFromName(chemicalName);
        if (!smiles) {
            const englishName = await translateWithLLM(chemicalName, model);
            if (englishName.toLowerCase() !== chemicalName.toLowerCase()) {
                smiles = await getSmilesFromName(englishName);
                if (smiles) {
                    chemicalName = englishName;
                }
            }
        }
    }

    if (!smiles) {
        return { type: 'error', message: `I could not identify a valid molecule from your message.` };
    }

    // 2. Görevi Hazırla ve Başlat
    const sessionId = randomUUID();
    const task = {
        type: 'single',
        name: chemicalName || identifier,
        smiles: smiles,
        sessionId: sessionId,
        identifier: chemicalName || smiles,
        selected_parameters: properties
    };
    
    // YENİ MANTIK: Bu fonksiyonun tek görevi görevi kuyruğa göndermek.
    // Cache kontrolü ve özetleme gibi yavaş işler ARTIK BURADA DEĞİL.
    // Onların hepsi server.js'de, arka planda yapılacak.
    try {
        sendTaskToQueue(task);
        console.log(`Task sent to queue for SMILES: ${smiles}`);
        return {
            type: 'async', // Her zaman async dönüyoruz.
            sessionId: sessionId,
            message: `Analysis for "${chemicalName || smiles}" has started.`
        };
    } catch (error) {
        console.error("Failed to send task to queue:", error);
        return { type: 'error', message: "There was an error starting the analysis." };
    }
}




async function handleComparisonRequest(molecules, model, properties) {
    const sessionId = randomUUID();

    const resolutionPromises = molecules.map(async (identifier) => {
        let name = identifier;
        
        const englishName = await translateWithLLM(identifier, model);
        if (englishName.toLowerCase() !== identifier.toLowerCase()) {
            console.log(`LLM translated "${identifier}" to "${englishName}" for comparison.`);
            name = englishName;
        }

        const foundSmiles = await getSmilesFromName(name);
        if (foundSmiles) {
            return { type: 'comparison', name, smiles: foundSmiles, sessionId, identifier };
        }
        
        const isSmilesLike = /^[A-Za-z0-9@+\-\[\]()=#\\/%.]+$/.test(identifier);
        if (isSmilesLike) {
            return { type: 'comparison', name: identifier, smiles: identifier, sessionId, identifier };
        }

        return { identifier, error: 'Could not resolve to a valid molecule.' };
    });

    const results = await Promise.all(resolutionPromises);

    const tasksToDispatch = results.filter(r => r.smiles);
    const failedResolutions = results.filter(r => r.error);

    if (tasksToDispatch.length === 0) {
        return { type: 'error', message: 'Could not analyze any of the provided molecules.' };
    }

    const batchInfo = {
        total: tasksToDispatch.length,
        failedResolutions: failedResolutions,
        results: [],
        properties: properties
    };
    await redisClient.set(`batch:${sessionId}`, JSON.stringify(batchInfo), { EX: 3600 });

    tasksToDispatch.forEach(task => sendTaskToQueue(task));

    return {
        type: 'async',
        sessionId: sessionId,
        message: `Comparison analysis for ${molecules.length} molecules has started. You will be notified when the results are ready.`
    };
}


export async function handleChatMessage(message, conversationHistory, tools, model = null) {
    if (tools.active === 'admet' || tools.active === 'ADMET') {
        return handleAdmetTool(message, model, tools.properties);
    }

    let systemPrompt = "You are a helpful assistant.";
    const hasAdmetReportInHistory = conversationHistory.some(
        (msg) => msg.role === 'assistant' && msg.content.includes('## 🧪 ADMET Analysis Report:')
    );

    if (hasAdmetReportInHistory) {
        systemPrompt = admetContextPrompt;
    }
    
    // `handleAdmetTool` sync cevap dönebileceği için bu fonksiyonun çıktısını da ona göre ayarlıyoruz.
    const result = await (tools.active === 'admet' ? handleAdmetTool(message, model, tools.properties) : Promise.resolve({ systemPrompt, finalMessage: message }));

    // Eğer handleAdmetTool sync bir sonuç döndürdüyse, onu direkt yolla.
    if (result.type === 'sync' || result.type === 'async' || result.type === 'error') {
        return result;
    }

    return { systemPrompt, finalMessage: message };
}

export { handleComparisonRequest };
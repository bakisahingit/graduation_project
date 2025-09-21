// src/handlers/chatHandler.js

import { getAdmetPredictions } from '../services/admetApiService.js';
import { extractChemicalWithLLM, translateWithLLM } from '../services/llmService.js';
import { getSmilesFromName } from '../services/pubchemService.js';
import { admetContextPrompt } from '../utils/constants.js';
import { formatAdmetReport } from '../utils/formatters.js';
import { extractChemicalNameByRegex } from '../utils/nameResolvers.js';

async function handleAdmetTool(message) {
    let smiles = null;
    let chemicalName = null;

    const extractedEntity = await extractChemicalWithLLM(message);

    if (extractedEntity.type === 'smiles') {
        smiles = extractedEntity.value;
    } else if (extractedEntity.type === 'name') {
        chemicalName = extractedEntity.value;
    } else {
        chemicalName = extractChemicalNameByRegex(message);
    }

    if (chemicalName && !smiles) {
        const englishName = await translateWithLLM(chemicalName);
        if (englishName !== chemicalName) console.log(`Translated "${chemicalName}" to "${englishName}"`);
        smiles = await getSmilesFromName(englishName);
    }

    if (!smiles) {
        return {
            systemPrompt: "You are a helpful assistant.",
            finalMessage: `I could not identify a valid molecule from your message. Please clarify. Original message was: "${message}"`
        };
    }

    const admetData = await getAdmetPredictions(smiles, chemicalName);

    if (!admetData) {
        return {
            error: `The ADMET analysis for molecule "${chemicalName || smiles}" failed. The service may be temporarily unavailable or the request may have timed out. Please try again later.`
        };
    }

    const admetReport = formatAdmetReport(admetData);
    return {
        systemPrompt: admetContextPrompt,
        finalMessage: `The user requested an ADMET analysis and the results are below. Please summarize these findings and present them to the user.\n\nADMET ANALYSIS REPORT:\n---\n${admetReport}`
    };
}

export async function handleChatMessage(message, conversationHistory, tools) {
    if (tools.active === 'admet' || tools.active === 'ADMET') {
        return handleAdmetTool(message);
    }

    let systemPrompt = "You are a helpful assistant.";
    const hasAdmetReportInHistory = conversationHistory.some(
        (msg) => msg.role === 'assistant' && msg.content.includes('## 🧪 ADMET Analysis Report:')
    );

    if (hasAdmetReportInHistory) {
        systemPrompt = admetContextPrompt;
    }
    
    return { systemPrompt, finalMessage: message };
}
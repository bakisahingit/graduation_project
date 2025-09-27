// src/handlers/chatHandler.js

import { getAdmetPredictions } from '../services/admetApiService.js';
import { extractChemicalWithLLM, translateWithLLM } from '../services/llmService.js';
import { getSmilesFromName } from '../services/pubchemService.js';
import { admetContextPrompt } from '../utils/constants.js';
import { formatAdmetReport } from '../utils/formatters.js';
import { extractChemicalNameByRegex } from '../utils/nameResolvers.js';

async function handleAdmetTool(message, model = null) {
    let smiles = null;
    let chemicalName = null;

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

    if (!smiles) {
        return {
            systemPrompt: "You are a helpful assistant.",
            finalMessage: `I could not identify a valid molecule from your message. Please clarify. Original message was: "${message}"`
        };
    }

    console.log(`Attempting ADMET analysis for SMILES: ${smiles}`);
    const admetData = await getAdmetPredictions(smiles, chemicalName);

    if (!admetData) {
        return {
            error: `The ADMET analysis for molecule "${chemicalName || smiles}" failed. The service may be temporarily unavailable or the request may have timed out. Please try again later.`
        };
    }

    console.log(`ADMET analysis completed successfully for ${chemicalName || smiles}`);

    const admetReport = formatAdmetReport(admetData);
    return {
        systemPrompt: admetContextPrompt,
        finalMessage: `The user requested an ADMET analysis and the results are below. Please summarize these findings and present them to the user.\n\nADMET ANALYSIS REPORT:\n---\n${admetReport}`,
        rawAdmetData: admetData // Add raw ADMET data
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

async function handleComparisonRequest(molecules, model) {
    const results = await Promise.all(molecules.map(m => getAdmetDataForIdentifier(m)));

    const successfulResults = results.filter(r => r.data);
    const failedResults = results.filter(r => r.error);

    if (successfulResults.length === 0) {
        return { error: 'Could not analyze any of the provided molecules.' };
    }

    let dataSummary = '';
    successfulResults.forEach(res => {
        dataSummary += `--- MOLECULE: ${res.data.moleculeName || res.identifier} ---\n`;
        dataSummary += `SMILES: ${res.data.smiles}\n`;
        dataSummary += `Overall Risk Score: ${res.data.riskScore.toFixed(1)}/100\n`;
        dataSummary += "Key Predictions:\n";
        res.data.admetPredictions.forEach(p => {
            dataSummary += `- ${p.property}: ${p.prediction}\n`;
        });
        dataSummary += '\n';
    });

    if (failedResults.length > 0) {
        dataSummary += '--- FAILED ANALYSES ---\n';
        failedResults.forEach(res => {
            dataSummary += `- ${res.identifier}: ${res.error}\n`;
        });
    }

    const finalMessage = `
Here is the data for ${successfulResults.length} molecules:
${dataSummary}

Your task is to compare these molecules based on their ADMET properties.
1.  Create a markdown table that compares the most important properties (e.g., Overall Risk Score, Ames, hERG, DILI, Hepatotoxicity, BBB, HIA, Clearance, VDss).
2.  After the table, provide a brief summary explaining which molecule(s) have a more favorable ADMET profile and why, highlighting the key trade-offs.
3.  If any molecules failed analysis, list them at the end.
`;

    return {
        systemPrompt: admetContextPrompt,
        finalMessage: finalMessage.trim(),
        rawComparisonData: { successfulResults, failedResults } // Add raw data
    };
}

export async function handleChatMessage(message, conversationHistory, tools, model = null) {
    if (tools.active === 'admet' || tools.active === 'ADMET') {
        return handleAdmetTool(message, model);
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

export { handleComparisonRequest };

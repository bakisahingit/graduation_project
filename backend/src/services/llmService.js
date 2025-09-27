// src/services/llmService.js

import { openai, config } from '../config/index.js';
import { entityExtractionPrompt, translationPrompt } from '../utils/constants.js';

export async function extractChemicalWithLLM(userMessage, model = null) {
    console.log("Attempting to extract chemical with LLM...");
    const selectedModel = model || config.llmModel;
    console.log(`Using model for extraction: ${selectedModel}`);
    try {
        const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: 'system', content: entityExtractionPrompt }, { role: 'user', content: userMessage }],
            temperature: 0,
            max_tokens: 60
        });
        const rawResponse = completion.choices[0].message.content;
        const cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        if (!cleanedResponse) return { type: 'none', value: null };
        return JSON.parse(cleanedResponse);
    } catch (error) {
        console.error("LLM-based extraction failed:", error);
        return { type: 'none', value: null };
    }
}

export async function translateWithLLM(turkishName, model = null) {
    console.log(`Translating "${turkishName}" to English with LLM...`);
    const selectedModel = model || config.llmModel;
    console.log(`Using model for translation: ${selectedModel}`);
    
    // Split the prompt into system instruction and user example
    const promptParts = translationPrompt.split('{turkishName}');
    const systemInstruction = promptParts[0].trim(); // "Translate the following Turkish chemical name..."
    const userExample = `Turkish: ${turkishName}\nEnglish:`; // The specific translation request

    try {
        const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userExample }
            ],
            temperature: 0,
            max_tokens: 20 // Currently 20
        });
        const rawResponse = completion.choices[0].message.content.trim();
        // Remove markdown code block delimiters if present
        const cleanedResponse = rawResponse.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
        try {
            const parsedResponse = JSON.parse(cleanedResponse);
            const translatedName = parsedResponse.englishName || turkishName;
            console.log(`LLM translation result for "${turkishName}": "${translatedName}"`); // Added log
            return translatedName;
        } catch (jsonError) {
            console.error("Failed to parse LLM translation response as JSON:", jsonError);
            return turkishName; // Fallback to original if JSON parsing fails
        }
    } catch (error) {
        console.error("LLM-based translation failed:", error);
        return turkishName;
    }
}

export async function getChatCompletion(messages, model = null) {
    console.log("Generating final response...");
    const selectedModel = model || config.llmModel;
    console.log(`Using model: ${selectedModel}`);
    try {
        const completion = await openai.chat.completions.create({ model: selectedModel, messages });
        return completion;
    } catch (error) {
        console.error("LLM chat completion failed:", error);
        // Return an empty object or re-throw a more specific error
        // For now, returning undefined to match the observed behavior if it's not throwing
        return undefined; 
    }
}
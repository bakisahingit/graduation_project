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
    const prompt = translationPrompt.replace('{turkishName}', turkishName);
    try {
        const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 10
        });
        const englishName = completion.choices[0].message.content.trim();
        return englishName || turkishName;
    } catch (error) {
        console.error("LLM-based translation failed:", error);
        return turkishName;
    }
}

export async function getChatCompletion(messages, model = null) {
    console.log("Generating final response...");
    const selectedModel = model || config.llmModel;
    console.log(`Using model: ${selectedModel}`);
    return await openai.chat.completions.create({ model: selectedModel, messages });
}
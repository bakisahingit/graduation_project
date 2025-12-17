// src/services/llmService.js

// YENİLİKLER:
// - Redis client import edildi.
// - `extractChemicalWithLLM` ve `translateWithLLM` fonksiyonlarına Redis önbellek mekanizması eklendi.
// - Başarılı LLM sonuçları 24 saatliğine Redis'e kaydediliyor.
// - Rate limit hatalarına karşı yeniden deneme mekanizması eklendi.

import { openai, config, resolveModel } from '../config/index.js';
import { entityExtractionPrompt, translationPrompt } from '../utils/constants.js';
import redisClient from './redisService.js'; // Redis client'ı import et

const LLM_CACHE_TTL_SECONDS = 3600 * 24; // LLM sonuçlarını 24 saat cache'le
const MAX_RETRIES = 5; // Increased retries to 5
const INITIAL_DELAY_MS = 1000;

// Yeniden deneme mekanizması için yardımcı fonksiyon
async function withRetry(fn, retries = MAX_RETRIES, delay = INITIAL_DELAY_MS) {
    try {
        return await fn();
    } catch (error) {
        if ((error.code === 429 || error.code === 502) && retries > 0) {
            console.warn(`Upstream error (${error.code}). Retrying in ${delay / 1000}s... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
        }
        throw error;
    }
}

export async function extractChemicalWithLLM(userMessage, model = null) {
    const cacheKey = `llm_extract:${userMessage.trim().toLowerCase()}`;

    try {
        const cachedExtraction = await redisClient.get(cacheKey);
        if (cachedExtraction) {
            console.log(`✅ Cache hit for LLM extraction: "${userMessage}"`);
            return JSON.parse(cachedExtraction);
        }
    } catch (e) {
        console.error("LLM extraction cache check failed:", e);
    }

    console.log("Attempting to extract chemical with LLM...");
    const selectedModel = resolveModel(model);
    console.log(`Using model for extraction: ${selectedModel}`);

    const apiCall = () => openai.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'system', content: entityExtractionPrompt }, { role: 'user', content: userMessage }],
        temperature: 0,
        max_tokens: 60,
        response_format: { type: "json_object" },
    });

    try {
        const completion = await withRetry(apiCall);

        if (completion.error) {
            throw new Error(`OpenAI API returned an error: ${completion.error.message}`);
        }

        const rawResponse = completion.choices[0].message.content;

        let result;
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error("LLM response did not contain a JSON object. Raw response:", rawResponse);
                throw new Error("No JSON object found in LLM response.");
            }
            result = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Failed to parse LLM response as JSON:", rawResponse, "Error:", e.message);
            throw new Error("LLM returned invalid JSON for extraction.");
        }

        try {
            await redisClient.set(cacheKey, JSON.stringify(result), { EX: LLM_CACHE_TTL_SECONDS });
        } catch (e) {
            console.error("LLM extraction cache set failed:", e);
        }

        return result;
    } catch (error) {
        console.error("LLM-based extraction failed after retries:", error);
        return { type: 'none', value: null };
    }
}

export async function translateWithLLM(turkishName, model = null) {
    const normalizedName = turkishName.trim().toLowerCase();
    const cacheKey = `llm_translate:${normalizedName}`;

    try {
        const cachedTranslation = await redisClient.get(cacheKey);
        if (cachedTranslation) {
            console.log(`✅ Cache hit for LLM translation: "${normalizedName}"`);
            return cachedTranslation;
        }
    } catch (e) {
        console.error("LLM translate cache check failed:", e);
    }

    console.log(`Translating "${turkishName}" to English with LLM...`);
    const selectedModel = resolveModel(model);
    console.log(`Using model for translation: ${selectedModel}`);

    const systemInstruction = "Translate the following Turkish chemical name to English. Respond with only a JSON object like this: {\"englishName\": \"...\"}";
    const userExample = `Turkish: ${turkishName}`;

    const apiCall = () => openai.chat.completions.create({
        model: selectedModel,
        messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userExample }
        ],
        temperature: 0,
        max_tokens: 20,
        response_format: { type: "json_object" },
    });

    try {
        const completion = await withRetry(apiCall);

        if (completion.error) {
            throw new Error(`OpenAI API returned an error: ${completion.error.message}`);
        }

        const rawResponse = completion.choices[0].message.content;

        let parsedResponse;
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error("LLM response did not contain a JSON object. Raw response:", rawResponse);
                throw new Error("No JSON object found in LLM response.");
            }
            parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Failed to parse LLM response as JSON:", rawResponse, "Error:", e.message);
            throw new Error("LLM returned invalid JSON for translation.");
        }

        const translatedName = parsedResponse.englishName || turkishName;

        if (translatedName !== turkishName) {
            try {
                await redisClient.set(cacheKey, translatedName, { EX: LLM_CACHE_TTL_SECONDS });
            } catch (e) {
                console.error("LLM translation cache set failed:", e);
            }
        }

        console.log(`LLM translation result for "${turkishName}": "${translatedName}"`);
        return translatedName;
    } catch (error) {
        console.error("LLM-based translation failed after retries:", error);
        return turkishName;
    }
}

export async function getChatCompletion(messages, model = null) {
    console.log("Generating final response...");
    const selectedModel = resolveModel(model);
    console.log(`Using model: ${selectedModel}`);

    const apiCall = () => openai.chat.completions.create({ model: selectedModel, messages });

    try {
        const completion = await withRetry(apiCall);
        console.log("LLM completion object:", JSON.stringify(completion, null, 2));

        if (completion.error) {
            throw new Error(`OpenAI API returned an error: ${completion.error.message}`);
        }

        return completion;
    } catch (error) {
        console.error("LLM chat completion failed after retries:", error);
        throw error;
    }
}

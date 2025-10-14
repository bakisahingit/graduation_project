// src/routes/chatRoutes.js

import { Router } from 'express';
import { handleChatMessage, handleComparisonRequest, extractSmilesOnly } from '../handlers/chatHandler.js';
import { getChatCompletion, extractChemicalWithLLM } from '../services/llmService.js';
import { getPubChemInfoBySmiles } from '../services/pubchemService.js';
import { getSmilesFromName } from '../services/pubchemService.js';
import TitleGeneratorService from '../../title_generator/service.js'; // Import title service
import { openai } from '../config/index.js'; // Import openai client

const router = Router();

router.post('/', async (req, res) => {
    const { message, conversationHistory = [], tools = {}, generateTitle = false, model } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Missing `message` in request body' });
    }

    // Handle title generation request
    if (generateTitle) {
        try {
            const titleService = new TitleGeneratorService();
            const title = await titleService.generateTitle(message, openai, model);
            return res.json({ type: 'title_generation', title: title });
        } catch (err) {
            console.error('Title generation route failed', err);
            return res.status(500).json({ error: 'Failed to generate title' });
        }
    }

    try {
        const result = await handleChatMessage(message, conversationHistory, tools);

        // Handle the new async response type
        if (result.type === 'async') {
            return res.status(202).json(result); // 202 Accepted
        }

        // Handle direct error response
        if (result.type === 'error') {
            return res.status(400).json({ output: result.message });
        }

        // Existing logic for synchronous LLM call
        const { systemPrompt, finalMessage } = result;

        const messages = [...conversationHistory];
        const systemPromptIndex = messages.findIndex(m => m.role === 'system');
        if (systemPromptIndex > -1) {
            messages[systemPromptIndex].content = systemPrompt;
        } else {
            messages.unshift({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: finalMessage });

        const completion = await getChatCompletion(messages);
        
        const llmContent = completion.choices[0].message.content;
        const cleanedContent = llmContent.replace(/<\｜begin of sentence\｜>/g, '').replace(/<\｜end of sentence\｜>/g, '');

        if (!cleanedContent || cleanedContent.trim() === '') {
            return res.json({ output: "I'm sorry, but I received an empty response from the model. Please try again." });
        }

        return res.json({
            output: cleanedContent,
            rawAdmetData: result.rawAdmetData
        });

    } catch (err) {
        console.error('Upstream request failed', err);
        return res.status(500).json({ error: String(err) });
    }
});

router.post('/compare', async (req, res) => {
    const { molecules, model, properties } = req.body;

    if (!molecules || !Array.isArray(molecules) || molecules.length < 2) {
        return res.status(400).json({ error: 'Request body must include an array of at least 2 molecules.' });
    }

    if (!properties || !Array.isArray(properties) || properties.length === 0) {
        return res.status(400).json({ error: 'Request body must include an array of properties to compare.' });
    }

    try {
        const result = await handleComparisonRequest(molecules, model, properties);

        // Handle the new async response type for comparisons
        if (result.type === 'async') {
            return res.status(202).json(result); // 202 Accepted
        }

        // Handle direct error response from the handler (e.g., no molecules could be resolved)
        if (result.type === 'error') {
            return res.status(400).json({ output: result.message });
        }

        // This part should ideally not be reached anymore as comparison is async.
        // Kept as a fallback in case of unexpected synchronous responses.
        return res.status(500).json({ error: 'An unexpected error occurred during the comparison request.' });

    } catch (err) {
        console.error('Comparison request failed', err);
        return res.status(500).json({ error: String(err) });
    }
});

// SMILES çıkarma endpoint'i - sadece molekül isminden SMILES formatını bulur
router.post('/extract-smiles', async (req, res) => {
    const { message, model } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Missing `message` in request body' });
    }

    try {
        const result = await extractSmilesOnly(message, model);
        
        if (result.success) {
            return res.json({
                success: true,
                smiles: result.smiles,
                chemicalName: result.chemicalName,
                message: result.message
            });
        } else {
            return res.json({
                success: false,
                message: result.message
            });
        }

    } catch (err) {
        console.error('SMILES extraction failed', err);
        return res.status(500).json({ 
            success: false,
            error: String(err) 
        });
    }
});

// PubChem özelliklerini SMILES ile getir
router.post('/pubchem-info', async (req, res) => {
    const { smiles } = req.body;
    if (!smiles) {
        return res.status(400).json({ success: false, error: 'Missing `smiles` in request body' });
    }
    try {
        const info = await getPubChemInfoBySmiles(smiles);
        if (!info) return res.json({ success: false, error: 'No record found in PubChem' });
        return res.json({ success: true, ...info });
    } catch (err) {
        console.error('PubChem info failed', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
});
export default router;
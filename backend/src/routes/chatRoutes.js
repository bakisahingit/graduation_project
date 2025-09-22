// src/routes/chatRoutes.js

import { Router } from 'express';
import { handleChatMessage, handleComparisonRequest } from '../handlers/chatHandler.js';
import { getChatCompletion } from '../services/llmService.js';

const router = Router();

router.post('/', async (req, res) => {
    const { message, conversationHistory = [], tools = {} } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Missing `message` in request body' });
    }

    try {
        const result = await handleChatMessage(message, conversationHistory, tools);

        // Check for a direct error response from the handler
        if (result.error) {
            return res.json({ output: result.error });
        }

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
        
        // Check if LLM returned empty content
        const llmContent = completion.choices[0].message.content;
        if (!llmContent || llmContent.trim() === '') {
            return res.json({ output: "I'm sorry, but I received an empty response from the model. Please try again." });
        }

        return res.json({ output: llmContent });

    } catch (err) {
        console.error('Upstream request failed', err);
        return res.status(500).json({ error: String(err) });
    }
});

router.post('/compare', async (req, res) => {
    const { molecules, model } = req.body;

    if (!molecules || !Array.isArray(molecules) || molecules.length < 2) {
        return res.status(400).json({ error: 'Request body must include an array of at least 2 molecules.' });
    }

    try {
        const result = await handleComparisonRequest(molecules, model);

        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        const { systemPrompt, finalMessage } = result;
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: finalMessage }
        ];

        const completion = await getChatCompletion(messages);
        
        const llmContent = completion.choices[0].message.content;
        if (!llmContent || llmContent.trim() === '') {
            return res.json({ output: "I'm sorry, but I received an empty response from the model. Please try again." });
        }

        return res.json({ output: llmContent });

    } catch (err) {
        console.error('Comparison request failed', err);
        return res.status(500).json({ error: String(err) });
    }
});

export default router;
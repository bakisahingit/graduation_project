/**
 * Backend Server
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// serve frontend from parent frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Normalize URL: remove trailing '/chat/completions' if user provided full endpoint
let rawUrl = process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1';
if (rawUrl.endsWith('/')) rawUrl = rawUrl.slice(0, -1);
// if someone provided the full completions path, strip it to the base API
rawUrl = rawUrl.replace(/\/chat\/completions\/?$/i, '');

const OPENROUTER_URL = rawUrl;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'openai/gpt-oss-20b:free';

if (!OPENROUTER_API_KEY) {
    console.warn('WARN: OPENROUTER_API_KEY not set. Requests will fail until configured.');
}

const openai = new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: OPENROUTER_URL,
    defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL || '',
        'X-Title': process.env.SITE_NAME || ''
    }
});

app.post('/api/chat', async (req, res) => {
    const message = req.body?.message;
    const model = req.body?.model || DEFAULT_MODEL;
    const conversationHistory = req.body?.conversationHistory || [];
    const tools = req.body?.tools || {};
    
    if (!message) return res.status(400).json({ error: 'Missing `message` in request body' });
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'Server not configured. Set OPENROUTER_API_KEY in env.' });
    }
    
    console.log('Chat request received:', { 
        message: message.substring(0, 100) + '...', 
        model, 
        tools,
        conversationLength: conversationHistory.length 
    });
    
    try {
        // Tools durumuna göre mesajı işle
        let processedMessage = message;
        let systemPrompt = null;
        
        if (tools.active === 'admed') {
            console.log('AdMed tool aktif - mesaj işleniyor...');
            processedMessage = `[AdMed Mode] ${message}`;
            systemPrompt = "Sen bir AdMed uzmanı asistanısın. Kullanıcının sorularını AdMed perspektifinden yanıtla. AdMed, tıbbi reklamlar ve ilaç promosyonları konusunda uzman bir sistemdir.";
            
            // AdMed service: const AdMedService = require('./admed/service');
        }
        
        // Mesaj listesini oluştur
        const messages = [...conversationHistory];
        
        // System prompt varsa ekle
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        
        // Kullanıcı mesajını ekle
        messages.push({ role: 'user', content: processedMessage });
        
        const completion = await openai.chat.completions.create({
            model,
            messages: messages
        });
        
        let finalResponse = completion;
        if (tools.active === 'admed') {
            console.log('AdMed response processing');
            // AdMed response processing: finalResponse = await admedService.processResponse(completion);
        }
        
        console.log('Response generated successfully');
        return res.json(finalResponse);
    } catch (err) {
        console.error('Upstream request failed', err);
        return res.status(500).json({ error: String(err) });
    }
});


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));




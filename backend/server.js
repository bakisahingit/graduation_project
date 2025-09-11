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
    
    if (!message) return res.status(400).json({ error: 'Missing `message` in request body' });
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'Server not configured. Set OPENROUTER_API_KEY in env.' });
    }
    
    try {
        // Geçmiş sohbetleri de dahil et
        const messages = [...conversationHistory, { role: 'user', content: message }];
        
        const completion = await openai.chat.completions.create({
            model,
            messages: messages
        });
        return res.json(completion);
    } catch (err) {
        console.error('Upstream request failed', err);
        return res.status(500).json({ error: String(err) });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));




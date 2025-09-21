// src/config/index.js

import dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axios';
import http from 'http';
import https from 'https';

// .env dosyasını projenin kök dizininden yükle
dotenv.config({ path: './.env' });

// Gerekli ortam değişkenlerini başlangıçta kontrol et
if (!process.env.OPENROUTER_API_KEY) {
    console.error("FATAL ERROR: OPENROUTER_API_KEY .env dosyasında tanımlı değil.");
    process.exit(1); // Hata varsa uygulamayı hemen durdur
}

// Merkezi Konfigürasyon nesnesi
export const config = {
    port: process.env.PORT || 3000,
    admetApiUrl: process.env.ADMET_API_URL || 'http://127.0.0.1:8000',
    llmModel: 'google/gemini-flash-1.5',
    siteUrl: process.env.SITE_URL || '',
    siteName: process.env.SITE_NAME || '',
    openrouterUrl: (process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '').replace(/\/chat\/completions\/?$/i, '')
};

// Önceden yapılandırılmış API istemcileri
export const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: config.openrouterUrl,
    defaultHeaders: {
        'HTTP-Referer': config.siteUrl,
        'X-Title': config.siteName
    }
});

export const httpClient = axios.create({
    timeout: 10000,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
    headers: { 'User-Agent': 'axios/1.6.8' }
});
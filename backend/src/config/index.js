// src/config/index.js

import dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axios';
import http from 'http';
import https from 'https';

// .env dosyasını projenin kök dizininden yükle
dotenv.config({ path: './.env' });

// Gerekli ortam değişkenlerini başlangıçta kontrol et
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY .env dosyasında tanımlı değil.");
    process.exit(1); // Hata varsa uygulamayı hemen durdur
}

// Merkezi Konfigürasyon nesnesi
export const config = {
    port: process.env.PORT || 3000,
    admetApiUrl: process.env.ADMET_API_URL || 'http://127.0.0.1:8000',
    llmModel: 'gemini-2.5-flash',  // Varsayılan Gemini model
    siteUrl: process.env.SITE_URL || '',
    siteName: process.env.SITE_NAME || '',
    // OpenRouter URL (backup)
    // openrouterUrl: (process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '').replace(/\/chat\/completions\/?$/i, '')
};

// Model mapping - Frontend model isimlerini Gemini model isimlerine çevir
export const modelMapping = {
    'AdmetGPT Fast': 'gemini-2.5-flash-lite',    // Hızlı model (Gemini 2.0)
    'AdmetGPT High': 'gemini-2.5-flash',    // Yüksek kalite model (Gemini 2.5)
};

// Varsayılan model
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

// Model ismini çözümle - frontend'den gelen ismi gerçek model ismine çevir
export function resolveModel(frontendModel) {
    if (!frontendModel) return DEFAULT_MODEL;
    return modelMapping[frontendModel] || DEFAULT_MODEL;
}

// Gemini API - OpenAI uyumlu endpoint
export const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

/* OpenRouter API (backup - yorum satırı olarak saklanıyor)
export const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: config.openrouterUrl,
    defaultHeaders: {
        'HTTP-Referer': config.siteUrl,
        'X-Title': config.siteName
    }
});
*/

export const httpClient = axios.create({
    timeout: 30000, // Increased timeout to 30 seconds for ADMET API calls
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
    headers: { 'User-Agent': 'axios/1.6.8' }
});
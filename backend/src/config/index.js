// src/config/index.js

import dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axios';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM için __dirname tanımla
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env dosyasını projenin kök dizininden yükle
dotenv.config({ path: './.env' });

// config.json dosyasını yükle
const configPath = path.resolve(__dirname, '../../config.json');
let appConfig;
try {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    appConfig = JSON.parse(configFile);
    console.log('✅ config.json yüklendi');
} catch (error) {
    console.error('❌ config.json yüklenemedi:', error.message);
    process.exit(1);
}

// Gerekli ortam değişkenlerini başlangıçta kontrol et
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY .env dosyasında tanımlı değil.");
    process.exit(1);
}

// Merkezi Konfigürasyon nesnesi
export const config = {
    port: process.env.PORT || 3000,
    admetApiUrl: process.env.ADMET_API_URL || 'http://127.0.0.1:8000',
    llmModel: appConfig.models.default,
    siteUrl: process.env.SITE_URL || '',
    siteName: process.env.SITE_NAME || '',
};

// Model mapping - config.json'dan yükle
export const modelMapping = appConfig.models.mapping;

// Varsayılan model - config.json'dan
const DEFAULT_MODEL = appConfig.models.default;

// Title generation modeli - config.json'dan
export const titleModel = appConfig.models.titleGeneration;

// Cache ayarları - config.json'dan
export const cacheConfig = appConfig.cache;

// Retry ayarları - config.json'dan
export const retryConfig = appConfig.retry;

// Title generator ayarları - config.json'dan
export const titleGeneratorConfig = appConfig.titleGenerator;

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

export const httpClient = axios.create({
    timeout: 30000,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
    headers: { 'User-Agent': 'axios/1.6.8' }
});
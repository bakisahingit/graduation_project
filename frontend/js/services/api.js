/**
 * API Service
 * Backend ile iletişim için API servisi
 */

import { config } from '../config.js';

export class ApiService {
    constructor() {
        this.baseUrl = config.api.baseUrl;
    }

    /**
     * Chat mesajı gönder
     * @param {string} message - Mesaj
     * @param {string} model - Model
     * @param {Array} conversationHistory - Konuşma geçmişi
     * @param {AbortSignal} signal - Abort signal
     * @param {string} activeTool - Aktif tool (null, 'ADMET', vs.)
     * @returns {Promise<any>}
     */
    async sendMessage(message, model, conversationHistory = [], signal = null, activeTool = null, admetProperties = null) {
        const requestBody = {
            message,
            model,
            conversationHistory
        };

        // Tools bilgisi varsa ekle
        if (activeTool) {
            requestBody.tools = {
                active: activeTool,
                properties: admetProperties || [] // Ensure properties is always an array
            };
        }

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        };

        if (signal) {
            requestOptions.signal = signal;
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat`, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request aborted');
            }
            throw error;
        }
    }

    /**
     * Başlık üret
     * @param {string} message - İlk mesaj
     * @param {string} model - Model (opsiyonel)
     * @returns {Promise<string>} - Üretilen başlık
     */
    async generateTitle(message, model = null) {
        const requestBody = {
            message,
            generateTitle: true // Başlık üretimi isteği
        };

        if (model) {
            requestBody.model = model;
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Başlık üretimi yanıtı kontrolü
            if (data.type === 'title_generation' && data.title) {
                return data.title;
            }

            // Fallback
            return 'Yeni Sohbet';

        } catch (error) {
            console.error('Title generation failed:', error);
            // Fallback: mesajın ilk kelimelerini kullan
            const words = message.split(' ').slice(0, 4);
            return words.join(' ') + (message.split(' ').length > 4 ? '...' : '');
        }
    }

    /**
     * Sends a comparison request for multiple molecules.
     * @param {string[]} molecules - Array of molecule names or SMILES.
     * @param {string} model - The selected LLM model.
     * @param {AbortSignal} signal - Abort signal.
     * @returns {Promise<any>}
     */
    async sendComparisonRequest(molecules, model, properties, signal = null) {
        const requestBody = {
            molecules,
            model,
            properties
        };

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        };

        if (signal) {
            requestOptions.signal = signal;
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/compare`, requestOptions);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request aborted');
            }
            throw error;
        }
    }

    /**
     * Resolve a chemical name to a SMILES string using PubChem PUG REST.
     * Returns the CanonicalSMILES string or null if not found.
     * This runs in the browser and uses the public PubChem REST API.
     * @param {string} name
     * @returns {Promise<string|null>}
     */
    async getSmilesFromName(name) {
        if (!name || typeof name !== 'string') return null;
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/CanonicalSMILES/JSON`;
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            const props = data?.PropertyTable?.Properties?.[0];
            if (props && (props.CanonicalSMILES || props.ConnectivitySMILES)) {
                return props.CanonicalSMILES || props.ConnectivitySMILES || null;
            }
            return null;
        } catch (e) {
            console.error('PubChem lookup failed for', name, e);
            return null;
        }
    }

    /**
     * Mevcut modelleri getir
     * @returns {Promise<Array>}
     */
    async fetchModels() {
        // Config'den model listesini döndür
        return config.models.list;
    }
}


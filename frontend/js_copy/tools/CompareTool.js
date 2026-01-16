/**
 * Compare Tool
 * Molekül karşılaştırma için özel işlemler
 */

import { DOMUtils } from '../core/dom.js';

export class CompareTool {
    constructor(apiService, conversationService, ui) {
        this.api = apiService;
        this.conversation = conversationService;
        this.ui = ui;

        // Callbacks
        this.onWebSocketSetup = null;
    }

    /**
     * WebSocket callback'ini ayarla
     * @param {Function} callback - WebSocket setup callback
     */
    setWebSocketCallback(callback) {
        this.onWebSocketSetup = callback;
    }

    /**
     * Karşılaştırma işlemini başlat
     * @param {string[]} molecules - Molekül listesi
     * @param {string} model - Model adı
     * @param {string[]} properties - Karşılaştırılacak özellikler
     */
    async processComparison(molecules, model, properties) {
        const userMessage = `Bu molekülleri şu özelliklere göre karşılaştır: ${properties.join(', ')} - ${molecules.join(', ')}`;

        // Konuşma yoksa oluştur
        if (!this.conversation.currentConversationId) {
            const conversation = this.conversation.createConversation(userMessage, model);
            this.conversation.setCurrentConversation(conversation.id);
        }

        // Kullanıcı mesajını ekle
        this.ui.appendMessage(userMessage, 'user');
        this.conversation.updateConversation(
            this.conversation.currentConversationId,
            { role: 'user', content: userMessage }
        );

        // UI'yi hazırla
        this.ui.setInputsEnabled(false);
        const typingEl = this.ui.showThinkingIndicator();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Streaming başlat
        if (window.app) {
            window.app.isStreaming = true;
        }
        this.ui.setStreamingState(true);

        try {
            const controller = new AbortController();
            this.ui.setAbortController(controller);

            const data = await this.api.sendComparisonRequest(
                molecules,
                model,
                properties,
                controller.signal
            );

            if (data.type === 'async') {
                // Asenkron görev başladı - WebSocket bağlantısı kur
                if (this.onWebSocketSetup) {
                    this.onWebSocketSetup(data.sessionId, typingEl);
                }
            } else {
                // Hata veya beklenmedik senkron cevap
                this.handleSyncResponse(typingEl, data);
            }
        } catch (err) {
            this.handleError(typingEl, err);
        }
    }

    /**
     * Senkron yanıtı işle
     * @param {HTMLElement} typingEl - Typing indicator
     * @param {object} data - API yanıtı
     */
    handleSyncResponse(typingEl, data) {
        this.ui.removeThinkingIndicator(typingEl);
        const errorMessage = data.output || data.message || 'Karşılaştırma başlatılırken bir hata oluştu.';
        this.ui.appendMessage(errorMessage, 'bot');
        this.resetState();
    }

    /**
     * Hata durumunu işle
     * @param {HTMLElement} typingEl - Typing indicator
     * @param {Error} err - Hata objesi
     */
    handleError(typingEl, err) {
        this.ui.removeThinkingIndicator(typingEl);

        if (err.name === 'AbortError' || err.message === 'Request aborted') {
            console.log('Comparison request was aborted by the user.');
            this.ui.appendMessage('Karşılaştırma isteği iptal edildi.', 'bot');
        } else {
            this.ui.appendMessage('Sunucu hatası: ' + String(err), 'bot');
        }

        this.resetState();
    }

    /**
     * Durumu sıfırla
     */
    resetState() {
        if (window.app) {
            window.app.isStreaming = false;
        }
        this.ui.setStreamingState(false);
        this.ui.setAbortController(null);
        this.ui.setInputsEnabled(true);
    }

    /**
     * Karşılaştırma sonuçlarını kontrol et
     * @param {object} rawData - Ham veri
     * @returns {boolean}
     */
    static isComparisonData(rawData) {
        return rawData &&
            rawData.successfulResults &&
            Array.isArray(rawData.successfulResults);
    }

    /**
     * Karşılaştırma sonuçlarından özet oluştur
     * @param {object} rawData - Ham karşılaştırma verisi
     * @returns {object} { moleculeCount, propertyCount, failedCount }
     */
    static getSummary(rawData) {
        if (!this.isComparisonData(rawData)) {
            return { moleculeCount: 0, propertyCount: 0, failedCount: 0 };
        }

        const moleculeCount = rawData.successfulResults.length;
        const failedCount = rawData.failedResults?.length || 0;

        // Tüm özellikleri topla
        const allProperties = new Set();
        rawData.successfulResults.forEach(mol => {
            mol.data.admetPredictions.forEach(p => allProperties.add(p.property));
        });

        return {
            moleculeCount,
            propertyCount: allProperties.size,
            failedCount
        };
    }

    /**
     * Başarısız analizleri al
     * @param {object} rawData - Ham veri
     * @returns {object[]}
     */
    static getFailedResults(rawData) {
        return rawData.failedResults || [];
    }

    /**
     * Molekül listesini al
     * @param {object} rawData - Ham veri
     * @returns {string[]}
     */
    static getMoleculeNames(rawData) {
        if (!this.isComparisonData(rawData)) return [];

        return rawData.successfulResults.map(
            mol => mol.data.moleculeName || mol.identifier
        );
    }

    /**
     * Belirli bir özellik için tüm moleküllerin değerlerini al
     * @param {object} rawData - Ham veri
     * @param {string} property - Özellik adı
     * @returns {object[]} [{molecule, value}]
     */
    static getPropertyValues(rawData, property) {
        if (!this.isComparisonData(rawData)) return [];

        const values = [];
        rawData.successfulResults.forEach(mol => {
            const name = mol.data.moleculeName || mol.identifier;
            const pred = mol.data.admetPredictions.find(p => p.property === property);
            values.push({
                molecule: name,
                value: pred ? pred.prediction : 'N/A'
            });
        });

        return values;
    }

    /**
     * Karşılaştırma verisini pivot tablo formatına dönüştür
     * @param {object} rawData - Ham veri
     * @returns {object} { headers: string[], rows: object[] }
     */
    static toPivotTable(rawData) {
        if (!this.isComparisonData(rawData)) {
            return { headers: [], rows: [] };
        }

        const moleculeNames = this.getMoleculeNames(rawData);
        const headers = ['Property', ...moleculeNames];

        // Tüm özellikleri topla
        const allProperties = new Set();
        rawData.successfulResults.forEach(mol => {
            mol.data.admetPredictions.forEach(p => allProperties.add(p.property));
        });
        const sortedProperties = Array.from(allProperties).sort();

        // Veri haritası oluştur
        const dataMap = new Map();
        rawData.successfulResults.forEach(mol => {
            const name = mol.data.moleculeName || mol.identifier;
            const propMap = new Map();
            mol.data.admetPredictions.forEach(p => propMap.set(p.property, p.prediction));
            dataMap.set(name, propMap);
        });

        // Satırları oluştur
        const rows = sortedProperties.map(prop => {
            const row = { property: prop };
            moleculeNames.forEach(name => {
                row[name] = dataMap.get(name)?.get(prop) || 'N/A';
            });
            return row;
        });

        return { headers, rows };
    }
}

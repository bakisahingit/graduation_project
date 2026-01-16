/**
 * ADMET Tool
 * ADMET analizi için özel işlemler ve utility fonksiyonları
 */

import { DOMUtils } from '../core/dom.js';

export class AdmetTool {
    constructor(apiService, conversationService) {
        this.api = apiService;
        this.conversation = conversationService;
        this.selectedProperties = [];
        this.isActive = false;
    }

    /**
     * Tool'u aktif et
     * @param {string[]} properties - Seçili ADMET özellikleri
     */
    activate(properties = []) {
        this.isActive = true;
        this.selectedProperties = properties;
    }

    /**
     * Tool'u deaktif et
     */
    deactivate() {
        this.isActive = false;
        this.selectedProperties = [];
    }

    /**
     * Aktif mi kontrol et
     * @returns {boolean}
     */
    isToolActive() {
        return this.isActive;
    }

    /**
     * Seçili özellikleri al
     * @returns {string[]}
     */
    getSelectedProperties() {
        return this.selectedProperties;
    }

    /**
     * Seçili özellikleri güncelle
     * @param {string[]} properties - Özellikler
     */
    setSelectedProperties(properties) {
        this.selectedProperties = properties;
    }

    /**
     * DOM'dan seçili özellikleri al
     * @returns {string[]}
     */
    getPropertiesFromDOM() {
        const checkboxes = document.querySelectorAll('input[name="admet_param"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /**
     * ADMET analizi için mesaj gönder
     * @param {string} smiles - SMILES formatında molekül
     * @param {string} model - Model adı
     * @param {AbortSignal} signal - Abort signal
     * @returns {Promise<object>}
     */
    async sendAnalysisRequest(smiles, model, signal = null) {
        return await this.api.sendMessage(
            smiles,
            model,
            [],
            signal,
            'admet',
            this.selectedProperties
        );
    }

    /**
     * SMILES'ı PubChem'den çözümle
     * @param {string} name - Molekül adı
     * @returns {Promise<string|null>}
     */
    async resolveSmilesFromName(name) {
        return await this.api.getSmilesFromName(name);
    }

    /**
     * Mesajın ADMET verisi içerip içermediğini kontrol et
     * @param {HTMLElement} messageElement - Mesaj elementi
     * @returns {boolean}
     */
    static hasAdmetData(messageElement) {
        return messageElement.querySelector('#admet-raw-data') !== null;
    }

    /**
     * Mesajdan ADMET raw verisini al
     * @param {HTMLElement} messageElement - Mesaj elementi
     * @returns {object|null}
     */
    static getAdmetData(messageElement) {
        const rawDataScript = messageElement.querySelector('#admet-raw-data');
        if (!rawDataScript) return null;

        try {
            return JSON.parse(rawDataScript.textContent);
        } catch (e) {
            console.error('Failed to parse ADMET data:', e);
            return null;
        }
    }

    /**
     * ADMET tahminlerini formatlı string'e dönüştür
     * @param {object[]} predictions - Tahmin dizisi [{property, prediction}]
     * @returns {string}
     */
    static formatPredictions(predictions) {
        if (!predictions || !predictions.length) return '';

        return predictions.map(p => `${p.property}: ${p.prediction}`).join('\n');
    }

    /**
     * Risk seviyesini belirle (0-1 arası değer için)
     * @param {number} value - Risk değeri
     * @returns {'low'|'medium'|'high'}
     */
    static getRiskLevel(value) {
        if (value < 0.3) return 'low';
        if (value < 0.7) return 'medium';
        return 'high';
    }

    /**
     * Varsayılan ADMET özelliklerini al
     * @returns {string[]}
     */
    static getDefaultProperties() {
        return [
            'Hepatotoxicity',
            'hERG Inhibition',
            'CYP2D6 Inhibition',
            'CYP3A4 Inhibition',
            'BBB Penetration',
            'Bioavailability',
            'Solubility',
            'Plasma Protein Binding'
        ];
    }

    /**
     * ADMET özellik kategorilerini al
     * @returns {object}
     */
    static getPropertyCategories() {
        return {
            'Absorption': [
                'Caco-2 Permeability',
                'HIA (Human Intestinal Absorption)',
                'Bioavailability',
                'P-glycoprotein Substrate'
            ],
            'Distribution': [
                'BBB Penetration',
                'Plasma Protein Binding',
                'VDss (Volume of Distribution)'
            ],
            'Metabolism': [
                'CYP1A2 Inhibition',
                'CYP2C19 Inhibition',
                'CYP2C9 Inhibition',
                'CYP2D6 Inhibition',
                'CYP3A4 Inhibition'
            ],
            'Excretion': [
                'Half-life',
                'Clearance'
            ],
            'Toxicity': [
                'Hepatotoxicity',
                'hERG Inhibition',
                'AMES Mutagenicity',
                'Carcinogenicity',
                'Skin Sensitization'
            ]
        };
    }
}

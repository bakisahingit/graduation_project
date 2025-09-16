/**
 * Model Service
 * Model yönetimi için servis
 */

import { StorageUtils } from '../utils/storage.js';
import { ApiService } from './api.js';

export class ModelService {
    constructor() {
        this.apiService = new ApiService();
        this.activeModels = new Set();
        this.loadActiveModels();
    }

    /**
     * Aktif modelleri yükle
     */
    loadActiveModels() {
        this.activeModels = StorageUtils.loadActiveModels();
        
        // Eğer hiç aktif model yoksa, varsayılan modelleri aktif et
        if (this.activeModels.size === 0) {
            const defaultModels = [
                "deepseek/deepseek-chat-v3.1:free",
                "openai/gpt-oss-20b:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "google/gemini-2.0-flash-exp:free"
            ];
            defaultModels.forEach(model => this.activeModels.add(model));
            this.saveActiveModels();
        }
    }

    /**
     * Aktif modelleri kaydet
     */
    saveActiveModels() {
        StorageUtils.saveActiveModels(this.activeModels);
    }

    /**
     * Tüm modelleri getir
     * @returns {Promise<Array>}
     */
    async getAllModels() {
        return await this.apiService.fetchModels();
    }

    /**
     * Aktif modelleri getir
     * @returns {Promise<Array>}
     */
    async getActiveModels() {
        const allModels = await this.getAllModels();
        return allModels.filter(model => this.activeModels.has(model));
    }

    /**
     * Modeli aktif et
     * @param {string} model - Model adı
     */
    activateModel(model) {
        this.activeModels.add(model);
        this.saveActiveModels();
    }

    /**
     * Modeli deaktif et
     * @param {string} model - Model adı
     */
    deactivateModel(model) {
        this.activeModels.delete(model);
        this.saveActiveModels();
    }

    /**
     * Model durumunu toggle et
     * @param {string} model - Model adı
     * @returns {boolean} - Yeni durum (aktif mi)
     */
    toggleModel(model) {
        if (this.activeModels.has(model)) {
            this.deactivateModel(model);
            return false;
        } else {
            this.activateModel(model);
            return true;
        }
    }

    /**
     * Model aktif mi kontrol et
     * @param {string} model - Model adı
     * @returns {boolean}
     */
    isModelActive(model) {
        return this.activeModels.has(model);
    }

    /**
     * İlk aktif modeli getir
     * @returns {Promise<string|null>}
     */
    async getFirstActiveModel() {
        const activeModels = await this.getActiveModels();
        return activeModels.length > 0 ? activeModels[0] : null;
    }
}


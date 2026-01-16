/**
 * Model Service
 * Model yönetimi için servis
 */

import { StorageUtils } from '../core/storage.js';
import { ApiService } from './ApiService.js';
import { config } from '../config.js';

export class ModelService {
    constructor() {
        this.apiService = new ApiService();
        this.activeModels = new Set();
        this.loadActiveModels();
    }

    /**
     * Modelleri yükle (API'den çek)
     */
    async loadModels() {
        try {
            const models = await this.apiService.fetchModels();
            // Default active models logic is already in loadActiveModels
            return models;
        } catch (error) {
            console.error('Failed to load models:', error);
            return [];
        }
    }

    /**
     * Aktif modelleri yükle (Local Storage)
     */
    loadActiveModels() {
        this.activeModels = StorageUtils.loadActiveModels();

        // Eğer hiç aktif model yoksa, varsayılan modelleri aktif et
        if (this.activeModels.size === 0) {
            const defaultModels = config.models.list;
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

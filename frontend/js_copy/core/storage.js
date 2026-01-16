/**
 * Storage Utilities
 * LocalStorage ile çalışmak için yardımcı fonksiyonlar
 */

export class StorageUtils {
    /**
     * LocalStorage'a veri kaydet
     * @param {string} key - Anahtar
     * @param {any} data - Veri
     */
    static set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Storage save error:', error);
        }
    }

    /**
     * LocalStorage'dan veri oku
     * @param {string} key - Anahtar
     * @param {any} defaultValue - Varsayılan değer
     * @returns {any}
     */
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage read error:', error);
            return defaultValue;
        }
    }

    /**
     * LocalStorage'dan veri sil
     * @param {string} key - Anahtar
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    }

    /**
     * LocalStorage'ı temizle
     */
    static clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Storage clear error:', error);
        }
    }

    /**
     * Konuşma geçmişini kaydet
     * @param {Array} conversations - Konuşma listesi
     */
    static saveConversationHistory(conversations) {
        this.set('conversationHistory', conversations);
    }

    /**
     * Konuşma geçmişini yükle
     * @returns {Array}
     */
    static loadConversationHistory() {
        const saved = this.get('conversationHistory', []);
        // Date stringlerini Date objelerine çevir
        return saved.map(conv => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt)
        }));
    }

    /**
     * Aktif modelleri kaydet
     * @param {Set} activeModels - Aktif model seti
     */
    static saveActiveModels(activeModels) {
        this.set('activeModels', Array.from(activeModels));
    }

    /**
     * Aktif modelleri yükle
     * @returns {Set}
     */
    static loadActiveModels() {
        const saved = this.get('activeModels', []);
        return new Set(saved);
    }
}

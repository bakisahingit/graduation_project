/**
 * State Manager
 * Uygulama state'ini merkezi olarak yönetir
 */

export class StateManager {
    constructor() {
        // Uygulama state'i
        this.state = {
            isStreaming: false,
            userScrolledUp: false,
            currentStreamController: null,
            activeTool: null, // null, 'admet', 'compare'
            lastPubChemSmiles: null,
            currentConversationId: null,
            selectedModel: null
        };

        // State değişikliği dinleyicileri
        this.listeners = new Map();
    }

    /**
     * State değerini al
     * @param {string} key - State anahtarı
     * @returns {any} State değeri
     */
    get(key) {
        return this.state[key];
    }

    /**
     * State değerini güncelle
     * @param {string} key - State anahtarı
     * @param {any} value - Yeni değer
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;

        // Değişiklik olduysa listener'ları bilgilendir
        if (oldValue !== value) {
            this.notify(key, value, oldValue);
        }
    }

    /**
     * Birden fazla state değerini güncelle
     * @param {Object} updates - Güncellenecek state değerleri
     */
    update(updates) {
        Object.keys(updates).forEach(key => {
            this.set(key, updates[key]);
        });
    }

    /**
     * State değişikliği dinleyicisi ekle
     * @param {string} key - İzlenecek state anahtarı
     * @param {Function} callback - Değişiklik olduğunda çağrılacak fonksiyon
     * @returns {Function} Dinleyiciyi kaldırma fonksiyonu
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        this.listeners.get(key).add(callback);

        // Unsubscribe fonksiyonu döndür
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
            }
        };
    }

    /**
     * Listener'ları bilgilendir
     * @private
     */
    notify(key, newValue, oldValue) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error(`Error in state listener for ${key}:`, error);
                }
            });
        }
    }

    /**
     * Streaming state'ini yönet
     */
    setStreaming(isStreaming, controller = null) {
        this.set('isStreaming', isStreaming);
        if (controller !== null) {
            this.set('currentStreamController', controller);
        }
    }

    /**
     * Active tool'u ayarla
     */
    setActiveTool(tool) {
        this.set('activeTool', tool);
    }

    /**
     * User scroll pozisyonunu takip et
     */
    setUserScrolledUp(scrolledUp) {
        this.set('userScrolledUp', scrolledUp);
    }

    /**
     * Current conversation ID'yi ayarla
     */
    setCurrentConversation(conversationId) {
        this.set('currentConversationId', conversationId);
    }

    /**
     * Selected model'i ayarla
     */
    setSelectedModel(model) {
        this.set('selectedModel', model);
    }

    /**
     * Tüm state'i sıfırla (logout gibi durumlarda)
     */
    reset() {
        this.state = {
            isStreaming: false,
            userScrolledUp: false,
            currentStreamController: null,
            activeTool: null,
            lastPubChemSmiles: null,
            currentConversationId: null,
            selectedModel: null
        };

        // Tüm listener'ları bilgilendir
        Object.keys(this.state).forEach(key => {
            this.notify(key, this.state[key], undefined);
        });
    }

    /**
     * Debug için tüm state'i göster
     */
    getAll() {
        return { ...this.state };
    }
}

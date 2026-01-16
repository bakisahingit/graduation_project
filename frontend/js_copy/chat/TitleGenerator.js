/**
 * Title Generator
 * Konuşma başlığı otomatik üretimi
 */

export class TitleGenerator {
    constructor(apiService, conversationService) {
        this.api = apiService;
        this.conversation = conversationService;

        // Loading durumundaki başlıklar
        this.loadingTitles = new Set();

        // UI update callback
        this.onTitleUpdated = null;
    }

    /**
     * UI update callback'ini ayarla
     * @param {Function} callback - (conversationId, newTitle, isLoading) => void
     */
    setUpdateCallback(callback) {
        this.onTitleUpdated = callback;
    }

    /**
     * Başlık üretimini asenkron olarak başlat
     * @param {string} conversationId - Konuşma ID'si
     * @param {string} firstMessage - İlk mesaj
     * @param {string} model - Model adı
     */
    async generateTitle(conversationId, firstMessage, model) {
        // Loading durumunu başlat
        this.loadingTitles.add(conversationId);

        // UI'yi güncelle (loading durumu)
        console.log('Starting title generation for:', conversationId);
        this.notifyUpdate(conversationId, null, true);

        try {
            const generatedTitle = await this.api.generateTitle(firstMessage, model);

            // Konuşmayı güncelle
            const conversation = this.conversation.getAllConversations()
                .find(c => c.id === conversationId);

            if (conversation) {
                conversation.title = generatedTitle;
                this.conversation.saveConversations();
                console.log('Otomatik başlık üretildi:', generatedTitle);

                // Loading durumunu kaldır
                this.loadingTitles.delete(conversationId);

                // UI'yi güncelle (final başlık)
                this.notifyUpdate(conversationId, generatedTitle, false);
            }
        } catch (error) {
            console.error('Başlık üretimi başarısız:', error);

            // Loading durumunu kaldır
            this.loadingTitles.delete(conversationId);

            // UI'yi güncelle (hata durumu - başlık değişmez)
            this.notifyUpdate(conversationId, null, false);
        }
    }

    /**
     * UI update bildirim
     * @param {string} conversationId - Konuşma ID'si
     * @param {string|null} newTitle - Yeni başlık
     * @param {boolean} isLoading - Loading durumu
     */
    notifyUpdate(conversationId, newTitle, isLoading) {
        if (this.onTitleUpdated) {
            this.onTitleUpdated(conversationId, newTitle, isLoading);
        }
    }

    /**
     * Başlık üretiliyor mu kontrol et
     * @param {string} conversationId - Konuşma ID'si
     * @returns {boolean}
     */
    isGenerating(conversationId) {
        return this.loadingTitles.has(conversationId);
    }

    /**
     * Fallback başlık oluştur (ilk mesajdan)
     * @param {string} message - İlk mesaj
     * @param {number} maxWords - Maksimum kelime sayısı
     * @returns {string}
     */
    static createFallbackTitle(message, maxWords = 4) {
        const words = message.split(' ').slice(0, maxWords);
        const title = words.join(' ');
        return message.split(' ').length > maxWords ? title + '...' : title;
    }

    /**
     * Varsayılan başlık
     * @returns {string}
     */
    static getDefaultTitle() {
        return 'Yeni Sohbet';
    }
}

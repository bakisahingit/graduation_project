/**
 * Helper Utilities
 * Genel yardımcı fonksiyonlar
 */

export class HelperUtils {
    /**
     * Benzersiz ID oluştur
     * @returns {string}
     */
    static generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Konuşma ID'si oluştur
     * @returns {string}
     */
    static generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Tarih formatla
     * @param {Date} date - Formatlanacak tarih
     * @returns {string}
     */
    static formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Şimdi';
        if (minutes < 60) return `${minutes} dk önce`;
        if (hours < 24) return `${hours} saat önce`;
        if (days < 7) return `${days} gün önce`;
        return date.toLocaleDateString('tr-TR');
    }

    /**
     * API yanıtından metin çıkar
     * @param {any} data - API yanıtı
     * @returns {string}
     */
    static extractTextFromResponse(data) {
        if (data?.choices && data.choices[0]?.message?.content) return data.choices[0].message.content;
        if (typeof data === 'string') return data;
        if (data?.output) return data.output;
        return JSON.stringify(data);
    }

    /**
     * Debounce fonksiyonu
     * @param {Function} func - Çalıştırılacak fonksiyon
     * @param {number} wait - Bekleme süresi (ms)
     * @returns {Function}
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle fonksiyonu
     * @param {Function} func - Çalıştırılacak fonksiyon
     * @param {number} limit - Limit süresi (ms)
     * @returns {Function}
     */
    static throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Rastgele gecikme ekle (jitter)
     * @param {number} baseDelay - Temel gecikme
     * @param {number} jitterRange - Jitter aralığı
     * @returns {number}
     */
    static addJitter(baseDelay, jitterRange = 0.05) {
        return baseDelay + (Math.random() * jitterRange);
    }

    /**
     * Kullanıcının scroll pozisyonunu kontrol et
     * @param {Element} container - Scroll container
     * @returns {boolean} - Alt kısımda mı
     */
    static isAtBottom(container) {
        return container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    }

    /**
     * Akıllı scroll - sadece kullanıcı manuel scroll yapmamışsa
     * @param {Element} container - Scroll container
     * @param {boolean} userScrolledUp - Kullanıcı yukarı scroll yaptı mı
     */
    static smartScroll(container, userScrolledUp) {
        if (!userScrolledUp) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

/**
 * DOM Utilities
 * DOM elementleri ile çalışmak için yardımcı fonksiyonlar
 */

export class DOMUtils {
    /**
     * Element seçici
     * @param {string} selector - CSS seçici
     * @param {Element} parent - Ana element (opsiyonel)
     * @returns {Element|null}
     */
    static select(selector, parent = document) {
        return parent.querySelector(selector);
    }

    /**
     * Çoklu element seçici
     * @param {string} selector - CSS seçici
     * @param {Element} parent - Ana element (opsiyonel)
     * @returns {NodeList}
     */
    static selectAll(selector, parent = document) {
        return parent.querySelectorAll(selector);
    }

    /**
     * Element oluşturucu
     * @param {string} tag - HTML etiketi
     * @param {Object} attributes - Özellikler
     * @param {string} content - İçerik
     * @returns {Element}
     */
    static create(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'value') {
                // Some elements (option, input, etc.) use the value property
                element.value = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        // If a content string was provided as the third arg, prefer it as textContent
        if (content) {
            element.textContent = content;
        }

        return element;
    }

    /**
     * Event listener ekleyici
     * @param {Element} element - Hedef element
     * @param {string} event - Event türü
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    static on(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
    }

    /**
     * Event listener kaldırıcı
     * @param {Element} element - Hedef element
     * @param {string} event - Event türü
     * @param {Function} handler - Event handler
     */
    static off(element, event, handler) {
        element.removeEventListener(event, handler);
    }

    /**
     * Class ekleyici
     * @param {Element} element - Hedef element
     * @param {string} className - Class adı
     */
    static addClass(element, className) {
        element.classList.add(className);
    }

    /**
     * Class kaldırıcı
     * @param {Element} element - Hedef element
     * @param {string} className - Class adı
     */
    static removeClass(element, className) {
        element.classList.remove(className);
    }

    /**
     * Class toggle
     * @param {Element} element - Hedef element
     * @param {string} className - Class adı
     */
    static toggleClass(element, className) {
        element.classList.toggle(className);
    }

    /**
     * Element görünürlük kontrolü
     * @param {Element} element - Hedef element
     * @param {boolean} show - Göster/gizle
     */
    static toggleVisibility(element, show) {
        element.style.display = show ? 'flex' : 'none';
    }

    /**
     * Textarea otomatik boyutlandırma
     * @param {HTMLTextAreaElement} textarea - Textarea elementi
     */
    static autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const maxHeight = 120;
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = newHeight + 'px';
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }

    /**
     * HTML escape
     * @param {string} str - Escape edilecek string
     * @returns {string}
     */
    static escapeHtml(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * URL sanitizer
     * @param {string} url - Sanitize edilecek URL
     * @returns {string}
     */
    static sanitizeUrl(url) {
        try {
            const u = url.trim();
            if (/^(https?:|mailto:)/i.test(u)) return u;
        } catch (e) { }
        return '#';
    }
}

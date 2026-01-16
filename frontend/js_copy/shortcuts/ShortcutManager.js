/**
 * Shortcut Manager
 * Klavye kısayolları yönetimi
 */

import { DOMUtils } from '../core/dom.js';

export class ShortcutManager {
    constructor() {
        // Kayıtlı kısayollar
        this.shortcuts = new Map();

        // Event listener referansı (cleanup için)
        this.keydownHandler = null;

        // Aktif mi?
        this.isEnabled = true;
    }

    /**
     * Shortcut sistemini başlat
     */
    init() {
        this.bindKeydownListener();
        this.registerDefaultShortcuts();
    }

    /**
     * Keydown listener'ı bağla
     */
    bindKeydownListener() {
        this.keydownHandler = (e) => this.handleKeydown(e);
        document.addEventListener('keydown', this.keydownHandler);
    }

    /**
     * Keydown event handler
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeydown(e) {
        if (!this.isEnabled) return;

        // Input/textarea içindeyse bazı kısayolları devre dışı bırak
        const isInInput = this.isInputFocused();

        // Kısayol key'ini oluştur
        const key = this.createShortcutKey(e);

        // Kayıtlı kısayolu bul
        const shortcut = this.shortcuts.get(key);

        if (shortcut) {
            // Input içinde çalışmaması gereken kısayolları kontrol et
            if (isInInput && !shortcut.allowInInput) {
                return;
            }

            e.preventDefault();
            shortcut.handler(e);
        }
    }

    /**
     * Kısayol key'i oluştur
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {string} Kısayol key'i (örn: "ctrl+k", "escape")
     */
    createShortcutKey(e) {
        const parts = [];

        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');

        // Key normalleştir
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'space';
        if (key === 'escape') key = 'esc';

        parts.push(key);

        return parts.join('+');
    }

    /**
     * Kısayol kaydet
     * @param {string} key - Kısayol key'i (örn: "ctrl+k", "esc")
     * @param {Function} handler - Handler fonksiyonu
     * @param {object} options - { description, allowInInput }
     */
    register(key, handler, options = {}) {
        this.shortcuts.set(key.toLowerCase(), {
            handler,
            description: options.description || '',
            allowInInput: options.allowInInput || false
        });
    }

    /**
     * Kısayolu kaldır
     * @param {string} key - Kısayol key'i
     */
    unregister(key) {
        this.shortcuts.delete(key.toLowerCase());
    }

    /**
     * Varsayılan kısayolları kaydet
     */
    registerDefaultShortcuts() {
        // ESC - Modal kapat
        this.register('esc', () => {
            this.triggerEvent('escape');
        }, { description: 'Modal kapat', allowInInput: true });

        // Ctrl+K - Arama
        this.register('ctrl+k', () => {
            this.triggerEvent('search');
        }, { description: 'Arama' });

        // Ctrl+N - Yeni sohbet
        this.register('ctrl+n', () => {
            this.triggerEvent('newChat');
        }, { description: 'Yeni sohbet' });

        // Ctrl+Enter - Mesaj gönder (input içinde)
        this.register('ctrl+enter', () => {
            this.triggerEvent('sendMessage');
        }, { description: 'Mesaj gönder', allowInInput: true });

        // Ctrl+/ - Kısayolları göster
        this.register('ctrl+/', () => {
            this.triggerEvent('showShortcuts');
        }, { description: 'Kısayolları göster' });

        // Ctrl+Shift+T - Tema değiştir
        this.register('ctrl+shift+t', () => {
            this.triggerEvent('toggleTheme');
        }, { description: 'Tema değiştir' });
    }

    /**
     * Custom event tetikle
     * @param {string} eventName - Event adı
     * @param {object} detail - Event detayları
     */
    triggerEvent(eventName, detail = {}) {
        const event = new CustomEvent(`shortcut:${eventName}`, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Shortcut event'ini dinle
     * @param {string} eventName - Event adı
     * @param {Function} handler - Handler fonksiyonu
     */
    on(eventName, handler) {
        document.addEventListener(`shortcut:${eventName}`, handler);
    }

    /**
     * Shortcut event listener'ını kaldır
     * @param {string} eventName - Event adı
     * @param {Function} handler - Handler fonksiyonu
     */
    off(eventName, handler) {
        document.removeEventListener(`shortcut:${eventName}`, handler);
    }

    /**
     * Input alanı aktif mi kontrol et
     * @returns {boolean}
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        if (!activeElement) return false;

        const tagName = activeElement.tagName.toLowerCase();
        return tagName === 'input' ||
            tagName === 'textarea' ||
            activeElement.isContentEditable;
    }

    /**
     * Kısayolları etkinleştir
     */
    enable() {
        this.isEnabled = true;
    }

    /**
     * Kısayolları devre dışı bırak
     */
    disable() {
        this.isEnabled = false;
    }

    /**
     * Tüm kayıtlı kısayolları al
     * @returns {Array} Kısayol listesi
     */
    getAll() {
        const list = [];
        this.shortcuts.forEach((value, key) => {
            list.push({
                key,
                description: value.description,
                allowInInput: value.allowInInput
            });
        });
        return list;
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        this.shortcuts.clear();
    }
}

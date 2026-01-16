/**
 * Sidebar Manager
 * Sidebar ve model select işlemlerini yönetir
 */

import { DOMUtils } from '../../core/dom.js';

export class SidebarManager {
    constructor(ui, onSettingsOpen) {
        this.ui = ui;
        this.onSettingsOpen = onSettingsOpen;
    }

    /**
     * Sidebar custom select kurulumu
     */
    setupCustomSelect() {
        // Input wrapper model select - Welcome
        if (this.ui.elements.selectTriggerWelcome) {
            DOMUtils.on(this.ui.elements.selectTriggerWelcome, 'click', (e) => {
                e.stopPropagation();
                this.toggleInputSelect('welcome');
            });
        }

        // Input wrapper model select - Chat
        if (this.ui.elements.selectTriggerChat) {
            DOMUtils.on(this.ui.elements.selectTriggerChat, 'click', (e) => {
                e.stopPropagation();
                this.toggleInputSelect('chat');
            });
        }

        // Model Ekle butonları
        if (this.ui.elements.welcomeAddModelBtn) {
            DOMUtils.on(this.ui.elements.welcomeAddModelBtn, 'click', (e) => {
                e.stopPropagation();
                if (this.onSettingsOpen) this.onSettingsOpen();
            });
        }

        if (this.ui.elements.chatAddModelBtn) {
            DOMUtils.on(this.ui.elements.chatAddModelBtn, 'click', (e) => {
                e.stopPropagation();
                if (this.onSettingsOpen) this.onSettingsOpen();
            });
        }

        // Close dropdown when clicking outside
        DOMUtils.on(document, 'click', (e) => {
            if (this.ui.elements.customSelectWelcome && !this.ui.elements.customSelectWelcome.contains(e.target)) {
                this.closeInputSelect('welcome');
            }
            if (this.ui.elements.customSelectChat && !this.ui.elements.customSelectChat.contains(e.target)) {
                this.closeInputSelect('chat');
            }
        });
    }

    /**
     * Input select toggle
     * @param {string} mode - 'welcome' veya 'chat'
     */
    toggleInputSelect(mode) {
        if (mode === 'welcome') {
            this.ui.elements.customSelectWelcome?.classList.toggle('open');
        } else {
            this.ui.elements.customSelectChat?.classList.toggle('open');
        }
    }

    /**
     * Input select kapat
     * @param {string} mode - 'welcome' veya 'chat'
     */
    closeInputSelect(mode) {
        if (mode === 'welcome') {
            this.ui.elements.customSelectWelcome?.classList.remove('open');
        } else {
            this.ui.elements.customSelectChat?.classList.remove('open');
        }
    }

    /**
     * Sidebar select kapat (deprecated - artık input wrapper'da)
     */
    closeSidebarSelect() {
        // Legacy - artık kullanılmıyor
    }

    /**
     * Model seç
     * @param {string} mode - 'welcome' veya 'chat'
     * @param {string} value - Model değeri
     */
    selectModel(mode, value) {
        if (mode === 'welcome') {
            if (this.ui.elements.modelSelectWelcome) {
                this.ui.elements.modelSelectWelcome.value = value;
            }
            if (this.ui.elements.selectValueWelcome) {
                this.ui.elements.selectValueWelcome.textContent = value;
            }
            // Seçenekleri güncelle
            if (this.ui.elements.selectOptionsWelcome) {
                const options = this.ui.elements.selectOptionsWelcome.querySelectorAll('.select-option-input');
                options.forEach(option => {
                    if (option.dataset.value === value) {
                        DOMUtils.addClass(option, 'selected');
                    } else {
                        DOMUtils.removeClass(option, 'selected');
                    }
                });
            }
        } else {
            if (this.ui.elements.modelSelectChat) {
                this.ui.elements.modelSelectChat.value = value;
            }
            if (this.ui.elements.selectValueChat) {
                this.ui.elements.selectValueChat.textContent = value;
            }
            // Seçenekleri güncelle
            if (this.ui.elements.selectOptionsChat) {
                const options = this.ui.elements.selectOptionsChat.querySelectorAll('.select-option-input');
                options.forEach(option => {
                    if (option.dataset.value === value) {
                        DOMUtils.addClass(option, 'selected');
                    } else {
                        DOMUtils.removeClass(option, 'selected');
                    }
                });
            }
        }
        this.closeInputSelect(mode);
    }
}

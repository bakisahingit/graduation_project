/**
 * Form Handler
 * Form submit işlemlerini yönetir (Welcome ve Chat)
 */

import { DOMUtils } from '../utils/dom.js';

export class FormHandler {
    constructor(ui, processMessage, updateToolButtonState) {
        this.ui = ui;
        this.processMessage = processMessage;
        this.updateToolButtonState = updateToolButtonState;
    }

    /**
     * Welcome form submit handler
     */
    async handleWelcomeSubmit() {
        const text = this.ui.elements.welcomeInput.value.trim();
        if (!text) return;

        const selectedModel = this.ui.elements.modelSelectWelcome ? this.ui.elements.modelSelectWelcome.value : null;

        // Chat moduna geç
        this.ui.switchToChatMode(selectedModel);

        // Tool buton durumunu güncelle (chat moduna geçtikten sonra)
        if (this.updateToolButtonState) {
            this.updateToolButtonState();
        }

        // Mesajı işle
        await this.processMessage(text, selectedModel);
    }

    /**
     * Chat form submit handler
     */
    async handleChatSubmit() {
        const text = this.ui.elements.input.value.trim();
        if (!text) return;

        const model = this.ui.elements.modelSelectChat ? this.ui.elements.modelSelectChat.value : null;

        // Clear input and resize
        this.ui.elements.input.value = '';
        DOMUtils.autoResizeTextarea(this.ui.elements.input);

        await this.processMessage(text, model);
    }
}

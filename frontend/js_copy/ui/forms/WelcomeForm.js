/**
 * Welcome Form
 * Welcome ekranı form submit handler
 */

import { DOMUtils } from '../../core/dom.js';

export class WelcomeForm {
    constructor(ui, processMessage, updateToolButtonState) {
        this.ui = ui;
        this.processMessage = processMessage;
        this.updateToolButtonState = updateToolButtonState;
    }

    /**
     * Welcome form submit handler
     */
    async handleSubmit() {
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
}

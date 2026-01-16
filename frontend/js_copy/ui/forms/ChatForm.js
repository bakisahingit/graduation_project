/**
 * Chat Form
 * Chat ekranı form submit handler
 */

import { DOMUtils } from '../../core/dom.js';

export class ChatForm {
    constructor(ui, processMessage) {
        this.ui = ui;
        this.processMessage = processMessage;
    }

    /**
     * Chat form submit handler
     */
    async handleSubmit() {
        const text = this.ui.elements.input.value.trim();
        if (!text) return;

        const model = this.ui.elements.modelSelectChat ? this.ui.elements.modelSelectChat.value : null;

        // Clear input and resize
        this.ui.elements.input.value = '';
        DOMUtils.autoResizeTextarea(this.ui.elements.input);

        await this.processMessage(text, model);
    }
}

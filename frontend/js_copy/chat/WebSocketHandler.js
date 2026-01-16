/**
 * WebSocket Handler
 * Asenkron görevler için WebSocket bağlantı yönetimi
 */

import { DOMUtils } from '../core/dom.js';

export class WebSocketHandler {
    constructor(ui, conversationService, markdownRenderer) {
        this.ui = ui;
        this.conversation = conversationService;
        this.markdown = markdownRenderer;

        // Aktif WebSocket bağlantısı
        this.currentWebSocket = null;

        // Callbacks
        this.onChartRender = null;
        this.onExportButtons = null;
    }

    /**
     * Callback'leri ayarla
     * @param {object} callbacks - { onChartRender, onExportButtons }
     */
    setCallbacks(callbacks) {
        this.onChartRender = callbacks.onChartRender || null;
        this.onExportButtons = callbacks.onExportButtons || null;
    }

    /**
     * WebSocket bağlantısı kur
     * @param {string} sessionId - Session ID
     * @param {HTMLElement} placeholderEl - Placeholder element (typing indicator)
     * @param {Function} onComplete - Tamamlandığında çağrılacak callback
     */
    connect(sessionId, placeholderEl, onComplete = null) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}?sessionId=${sessionId}`;
        const ws = new WebSocket(wsUrl);

        this.currentWebSocket = ws;

        ws.onopen = () => {
            console.log(`WebSocket connection opened for session: ${sessionId}`);
        };

        ws.onmessage = async (event) => {
            console.log(`WebSocket message received for session: ${sessionId}`, event.data);
            await this.handleMessage(event.data, placeholderEl);
            ws.close();
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for session: ${sessionId}`, error);
            this.handleError(placeholderEl);
        };

        ws.onclose = () => {
            console.log(`WebSocket connection closed for session: ${sessionId}`);
            this.currentWebSocket = null;
            if (onComplete) onComplete();
        };

        // Abort controller ile WebSocket'i bağla
        this.setupAbortHandler(ws);
    }

    /**
     * WebSocket mesajını işle
     * @param {string} data - WebSocket mesaj verisi
     * @param {HTMLElement} placeholderEl - Placeholder element
     */
    async handleMessage(data, placeholderEl) {
        const result = JSON.parse(data);

        // Bot mesaj container'ı oluştur ve placeholder'ı değiştir
        const botMessageContainer = this.ui.createBotMessage();
        placeholderEl.replaceWith(botMessageContainer);
        const contentEl = botMessageContainer.querySelector('.message-content');

        if (result.status === 'success') {
            await this.handleSuccess(result, botMessageContainer, contentEl);
        } else {
            this.handleFailure(result, contentEl);
        }
    }

    /**
     * Başarılı yanıtı işle
     * @param {object} result - WebSocket sonucu
     * @param {HTMLElement} container - Bot mesaj container
     * @param {HTMLElement} contentEl - İçerik elementi
     */
    async handleSuccess(result, container, contentEl) {
        const reply = result.output || 'Analiz tamamlandı ancak sonuç boş.';
        const rawData = result.rawAdmetData || result.rawComparisonData;

        // Konuşmaya kaydet
        this.conversation.updateConversation(
            this.conversation.currentConversationId,
            { role: 'bot', content: reply },
            rawData
        );

        // Markdown typewrite
        await this.markdown.typeWriteMarkdown(contentEl, reply, 0.1, () => this.ui.smartScroll());

        // Raw data script ekle
        if (rawData) {
            const scriptEl = DOMUtils.create('script', {
                type: 'application/json',
                id: 'admet-raw-data',
                textContent: JSON.stringify(rawData)
            });
            container.appendChild(scriptEl);
        }

        // Syntax highlighting ve copy butonları
        this.markdown.applySyntaxHighlighting(contentEl);
        this.markdown.addCopyButtons(contentEl);

        // Chart ve export butonları
        if (this.onChartRender) this.onChartRender(contentEl);
        if (this.onExportButtons) this.onExportButtons(container);
    }

    /**
     * Başarısız yanıtı işle
     * @param {object} result - WebSocket sonucu
     * @param {HTMLElement} contentEl - İçerik elementi
     */
    handleFailure(result, contentEl) {
        const errorMessage = result.output || 'Analiz sırasında bilinmeyen bir hata oluştu.';

        this.conversation.updateConversation(
            this.conversation.currentConversationId,
            { role: 'bot', content: errorMessage }
        );

        contentEl.innerHTML = this.markdown.renderToHtml(`**Hata:** ${errorMessage}`);
    }

    /**
     * WebSocket hatasını işle
     * @param {HTMLElement} placeholderEl - Placeholder element
     */
    handleError(placeholderEl) {
        this.ui.removeThinkingIndicator(placeholderEl);
        this.ui.appendMessage('Sonuçlar alınırken bir bağlantı hatası oluştu.', 'bot');
    }

    /**
     * Abort handler'ı kur
     * @param {WebSocket} ws - WebSocket instance
     */
    setupAbortHandler(ws) {
        if (this.ui.currentStreamController) {
            this.ui.currentStreamController.signal.addEventListener('abort', () => {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            });
        }
    }

    /**
     * Aktif WebSocket bağlantısını kapat
     */
    close() {
        if (this.currentWebSocket) {
            if (this.currentWebSocket.readyState === WebSocket.OPEN ||
                this.currentWebSocket.readyState === WebSocket.CONNECTING) {
                this.currentWebSocket.close();
            }
            this.currentWebSocket = null;
        }
    }

    /**
     * Bağlantı açık mı kontrol et
     * @returns {boolean}
     */
    isConnected() {
        return this.currentWebSocket &&
            this.currentWebSocket.readyState === WebSocket.OPEN;
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.close();
    }
}

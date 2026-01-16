/**
 * Message Handler
 * Mesaj işleme, API çağrıları ve streaming yönetimi
 */

import { DOMUtils } from '../core/dom.js';
import { HelperUtils } from '../core/helpers.js';

export class MessageHandler {
    constructor(ui, markdownRenderer, conversationService, apiService) {
        this.ui = ui;
        this.markdown = markdownRenderer;
        this.conversation = conversationService;
        this.api = apiService;

        // Tool callbacks
        this.getActiveTool = () => null;
        this.getSelectedAdmetParameters = () => [];

        // WebSocket handler
        this.webSocketHandler = null;

        // Streaming state
        this.isStreaming = false;

        // Callbacks
        this.onChartRender = null;
        this.onExportButtons = null;
        this.onTitleUpdate = null;
    }

    /**
     * Tool callback'lerini ayarla
     * @param {Function} getActiveTool - Aktif tool callback
     * @param {Function} getSelectedAdmetParameters - Seçili ADMET parametreleri callback
     */
    setToolCallbacks(getActiveTool, getSelectedAdmetParameters) {
        this.getActiveTool = getActiveTool || (() => null);
        this.getSelectedAdmetParameters = getSelectedAdmetParameters || (() => []);
    }

    /**
     * WebSocket handler'ı ayarla
     * @param {WebSocketHandler} handler - WebSocket handler instance
     */
    setWebSocketHandler(handler) {
        this.webSocketHandler = handler;
    }

    /**
     * Render callback'lerini ayarla
     * @param {object} callbacks - { onChartRender, onExportButtons, onTitleUpdate }
     */
    setRenderCallbacks(callbacks) {
        this.onChartRender = callbacks.onChartRender || null;
        this.onExportButtons = callbacks.onExportButtons || null;
        this.onTitleUpdate = callbacks.onTitleUpdate || null;
    }

    /**
     * Mesajı işle
     * @param {string} text - Mesaj metni
     * @param {string} model - Model adı
     */
    async processMessage(text, model) {
        // Yeni konuşma oluştur (gerekirse)
        if (!this.conversation.currentConversationId) {
            const conversation = this.conversation.createConversationWithTempTitle(text, model);
            this.conversation.setCurrentConversation(conversation.id);

            // Başlık üretimini asenkron olarak başlat
            this.conversation.onTitleUpdated = (conversationId, newTitle, isLoading) => {
                if (this.onTitleUpdate) {
                    this.onTitleUpdate(conversationId, newTitle, isLoading);
                }
            };
            this.conversation.updateConversationTitleAsync(conversation.id, text, model);
        }

        // Kullanıcı mesajını ekle
        this.ui.appendMessage(text, 'user');

        // Kullanıcı mesajını konuşmaya kaydet
        this.conversation.updateConversation(
            this.conversation.currentConversationId,
            { role: 'user', content: text }
        );

        // UI'yi hazırla
        this.ui.setInputsEnabled(false);
        const typingEl = this.ui.showThinkingIndicator();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Streaming başlat
        this.startStreaming();

        try {
            const controller = new AbortController();
            this.ui.setAbortController(controller);

            // API çağrısı
            const data = await this.sendMessage(text, model, controller.signal);

            if (data.type === 'async') {
                // Asenkron görev - WebSocket bağlantısı kur
                console.log('🔄 Async task started, sessionId:', data.sessionId);
                this.handleAsyncResponse(data.sessionId, typingEl);
            } else {
                // Senkron yanıt
                console.log('✅ Sync response received');
                this.ui.removeThinkingIndicator(typingEl);
                await this.handleSyncResponse(data);
                this.resetStreamingState();
            }
        } catch (err) {
            this.ui.removeThinkingIndicator(typingEl);
            this.handleError(err);
            this.resetStreamingState();
        }
    }

    /**
     * Mesaj gönder
     * @param {string} text - Mesaj metni
     * @param {string} model - Model adı
     * @param {AbortSignal} signal - Abort signal
     * @returns {Promise<object>}
     */
    async sendMessage(text, model, signal) {
        const currentConversation = this.conversation.getCurrentConversation();
        const conversationHistory = currentConversation ? currentConversation.messages : [];

        // ADMET parametreleri
        let admetProperties = null;
        const activeTool = this.getActiveTool();
        if (activeTool === 'admet') {
            admetProperties = this.getSelectedAdmetParameters();
        }

        return await this.api.sendMessage(
            text,
            model,
            conversationHistory,
            signal,
            activeTool,
            admetProperties
        );
    }

    /**
     * Senkron yanıtı işle
     * @param {object} data - API yanıtı
     */
    async handleSyncResponse(data) {
        if (!this.isStreaming) return;

        const reply = HelperUtils.extractTextFromResponse(data) || 'Boş yanıt';
        console.log('📝 Reply extracted:', reply.substring(0, 100) + '...');

        // Konuşmaya kaydet
        this.conversation.updateConversation(
            this.conversation.currentConversationId,
            { role: 'bot', content: reply },
            data.rawAdmetData
        );

        // Bot mesajı oluştur
        const botMessageContainer = this.ui.createBotMessage();
        const contentEl = botMessageContainer.querySelector('.message-content');

        // Typewriter efekti
        await this.markdown.typeWriteMarkdown(contentEl, reply, 0.1, () => this.ui.smartScroll());

        // Raw data ekle
        if (data.rawAdmetData) {
            const scriptEl = DOMUtils.create('script', {
                type: 'application/json',
                id: 'admet-raw-data',
                textContent: JSON.stringify(data.rawAdmetData)
            });
            botMessageContainer.appendChild(scriptEl);
        }

        // Syntax highlighting ve copy butonları
        this.markdown.applySyntaxHighlighting(contentEl);
        this.markdown.addCopyButtons(contentEl);

        // Chart ve export butonları
        if (this.onChartRender) this.onChartRender(contentEl);
        if (this.onExportButtons) this.onExportButtons(botMessageContainer);
    }

    /**
     * Asenkron yanıtı işle (WebSocket)
     * @param {string} sessionId - Session ID
     * @param {HTMLElement} typingEl - Typing indicator element
     */
    handleAsyncResponse(sessionId, typingEl) {
        if (this.webSocketHandler) {
            this.webSocketHandler.connect(sessionId, typingEl, () => {
                this.resetStreamingState();
            });
        } else {
            console.error('WebSocket handler not set');
            this.ui.removeThinkingIndicator(typingEl);
            this.ui.appendMessage('WebSocket bağlantısı kurulamadı.', 'bot');
            this.resetStreamingState();
        }
    }

    /**
     * Hata işle
     * @param {Error} err - Hata objesi
     */
    handleError(err) {
        if (err.name === 'AbortError' || err.message === 'Request aborted') {
            console.log('Request was aborted by the user.');
            this.ui.appendMessage('İstek iptal edildi.', 'bot');
        } else {
            console.error('An error occurred:', err);
            this.ui.appendMessage('Sunucu hatası: ' + String(err), 'bot');
        }
    }

    /**
     * Streaming'i başlat
     */
    startStreaming() {
        this.isStreaming = true;
        this.ui.setStreamingState(true);

        // window.app.isStreaming kontrolü için
        if (window.app) {
            window.app.isStreaming = true;
        }
    }

    /**
     * Streaming state'ini sıfırla
     */
    resetStreamingState() {
        this.isStreaming = false;
        this.ui.setStreamingState(false);
        this.ui.setAbortController(null);
        this.ui.setInputsEnabled(true);

        if (window.app) {
            window.app.isStreaming = false;
        }
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.webSocketHandler) {
            this.webSocketHandler.cleanup();
        }
        this.resetStreamingState();
    }
}

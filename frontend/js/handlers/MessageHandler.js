/**
 * Message Handler
 * Mesaj işleme, WebSocket ve streaming logic'i yönetir
 */

import { DOMUtils } from '../utils/dom.js';
import { HelperUtils } from '../utils/helpers.js';

export class MessageHandler {
    constructor(ui, markdown, conversation, api, activeTool, getSelectedAdmetParameters) {
        this.ui = ui;
        this.markdown = markdown;
        this.conversation = conversation;
        this.api = api;

        // Active tool'u almak için callback
        this.getActiveTool = () => activeTool;
        this.getSelectedAdmetParameters = getSelectedAdmetParameters;

        // WebSocket bağlantısını takip et
        this.currentWebSocket = null;

        // Streaming state
        this.isStreaming = false;
    }

    /**
     * Mesaj işle
     * @param {string} text - Mesaj metni
     * @param {string} model - Model
     * @param {Function} renderAdmetChart - Chart render callback
     * @param {Function} addExportButtons - Export buttons callback
     * @param {Function} updateConversationTitleInUI - UI title update callback
     */
    async processMessage(text, model, renderAdmetChart, addExportButtons, updateConversationTitleInUI) {
        // Yeni konuşma oluştur (geçici başlık ile)
        if (!this.conversation.currentConversationId) {
            const conversation = this.conversation.createConversationWithTempTitle(text, model);
            this.conversation.setCurrentConversation(conversation.id);

            // Başlık üretimini asenkron olarak başlat
            // UI update callback'ini ayarla
            this.conversation.onTitleUpdated = (conversationId, newTitle, isLoading) => {
                if (updateConversationTitleInUI) {
                    updateConversationTitleInUI(conversationId, newTitle, isLoading);
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

        // Input'ları deaktif et
        this.ui.setInputsEnabled(false, true);

        // "Thinking" animasyonunu göster
        const typingEl = this.ui.showThinkingIndicator();
        await new Promise(resolve => setTimeout(resolve, 50));

        this.isStreaming = true;
        this.ui.setStreamingState(true);

        // CRITICAL: typeWriteMarkdown window.app.isStreaming kontrolü yapıyor!
        if (window.app) {
            window.app.isStreaming = true;
        }

        try {
            const controller = new AbortController();
            this.ui.setAbortController(controller);

            const currentConversation = this.conversation.getCurrentConversation();
            const conversationHistoryForAPI = currentConversation ? currentConversation.messages : [];

            // Get selected ADMET parameters if the tool is active
            let admetProperties = null;
            const activeTool = this.getActiveTool();
            if (activeTool === 'admet') {
                admetProperties = this.getSelectedAdmetParameters();
            }

            const data = await this.api.sendMessage(
                text,
                model,
                conversationHistoryForAPI,
                controller.signal,
                activeTool,
                admetProperties
            );

            if (data.type === 'async') {
                // ASENKRON GÖREV BAŞLADI
                console.log('🔄 Async task started, sessionId:', data.sessionId);
                this.setupWebSocket(data.sessionId, typingEl, renderAdmetChart, addExportButtons);
            } else {
                // SENKRON (NORMAL) CEVAP
                console.log('✅ Sync response received:', data);
                this.ui.removeThinkingIndicator(typingEl);

                if (this.isStreaming) {
                    const reply = HelperUtils.extractTextFromResponse(data) || 'Boş yanıt';
                    console.log('📝 Reply extracted:', reply.substring(0, 100) + '...');

                    this.conversation.updateConversation(
                        this.conversation.currentConversationId,
                        { role: 'bot', content: reply },
                        data.rawAdmetData
                    );

                    const botMessageContainer = this.ui.createBotMessage();
                    console.log('💬 Bot message container created');

                    const contentEl = botMessageContainer.querySelector('.message-content');
                    console.log('📄 Content element:', contentEl);

                    await this.markdown.typeWriteMarkdown(contentEl, reply, 0.1, () => this.ui.smartScroll());
                    console.log('✍️ TypeWrite completed');

                    if (data.rawAdmetData) {
                        const scriptEl = DOMUtils.create('script', {
                            type: 'application/json',
                            id: 'admet-raw-data',
                            textContent: JSON.stringify(data.rawAdmetData)
                        });
                        botMessageContainer.appendChild(scriptEl);
                    }

                    this.markdown.applySyntaxHighlighting(contentEl);
                    this.markdown.addCopyButtons(contentEl);
                    renderAdmetChart(contentEl);
                    addExportButtons(botMessageContainer);
                }

                // Senkron akış için durumu sıfırla
                this.resetStreamingState();
            }
        } catch (err) {
            this.ui.removeThinkingIndicator(typingEl);

            // AbortError'u veya özel "Request aborted" mesajını daha zarif bir şekilde işle
            if (err.name === 'AbortError' || err.message === 'Request aborted') {
                console.log('Request was aborted by the user.');
                this.ui.appendMessage('İstek iptal edildi.', 'bot');
            } else {
                console.error('An error occurred:', err);
                this.ui.appendMessage('Sunucu hatası: ' + String(err), 'bot');
            }

            // Hata durumunda durumu sıfırla
            this.resetStreamingState();
        }
    }

    /**
     * WebSocket kurulumu
     * @param {string} sessionId - Session ID
     * @param {Element} placeholderEl - Placeholder element
     * @param {Function} renderAdmetChart - Chart render callback
     * @param {Function} addExportButtons - Export buttons callback
     */
    setupWebSocket(sessionId, placeholderEl, renderAdmetChart, addExportButtons) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}?sessionId=${sessionId}`;
        const ws = new WebSocket(wsUrl);

        // Mevcut WebSocket'i takip et
        this.currentWebSocket = ws;

        ws.onopen = () => {
            console.log(`WebSocket connection opened for session: ${sessionId}`);
        };

        ws.onmessage = async (event) => {
            console.log(`WebSocket message received for session: ${sessionId}`, event.data);
            const result = JSON.parse(event.data);

            const botMessageContainer = this.ui.createBotMessage();
            placeholderEl.replaceWith(botMessageContainer);
            const contentEl = botMessageContainer.querySelector('.message-content');

            if (result.status === 'success') {
                const reply = result.output || 'Analiz tamamlandı ancak sonuç boş.';
                const rawData = result.rawAdmetData || result.rawComparisonData;

                this.conversation.updateConversation(
                    this.conversation.currentConversationId,
                    { role: 'bot', content: reply },
                    rawData
                );

                await this.markdown.typeWriteMarkdown(contentEl, reply, 0.1, () => this.ui.smartScroll());

                // Hem tekli analiz hem de karşılaştırma sonuçlarını kontrol et
                if (rawData) {
                    const scriptEl = DOMUtils.create('script', {
                        type: 'application/json',
                        id: 'admet-raw-data',
                        textContent: JSON.stringify(rawData)
                    });
                    botMessageContainer.appendChild(scriptEl);
                }

                this.markdown.applySyntaxHighlighting(contentEl);
                this.markdown.addCopyButtons(contentEl);
                renderAdmetChart(contentEl);
                addExportButtons(botMessageContainer);

            } else {
                const errorMessage = result.output || 'Analiz sırasında bilinmeyen bir hata oluştu.';
                this.conversation.updateConversation(
                    this.conversation.currentConversationId,
                    { role: 'bot', content: errorMessage }
                );
                contentEl.innerHTML = this.markdown.renderToHtml(`**Hata:** ${errorMessage}`);
            }

            ws.close();
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for session: ${sessionId}`, error);
            this.ui.removeThinkingIndicator(placeholderEl);
            this.ui.appendMessage('Sonuçlar alınırken bir bağlantı hatası oluştu.', 'bot');
            this.resetStreamingState();
        };

        ws.onclose = () => {
            console.log(`WebSocket connection closed for session: ${sessionId}`);
            this.resetStreamingState();
            this.currentWebSocket = null;
        };

        // Abort controller ile WebSocket'i bağla
        if (this.ui.abortController) {
            this.ui.abortController.signal.addEventListener('abort', () => {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            });
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

        // window.app.isStreaming'i de sıfırla
        if (window.app) {
            window.app.isStreaming = false;
        }
    }

    /**
     * WebSocket cleanup
     */
    cleanup() {
        if (this.currentWebSocket) {
            this.currentWebSocket.close();
            this.currentWebSocket = null;
        }
        this.resetStreamingState();
    }
}

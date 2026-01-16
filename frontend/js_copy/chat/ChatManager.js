/**
 * Chat Manager
 * Ana chat mantığı ve koordinasyonu
 */

import { DOMUtils } from '../core/dom.js';
import { MessageHandler } from './MessageHandler.js';
import { WebSocketHandler } from './WebSocketHandler.js';
import { TitleGenerator } from './TitleGenerator.js';

export class ChatManager {
    constructor(ui, apiService, conversationService, markdownRenderer) {
        this.ui = ui;
        this.api = apiService;
        this.conversation = conversationService;
        this.markdown = markdownRenderer;

        // Sub-handlers
        this.messageHandler = new MessageHandler(ui, markdownRenderer, conversationService, apiService);
        this.webSocketHandler = new WebSocketHandler(ui, conversationService, markdownRenderer);
        this.titleGenerator = new TitleGenerator(apiService, conversationService);

        // MessageHandler'a WebSocket handler'ı bağla
        this.messageHandler.setWebSocketHandler(this.webSocketHandler);

        // Attached files
        this.attachedFiles = [];

        // Streaming state (legacy support)
        this.isStreaming = false;
    }

    /**
     * Chat Manager'ı initialize et
     */
    init() {
        this.bindEvents();
        this.renderConversationHistory();
    }

    /**
     * Event listener'ları bağla
     */
    bindEvents() {
        // Welcome form submit
        if (this.ui.elements.welcomeForm) {
            DOMUtils.on(this.ui.elements.welcomeForm, 'submit', (e) => {
                e.preventDefault();
                this.handleWelcomeSubmit();
            });
        }

        // Chat form submit
        if (this.ui.elements.form) {
            DOMUtils.on(this.ui.elements.form, 'submit', (e) => {
                e.preventDefault();
                this.handleChatSubmit();
            });
        }

        // File input handlers
        this.setupFileInputs();
    }

    /**
     * File input'larını kur
     */
    setupFileInputs() {
        const fileInputs = [
            document.getElementById('file-input-welcome'),
            document.getElementById('file-input-chat')
        ];

        fileInputs.forEach(input => {
            if (input) {
                DOMUtils.on(input, 'change', (e) => this.handleFileUpload(e));
            }
        });
    }

    /**
     * Tool callback'lerini ayarla
     * @param {Function} getActiveTool - Aktif tool callback
     * @param {Function} getSelectedAdmetParameters - Seçili ADMET parametreleri callback
     */
    setToolCallbacks(getActiveTool, getSelectedAdmetParameters) {
        this.messageHandler.setToolCallbacks(getActiveTool, getSelectedAdmetParameters);
    }

    /**
     * Render callback'lerini ayarla
     * @param {object} callbacks - { onChartRender, onExportButtons, onTitleUpdate }
     */
    setRenderCallbacks(callbacks) {
        this.messageHandler.setRenderCallbacks(callbacks);
        this.webSocketHandler.setCallbacks({
            onChartRender: callbacks.onChartRender,
            onExportButtons: callbacks.onExportButtons
        });
    }

    /**
     * Welcome form submit handler
     */
    async handleWelcomeSubmit() {
        const text = this.ui.elements.welcomeInput.value.trim();
        if (!text) return;

        const selectedModel = this.ui.elements.modelSelectWelcome
            ? this.ui.elements.modelSelectWelcome.value
            : null;

        // Chat moduna geç
        this.ui.switchToChatMode(selectedModel);

        // Mesajı işle
        await this.processMessage(text, selectedModel);
    }

    /**
     * Chat form submit handler
     */
    async handleChatSubmit() {
        const text = this.ui.elements.input.value.trim();
        if (!text) return;

        const model = this.ui.elements.modelSelectChat
            ? this.ui.elements.modelSelectChat.value
            : null;

        // Input'u temizle
        this.ui.elements.input.value = '';
        DOMUtils.autoResizeTextarea(this.ui.elements.input);

        // Mesajı işle
        await this.processMessage(text, model);
    }

    /**
     * Mesajı işle (MessageHandler'a delegate et)
     * @param {string} text - Mesaj metni
     * @param {string} model - Model adı
     */
    async processMessage(text, model) {
        await this.messageHandler.processMessage(text, model);

        // Sidebar'ı güncelle
        this.renderConversationHistory();

        // Legacy state sync
        this.isStreaming = this.messageHandler.isStreaming;
    }

    /**
     * Dosya yükleme handler
     * @param {Event} event - Change event
     */
    handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            this.addFileChip(file);
        });

        // Input'u sıfırla
        event.target.value = '';
    }

    /**
     * Dosya chip'i ekle
     * @param {File} file - Dosya objesi
     */
    addFileChip(file) {
        this.attachedFiles.push(file);

        const chipContainer = document.querySelector('.file-chips-container');
        if (!chipContainer) return;

        const chip = DOMUtils.create('div', {
            className: 'file-chip'
        });
        chip.innerHTML = `
            <span class="file-chip-name">${DOMUtils.escapeHtml(file.name)}</span>
            <button class="file-chip-remove" title="Kaldır">&times;</button>
        `;

        const removeBtn = chip.querySelector('.file-chip-remove');
        DOMUtils.on(removeBtn, 'click', () => {
            this.attachedFiles = this.attachedFiles.filter(f => f !== file);
            chip.remove();
        });

        chipContainer.appendChild(chip);
    }

    /**
     * Dosya chip'lerini temizle
     */
    clearFileChips() {
        this.attachedFiles = [];
        const chipContainer = document.querySelector('.file-chips-container');
        if (chipContainer) {
            chipContainer.innerHTML = '';
        }
    }

    /**
     * Konuşma geçmişini render et
     */
    renderConversationHistory() {
        this.renderPinnedConversations();
        this.renderUnpinnedConversations();
    }

    /**
     * Pinli konuşmaları render et
     */
    renderPinnedConversations() {
        const pinnedList = document.getElementById('pinned-list');
        if (!pinnedList) return;

        pinnedList.innerHTML = '';
        const pinnedConversations = this.conversation.getPinnedConversations();

        pinnedConversations.forEach(conversation => {
            const historyItem = this.createHistoryItem(conversation);
            pinnedList.appendChild(historyItem);
        });

        // Pinli konuşma yoksa bölümü gizle
        const pinnedSection = document.getElementById('pinned-conversations');
        if (pinnedSection) {
            pinnedSection.style.display = pinnedConversations.length === 0 ? 'none' : 'flex';
        }
    }

    /**
     * Pinli olmayan konuşmaları render et
     */
    renderUnpinnedConversations() {
        if (!this.ui.elements.historyList) return;

        this.ui.elements.historyList.innerHTML = '';
        const unpinnedConversations = this.conversation.getUnpinnedConversations();

        unpinnedConversations.forEach(conversation => {
            const historyItem = this.createHistoryItem(conversation);
            this.ui.elements.historyList.appendChild(historyItem);
        });
    }

    /**
     * Konuşma öğesi oluştur
     * @param {object} conversation - Konuşma objesi
     * @param {boolean} isLoading - Loading durumu
     * @returns {HTMLElement}
     */
    createHistoryItem(conversation, isLoading = false) {
        const historyItem = DOMUtils.create('div', {
            className: 'panel-item history-item'
        });

        if (conversation.id === this.conversation.currentConversationId) {
            DOMUtils.addClass(historyItem, 'active');
        }

        const titleClass = isLoading ? 'history-item-title loading' : 'history-item-title';
        const titleText = isLoading ? 'Başlık üretiliyor, lütfen bekleyiniz...' : conversation.title;

        historyItem.innerHTML = `
            <div class="panel-item-text ${titleClass}">${titleText}</div>
            <input type="text" class="history-item-edit" value="${conversation.title}" data-conversation-id="${conversation.id}">
            <button class="history-item-menu" onclick="app.toggleConversationMenu(event, '${conversation.id}')">
                <img src="assets/ellipsis.svg" alt="Menu" class="ellipsis-icon">
            </button>
        `;

        DOMUtils.on(historyItem, 'click', (e) => {
            if (!e.target.classList.contains('history-item-menu') &&
                !e.target.classList.contains('ellipsis-icon')) {
                this.loadConversation(conversation.id);
            }
        });

        return historyItem;
    }

    /**
     * Konuşmayı yükle
     * @param {string} conversationId - Konuşma ID'si
     */
    loadConversation(conversationId) {
        const conversation = this.conversation.loadConversation(conversationId);
        if (!conversation) return;

        // UI'yi chat moduna geç
        this.ui.switchToChatMode(conversation.model);

        // Mesajları temizle ve yeniden render et
        this.ui.elements.messagesEl.innerHTML = '';

        conversation.messages.forEach(message => {
            if (message.role === 'user') {
                this.ui.appendMessage(message.content, 'user');
            } else {
                const botMessageContainer = this.ui.createBotMessage();
                const contentEl = botMessageContainer.querySelector('.message-content');
                contentEl.innerHTML = this.markdown.renderToHtml(message.content);
                this.markdown.applySyntaxHighlighting(contentEl);
                this.markdown.addCopyButtons(contentEl);
            }
        });

        // Aktif konuşmayı güncelle
        this.conversation.setCurrentConversation(conversationId);
        this.renderConversationHistory();
    }

    /**
     * Konuşma başlığını UI'da güncelle
     * @param {string} conversationId - Konuşma ID'si
     * @param {string|null} newTitle - Yeni başlık
     * @param {boolean} isLoading - Loading durumu
     */
    updateConversationTitleInUI(conversationId, newTitle, isLoading) {
        const historyItem = this.findHistoryItemById(conversationId);
        if (!historyItem) return;

        const titleElement = historyItem.querySelector('.history-item-title');
        const editInput = historyItem.querySelector('.history-item-edit');

        if (isLoading) {
            titleElement.textContent = 'Başlık üretiliyor, lütfen bekleyiniz...';
            titleElement.className = 'history-item-title loading';
        } else if (newTitle) {
            titleElement.textContent = newTitle;
            titleElement.className = 'history-item-title';
            editInput.value = newTitle;
        } else {
            titleElement.textContent = 'Yeni Sohbet';
            titleElement.className = 'history-item-title';
            editInput.value = 'Yeni Sohbet';
        }
    }

    /**
     * ID'ye göre history item bul
     * @param {string} conversationId - Konuşma ID'si
     * @returns {HTMLElement|null}
     */
    findHistoryItemById(conversationId) {
        const pinnedList = document.getElementById('pinned-list');
        const historyList = document.getElementById('history-list');

        if (!pinnedList || !historyList) return null;

        const allItems = [
            ...pinnedList.querySelectorAll('.history-item'),
            ...historyList.querySelectorAll('.history-item')
        ];

        return allItems.find(item => {
            const editInput = item.querySelector('.history-item-edit');
            return editInput && editInput.dataset.conversationId === conversationId;
        }) || null;
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.messageHandler.cleanup();
        this.webSocketHandler.cleanup();
    }
}

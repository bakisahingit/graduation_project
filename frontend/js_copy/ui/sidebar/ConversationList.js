/**
 * Conversation List
 * Konuşma geçmişi listesi render işlemleri
 */

import { DOMUtils } from '../../core/dom.js';

export class ConversationList {
    constructor(ui, conversationService, onLoadConversation) {
        this.ui = ui;
        this.conversationService = conversationService;
        this.onLoadConversation = onLoadConversation;
    }

    /**
     * Tüm konuşma geçmişini render et
     */
    render() {
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

        const pinnedConversations = this.conversationService.getPinnedConversations();
        pinnedConversations.forEach(conversation => {
            const historyItem = this.createHistoryItem(conversation);
            pinnedList.appendChild(historyItem);
        });

        // Pinli konuşma yoksa bölümü gizle
        const pinnedSection = document.getElementById('pinned-conversations');
        if (pinnedSection) {
            if (pinnedConversations.length === 0) {
                pinnedSection.style.display = 'none';
            } else {
                pinnedSection.style.display = 'flex';
            }
        }
    }

    /**
     * Pinli olmayan konuşmaları render et
     */
    renderUnpinnedConversations() {
        if (!this.ui.elements.historyList) return;

        this.ui.elements.historyList.innerHTML = '';

        const unpinnedConversations = this.conversationService.getUnpinnedConversations();
        unpinnedConversations.forEach(conversation => {
            const historyItem = this.createHistoryItem(conversation);
            this.ui.elements.historyList.appendChild(historyItem);
        });
    }

    /**
     * Konuşma öğesi oluştur
     * @param {Object} conversation - Konuşma objesi
     * @param {boolean} isLoading - Loading durumu
     * @returns {HTMLElement}
     */
    createHistoryItem(conversation, isLoading = false) {
        const historyItem = DOMUtils.create('div', {
            className: 'panel-item history-item'
        });

        if (conversation.id === this.conversationService.currentConversationId) {
            DOMUtils.addClass(historyItem, 'active');
        }

        // Loading durumuna göre title class'ını belirle
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
                if (this.onLoadConversation) {
                    this.onLoadConversation(conversation.id);
                }
            }
        });

        return historyItem;
    }

    /**
     * ID'ye göre konuşma öğesini bul
     * @param {string} conversationId - Konuşma ID'si
     * @returns {HTMLElement|null} - Konuşma öğesi
     */
    findHistoryItemById(conversationId) {
        // Hem pinned hem de normal listede ara
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
     * Konuşma başlığını UI'da güncelle
     * @param {string} conversationId - Konuşma ID'si
     * @param {string|null} newTitle - Yeni başlık (null ise loading veya hata)
     * @param {boolean} isLoading - Loading durumu
     */
    updateTitleInUI(conversationId, newTitle, isLoading) {
        console.log('updateTitleInUI called:', { conversationId, newTitle, isLoading });

        const historyItem = this.findHistoryItemById(conversationId);
        if (!historyItem) {
            console.log('History item not found for:', conversationId);
            return;
        }

        const titleElement = historyItem.querySelector('.history-item-title');
        const editInput = historyItem.querySelector('.history-item-edit');

        if (isLoading) {
            // Loading durumu - çok bulanık metin
            console.log('Setting loading state...');
            titleElement.textContent = 'Başlık üretiliyor, lütfen bekleyiniz...';
            titleElement.className = 'history-item-title loading';
        } else if (newTitle) {
            // Final başlık
            console.log('Setting final title:', newTitle);
            titleElement.textContent = newTitle;
            titleElement.className = 'history-item-title';
            editInput.value = newTitle;
        } else {
            // Hata durumu - başlığı "Yeni Sohbet" olarak bırak
            console.log('Setting fallback title');
            titleElement.textContent = 'Yeni Sohbet';
            titleElement.className = 'history-item-title';
            editInput.value = 'Yeni Sohbet';
        }
    }

    /**
     * Belirli bir konuşmayı aktif yap (highlight et)
     * @param {string} conversationId - Konuşma ID'si
     */
    setActiveConversation(conversationId) {
        // Önce tüm aktif class'ları kaldır
        const allItems = document.querySelectorAll('.history-item');
        allItems.forEach(item => {
            DOMUtils.removeClass(item, 'active');
        });

        // Yeni aktif itemi bul ve işaretle
        const activeItem = this.findHistoryItemById(conversationId);
        if (activeItem) {
            DOMUtils.addClass(activeItem, 'active');
        }
    }
}

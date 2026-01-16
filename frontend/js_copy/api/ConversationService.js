/**
 * Conversation Service
 * Konuşma yönetimi için servis
 */

import { StorageUtils } from '../core/storage.js';
import { HelperUtils } from '../core/helpers.js';
import { ApiService } from './ApiService.js';

export class ConversationService {
    constructor() {
        this.conversations = [];
        this.currentConversationId = null;
        this.apiService = new ApiService();
        this.loadingTitles = new Set(); // Loading durumundaki konuşma ID'leri
        this.loadConversations();
    }

    /**
     * Konuşmaları yükle
     */
    loadConversations() {
        this.conversations = StorageUtils.loadConversationHistory();
    }

    /**
     * Konuşmaları kaydet
     */
    saveConversations() {
        StorageUtils.saveConversationHistory(this.conversations);
    }

    /**
     * Yeni konuşma oluştur
     * @param {string} title - Konuşma başlığı
     * @param {string} model - Model
     * @returns {Object} - Konuşma objesi
     */
    createConversation(title, model) {
        const conversation = {
            id: HelperUtils.generateConversationId(),
            title: title,
            model: model,
            messages: [],
            pinned: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.conversations.unshift(conversation);
        this.saveConversations();
        return conversation;
    }

    /**
     * Yeni konuşma oluştur (başlık üretimi olmadan)
     * @param {string} firstMessage - İlk mesaj
     * @param {string} model - Model
     * @returns {Object} - Konuşma objesi
     */
    createConversationWithTempTitle(firstMessage, model) {
        // Geçici başlık ile konuşma oluştur
        const tempTitle = 'Yeni Sohbet';
        const conversation = this.createConversation(tempTitle, model);

        // NOT: İlk mesajı BURAYA EKLEMİYORUZ
        // processMessage() içinde eklenecek, duplikasyon olmaması için

        return conversation;
    }

    /**
     * Konuşma başlığını asenkron olarak güncelle
     * @param {string} conversationId - Konuşma ID'si
     * @param {string} firstMessage - İlk mesaj
     * @param {string} model - Model
     * @returns {Promise<void>}
     */
    async updateConversationTitleAsync(conversationId, firstMessage, model) {
        // Loading durumunu başlat
        this.loadingTitles.add(conversationId);

        // UI'yi güncelle (loading durumu)
        console.log('Starting title generation for:', conversationId);
        if (this.onTitleUpdated) {
            console.log('Calling onTitleUpdated with loading=true');
            this.onTitleUpdated(conversationId, null, true); // true = loading
        } else {
            console.log('onTitleUpdated callback not set!');
        }

        try {
            const generatedTitle = await this.apiService.generateTitle(firstMessage, model);
            const conversation = this.conversations.find(c => c.id === conversationId);
            if (conversation) {
                conversation.title = generatedTitle;
                this.saveConversations();
                console.log('Otomatik başlık üretildi:', generatedTitle);

                // Loading durumunu kaldır
                this.loadingTitles.delete(conversationId);

                // UI'yi güncelle (final başlık)
                if (this.onTitleUpdated) {
                    this.onTitleUpdated(conversationId, generatedTitle, false);
                }
            }
        } catch (error) {
            console.error('Başlık üretimi başarısız:', error);
            // Loading durumunu kaldır
            this.loadingTitles.delete(conversationId);

            // UI'yi güncelle (hata durumu - başlık değişmez)
            if (this.onTitleUpdated) {
                this.onTitleUpdated(conversationId, null, false);
            }
        }
    }

    /**
     * Konuşmayı güncelle
     * @param {string} conversationId - Konuşma ID'si
     * @param {Object} message - Mesaj objesi
     */
    updateConversation(conversationId, message, rawData = null) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            const messageToStore = { ...message };
            if (rawData) {
                messageToStore.rawData = rawData;
            }
            conversation.messages.push(messageToStore);
            conversation.updatedAt = new Date();
            this.saveConversations();
        }
    }

    /**
     * Konuşmayı sil
     * @param {string} conversationId - Konuşma ID'si
     */
    deleteConversation(conversationId) {
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        this.saveConversations();

        // Eğer mevcut konuşma silindiyse, current ID'yi temizle
        if (this.currentConversationId === conversationId) {
            this.currentConversationId = null;
        }
    }

    /**
     * Konuşmayı yükle
     * @param {string} conversationId - Konuşma ID'si
     * @returns {Object|null} - Konuşma objesi
     */
    loadConversation(conversationId) {
        return this.conversations.find(c => c.id === conversationId) || null;
    }

    /**
     * Mevcut konuşmayı al
     * @returns {Object|null} - Mevcut konuşma
     */
    getCurrentConversation() {
        return this.currentConversationId ?
            this.loadConversation(this.currentConversationId) : null;
    }

    /**
     * Mevcut konuşma ID'sini set et
     * @param {string} conversationId - Konuşma ID'si
     */
    setCurrentConversation(conversationId) {
        this.currentConversationId = conversationId;
    }

    /**
     * Tüm konuşmaları al
     * @returns {Array} - Konuşma listesi
     */
    getAllConversations() {
        return this.conversations;
    }

    /**
     * Konuşmayı pinle/unpinle
     * @param {string} conversationId - Konuşma ID'si
     */
    togglePinConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.pinned = !conversation.pinned;
            this.saveConversations();
        }
    }

    /**
     * Pinli konuşmaları al
     * @returns {Array} - Pinli konuşma listesi
     */
    getPinnedConversations() {
        return this.conversations.filter(c => c.pinned);
    }

    /**
     * Pinli olmayan konuşmaları al
     * @returns {Array} - Pinli olmayan konuşma listesi
     */
    getUnpinnedConversations() {
        return this.conversations.filter(c => !c.pinned);
    }

    /**
     * Konuşma geçmişini temizle
     */
    clearConversations() {
        this.conversations = [];
        this.currentConversationId = null;
        this.saveConversations();
    }
}

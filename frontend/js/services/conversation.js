/**
 * Conversation Service
 * Konuşma yönetimi için servis
 */

import { StorageUtils } from '../utils/storage.js';
import { HelperUtils } from '../utils/helpers.js';

export class ConversationService {
    constructor() {
        this.conversations = [];
        this.currentConversationId = null;
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
     * Konuşmayı güncelle
     * @param {string} conversationId - Konuşma ID'si
     * @param {Object} message - Mesaj objesi
     */
    updateConversation(conversationId, message) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.messages.push(message);
            conversation.updatedAt = new Date();
            
            // İlk kullanıcı mesajı ise başlığı güncelle
            if (conversation.messages.length === 1 && message.role === 'user') {
                conversation.title = message.content.substring(0, 50) + 
                    (message.content.length > 50 ? '...' : '');
            }
            
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


/**
 * Main Application
 * Ana uygulama dosyası
 */

import { UIComponent } from './components/ui.js';
import { MarkdownComponent } from './components/markdown.js';
import { MoleculeComponent } from './components/molecule.js';
import { ApiService } from './services/api.js';
import { ConversationService } from './services/conversation.js';
import { ModelService } from './services/model.js';
import { DOMUtils } from './utils/dom.js';
import { HelperUtils } from './utils/helpers.js';

class ChatApp {
    constructor() {
        this.ui = new UIComponent();
        this.markdown = new MarkdownComponent();
        this.molecule = new MoleculeComponent();
        this.api = new ApiService();
        this.conversation = new ConversationService();
        this.model = new ModelService();
        
        this.isStreaming = false;
        this.userScrolledUp = false;
        this.currentStreamController = null;
        this.activeTool = null; // Aktif tool (null, 'admed', vs.)
        
        this.init();
    }

    /**
     * Uygulamayı başlat
     */
    async init() {
        // DOM elementlerinin yüklenmesini bekle
        await this.waitForDOM();
        
        // Event listener'ları kur
        this.setupEventListeners();
        
        // UI event listener'ları kur
        this.ui.setupEventListeners();
        
        // Modelleri yükle
        await this.populateModels();
        
        // Konuşma geçmişini yükle
        this.renderConversationHistory();
        
        // Molekül çizim sistemini başlat
        this.initializeMoleculeDrawing();
        
        // Welcome input'a focus
        if (this.ui.elements.welcomeInput) {
            this.ui.elements.welcomeInput.focus();
        }
    }

    /**
     * DOM elementlerinin yüklenmesini bekle
     */
    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Molekül çizim sistemini başlat
     */
    initializeMoleculeDrawing() {
        // DOM yüklendikten sonra molekül çizim sistemini başlat
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.molecule.initialize();
            });
        } else {
            this.molecule.initialize();
        }
    }

    /**
     * Event listener'ları kur
     */
    setupEventListeners() {
        // Form submit handlers
        if (this.ui.elements.welcomeForm) {
            DOMUtils.on(this.ui.elements.welcomeForm, 'submit', (e) => {
                e.preventDefault();
                this.handleWelcomeSubmit();
            });
        }

        if (this.ui.elements.form) {
            DOMUtils.on(this.ui.elements.form, 'submit', (e) => {
                e.preventDefault();
                this.handleChatSubmit();
            });
        }

        // Sidebar custom select
        this.setupSidebarCustomSelect();

        // Settings modal
        if (this.ui.elements.settingsBtn) {
            DOMUtils.on(this.ui.elements.settingsBtn, 'click', () => {
                this.openSettingsModal();
            });
        }

        if (this.ui.elements.settingsClose) {
            DOMUtils.on(this.ui.elements.settingsClose, 'click', () => {
                this.closeSettingsModal();
            });
        }

        if (this.ui.elements.settingsOverlay) {
            DOMUtils.on(this.ui.elements.settingsOverlay, 'click', () => {
                this.closeSettingsModal();
            });
        }

        // Molecule modal - Sidebar butonu kaldırıldı (artık input wrapper'da)

        if (this.ui.elements.moleculeClose) {
            DOMUtils.on(this.ui.elements.moleculeClose, 'click', () => {
                this.closeMoleculeModal();
            });
        }

        if (this.ui.elements.moleculeOverlay) {
            DOMUtils.on(this.ui.elements.moleculeOverlay, 'click', () => {
                this.closeMoleculeModal();
            });
        }

        if (this.ui.elements.smilesInput) {
            DOMUtils.on(this.ui.elements.smilesInput, 'input', () => {
                this.updateMoleculeDisplay();
            });
        }

        if (this.ui.elements.clearMoleculeBtn) {
            DOMUtils.on(this.ui.elements.clearMoleculeBtn, 'click', () => {
                this.clearMolecule();
            });
        }

        if (this.ui.elements.insertMoleculeBtn) {
            DOMUtils.on(this.ui.elements.insertMoleculeBtn, 'click', () => {
                this.insertMoleculeToChat();
            });
        }

        // New chat button
        if (this.ui.elements.newChatBtn) {
            DOMUtils.on(this.ui.elements.newChatBtn, 'click', () => {
                this.switchToWelcomeMode();
            });
        }

        // Add model option
        if (this.ui.elements.addModelOption) {
            DOMUtils.on(this.ui.elements.addModelOption, 'click', (e) => {
                e.stopPropagation();
                this.closeSidebarSelect();
                this.openSettingsModal();
            });
        }

        // Add dropdown
        if (this.ui.elements.welcomeAddBtn) {
            DOMUtils.on(this.ui.elements.welcomeAddBtn, 'click', (e) => {
                e.stopPropagation();
                this.toggleAddDropdown('welcome');
            });
        }

        if (this.ui.elements.chatAddBtn) {
            DOMUtils.on(this.ui.elements.chatAddBtn, 'click', (e) => {
                e.stopPropagation();
                this.toggleAddDropdown('chat');
            });
        }

        // Add dropdown options
        if (this.ui.elements.welcomeFileUpload) {
            DOMUtils.on(this.ui.elements.welcomeFileUpload, 'click', () => {
                this.handleFileUpload('welcome');
            });
        }

        if (this.ui.elements.chatFileUpload) {
            DOMUtils.on(this.ui.elements.chatFileUpload, 'click', () => {
                this.handleFileUpload('chat');
            });
        }

        if (this.ui.elements.welcomeMoleculeDraw) {
            DOMUtils.on(this.ui.elements.welcomeMoleculeDraw, 'click', () => {
                this.handleMoleculeDraw('welcome');
            });
        }

        if (this.ui.elements.chatMoleculeDraw) {
            DOMUtils.on(this.ui.elements.chatMoleculeDraw, 'click', () => {
                this.handleMoleculeDraw('chat');
            });
        }

        // Tools dropdown
        if (this.ui.elements.welcomeToolsBtn) {
            DOMUtils.on(this.ui.elements.welcomeToolsBtn, 'click', (e) => {
                e.stopPropagation();
                this.toggleToolsDropdown('welcome');
            });
        }

        if (this.ui.elements.chatToolsBtn) {
            DOMUtils.on(this.ui.elements.chatToolsBtn, 'click', (e) => {
                e.stopPropagation();
                this.toggleToolsDropdown('chat');
            });
        }

        // Dropdown dışına tıklayınca kapat
        DOMUtils.on(document, 'click', (e) => {
            // Tools dropdown kontrolü
            if ((this.ui.elements.welcomeToolsDropdown && 
                 !this.ui.elements.welcomeToolsDropdown.contains(e.target) &&
                 !this.ui.elements.welcomeToolsBtn.contains(e.target)) ||
                (this.ui.elements.chatToolsDropdown && 
                 !this.ui.elements.chatToolsDropdown.contains(e.target) &&
                 !this.ui.elements.chatToolsBtn.contains(e.target))) {
                this.closeAllToolsDropdowns();
            }
            
            // Add dropdown kontrolü
            if ((this.ui.elements.welcomeAddDropdown && 
                 !this.ui.elements.welcomeAddDropdown.contains(e.target) &&
                 !this.ui.elements.welcomeAddBtn.contains(e.target)) ||
                (this.ui.elements.chatAddDropdown && 
                 !this.ui.elements.chatAddDropdown.contains(e.target) &&
                 !this.ui.elements.chatAddBtn.contains(e.target))) {
                this.closeAllAddDropdowns();
            }
        });


        if (this.ui.elements.welcomeAdmedTool) {
            DOMUtils.on(this.ui.elements.welcomeAdmedTool, 'click', () => {
                this.handleAdmedTool();
            });
        }

        if (this.ui.elements.chatAdmedTool) {
            DOMUtils.on(this.ui.elements.chatAdmedTool, 'click', () => {
                this.handleAdmedTool();
            });
        }

        // Keyboard shortcuts
        DOMUtils.on(document, 'keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.ui.elements.settingsModal.classList.contains('open')) {
                    this.closeSettingsModal();
                } else if (this.ui.elements.moleculeModal.classList.contains('open')) {
                    this.closeMoleculeModal();
                } else if ((this.ui.elements.welcomeToolsDropdown && this.ui.elements.welcomeToolsDropdown.classList.contains('open')) ||
                          (this.ui.elements.chatToolsDropdown && this.ui.elements.chatToolsDropdown.classList.contains('open'))) {
                    this.closeAllToolsDropdowns();
                }
            }
        });
    }

    /**
     * Sidebar custom select kurulumu
     */
    setupSidebarCustomSelect() {
        // Sidebar model select moved to input wrapper
        // if (!this.ui.elements.selectTriggerSidebar || !this.ui.elements.customSelectSidebar) {
        //     return;
        // }

        // Sidebar model select devre dışı (artık input wrapper'da)
        // Toggle dropdown
        // DOMUtils.on(this.ui.elements.selectTriggerSidebar, 'click', (e) => {
        //     e.stopPropagation();
        //     this.toggleSidebarSelect();
        // });

        // Input wrapper model select - Welcome
        if (this.ui.elements.selectTriggerWelcome) {
            DOMUtils.on(this.ui.elements.selectTriggerWelcome, 'click', (e) => {
                e.stopPropagation();
                this.toggleInputSelect('welcome');
            });
        }

        // Input wrapper model select - Chat
        if (this.ui.elements.selectTriggerChat) {
            DOMUtils.on(this.ui.elements.selectTriggerChat, 'click', (e) => {
                e.stopPropagation();
                this.toggleInputSelect('chat');
            });
        }

        // Model Ekle butonları
        if (this.ui.elements.welcomeAddModelBtn) {
            DOMUtils.on(this.ui.elements.welcomeAddModelBtn, 'click', (e) => {
                e.stopPropagation();
                this.openSettingsModal();
            });
        }

        if (this.ui.elements.chatAddModelBtn) {
            DOMUtils.on(this.ui.elements.chatAddModelBtn, 'click', (e) => {
                e.stopPropagation();
                this.openSettingsModal();
            });
        }

        // Close dropdown when clicking outside
        DOMUtils.on(document, 'click', (e) => {
            // Sidebar model select devre dışı
            // if (this.ui.elements.customSelectSidebar && !this.ui.elements.customSelectSidebar.contains(e.target)) {
            //     this.closeSidebarSelect();
            // }
            if (this.ui.elements.customSelectWelcome && !this.ui.elements.customSelectWelcome.contains(e.target)) {
                this.closeInputSelect('welcome');
            }
            if (this.ui.elements.customSelectChat && !this.ui.elements.customSelectChat.contains(e.target)) {
                this.closeInputSelect('chat');
            }
        });

        // Sidebar keyboard navigation devre dışı
        // DOMUtils.on(this.ui.elements.selectTriggerSidebar, 'keydown', (e) => {
        //     if (e.key === 'Enter' || e.key === ' ') {
        //         e.preventDefault();
        //         this.toggleSidebarSelect();
        //     } else if (e.key === 'Escape') {
        //         this.closeSidebarSelect();
        //     }
        // });
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
        this.updateToolButtonState();
        
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
        await this.processMessage(text, model);
    }

    /**
     * Mesaj işleme
     * @param {string} text - Mesaj metni
     * @param {string} model - Model
     */
    async processMessage(text, model) {
        // Yeni konuşma oluştur
        if (!this.conversation.currentConversationId) {
            const conversation = this.conversation.createConversation(text, model);
            this.conversation.setCurrentConversation(conversation.id);
        }

        // Kullanıcı mesajını ekle
        this.ui.appendMessage(text, 'user');

        // Kullanıcı mesajını konuşmaya kaydet
        this.conversation.updateConversation(this.conversation.currentConversationId, { 
            role: 'user', 
            content: text 
        });

        // Input'u temizle ve devre dışı bırak
        const isInChatMode = this.ui.elements.chatInterface.style.display !== 'none';
        if (isInChatMode) {
            this.ui.elements.input.value = '';
            this.ui.elements.input.disabled = true;
        } else {
            this.ui.elements.welcomeInput.value = '';
            this.ui.elements.welcomeInput.disabled = true;
        }

        // Thinking indicator göster
        const typingEl = this.ui.showThinkingIndicator();

        // Streaming durumunu set et
        this.isStreaming = true;
        this.ui.setStreamingState(true);

        try {
            // AbortController oluştur
            const controller = new AbortController();
            this.ui.setAbortController(controller);

            // Mevcut konuşma geçmişini al
            const currentConversation = this.conversation.getCurrentConversation();
            const conversationHistoryForAPI = currentConversation ? currentConversation.messages : [];

            // API'ye istek gönder (tools bilgisi ile)
            const data = await this.api.sendMessage(text, model, conversationHistoryForAPI, controller.signal, this.activeTool);
            
            this.ui.removeThinkingIndicator(typingEl);

            if (this.isStreaming) {
                const reply = HelperUtils.extractTextFromResponse(data) || 'Boş yanıt';

                // Bot mesajını konuşmaya kaydet
                this.conversation.updateConversation(this.conversation.currentConversationId, { 
                    role: 'bot', 
                    content: reply 
                });

                // Bot mesajını oluştur ve typewriter efekti ile render et
                const botEl = this.ui.createBotMessage();
                await this.markdown.typeWriteMarkdown(botEl, reply, 0.1, () => {
                    this.ui.smartScroll();
                });

                // Final enhancements: syntax highlighting ve copy butonları
                this.markdown.applySyntaxHighlighting(botEl);
                this.markdown.addCopyButtons(botEl);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                this.ui.removeThinkingIndicator(typingEl);
                this.ui.appendMessage('Sunucu hatası: ' + String(err), 'bot');
            }
        } finally {
            // Streaming durumunu sıfırla
            this.isStreaming = false;
            this.ui.setStreamingState(false);
            this.ui.setAbortController(null);

            // Input'u tekrar etkinleştir
            this.ui.setInputsEnabled(true);
        }
    }

    /**
     * Modelleri yükle
     */
    async populateModels() {
        // Sidebar model select kaldırıldı, sadece input wrapper model select'leri kullanılıyor
        // if (!this.ui.elements.modelSelectSidebar || !this.ui.elements.selectOptionsScroll) {
        //     return;
        // }

        // Mevcut seçenekleri temizle (sidebar kaldırıldı)
        // this.ui.elements.modelSelectSidebar.innerHTML = '';
        // this.ui.elements.selectOptionsScroll.innerHTML = '';
        
        // Input wrapper model select'leri de temizle
        if (this.ui.elements.modelSelectWelcome) {
            this.ui.elements.modelSelectWelcome.innerHTML = '';
        }
        if (this.ui.elements.modelSelectChat) {
            this.ui.elements.modelSelectChat.innerHTML = '';
        }
        if (this.ui.elements.selectOptionsWelcome) {
            this.ui.elements.selectOptionsWelcome.innerHTML = '';
        }
        if (this.ui.elements.selectOptionsChat) {
            this.ui.elements.selectOptionsChat.innerHTML = '';
        }

        try {
            const allModels = await this.model.getAllModels();
            const activeModelsList = allModels.filter(model => this.model.isModelActive(model));

            if (activeModelsList.length === 0) {
                // Sidebar model select kaldırıldı
                // if (this.ui.elements.selectValueSidebar) {
                //     this.ui.elements.selectValueSidebar.textContent = 'Model seçiliyor...';
                // }
                if (this.ui.elements.selectValueWelcome) {
                    this.ui.elements.selectValueWelcome.textContent = 'Model seçiliyor...';
                }
                if (this.ui.elements.selectValueChat) {
                    this.ui.elements.selectValueChat.textContent = 'Model seçiliyor...';
                }
                return;
            }

            // İlk modeli seçili olarak ayarla
            const firstModel = activeModelsList[0];
            // Sidebar model select kaldırıldı
            // if (this.ui.elements.selectValueSidebar) {
            //     this.ui.elements.selectValueSidebar.textContent = firstModel;
            // }
            if (this.ui.elements.selectValueWelcome) {
                this.ui.elements.selectValueWelcome.textContent = firstModel;
            }
            if (this.ui.elements.selectValueChat) {
                this.ui.elements.selectValueChat.textContent = firstModel;
            }

            activeModelsList.forEach((model, idx) => {
                // Sidebar model select kaldırıldı
                // const optSidebar = DOMUtils.create('option', { 
                //     value: model, 
                //     textContent: model 
                // });
                // if (idx === 0) optSidebar.selected = true;
                // this.ui.elements.modelSelectSidebar.appendChild(optSidebar);

                // Welcome model select'e ekle (gizli)
                if (this.ui.elements.modelSelectWelcome) {
                    const optWelcome = DOMUtils.create('option', { 
                        value: model, 
                        textContent: model 
                    });
                    if (idx === 0) optWelcome.selected = true;
                    this.ui.elements.modelSelectWelcome.appendChild(optWelcome);
                }

                // Chat model select'e ekle (gizli)
                if (this.ui.elements.modelSelectChat) {
                    const optChat = DOMUtils.create('option', { 
                        value: model, 
                        textContent: model 
                    });
                    if (idx === 0) optChat.selected = true;
                    this.ui.elements.modelSelectChat.appendChild(optChat);
                }

                // Sidebar custom select kaldırıldı
                // const sidebarOption = DOMUtils.create('div', { 
                //     className: 'select-option-sidebar',
                //     textContent: model
                // });
                // sidebarOption.dataset.value = model;
                // 
                // if (idx === 0) {
                //     DOMUtils.addClass(sidebarOption, 'selected');
                // }
                // 
                // DOMUtils.on(sidebarOption, 'click', () => {
                //     this.selectSidebarOption(model, model);
                // });
                // 
                // this.ui.elements.selectOptionsScroll.appendChild(sidebarOption);

                // Welcome dropdown seçeneklerine ekle (görsel)
                if (this.ui.elements.selectOptionsWelcome) {
                    const welcomeOption = DOMUtils.create('div', {
                        className: 'select-option-input',
                        dataset: { value: model },
                        textContent: model
                    });

                    if (idx === 0) {
                        DOMUtils.addClass(welcomeOption, 'selected');
                    }

                    DOMUtils.on(welcomeOption, 'click', () => {
                        this.selectInputOption('welcome', model, model);
                    });

                    this.ui.elements.selectOptionsWelcome.appendChild(welcomeOption);
                }

                // Chat dropdown seçeneklerine ekle (görsel)
                if (this.ui.elements.selectOptionsChat) {
                    const chatOption = DOMUtils.create('div', {
                        className: 'select-option-input',
                        dataset: { value: model },
                        textContent: model
                    });

                    if (idx === 0) {
                        DOMUtils.addClass(chatOption, 'selected');
                    }

                    DOMUtils.on(chatOption, 'click', () => {
                        this.selectInputOption('chat', model, model);
                    });

                    this.ui.elements.selectOptionsChat.appendChild(chatOption);
                }
            });

            // Model Ekle butonunu ekle (Welcome)
            if (this.ui.elements.selectOptionsWelcome) {
                const welcomeAddModelDiv = this.ui.elements.selectOptionsWelcome.querySelector('.select-add-model');
                if (!welcomeAddModelDiv) {
                    const addModelDiv = DOMUtils.create('div', {
                        className: 'select-add-model'
                    });
                    
                    const addModelBtn = DOMUtils.create('button', {
                        className: 'select-add-model-btn',
                        id: 'welcome-add-model-btn',
                        innerHTML: `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Model Ekle
                        `
                    });

                    DOMUtils.on(addModelBtn, 'click', (e) => {
                        e.stopPropagation();
                        this.openSettingsModal();
                    });

                    addModelDiv.appendChild(addModelBtn);
                    this.ui.elements.selectOptionsWelcome.appendChild(addModelDiv);
                }
            }

            // Model Ekle butonunu ekle (Chat)
            if (this.ui.elements.selectOptionsChat) {
                const chatAddModelDiv = this.ui.elements.selectOptionsChat.querySelector('.select-add-model');
                if (!chatAddModelDiv) {
                    const addModelDiv = DOMUtils.create('div', {
                        className: 'select-add-model'
                    });
                    
                    const addModelBtn = DOMUtils.create('button', {
                        className: 'select-add-model-btn',
                        id: 'chat-add-model-btn',
                        innerHTML: `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Model Ekle
                        `
                    });

                    DOMUtils.on(addModelBtn, 'click', (e) => {
                        e.stopPropagation();
                        this.openSettingsModal();
                    });

                    addModelDiv.appendChild(addModelBtn);
                    this.ui.elements.selectOptionsChat.appendChild(addModelDiv);
                }
            }
        } catch (error) {
            // Sidebar model select kaldırıldı
            // if (this.ui.elements.selectValueSidebar) {
            //     this.ui.elements.selectValueSidebar.textContent = 'Model yüklenemedi';
            // }
            if (this.ui.elements.selectValueWelcome) {
                this.ui.elements.selectValueWelcome.textContent = 'Model yüklenemedi';
            }
            if (this.ui.elements.selectValueChat) {
                this.ui.elements.selectValueChat.textContent = 'Model yüklenemedi';
            }
        }
    }

    /**
     * Konuşma geçmişini render et
     */
    renderConversationHistory() {
        this.ui.elements.historyList.innerHTML = '';

        const conversations = this.conversation.getAllConversations();
        conversations.forEach(conversation => {
            const historyItem = DOMUtils.create('div', { 
                className: 'history-item'
            });
            
            if (conversation.id === this.conversation.currentConversationId) {
                DOMUtils.addClass(historyItem, 'active');
            }

            historyItem.innerHTML = `
                <div class="history-item-title">${conversation.title}</div>
                <div class="history-item-date">${HelperUtils.formatDate(conversation.updatedAt)}</div>
                <button class="history-item-delete" onclick="app.deleteConversation('${conversation.id}')">×</button>
            `;

            DOMUtils.on(historyItem, 'click', (e) => {
                if (!e.target.classList.contains('history-item-delete')) {
                    this.loadConversation(conversation.id);
                }
            });

            this.ui.elements.historyList.appendChild(historyItem);
        });
    }

    /**
     * Konuşmayı yükle
     * @param {string} conversationId - Konuşma ID'si
     */
    loadConversation(conversationId) {
        const conversation = this.conversation.loadConversation(conversationId);
        if (conversation) {
            this.conversation.setCurrentConversation(conversationId);

            // Mevcut mesajları temizle
            this.ui.elements.messagesEl.innerHTML = '';

            // Konuşma mesajlarını yükle
            conversation.messages.forEach(msg => {
                if (msg.role === 'user') {
                    // Kullanıcı mesajları: formatı koru
                    this.ui.appendMessage(msg.content, msg.role);
                } else {
                    // Bot mesajları: markdown olarak render et
                    const botEl = DOMUtils.create('div', { 
                        className: 'message bot',
                        innerHTML: this.markdown.renderToHtml(msg.content)
                    });
                    this.ui.elements.messagesEl.appendChild(botEl);

                    // Syntax highlighting ve copy butonları uygula
                    this.markdown.applySyntaxHighlighting(botEl);
                    this.markdown.addCopyButtons(botEl);
                }
            });

            // Chat moduna geç
            this.ui.switchToChatMode(conversation.model);

            // Aktif konuşmayı güncelle
            this.renderConversationHistory();
        }
    }

    /**
     * Konuşmayı sil
     * @param {string} conversationId - Konuşma ID'si
     */
    deleteConversation(conversationId) {
        this.conversation.deleteConversation(conversationId);
        this.renderConversationHistory();

        // Eğer mevcut konuşma silindiyse, welcome moduna geç
        if (this.conversation.currentConversationId === conversationId) {
            this.switchToWelcomeMode();
        }
    }

    /**
     * Welcome moduna geç
     */
    switchToWelcomeMode() {
        this.ui.switchToWelcomeMode();
        this.conversation.setCurrentConversation(null);
        this.renderConversationHistory();
        
        // Tool buton durumunu güncelle (welcome moduna geçtikten sonra)
        this.updateToolButtonState();
    }

    /**
     * Sidebar select toggle
     */
    toggleSidebarSelect() {
        if (!this.ui.elements.selectOptionsSidebar) return;
        
        const isOpen = this.ui.elements.selectOptionsSidebar.classList.contains('open');
        if (isOpen) {
            this.closeSidebarSelect();
        } else {
            this.openSidebarSelect();
        }
    }

    /**
     * Sidebar select aç
     */
    openSidebarSelect() {
        if (!this.ui.elements.selectOptionsSidebar || !this.ui.elements.selectTriggerSidebar) return;
        
        DOMUtils.addClass(this.ui.elements.selectOptionsSidebar, 'open');
        DOMUtils.addClass(this.ui.elements.selectTriggerSidebar, 'active');
        this.ui.elements.selectTriggerSidebar.setAttribute('aria-expanded', 'true');
    }

    /**
     * Sidebar select kapat
     */
    closeSidebarSelect() {
        if (!this.ui.elements.selectOptionsSidebar || !this.ui.elements.selectTriggerSidebar) return;
        
        DOMUtils.removeClass(this.ui.elements.selectOptionsSidebar, 'open');
        DOMUtils.removeClass(this.ui.elements.selectTriggerSidebar, 'active');
        this.ui.elements.selectTriggerSidebar.setAttribute('aria-expanded', 'false');
    }

    /**
     * Sidebar seçenek seç
     * @param {string} value - Değer
     * @param {string} text - Metin
     */
    selectSidebarOption(value, text) {
        if (!this.ui.elements.selectValueSidebar || !this.ui.elements.modelSelectSidebar) return;
        
        // Model seçimini güncelle
        this.ui.elements.selectValueSidebar.textContent = text;
        this.ui.elements.modelSelectSidebar.value = value;

        // Seçili durumu güncelle
        if (this.ui.elements.selectOptionsScroll) {
            this.ui.elements.selectOptionsScroll.querySelectorAll('.select-option-sidebar').forEach(option => {
                DOMUtils.removeClass(option, 'selected');
                if (option.dataset.value === value) {
                    DOMUtils.addClass(option, 'selected');
                }
            });
        }

        this.closeSidebarSelect();
    }

    /**
     * Input wrapper model select toggle
     * @param {string} type - 'welcome' veya 'chat'
     */
    toggleInputSelect(type) {
        const elements = this.getInputSelectElements(type);
        if (!elements.selectOptions) return;
        
        const isOpen = elements.selectOptions.classList.contains('open');
        if (isOpen) {
            this.closeInputSelect(type);
        } else {
            this.openInputSelect(type);
        }
    }

    /**
     * Input wrapper model select aç
     * @param {string} type - 'welcome' veya 'chat'
     */
    openInputSelect(type) {
        const elements = this.getInputSelectElements(type);
        if (!elements.selectOptions || !elements.selectTrigger) return;
        
        DOMUtils.addClass(elements.selectOptions, 'open');
        DOMUtils.addClass(elements.selectTrigger, 'active');
        elements.selectTrigger.setAttribute('aria-expanded', 'true');
    }

    /**
     * Input wrapper model select kapat
     * @param {string} type - 'welcome' veya 'chat'
     */
    closeInputSelect(type) {
        const elements = this.getInputSelectElements(type);
        if (!elements.selectOptions || !elements.selectTrigger) return;
        
        DOMUtils.removeClass(elements.selectOptions, 'open');
        DOMUtils.removeClass(elements.selectTrigger, 'active');
        elements.selectTrigger.setAttribute('aria-expanded', 'false');
    }

    /**
     * Input wrapper model select elementlerini al
     * @param {string} type - 'welcome' veya 'chat'
     * @returns {Object} Elementler
     */
    getInputSelectElements(type) {
        if (type === 'welcome') {
            return {
                selectOptions: this.ui.elements.selectOptionsWelcome,
                selectTrigger: this.ui.elements.selectTriggerWelcome,
                selectValue: this.ui.elements.selectValueWelcome,
                modelSelect: this.ui.elements.modelSelectWelcome
            };
        } else {
            return {
                selectOptions: this.ui.elements.selectOptionsChat,
                selectTrigger: this.ui.elements.selectTriggerChat,
                selectValue: this.ui.elements.selectValueChat,
                modelSelect: this.ui.elements.modelSelectChat
            };
        }
    }

    /**
     * Input wrapper seçenek seç
     * @param {string} type - 'welcome' veya 'chat'
     * @param {string} value - Değer
     * @param {string} text - Metin
     */
    selectInputOption(type, value, text) {
        const elements = this.getInputSelectElements(type);
        if (!elements.selectValue || !elements.modelSelect) return;
        
        // Görsel değeri güncelle
        elements.selectValue.textContent = text;
        
        // Gizli select'i güncelle
        elements.modelSelect.value = value;
        
        // Seçenekleri güncelle
        const options = elements.selectOptions.querySelectorAll('.select-option-input');
        options.forEach(option => {
            if (option.dataset.value === value) {
                DOMUtils.addClass(option, 'selected');
            } else {
                DOMUtils.removeClass(option, 'selected');
            }
        });
        
        // Diğer model select'i de senkronize et
        if (type === 'welcome' && this.ui.elements.modelSelectChat && this.ui.elements.selectValueChat) {
            this.ui.elements.modelSelectChat.value = value;
            this.ui.elements.selectValueChat.textContent = text;
            
            // Chat model select'teki seçenekleri güncelle
            if (this.ui.elements.selectOptionsChat) {
                const chatOptions = this.ui.elements.selectOptionsChat.querySelectorAll('.select-option-input');
                chatOptions.forEach(option => {
                    if (option.dataset.value === value) {
                        DOMUtils.addClass(option, 'selected');
                    } else {
                        DOMUtils.removeClass(option, 'selected');
                    }
                });
            }
        } else if (type === 'chat' && this.ui.elements.modelSelectWelcome && this.ui.elements.selectValueWelcome) {
            this.ui.elements.modelSelectWelcome.value = value;
            this.ui.elements.selectValueWelcome.textContent = text;
            
            // Welcome model select'teki seçenekleri güncelle
            if (this.ui.elements.selectOptionsWelcome) {
                const welcomeOptions = this.ui.elements.selectOptionsWelcome.querySelectorAll('.select-option-input');
                welcomeOptions.forEach(option => {
                    if (option.dataset.value === value) {
                        DOMUtils.addClass(option, 'selected');
                    } else {
                        DOMUtils.removeClass(option, 'selected');
                    }
                });
            }
        }
        
        this.closeInputSelect(type);
    }

    /**
     * Settings modal aç
     */
    openSettingsModal() {
        if (!this.ui.elements.settingsModal) {
            return;
        }
        
        DOMUtils.addClass(this.ui.elements.settingsModal, 'open');
        this.populateModelsList();
    }

    /**
     * Settings modal kapat
     */
    closeSettingsModal() {
        if (!this.ui.elements.settingsModal) return;
        
        DOMUtils.removeClass(this.ui.elements.settingsModal, 'open');
    }

    /**
     * Models listesini doldur
     */
    async populateModelsList() {
        if (!this.ui.elements.modelsList) return;
        
        this.ui.elements.modelsList.innerHTML = '';
        
        try {
            const models = await this.model.getAllModels();

            models.forEach(model => {
                const modelItem = DOMUtils.create('div', { 
                    className: 'model-item',
                    innerHTML: `
                        <span class="model-name">${model}</span>
                        <div class="model-controls">
                            <span class="model-status">free</span>
                            <div class="model-switch ${this.model.isModelActive(model) ? 'active' : ''}" data-model="${model}"></div>
                        </div>
                    `
                });

                // Switch click handler
                const switchElement = modelItem.querySelector('.model-switch');
                if (switchElement) {
                    DOMUtils.on(switchElement, 'click', (e) => {
                        e.stopPropagation();
                        this.toggleModelActive(model, switchElement);
                    });
                }

                this.ui.elements.modelsList.appendChild(modelItem);
            });
        } catch (error) {
            this.ui.elements.modelsList.innerHTML = '<div class="model-item">Modeller yüklenemedi</div>';
        }
    }

    /**
     * Model aktif durumunu toggle et
     * @param {string} model - Model adı
     * @param {Element} switchElement - Switch elementi
     */
    toggleModelActive(model, switchElement) {
        const isActive = this.model.toggleModel(model);

        if (isActive) {
            DOMUtils.addClass(switchElement, 'active');
        } else {
            DOMUtils.removeClass(switchElement, 'active');
        }

        // Sidebar model listesini yenile
        this.populateModels();

        // Eğer mevcut seçili model deaktif edildiyse, ilk aktif modeli seç
        // Sidebar model select kaldırıldı, input wrapper model select'leri güncelleniyor
        if (this.ui.elements.modelSelectWelcome && !this.model.isModelActive(this.ui.elements.modelSelectWelcome.value)) {
            this.model.getFirstActiveModel().then(firstModel => {
                if (firstModel) {
                    this.selectInputOption('welcome', firstModel, firstModel);
                } else {
                    if (this.ui.elements.selectValueWelcome) {
                        this.ui.elements.selectValueWelcome.textContent = 'Model seçiliyor...';
                    }
                }
            });
        }
        
        if (this.ui.elements.modelSelectChat && !this.model.isModelActive(this.ui.elements.modelSelectChat.value)) {
            this.model.getFirstActiveModel().then(firstModel => {
                if (firstModel) {
                    this.selectInputOption('chat', firstModel, firstModel);
                } else {
                    if (this.ui.elements.selectValueChat) {
                        this.ui.elements.selectValueChat.textContent = 'Model seçiliyor...';
                    }
                }
            });
        }
    }

    /**
     * Molecule modal aç
     */
    openMoleculeModal() {
        if (!this.ui.elements.moleculeModal) {
            return;
        }
        
        DOMUtils.addClass(this.ui.elements.moleculeModal, 'open');
        
        if (this.ui.elements.smilesInput) {
            this.ui.elements.smilesInput.focus();
        }

        // Molekül çizim sistemini başlat
        if (!this.molecule.isInitialized) {
            this.molecule.initialize();
        }
    }

    /**
     * Molecule modal kapat
     */
    closeMoleculeModal() {
        if (!this.ui.elements.moleculeModal) return;
        
        DOMUtils.removeClass(this.ui.elements.moleculeModal, 'open');
    }

    /**
     * Molekül görselleştirmesini güncelle
     */
    updateMoleculeDisplay() {
        if (!this.ui.elements.smilesInput) return;
        
        const smiles = this.ui.elements.smilesInput.value.trim();
        this.molecule.updateDisplay(smiles);
    }

    /**
     * Molekülü temizle
     */
    clearMolecule() {
        if (!this.ui.elements.smilesInput) return;
        
        this.ui.elements.smilesInput.value = '';
        this.updateMoleculeDisplay();
    }

    /**
     * Molekülü sohbete ekle
     */
    insertMoleculeToChat() {
        if (!this.ui.elements.smilesInput) return;
        
        const smiles = this.ui.elements.smilesInput.value.trim();
        if (!smiles) {
            alert('Lütfen bir SMILES formatı girin.');
            return;
        }

        // Molekül mesaj metni oluştur
        const moleculeMessage = `Molekül: ${smiles}`;

        // Mevcut input alanına ekle
        const isInChatMode = this.ui.elements.chatInterface && this.ui.elements.chatInterface.style.display !== 'none';
        if (isInChatMode && this.ui.elements.input) {
            const currentValue = this.ui.elements.input.value;
            this.ui.elements.input.value = currentValue ? `${currentValue}\n${moleculeMessage}` : moleculeMessage;
            DOMUtils.autoResizeTextarea(this.ui.elements.input);
            this.ui.elements.input.focus();
        } else if (this.ui.elements.welcomeInput) {
            const currentValue = this.ui.elements.welcomeInput.value;
            this.ui.elements.welcomeInput.value = currentValue ? `${currentValue}\n${moleculeMessage}` : moleculeMessage;
            DOMUtils.autoResizeTextarea(this.ui.elements.welcomeInput);
            this.ui.elements.welcomeInput.focus();
        }

        // Modal'ı kapat
        this.closeMoleculeModal();
    }

    /**
     * Tools dropdown aç/kapat
     */
    toggleToolsDropdown(type) {
        const dropdown = type === 'welcome' ? this.ui.elements.welcomeToolsDropdown : this.ui.elements.chatToolsDropdown;
        
        if (!dropdown) {
            return;
        }
        
        // Eğer bu dropdown zaten açıksa, kapat
        if (dropdown.classList.contains('open')) {
            DOMUtils.removeClass(dropdown, 'open');
            return;
        }
        
        // Diğer dropdown'ı kapat ve bu dropdown'ı aç
        this.closeAllToolsDropdowns();
        DOMUtils.addClass(dropdown, 'open');
    }

    /**
     * Tüm tools dropdown'ları kapat
     */
    closeAllToolsDropdowns() {
        if (this.ui.elements.welcomeToolsDropdown) {
            DOMUtils.removeClass(this.ui.elements.welcomeToolsDropdown, 'open');
        }
        if (this.ui.elements.chatToolsDropdown) {
            DOMUtils.removeClass(this.ui.elements.chatToolsDropdown, 'open');
        }
    }

    /**
     * Add dropdown'ı aç/kapat
     * @param {string} type - 'welcome' veya 'chat'
     */
    toggleAddDropdown(type) {
        const dropdown = type === 'welcome' ? this.ui.elements.welcomeAddDropdown : this.ui.elements.chatAddDropdown;
        
        if (!dropdown) {
            return;
        }
        
        // Eğer bu dropdown zaten açıksa, kapat
        if (dropdown.classList.contains('open')) {
            DOMUtils.removeClass(dropdown, 'open');
            return;
        }
        
        // Diğer dropdown'ları kapat ve bu dropdown'ı aç
        this.closeAllAddDropdowns();
        this.closeAllToolsDropdowns();
        DOMUtils.addClass(dropdown, 'open');
    }

    /**
     * Tüm add dropdown'ları kapat
     */
    closeAllAddDropdowns() {
        if (this.ui.elements.welcomeAddDropdown) {
            DOMUtils.removeClass(this.ui.elements.welcomeAddDropdown, 'open');
        }
        if (this.ui.elements.chatAddDropdown) {
            DOMUtils.removeClass(this.ui.elements.chatAddDropdown, 'open');
        }
    }

    /**
     * Dosya yükleme handler'ı
     * @param {string} type - 'welcome' veya 'chat'
     */
    handleFileUpload(type) {
        this.closeAllAddDropdowns();
        
        // Dosya seçici oluştur
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.md,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif';
        input.multiple = true;
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.processUploadedFiles(files, type);
            }
        };
        
        input.click();
    }

    /**
     * Yüklenen dosyaları işle
     * @param {Array} files - Yüklenen dosyalar
     * @param {string} type - 'welcome' veya 'chat'
     */
    processUploadedFiles(files, type) {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const fileName = file.name;
                
                // Dosya içeriğini chat'e ekle
                this.addFileToChat(fileName, content, type);
            };
            reader.readAsText(file);
        });
    }

    /**
     * Dosyayı chat'e ekle
     * @param {string} fileName - Dosya adı
     * @param {string} content - Dosya içeriği
     * @param {string} type - 'welcome' veya 'chat'
     */
    addFileToChat(fileName, content, type) {
        const input = type === 'welcome' ? this.ui.elements.welcomeInput : this.ui.elements.input;
        if (input) {
            const fileInfo = `\n\n[Dosya: ${fileName}]\n${content}\n[/Dosya]\n\n`;
            input.value += fileInfo;
            input.focus();
        }
    }

    /**
     * Molekül çizme handler'ı
     * @param {string} type - 'welcome' veya 'chat'
     */
    handleMoleculeDraw(type) {
        this.closeAllAddDropdowns();
        this.openMoleculeModal();
    }

    /**
     * AdMed tool handler
     */
    handleAdmedTool() {
        // Tool'u aktif/pasif yap
        if (this.activeTool === 'admed') {
            this.activeTool = null;
            this.updateToolButtonState();
        } else {
            this.activeTool = 'admed';
            this.updateToolButtonState();
        }

        // Dropdown'ları kapat
        this.closeAllToolsDropdowns();
    }

    /**
     * Aktif tool'u kaldır
     */
    removeActiveTool() {
        this.activeTool = null;
        this.updateToolButtonState();
    }

    /**
     * Tool buton durumunu güncelle
     */
    updateToolButtonState() {
        const isInChatMode = this.ui.elements.chatInterface.style.display !== 'none';
        const toolsBtn = isInChatMode ? this.ui.elements.chatToolsBtn : this.ui.elements.welcomeToolsBtn;
        
        if (toolsBtn) {
            if (this.activeTool === 'admed') {
                DOMUtils.addClass(toolsBtn, 'active');
                toolsBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 14 5 C 12.90625 5 12 5.90625 12 7 L 12 8 L 6 8 C 4.355469 8 3 9.355469 3 11 L 3 26 L 29 26 L 29 11 C 29 9.355469 27.644531 8 26 8 L 20 8 L 20 7 C 20 5.90625 19.09375 5 18 5 Z M 14 7 L 18 7 L 18 8 L 14 8 Z M 6 10 L 26 10 C 26.566406 10 27 10.433594 27 11 L 27 24 L 5 24 L 5 11 C 5 10.433594 5.433594 10 6 10 Z M 15 13 L 15 16 L 12 16 L 12 18 L 15 18 L 15 21 L 17 21 L 17 18 L 20 18 L 20 16 L 17 16 L 17 13 Z" fill="currentColor"/>
                    </svg>
                    <span>AdMed</span>
                    <button class="tool-remove-btn" type="button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                `;
                
                // Remove button için event listener ekle
                const removeBtn = toolsBtn.querySelector('.tool-remove-btn');
                if (removeBtn) {
                    DOMUtils.on(removeBtn, 'click', (e) => {
                        e.stopPropagation();
                        this.removeActiveTool();
                    });
                }
            } else {
                DOMUtils.removeClass(toolsBtn, 'active');
                toolsBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Tools
                `;
            }
        }
    }
}

// Uygulamayı başlat
let app;

// DOM yüklendikten sonra uygulamayı başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new ChatApp();
        window.app = app;
    });
} else {
    app = new ChatApp();
    window.app = app;
}

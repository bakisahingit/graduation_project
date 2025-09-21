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
        this.activeTool = null; // Aktif tool (null, 'ADMET', vs.)
        
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

        // Molecule modal
        if (this.ui.elements.moleculeDrawerBtn) {
            DOMUtils.on(this.ui.elements.moleculeDrawerBtn, 'click', () => {
                this.openMoleculeModal();
            });
        }

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
            if ((this.ui.elements.welcomeToolsDropdown && 
                 !this.ui.elements.welcomeToolsDropdown.contains(e.target) &&
                 !this.ui.elements.welcomeToolsBtn.contains(e.target)) ||
                (this.ui.elements.chatToolsDropdown && 
                 !this.ui.elements.chatToolsDropdown.contains(e.target) &&
                 !this.ui.elements.chatToolsBtn.contains(e.target))) {
                this.closeAllToolsDropdowns();
            }
        });


        if (this.ui.elements.welcomeAdmetTool) {
            DOMUtils.on(this.ui.elements.welcomeAdmetTool, 'click', () => {
                this.handleAdmetTool();
            });
        }

        if (this.ui.elements.chatAdmetTool) {
            DOMUtils.on(this.ui.elements.chatAdmetTool, 'click', () => {
                this.handleAdmetTool();
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
        if (!this.ui.elements.selectTriggerSidebar || !this.ui.elements.customSelectSidebar) {
            return;
        }

        // Toggle dropdown
        DOMUtils.on(this.ui.elements.selectTriggerSidebar, 'click', (e) => {
            e.stopPropagation();
            this.toggleSidebarSelect();
        });

        // Close dropdown when clicking outside
        DOMUtils.on(document, 'click', (e) => {
            if (this.ui.elements.customSelectSidebar && !this.ui.elements.customSelectSidebar.contains(e.target)) {
                this.closeSidebarSelect();
            }
        });

        // Handle keyboard navigation
        DOMUtils.on(this.ui.elements.selectTriggerSidebar, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleSidebarSelect();
            } else if (e.key === 'Escape') {
                this.closeSidebarSelect();
            }
        });
    }

    /**
     * Welcome form submit handler
     */
    async handleWelcomeSubmit() {
        const text = this.ui.elements.welcomeInput.value.trim();
        if (!text) return;

        const selectedModel = this.ui.elements.modelSelectSidebar.value;
        
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

        const model = this.ui.elements.modelSelectSidebar.value;
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

        // Force repaint to ensure the indicator is shown before the long API call
        await new Promise(resolve => setTimeout(resolve, 50));

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
        if (!this.ui.elements.modelSelectSidebar || !this.ui.elements.selectOptionsScroll) {
            return;
        }

        // Mevcut seçenekleri temizle
        this.ui.elements.modelSelectSidebar.innerHTML = '';
        this.ui.elements.selectOptionsScroll.innerHTML = '';

        try {
            const allModels = await this.model.getAllModels();
            const activeModelsList = allModels.filter(model => this.model.isModelActive(model));

            if (activeModelsList.length === 0) {
                if (this.ui.elements.selectValueSidebar) {
                    this.ui.elements.selectValueSidebar.textContent = 'Model seçiliyor...';
                }
                return;
            }

            // İlk modeli seçili olarak ayarla
            const firstModel = activeModelsList[0];
            if (this.ui.elements.selectValueSidebar) {
                this.ui.elements.selectValueSidebar.textContent = firstModel;
            }

            activeModelsList.forEach((model, idx) => {
                // Sidebar model select'e ekle (gizli)
                const optSidebar = DOMUtils.create('option', { 
                    value: model, 
                    textContent: model 
                });
                if (idx === 0) optSidebar.selected = true;
                this.ui.elements.modelSelectSidebar.appendChild(optSidebar);

                // Sidebar custom select scroll container'a ekle
                const sidebarOption = DOMUtils.create('div', { 
                    className: 'select-option-sidebar',
                    textContent: model
                });
                sidebarOption.dataset.value = model;
                
                if (idx === 0) {
                    DOMUtils.addClass(sidebarOption, 'selected');
                }

                DOMUtils.on(sidebarOption, 'click', () => {
                    this.selectSidebarOption(model, model);
                });

                this.ui.elements.selectOptionsScroll.appendChild(sidebarOption);
            });
        } catch (error) {
            if (this.ui.elements.selectValueSidebar) {
                this.ui.elements.selectValueSidebar.textContent = 'Model yüklenemedi';
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
        if (!this.model.isModelActive(this.ui.elements.modelSelectSidebar.value)) {
            this.model.getFirstActiveModel().then(firstModel => {
                if (firstModel) {
                    this.selectSidebarOption(firstModel, firstModel);
                } else {
                    if (this.ui.elements.selectValueSidebar) {
                        this.ui.elements.selectValueSdebar.textContent = 'Model seçiliyor...';
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
     * ADMET tool handler
     */
    handleAdmetTool() {
        // Tool'u aktif/pasif yap
        if (this.activeTool === 'ADMET') {
            this.activeTool = null;
            this.updateToolButtonState();
        } else {
            this.activeTool = 'ADMET';
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
            if (this.activeTool === 'ADMET') {
                DOMUtils.addClass(toolsBtn, 'active');
                toolsBtn.innerHTML = `
                    <img src="assets/ADMET.svg" alt="ADMET" class="tool-icon" width="16" height="16">
                    <span>ADMET</span>
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
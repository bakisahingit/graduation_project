/**
 * UI Component
 * Kullanıcı arayüzü bileşenleri
 */

import { DOMUtils } from '../utils/dom.js';
import { HelperUtils } from '../utils/helpers.js';

export class UIComponent {
    constructor() {
        this.elements = this.initializeElements();
        this.isStreaming = false;
        this.userScrolledUp = false;
        this.currentStreamController = null;
    }

    /**
     * DOM elementlerini initialize et
     * @returns {Object}
     */
    initializeElements() {
        return {
            // Ana elementler
            messagesEl: DOMUtils.select('#messages'),
            form: DOMUtils.select('#chat-form'),
            input: DOMUtils.select('#chat-input'),
            
            // Welcome screen elementleri
            welcomeScreen: DOMUtils.select('#welcome-screen'),
            chatInterface: DOMUtils.select('#chat-interface'),
            welcomeForm: DOMUtils.select('#welcome-form'),
            welcomeInput: DOMUtils.select('#welcome-input'),
            welcomeSendBtn: DOMUtils.select('#welcome-send-btn'),
            chatSendBtn: DOMUtils.select('#chat-send-btn'),
            
            // Sidebar elementleri
            sidebar: DOMUtils.select('#sidebar'),
            newChatBtn: DOMUtils.select('#new-chat-btn'),
            settingsBtn: DOMUtils.select('#settings-btn'),
            // Sidebar model select moved to input wrapper
            // modelSelectSidebar: DOMUtils.select('#model-select-sidebar'),
            // customSelectSidebar: DOMUtils.select('#custom-model-select-sidebar'),
            // selectTriggerSidebar: DOMUtils.select('#select-trigger-sidebar'),
            // selectValueSidebar: DOMUtils.select('.select-value-sidebar'),
            // selectOptionsSidebar: DOMUtils.select('#select-options-sidebar'),
            historyList: DOMUtils.select('#history-list'),
            
            // Settings modal elementleri
            settingsModal: DOMUtils.select('#settings-modal'),
            settingsOverlay: DOMUtils.select('#settings-overlay'),
            settingsClose: DOMUtils.select('#settings-close'),
            modelsList: DOMUtils.select('#models-list'),
            modelsSearch: DOMUtils.select('#models-search'),
            addModelOption: DOMUtils.select('#add-model-option'),
            selectOptionsScroll: DOMUtils.select('#select-options-scroll'),
            
            // Molecule modal elementleri
            moleculeModal: DOMUtils.select('#molecule-modal'),
            moleculeOverlay: DOMUtils.select('#molecule-overlay'),
            moleculeClose: DOMUtils.select('#molecule-close'),
            // moleculeDrawerBtn: DOMUtils.select('#molecule-drawer-btn'), // Moved to input wrapper
            moleculeDisplay: DOMUtils.select('#molecule-display'),
            smilesInput: DOMUtils.select('#smiles-input'),
            clearMoleculeBtn: DOMUtils.select('#clear-molecule'),
            insertMoleculeBtn: DOMUtils.select('#insert-molecule'),
            
            // Add dropdown elementleri
            welcomeAddBtn: DOMUtils.select('#welcome-add-btn'),
            chatAddBtn: DOMUtils.select('#chat-add-btn'),
            welcomeAddDropdown: DOMUtils.select('#welcome-add-dropdown'),
            chatAddDropdown: DOMUtils.select('#chat-add-dropdown'),
            welcomeFileUpload: DOMUtils.select('#welcome-file-upload'),
            chatFileUpload: DOMUtils.select('#chat-file-upload'),
            welcomeMoleculeDraw: DOMUtils.select('#welcome-molecule-draw'),
            chatMoleculeDraw: DOMUtils.select('#chat-molecule-draw'),
            
            // Input wrapper model select elementleri
            modelSelectWelcome: DOMUtils.select('#model-select-welcome'),
            customSelectWelcome: DOMUtils.select('#custom-model-select-welcome'),
            selectTriggerWelcome: DOMUtils.select('#select-trigger-welcome'),
            selectValueWelcome: DOMUtils.select('#select-trigger-welcome .select-value-input'),
            selectOptionsWelcome: DOMUtils.select('#select-options-welcome'),
            modelSelectChat: DOMUtils.select('#model-select-chat'),
            customSelectChat: DOMUtils.select('#custom-model-select-chat'),
            selectTriggerChat: DOMUtils.select('#select-trigger-chat'),
            selectValueChat: DOMUtils.select('#select-trigger-chat .select-value-input'),
            selectOptionsChat: DOMUtils.select('#select-options-chat'),
            welcomeAddModelBtn: DOMUtils.select('#welcome-add-model-btn'),
            chatAddModelBtn: DOMUtils.select('#chat-add-model-btn'),
            
            // Tools dropdown elementleri
            welcomeToolsDropdown: DOMUtils.select('#welcome-tools-dropdown'),
            chatToolsDropdown: DOMUtils.select('#chat-tools-dropdown'),
            welcomeToolsBtn: DOMUtils.select('#welcome-tools-btn'),
            chatToolsBtn: DOMUtils.select('#chat-tools-btn'),
            welcomeAdmedTool: DOMUtils.select('#welcome-admed-tool'),
            chatAdmedTool: DOMUtils.select('#chat-admed-tool')
        };
    }

    /**
     * Event listener'ları kur
     */
    setupEventListeners() {
        // Textarea handlers
        if (this.elements.welcomeInput && this.elements.welcomeForm) {
            this.setupTextareaHandlers(this.elements.welcomeInput, this.elements.welcomeForm);
        }
        if (this.elements.input && this.elements.form) {
            this.setupTextareaHandlers(this.elements.input, this.elements.form);
        }
        
        // Scroll listener
        if (this.elements.messagesEl) {
            DOMUtils.on(this.elements.messagesEl, 'scroll', () => {
                this.checkUserScroll();
            });
        }
        
        // Send button handlers
        if (this.elements.welcomeSendBtn) {
            DOMUtils.on(this.elements.welcomeSendBtn, 'click', (e) => {
                if (this.isStreaming) {
                    e.preventDefault();
                    this.stopStream();
                }
            });
        }
        
        if (this.elements.chatSendBtn) {
            DOMUtils.on(this.elements.chatSendBtn, 'click', (e) => {
                if (this.isStreaming) {
                    e.preventDefault();
                    this.stopStream();
                }
            });
        }
    }

    /**
     * Textarea handlers kur
     * @param {HTMLTextAreaElement} textarea - Textarea
     * @param {HTMLFormElement} form - Form
     */
    setupTextareaHandlers(textarea, form) {
        DOMUtils.on(textarea, 'input', () => {
            DOMUtils.autoResizeTextarea(textarea);
        });
        
        DOMUtils.on(textarea, 'keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // Shift+Enter: Yeni satır (varsayılan davranış)
                } else {
                    // Enter: Mesaj gönder
                    e.preventDefault();
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    /**
     * Kullanıcı scroll kontrolü
     */
    checkUserScroll() {
        const isAtBottom = HelperUtils.isAtBottom(this.elements.messagesEl);
        this.userScrolledUp = !isAtBottom;
    }

    /**
     * Akıllı scroll
     */
    smartScroll() {
        HelperUtils.smartScroll(this.elements.messagesEl, this.userScrolledUp);
    }

    /**
     * Mesaj ekle
     * @param {string} text - Mesaj metni
     * @param {string} role - Mesaj rolü (user/bot)
     */
    appendMessage(text, role = 'bot') {
        const el = DOMUtils.create('div', { className: `message ${role}` });
        
        if (role === 'user') {
            // Kullanıcı mesajları için satır sonlarını koru
            const escapedText = DOMUtils.escapeHtml(text);
            el.innerHTML = escapedText.replace(/\n/g, '<br>');
        } else {
            // Bot mesajları için normal textContent
            el.textContent = text;
        }
        
        this.elements.messagesEl.appendChild(el);
        this.smartScroll();
    }

    /**
     * Bot mesajı oluştur
     * @returns {Element}
     */
    createBotMessage() {
        const el = DOMUtils.create('div', { 
            className: 'message bot',
            textContent: ''
        });
        this.elements.messagesEl.appendChild(el);
        this.smartScroll();
        return el;
    }

    /**
     * Typewriter efekti
     * @param {Element} el - Hedef element
     * @param {string} text - Yazılacak metin
     * @param {number} speed - Yazma hızı
     * @returns {Promise}
     */
    async typeWrite(el, text, speed = 0.1) {
        return new Promise((resolve) => {
            let i = 0;
            el.textContent = '';
            
            const step = () => {
                if (i < text.length && this.isStreaming) {
                    el.textContent += text[i++];
                    this.smartScroll();
                    const jitter = HelperUtils.addJitter(speed);
                    setTimeout(step, jitter);
                } else {
                    resolve();
                }
            };
            
            step();
        });
    }

    /**
     * Send button durumunu güncelle
     * @param {boolean} isStreaming - Streaming durumu
     */
    updateSendButtonState(isStreaming) {
        const isInChatMode = this.elements.chatInterface.style.display !== 'none';
        
        if (isInChatMode) {
            this.elements.chatSendBtn.disabled = false;
            const icon = this.elements.chatSendBtn.querySelector('.btn-icon');
            if (isStreaming) {
                icon.src = '../assets/stop.svg';
                icon.alt = 'Durdur';
                DOMUtils.addClass(this.elements.chatSendBtn, 'stop-stream-btn');
            } else {
                icon.src = '../assets/send.svg';
                icon.alt = 'Gönder';
                DOMUtils.removeClass(this.elements.chatSendBtn, 'stop-stream-btn');
            }
        } else {
            this.elements.welcomeSendBtn.disabled = false;
            const icon = this.elements.welcomeSendBtn.querySelector('.btn-icon');
            if (isStreaming) {
                icon.src = '../assets/stop.svg';
                icon.alt = 'Durdur';
                DOMUtils.addClass(this.elements.welcomeSendBtn, 'stop-stream-btn');
            } else {
                icon.src = '../assets/send.svg';
                icon.alt = 'Gönder';
                DOMUtils.removeClass(this.elements.welcomeSendBtn, 'stop-stream-btn');
            }
        }
    }

    /**
     * Chat moduna geç
     * @param {string} selectedModel - Seçili model
     */
    switchToChatMode(selectedModel) {
        DOMUtils.toggleVisibility(this.elements.welcomeScreen, false);
        DOMUtils.toggleVisibility(this.elements.chatInterface, true);
        
        // Welcome'dan seçilen modeli chat model select'e aktar
        if (selectedModel && this.elements.modelSelectChat && this.elements.selectValueChat) {
            this.elements.modelSelectChat.value = selectedModel;
            this.elements.selectValueChat.textContent = selectedModel;
            
            // Chat model select'teki seçenekleri güncelle
            if (this.elements.selectOptionsChat) {
                const options = this.elements.selectOptionsChat.querySelectorAll('.select-option-input');
                options.forEach(option => {
                    if (option.dataset.value === selectedModel) {
                        DOMUtils.addClass(option, 'selected');
                    } else {
                        DOMUtils.removeClass(option, 'selected');
                    }
                });
            }
        }
        
        // Focus'u yumuşak bir şekilde yap (sayfa kaydırmasını önlemek için)
        setTimeout(() => {
            this.elements.input.focus();
        }, 100);
    }

    /**
     * Welcome moduna geç
     */
    switchToWelcomeMode() {
        DOMUtils.toggleVisibility(this.elements.chatInterface, false);
        DOMUtils.toggleVisibility(this.elements.welcomeScreen, true);
        
        // Mesajları temizle
        this.elements.messagesEl.innerHTML = '';
        
        // Input alanlarını temizle
        this.elements.input.value = '';
        this.elements.welcomeInput.value = '';
        
        // Chat'ten seçilen modeli welcome model select'e aktar
        if (this.elements.modelSelectChat && this.elements.modelSelectWelcome && this.elements.selectValueWelcome) {
            const chatSelectedModel = this.elements.modelSelectChat.value;
            if (chatSelectedModel) {
                this.elements.modelSelectWelcome.value = chatSelectedModel;
                this.elements.selectValueWelcome.textContent = chatSelectedModel;
                
                // Welcome model select'teki seçenekleri güncelle
                if (this.elements.selectOptionsWelcome) {
                    const options = this.elements.selectOptionsWelcome.querySelectorAll('.select-option-input');
                    options.forEach(option => {
                        if (option.dataset.value === chatSelectedModel) {
                            DOMUtils.addClass(option, 'selected');
                        } else {
                            DOMUtils.removeClass(option, 'selected');
                        }
                    });
                }
            }
        }
        
        // Textarea yüksekliklerini sıfırla
        DOMUtils.autoResizeTextarea(this.elements.input);
        DOMUtils.autoResizeTextarea(this.elements.welcomeInput);
        
        this.elements.welcomeInput.focus();
    }

    /**
     * Input alanlarını etkinleştir/devre dışı bırak
     * @param {boolean} enabled - Etkin mi
     */
    setInputsEnabled(enabled) {
        this.elements.input.disabled = !enabled;
        this.elements.welcomeInput.disabled = !enabled;
        
        if (enabled) {
            const isInChatMode = this.elements.chatInterface.style.display !== 'none';
            // Focus'u yumuşak bir şekilde yap (sayfa kaydırmasını önlemek için)
            setTimeout(() => {
                if (isInChatMode) {
                    this.elements.input.focus();
                } else {
                    this.elements.welcomeInput.focus();
                }
            }, 50);
        }
    }

    /**
     * Thinking indicator göster
     * @returns {Element}
     */
    showThinkingIndicator() {
        const typingEl = DOMUtils.create('div', { 
            className: 'message typing',
            innerHTML: '<span>Düşünüyor</span><div class="thinking-dots"><span></span><span></span><span></span></div>'
        });
        this.elements.messagesEl.appendChild(typingEl);
        this.smartScroll();
        return typingEl;
    }

    /**
     * Thinking indicator'ı kaldır
     * @param {Element} typingEl - Typing element
     */
    removeThinkingIndicator(typingEl) {
        if (typingEl) {
            typingEl.remove();
        }
    }

    /**
     * Stream durumunu set et
     * @param {boolean} isStreaming - Streaming durumu
     */
    setStreamingState(isStreaming) {
        this.isStreaming = isStreaming;
        this.userScrolledUp = false; // Yeni mesaj için scroll durumunu sıfırla
        this.updateSendButtonState(isStreaming);
    }

    /**
     * Stream'i durdur
     */
    stopStream() {
        this.setStreamingState(false);
        
        // Abort controller'ı kullan
        if (this.currentStreamController) {
            this.currentStreamController.abort();
        }
        
        // Thinking indicator'ı kaldır
        const typing = DOMUtils.select('.message.typing');
        if (typing) typing.remove();
        
        this.setInputsEnabled(true);
    }

    /**
     * Abort controller set et
     * @param {AbortController} controller - Abort controller
     */
    setAbortController(controller) {
        this.currentStreamController = controller;
    }
}

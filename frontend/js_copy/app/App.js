/**
 * ADMET-AI Application
 * Ana uygulama sınıfı - Tüm modülleri koordine eder
 */

// Core Modules
import { DOMUtils } from '../core/dom.js';
import { StorageUtils } from '../core/storage.js';

// Feature Modules
import { ApiService } from '../api/ApiService.js';
import { ConversationService } from '../api/ConversationService.js';
import { ModelService } from '../api/ModelService.js';

import { UIComponent } from '../ui/UIComponent.js';
import { MarkdownRenderer } from '../ui/MarkdownRenderer.js';
import { ThemeManager } from '../theme/ThemeManager.js';
import { ShortcutManager } from '../shortcuts/ShortcutManager.js';
import { SidebarManager } from '../ui/sidebar/SidebarManager.js';
import { ConversationList } from '../ui/sidebar/ConversationList.js';

import { ModalManager } from '../modals/ModalManager.js';
import { SettingsModal } from '../modals/SettingsModal.js';
import { MoleculeModal } from '../modals/MoleculeModal.js';
import { CompareModal } from '../modals/CompareModal.js';
import { AdmetSettingsModal } from '../modals/AdmetSettingsModal.js';

import { ChatManager } from '../chat/ChatManager.js';
import { ToolHandler } from '../tools/ToolHandler.js';
import { AdmetTool } from '../tools/AdmetTool.js';
import { CompareTool } from '../tools/CompareTool.js';

// Feature Modules
import { MoleculeComponent } from '../molecule/MoleculeComponent.js';

export class App {
    constructor() {
        // 1. Core Services (Dependencies)
        this.api = new ApiService();
        this.conversation = new ConversationService();
        this.modelService = new ModelService(this.api);

        // 2. UI & Theme
        this.theme = new ThemeManager();
        this.ui = new UIComponent();
        this.markdown = new MarkdownRenderer();

        // Sidebar Components
        this.conversationList = new ConversationList(
            this.ui,
            this.conversation,
            (id) => this.chat.loadConversation(id)
        );
        this.sidebarManager = new SidebarManager(
            this.ui,
            () => this.modalManager.openSettings(() => this.modals.settings.onOpen())
        );

        // 3. Components
        this.molecule = new MoleculeComponent();

        // 4. Modals
        this.modalManager = new ModalManager(this.ui, this.molecule);
        this.modals = {
            settings: new SettingsModal(this.ui, this.modelService, () => this.onModelsUpdated()),
            molecule: new MoleculeModal(this.ui, this.molecule, this.api),
            compare: new CompareModal(this.ui, (m, p) => this.chat.messageHandler.processComparison(m, p)),
            admet: new AdmetSettingsModal(this.ui, (p) => this.onAdmetSettingsSaved(p))
        };

        // 5. Tools & Chat
        this.tools = new ToolHandler(this.ui, this.conversation, this.api);
        this.admetTool = new AdmetTool(this.api, this.conversation);
        this.compareTool = new CompareTool(this.api, this.conversation, this.ui);

        this.chat = new ChatManager(this.ui, this.api, this.conversation, this.markdown);

        // 6. Shortcuts
        this.shortcuts = new ShortcutManager();

        // State Flags
        this.isStreaming = false;
    }

    /**
     * Uygulamayı başlat
     */
    async init() {
        console.log('🚀 ADMET-AI başlatılıyor...');

        // 1. Tema başlat
        this.theme.init();

        // 2. Servisleri başlat
        await this.conversation.loadConversations();
        await this.modelService.loadModels();

        // 3. UI Başlat
        // Molecule component init (DOM bağımlı)
        this.molecule.initialize();
        this.modalManager.setMolecule(this.molecule);

        // Sidebar render
        this.conversationList.render();

        // UI Event Listeners (Send buttons, input handlers, scroll, etc.)
        this.ui.setupEventListeners();

        // 4. Modülleri entegre et
        this.integrateModules();

        // 5. Global erişim (debug ve legacy kodlar için)
        window.app = this;

        // 6. Event listener'ları başlat
        this.shortcuts.init();
        this.setupGlobalEventListeners();

        // 7. Onboarding göster
        if (this.conversation.getAllConversations().length === 0) {
            this.renderOnboarding();
        }

        console.log('✅ ADMET-AI hazır!');
    }

    /**
     * Modüller arası bağlantıları kur (Wiring)
     */
    integrateModules() {
        // --- Sidebar Entegrasyonu ---
        this.sidebarManager.setupCustomSelect();

        // --- Chat Module Entegrasyonu ---

        // Chat module tool callbacks
        this.chat.setToolCallbacks(
            () => this.tools.getActiveTool(),                   // getActiveTool
            () => this.admetTool.getSelectedProperties()        // getSelectedAdmetParameters
        );

        // Chat module render callbacks
        this.chat.setRenderCallbacks({
            onChartRender: (el) => this.tools.renderAdmetChart(el),
            onExportButtons: (el) => this.tools.addExportButtons(el),
            onTitleUpdate: (id, title, loading) => this.conversationList.updateTitleInUI(id, title, loading)
        });

        // Chat manager init (listeners bind)
        this.chat.init();


        // --- Tools Module Entegrasyonu ---

        // Tool state değişince
        this.tools.setCallbacks({
            onToolStateChange: (tool) => {
                if (tool === 'admet') {
                    this.admetTool.activate(this.admetTool.getDefaultProperties());
                } else {
                    this.admetTool.deactivate();
                }
            }
        });

        // AdmetTool ayarları
        this.admetTool.activate(AdmetTool.getDefaultProperties()); // Varsayılan aktif


        // --- Modals Entegrasyonu ---

        // ModalManager wrapper fonksiyonları (UIComponent için)
        this.ui.bindModalTriggers({
            openSettings: () => this.modalManager.openSettings(() => this.modals.settings.onOpen()),
            openMolecule: () => this.modalManager.openMolecule(),
            openCompare: () => this.modalManager.openCompare(),
            openAdmetSettings: () => this.modalManager.openAdmetSettings()
        });

        // Modals Event Listeners Init
        // Bu modalların DOM elementlerine (buton, input vb.) event listener eklemesi gerekiyor
        if (this.modals.molecule) this.modals.molecule.setupEventListeners();
        if (this.modals.compare) this.modals.compare.setupEventListeners();
        if (this.modals.admet) this.modals.admet.setupEventListeners();

        this.ui.bindModalClosers({
            closeSettings: () => this.modalManager.closeSettings(),
            closeMolecule: () => this.modalManager.closeMolecule(),
            closeCompare: () => this.modalManager.closeCompare(),
            closeAdmetSettings: () => this.modalManager.closeAdmetSettings()
        });

        // Molecule Modal -> Chat entegrasyonu
        this.modals.molecule.setInsertCallback((smiles) => {
            this.modalManager.closeMolecule();

            // Chat moduna geç ve input'a yaz
            this.ui.switchToChatMode(this.ui.elements.modelSelectWelcome?.value);
            this.ui.elements.input.value = smiles;
            this.ui.elements.input.focus();
        });

        // Compare Modal callback
        this.modals.compare.onComparisonSubmit = async (molecules, properties) => {
            this.modalManager.closeCompare();
            await this.compareTool.processComparison(molecules, this.ui.elements.modelSelectChat?.value, properties);
        };
    }

    /**
     * Global event listener'lar
     */
    setupGlobalEventListeners() {
        // Shortcuts entegrasyonu
        this.shortcuts.register('ctrl+k', () => this.ui.focusSearch());
        this.shortcuts.register('esc', () => this.modalManager.handleEscapeKey());
        this.shortcuts.register('ctrl+n', () => this.startNewChat());
        this.shortcuts.register('ctrl+shift+t', () => this.theme.toggle());

        // New Chat Button
        if (this.ui.elements.newChatBtn) {
            DOMUtils.on(this.ui.elements.newChatBtn, 'click', () => this.startNewChat());
        }
    }

    /**
     * Yeni sohbet başlat
     */
    startNewChat() {
        // ConversationService'de startNewConversation metodu yok, createConversationWithTempTitle kullanıyoruz
        // Ancak yeni sohbet UI'da sadece 'resetUI' ile başlar, veritabanına kayıt ilk mesajla olur.
        // Bu nedenle burada model seçimini sıfırlayıp welcome ekranına dönmek yeterli olabilir.
        // Eğer kullanıcı yeni sohbete tıkladığında listeye hemen "Yeni Sohbet" eklensin istiyorsak:

        // const conversation = this.conversation.createConversationWithTempTitle('Yeni Sohbet', 'gpt-4');
        // this.conversationList.setActiveConversation(conversation.id);
        // this.conversationList.render();

        // Mevcut mantık: UI'ı sıfırla, conversation ID'yi null yap. İlk mesajda yeni conversation oluşur.
        this.conversation.currentConversationId = null;
        this.ui.resetUI();
        this.chat.clearFileChips();
        this.conversationList.setActiveConversation(null);
    }

    /**
     * Model listesi güncellendiğinde
     */
    onModelsUpdated() {
        // UI'daki model listelerini güncelle (varsa logic)
        console.log('Models updated');
    }

    /**
     * ADMET ayarları kaydedildiğinde
     */
    onAdmetSettingsSaved(properties) {
        this.admetTool.setSelectedProperties(properties);
        this.modalManager.closeAdmetSettings();
    }

    /**
     * Onboarding ekranını render et
     */
    renderOnboarding() {
        // Legacy: main.js renderOnboarding mantığı
    }

    /**
     * Toggle conversation menu (Main.js legacy)
     * HTML onclick="app.toggleConversationMenu(...)" için gerekli
     */
    toggleConversationMenu(event, conversationId) {
        event.preventDefault();
        event.stopPropagation();

        const menu = document.getElementById('conversation-menu');
        if (!menu) return; // Guard clause
        const isVisible = menu.classList.contains('show');

        // Her durumda mevcut listener'ı temizle
        if (this._outsideClickListener) {
            document.removeEventListener('click', this._outsideClickListener);
            this._outsideClickListener = null;
        }

        if (isVisible) {
            this.hideConversationMenu();
            // Eğer aynı butona tıklandıysa kapat ve çık
            if (this.currentMenuConversationId === conversationId) {
                return;
            }
            // Farklı butona tıklandıysa aşağıdan devam edip yenisini aç
        }

        // Menu'yu göster
        this.currentMenuConversationId = conversationId;
        menu.classList.add('show');
        document.body.classList.add('menu-open');

        // Butonun parent elementini al (history-item-menu)
        const buttonElement = event.target.closest('.history-item-menu');
        const historyItem = buttonElement.closest('.history-item');
        this.currentActiveButton = buttonElement;
        this.currentActiveHistoryItem = historyItem;

        // Butonu ve history item'ı aktif göster
        buttonElement.classList.add('active');
        historyItem.classList.add('menu-active');

        // Menu pozisyonunu ayarla (sidebar'ın sağ tarafında)
        const sidebar = document.querySelector('.sidebar');
        const sidebarRect = sidebar.getBoundingClientRect();
        const buttonRect = buttonElement.getBoundingClientRect();

        // Menüyü geçici olarak göster ve yüksekliğini hesapla
        menu.style.visibility = 'hidden';
        menu.style.opacity = '0';
        menu.style.display = 'block';

        const menuHeight = menu.offsetHeight;
        const viewportHeight = window.innerHeight;

        // Menünün ekranın alt kısmına taşacağını kontrol et
        const wouldOverflowBottom = (buttonRect.top + menuHeight) > viewportHeight;

        // Menüyü tekrar görünür yap (CSS transition için opacity/visibility ayarları CSS'te olabilir)
        menu.style.visibility = '';
        menu.style.opacity = '';
        menu.style.display = '';

        menu.style.left = `${sidebarRect.right + 5}px`;

        if (wouldOverflowBottom) {
            // Menüyü butonun üstüne yerleştir
            const topPosition = buttonRect.bottom - menuHeight;

            // Menünün ekranın üst kısmına taşmamasını kontrol et
            if (topPosition < 0) {
                // Menüyü ekranın üst kısmına yapıştır
                menu.style.top = '10px';
            } else {
                menu.style.top = `${topPosition}px`;
            }
        } else {
            // Menüyü butonun altına yerleştir (varsayılan)
            menu.style.top = `${buttonRect.top}px`;
        }

        // Dışarı tıklama ile kapatma
        this._outsideClickListener = this.handleMenuOutsideClick.bind(this);
        setTimeout(() => {
            document.addEventListener('click', this._outsideClickListener);
        }, 0);

        // Menu butonlarına event listener ekle
        this.setupMenuEventListeners();

        // Pin butonunun görünümünü güncelle
        this.updatePinButtonAppearance();
    }

    hideConversationMenu() {
        const menu = document.getElementById('conversation-menu');
        if (!menu) return;

        menu.classList.remove('show');
        document.body.classList.remove('menu-open');

        // Aktif butonu ve history item'ı temizle
        if (this.currentActiveButton) {
            this.currentActiveButton.classList.remove('active');
            this.currentActiveButton = null;
        }

        if (this.currentActiveHistoryItem) {
            this.currentActiveHistoryItem.classList.remove('menu-active');
            this.currentActiveHistoryItem = null;
        }

        this.currentMenuConversationId = null;

        if (this._outsideClickListener) {
            document.removeEventListener('click', this._outsideClickListener);
            this._outsideClickListener = null;
        }
    }

    handleMenuOutsideClick(event) {
        const menu = document.getElementById('conversation-menu');
        if (menu && !menu.contains(event.target)) {
            this.hideConversationMenu();
        }
    }

    setupMenuEventListeners() {
        const menuPin = document.getElementById('menu-pin');
        const menuRename = document.getElementById('menu-rename');
        const menuDelete = document.getElementById('menu-delete');

        if (!menuPin || !menuRename || !menuDelete) return;

        // Eski event listener'ları temizle
        const newMenuPin = menuPin.cloneNode(true);
        const newMenuRename = menuRename.cloneNode(true);
        const newMenuDelete = menuDelete.cloneNode(true);

        menuPin.replaceWith(newMenuPin);
        menuRename.replaceWith(newMenuRename);
        menuDelete.replaceWith(newMenuDelete);

        newMenuPin.addEventListener('click', () => {
            if (this.currentMenuConversationId) {
                this.pinConversation(this.currentMenuConversationId);
                this.hideConversationMenu();
            }
        });

        newMenuRename.addEventListener('click', () => {
            if (this.currentMenuConversationId) {
                this.renameConversation(this.currentMenuConversationId);
                this.hideConversationMenu();
            }
        });

        newMenuDelete.addEventListener('click', () => {
            if (this.currentMenuConversationId) {
                this.deleteConversation(this.currentMenuConversationId);
                this.hideConversationMenu();
            }
        });
    }

    updatePinButtonAppearance() {
        if (!this.currentMenuConversationId) return;
        const conversation = this.conversation.loadConversation(this.currentMenuConversationId);
        const menuPin = document.getElementById('menu-pin');
        if (!conversation || !menuPin) return;

        const menuIcon = menuPin.querySelector('.menu-icon');
        const menuText = menuPin.querySelector('.menu-text');

        if (conversation.pinned) {
            // Unpin görünümü
            menuIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12.4207 3.45395C13.5425 2.33208 15.3614 2.33208 16.4833 3.45395L20.546 7.51662C21.6679 8.63849 21.6679 10.4574 20.546 11.5793L17.1604 14.9648L19.8008 17.6052C20.1748 17.9792 20.1748 18.5855 19.8008 18.9594C19.4269 19.3334 18.8205 19.3334 18.4466 18.9594L16.0834 16.5962L15.674 18.8144C15.394 20.3314 13.5272 20.9118 12.4364 19.821L8.98476 16.3694L6.83948 18.5147C6.46552 18.8886 5.85922 18.8886 5.48526 18.5147C5.1113 18.1407 5.1113 17.5344 5.48525 17.1605L7.63054 15.0152L4.17891 11.5635C3.08815 10.4728 3.66858 8.60594 5.18551 8.32595L7.40369 7.91654L5.04048 5.55333C4.66652 5.17938 4.66652 4.57307 5.04048 4.19911C5.41444 3.82515 6.02075 3.82515 6.3947 4.19911L9.0351 6.83951L12.4207 3.45395ZM9.0351 9.54795L9.01673 9.56632L5.53313 10.2093L13.7906 18.4668L14.4336 14.9832L14.452 14.9648L9.0351 9.54795ZM15.8062 13.6106L10.3893 8.19373L13.7749 4.80818C14.1488 4.43422 14.7551 4.43422 15.1291 4.80818L19.1918 8.87084C19.5657 9.2448 19.5657 9.8511 19.1918 10.2251L15.8062 13.6106Z" fill="currentColor"/>
                </svg>
            `;
            menuText.textContent = 'Unpin';
        } else {
            // Pin görünümü
            menuIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.9999 17V21M6.9999 12.6667V6C6.9999 4.89543 7.89533 4 8.9999 4H14.9999C16.1045 4 16.9999 4.89543 16.9999 6V12.6667L18.9135 15.4308C19.3727 16.094 18.898 17 18.0913 17H5.90847C5.1018 17 4.62711 16.094 5.08627 15.4308L6.9999 12.6667Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;
            menuText.textContent = 'Pin';
        }
    }

    pinConversation(conversationId) {
        this.conversation.togglePinConversation(conversationId);
        this.conversationList.render();
    }

    /**
     * Konuşma yeniden adlandırma (Main.js legacy)
     */
    renameConversation(conversationId) {
        const historyItem = this.conversationList.findHistoryItemById(conversationId);
        if (!historyItem) return;

        const titleEl = historyItem.querySelector('.history-item-title');
        const inputEl = historyItem.querySelector('.history-item-edit');
        const menuBtn = historyItem.querySelector('.history-item-menu');

        titleEl.style.display = 'none';
        menuBtn.style.display = 'none';
        inputEl.style.display = 'block';
        inputEl.focus();

        const saveRename = () => {
            const newTitle = inputEl.value.trim();
            if (newTitle) {
                this.conversation.updateConversationTitle(conversationId, newTitle);
                titleEl.textContent = newTitle;
            }
            titleEl.style.display = 'block';
            menuBtn.style.display = 'flex';
            inputEl.style.display = 'none';
        }

        inputEl.onblur = saveRename;
        inputEl.onkeydown = (e) => {
            if (e.key === 'Enter') {
                saveRename();
            }
        };
    }

    /**
     * Konuşma silme (Main.js legacy)
     */
    deleteConversation(conversationId) {
        if (confirm('Bu konuşmayı silmek istediğinizden emin misiniz?')) {
            this.conversation.deleteConversation(conversationId);
            this.conversationList.render();

            if (this.conversation.currentConversationId === conversationId) {
                this.startNewChat();
            }
        }
    }
}

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
        this.activeTool = null; // Aktif tool (null, 'admet', vs.)
        // Keep track of last PubChem-loaded SMILES to avoid redundant fetches
        this._lastPubChemSmiles = null;
        
        this.init();
    }

    /**
     * Başlangıçta tüm chip konteynerlerini ve ilgili divider'ları gizle
     */
    initializeFileChipsUI() {
        const welcomeContainer = this.ui.elements.welcomeFileChips;
        const chatContainer = this.ui.elements.chatFileChips;

        [welcomeContainer, chatContainer].forEach(container => {
            if (!container) return;
            container.style.display = 'none';
            const divider = container.nextElementSibling;
            if (divider && divider.classList && divider.classList.contains('chips-divider')) {
                divider.style.display = 'none';
            }
        });
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

        // File chips UI başlangıçta gizli olsun
        this.initializeFileChipsUI();
        
        // Modelleri yükle
        await this.populateModels();
        
        // Konuşma geçmişini yükle
        this.renderConversationHistory();

        // Onboarding içeriklerini doldur
        this.renderOnboarding();
        
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

        // Settings modal: tab switching (models / shortcuts)
        const settingsModal = this.ui.elements.settingsModal;
        if (settingsModal) {
            DOMUtils.on(settingsModal, 'click', (e) => {
                const navBtn = e.target.closest('.settings-nav-btn');
                if (navBtn && navBtn.dataset && navBtn.dataset.tab) {
                    const tab = navBtn.dataset.tab;
                    // remove active class from nav buttons
                    const navBtns = settingsModal.querySelectorAll('.settings-nav-btn');
                    navBtns.forEach(b => DOMUtils.removeClass(b, 'active'));
                    DOMUtils.addClass(navBtn, 'active');

                    // hide all tabs, show selected
                    const tabs = settingsModal.querySelectorAll('.settings-tab');
                    tabs.forEach(t => t.style.display = 'none');
                    const activeTab = settingsModal.querySelector(`#${tab}-tab`);
                    if (activeTab) activeTab.style.display = 'block';
                }
            });

            // Wire change/reset buttons for shortcuts
            const changeMoleculeBtn = settingsModal.querySelector('#change-shortcut-molecule');
            const resetMoleculeBtn = settingsModal.querySelector('#reset-shortcut-molecule');
            const changeAdmetBtn = settingsModal.querySelector('#change-shortcut-admet');
            const resetAdmetBtn = settingsModal.querySelector('#reset-shortcut-admet');

            // Defaults stored in localStorage keys
            const SHORTCUT_KEYS = {
                molecule: 'shortcut_molecule',
                admet: 'shortcut_admet'
            };

            const loadShortcutsToUI = () => {
                const m = DOMUtils.select('#shortcut-molecule-display');
                const a = DOMUtils.select('#shortcut-admet-display');
                const mv = window.localStorage.getItem(SHORTCUT_KEYS.molecule) || 'Alt+M';
                const av = window.localStorage.getItem(SHORTCUT_KEYS.admet) || 'Alt+N';
                if (m) m.textContent = mv;
                if (a) a.textContent = av;
                // Also update the floating shortcuts mini UI (new structure: kbd[data-action])
                try {
                    const miniM = document.querySelector('kbd[data-action="molecule"]');
                    const miniA = document.querySelector('kbd[data-action="admet"]');
                    if (miniM) miniM.textContent = mv;
                    if (miniA) miniA.textContent = av;
                } catch (e) {
                    // ignore
                }
            };

            const listenForNewShortcut = (targetKey, displayEl) => {
                // Create a small capture panel to prompt the user
                const existing = document.getElementById('shortcut-capture-panel');
                if (existing) existing.remove();

                const panel = document.createElement('div');
                panel.id = 'shortcut-capture-panel';
                panel.style.position = 'fixed';
                panel.style.top = '50%';
                panel.style.left = '50%';
                panel.style.transform = 'translate(-50%, -50%)';
                panel.style.background = 'rgba(10,11,12,0.95)';
                panel.style.color = 'var(--gray-100)';
                panel.style.border = '1px solid var(--border-secondary)';
                panel.style.padding = '14px 18px';
                panel.style.borderRadius = '10px';
                panel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
                panel.style.zIndex = 20000;
                panel.innerHTML = `
                    <div style="font-weight:600;margin-bottom:8px;">Yeni kısayolu girin</div>
                    <div style="font-size:13px;color:var(--gray-400);margin-bottom:10px;">Yeni kombinasyonu klavyeden basınız. İptal için <kbd>Esc</kbd>.</div>
                    <div style="text-align:center;margin-top:6px;color:var(--gray-300);font-size:14px" id="shortcut-preview">Bekleniyor...</div>
                    <div style="text-align:right;margin-top:10px"><button id="cancel-shortcut-capture" style="padding:6px 10px;border-radius:8px;background:transparent;border:1px solid var(--border-secondary);color:var(--gray-200);cursor:pointer">İptal</button></div>
                `;

                document.body.appendChild(panel);

                const cleanup = () => {
                    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
                    document.removeEventListener('keydown', keyHandler, true);
                    cancelBtn.removeEventListener('click', onCancel);
                };

                const modKeys = new Set(['Shift', 'Control', 'Alt', 'Meta']);

                const updatePreview = (ev) => {
                    const preview = document.getElementById('shortcut-preview');
                    if (!preview) return;
                    let parts = [];
                    if (ev.ctrlKey) parts.push('Ctrl');
                    if (ev.altKey) parts.push('Alt');
                    if (ev.shiftKey) parts.push('Shift');
                    const k = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key;
                    // if only modifier pressed, show modifier + ...
                    if (modKeys.has(k)) {
                        preview.textContent = parts.join('+') + (parts.length ? '+' : '') + '...';
                    } else {
                        preview.textContent = parts.concat([k.length === 1 ? k.toUpperCase() : k]).join('+');
                    }
                };

                const keyHandler = (ev) => {
                    // ESC -> cancel
                    if (ev.key === 'Escape') {
                        ev.preventDefault();
                        cleanup();
                        return;
                    }

                    // Update preview always
                    updatePreview(ev);

                    // If the pressed key is only a modifier, wait for the next key
                    if (modKeys.has(ev.key)) {
                        // do not finalize yet
                        ev.preventDefault();
                        return;
                    }

                    // Finalize on non-modifier key
                    ev.preventDefault();
                    let parts = [];
                    if (ev.ctrlKey) parts.push('Ctrl');
                    if (ev.altKey) parts.push('Alt');
                    if (ev.shiftKey) parts.push('Shift');
                    const k = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key;
                    parts.push(k);
                    const combo = parts.join('+');
                    window.localStorage.setItem(targetKey, combo);
                    loadShortcutsToUI();
                    cleanup();
                };

                const cancelBtn = panel.querySelector('#cancel-shortcut-capture');
                const onCancel = (e) => { e.preventDefault(); cleanup(); };

                // Capture at document level (use capture true to get it first)
                document.addEventListener('keydown', keyHandler, true);
                cancelBtn.addEventListener('click', onCancel);
            };

            if (changeMoleculeBtn) {
                changeMoleculeBtn.addEventListener('click', () => listenForNewShortcut(SHORTCUT_KEYS.molecule));
            }
            if (resetMoleculeBtn) {
                resetMoleculeBtn.addEventListener('click', () => { window.localStorage.removeItem(SHORTCUT_KEYS.molecule); loadShortcutsToUI(); });
            }
            if (changeAdmetBtn) {
                changeAdmetBtn.addEventListener('click', () => listenForNewShortcut(SHORTCUT_KEYS.admet));
            }
            if (resetAdmetBtn) {
                resetAdmetBtn.addEventListener('click', () => { window.localStorage.removeItem(SHORTCUT_KEYS.admet); loadShortcutsToUI(); });
            }

            loadShortcutsToUI();
        }

        // Global kısayollar: dynamic from localStorage (defaults Alt+M / Alt+N)
        DOMUtils.on(document, 'keydown', (e) => {
            try {
                const mv = window.localStorage.getItem('shortcut_molecule') || 'Alt+M';
                const av = window.localStorage.getItem('shortcut_admet') || 'Alt+N';

                const normalizeKey = (k) => {
                    if (!k) return k;
                    return k.length === 1 ? k.toUpperCase() : k;
                };

                const matchCombo = (ev, combo) => {
                    if (!combo) return false;
                    const parts = combo.split('+').map(p => p.trim()).filter(Boolean);
                    let need = { ctrl: false, alt: false, shift: false, meta: false };
                    let keyPart = null;
                    parts.forEach(p => {
                        const low = p.toLowerCase();
                        if (low === 'ctrl' || low === 'control') need.ctrl = true;
                        else if (low === 'alt') need.alt = true;
                        else if (low === 'shift') need.shift = true;
                        else if (low === 'meta' || low === 'cmd' || low === 'command') need.meta = true;
                        else keyPart = p;
                    });

                    if (need.ctrl !== !!ev.ctrlKey) return false;
                    if (need.alt !== !!ev.altKey) return false;
                    if (need.shift !== !!ev.shiftKey) return false;
                    if (need.meta !== !!ev.metaKey) return false;

                    if (!keyPart) return false; // require a non-modifier key to trigger
                    const evKey = normalizeKey(ev.key.length === 1 ? ev.key : ev.key);
                    const wantKey = normalizeKey(keyPart.length === 1 ? keyPart : keyPart);
                    return String(evKey).toLowerCase() === String(wantKey).toLowerCase();
                };

                if (matchCombo(e, mv)) {
                    e.preventDefault();
                    this.openMoleculeModal();
                    return;
                }

                if (matchCombo(e, av)) {
                    e.preventDefault();
                    this.handleAdmetTool();
                    return;
                }
            } catch (err) {
                // fallback to defaults on error
                if (e.altKey && (e.key === 'm' || e.key === 'M')) {
                    e.preventDefault();
                    this.openMoleculeModal();
                }
                if (e.altKey && (e.key === 'n' || e.key === 'N')) {
                    e.preventDefault();
                    this.handleAdmetTool();
                }
            }
        });

        // Click handlers for shortcuts in the UI (shortcuts-mini-list)
        const shortcutsContainer = DOMUtils.select('#shortcuts-floating');
        if (shortcutsContainer) {
            DOMUtils.on(shortcutsContainer, 'click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                const action = target.dataset.action;
                if (action === 'molecule') {
                    this.openMoleculeModal();
                } else if (action === 'admet') {
                    this.handleAdmetTool();
                }
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

        // Resolve & Draw button (new UI flow)
        // New molecule query input + send button
        const moleculeQueryInput = DOMUtils.select('#molecule-query-input');
        const moleculeQuerySend = DOMUtils.select('#molecule-query-send');
        if (moleculeQueryInput && moleculeQuerySend) {
            DOMUtils.on(moleculeQuerySend, 'click', async (e) => {
                e.preventDefault();
                const q = moleculeQueryInput.value.trim();
                if (!q) return;

                // Yeni SMILES çıkarma endpoint'ini kullan - ADMET analizi yapmaz
                try {
                    const model = this.ui.elements.modelSelectChat ? this.ui.elements.modelSelectChat.value : null;
                    const response = await fetch('/api/chat/extract-smiles', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: q,
                            model: model
                        })
                    });

                    const data = await response.json();

                    if (data.success && data.smiles) {
                        // Update the SMILES display
                        if (this.ui.elements.smilesInput) this.ui.elements.smilesInput.value = data.smiles;
                        const smilesDisplay = document.getElementById('smiles-display');
                        if (smilesDisplay) smilesDisplay.textContent = data.smiles;
                        
                        // Update the molecule visualization
                        this.updateMoleculeDisplay();

                        // Clear the input
                        moleculeQueryInput.value = '';
                        DOMUtils.autoResizeTextarea(moleculeQueryInput);
                    } else {
                        alert(data.message || 'Molekül bulunamadı. Lütfen geçerli bir molekül ismi veya SMILES formatı girin.');
                    }
                } catch (error) {
                    console.error('Molecule resolution failed:', error);
                    alert('Molekül çözümleme hatası: ' + error.message);
                }
            });

            // Submit on Enter (without Shift)
            DOMUtils.on(moleculeQueryInput, 'keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    moleculeQuerySend.click();
                }
            });
        }

        // When ADMET tool is active and user types a name (not SMILES) into the smiles input,
        // attempt to resolve it to SMILES automatically using PubChem and populate the field.
        if (this.ui.elements.smilesInput) {
            // debounce to avoid too many requests
            let timeout = null;
            DOMUtils.on(this.ui.elements.smilesInput, 'change', async () => {
                // Only run when admet tool is active
                if (this.activeTool !== 'admet') return;

                const raw = this.ui.elements.smilesInput.value.trim();
                if (!raw) return;

                // Quick heuristic: if it looks like a SMILES, do nothing
                const smilesLike = /^[A-Za-z0-9@+\-\[\]()=#\\\/%.]+$/.test(raw);
                if (smilesLike && raw.length > 1 && raw.length < 200 && /[=#@0-9]/.test(raw)) {
                    // Probably already a SMILES, don't resolve
                    return;
                }

                clearTimeout(timeout);
                timeout = setTimeout(async () => {
                    try {
                        const api = this.api;
                        const resolved = await api.getSmilesFromName(raw);
                        if (resolved) {
                            // populate the input and trigger display update
                            this.ui.elements.smilesInput.value = resolved;
                            this.updateMoleculeDisplay();
                        } else {
                            // try translating via LLM by sending a normal chat request (fallback not implemented here)
                            console.log('Could not resolve name to SMILES for:', raw);
                        }
                    } catch (e) {
                        console.error('Name-to-SMILES resolution error:', e);
                    }
                }, 450);
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

        // Molekül örnekleri kaldırıldı

        // Zoom kontrolleri için event listener'lar
        this.setupMoleculeControls();

        // Export ve arama butonları için event listener'lar
        this.setupMoleculeActions();

        // Comparison Modal
        if (this.ui.elements.compareToolBtn) {
            DOMUtils.on(this.ui.elements.compareToolBtn, 'click', () => this.openCompareModal());
        }
        if (this.ui.elements.compareClose) {
            DOMUtils.on(this.ui.elements.compareClose, 'click', () => this.closeCompareModal());
        }
        if (this.ui.elements.compareOverlay) {
            DOMUtils.on(this.ui.elements.compareOverlay, 'click', () => this.closeCompareModal());
        }
        if (this.ui.elements.runComparisonBtn) {
            DOMUtils.on(this.ui.elements.runComparisonBtn, 'click', () => this.handleComparisonSubmit());
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

        if (this.ui.elements.welcomeCompareTool) {
            DOMUtils.on(this.ui.elements.welcomeCompareTool, 'click', () => {
                this.openCompareModal();
            });
        }

        if (this.ui.elements.chatCompareTool) {
            DOMUtils.on(this.ui.elements.chatCompareTool, 'click', () => {
                this.openCompareModal();
            });
        }

        // Keyboard shortcuts
        DOMUtils.on(document, 'keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.ui.elements.settingsModal.classList.contains('open')) {
                    this.closeSettingsModal();
                } else if (this.ui.elements.moleculeModal.classList.contains('open')) {
                    this.closeMoleculeModal();
                } else if (this.ui.elements.compareModal.classList.contains('open')) {
                    this.closeCompareModal();
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
     * Comparison form submit handler
     */
    async handleComparisonSubmit() {
        const text = this.ui.elements.compareInput.value.trim();
        if (!text) return;

        const molecules = text.split('\n').map(m => m.trim()).filter(m => m);
        if (molecules.length < 2) {
            alert('Lütfen karşılaştırmak için en az 2 molekül girin.');
            return;
        }

        this.closeCompareModal();
        const model = this.ui.elements.modelSelectSidebar.value;
        this.ui.switchToChatMode(model);
        await this.processComparison(molecules, model);
    }

    /**
     * Welcome onboarding alanlarını doldur
     */
    renderOnboarding() {
        const quickGrid = document.getElementById('quick-start-grid');
        const emptyState = document.getElementById('empty-state');
        if (!quickGrid) return;

        // Hızlı başlat kartları (eczacı/molekül toksisite odaklı)
        const quickCards = [
            {
                title: 'Kafein toksisite profili',
                desc: 'ADMET parametreleri ve risk değerlendirmesi',
                prompt: 'Kafein için ADMET ve toksisite risk profilini çıkar. Özellikle hepatotoksisite ve kardiyotoksisite risklerini değerlendir.'
            },
            {
                title: 'Eşdeğer molekül öner',
                desc: 'Benzer etki, daha düşük risk',
                prompt: 'Parasetamol için terapötik açıdan benzer ama daha düşük toksisite riski taşıyan alternatif molekülleri öner ve kıyasla.'
            },
            {
                title: 'SMILES çöz ve çiz',
                desc: 'İsimden yapıyı çöz, görselleştir',
                prompt: 'Ibuprofen için SMILES’ı çöz, yapıyı çiz ve temel ADMET özetini ver.'
            },
            {
                title: 'Formülasyonda etkileşim',
                desc: 'Yardımcı madde-molekül riski',
                prompt: 'Lidokain ile etanol ve propilen glikol varlığında stabilite ve potansiyel toksisite etkileşim risklerini değerlendir.'
            },
        ];

        quickGrid.innerHTML = '';
        quickCards.forEach(c => {
            const el = DOMUtils.create('div', { className: 'card' });
            el.innerHTML = `<div class="card-title">${DOMUtils.escapeHtml(c.title)}</div><div class="card-desc">${DOMUtils.escapeHtml(c.desc)}</div>`;
            DOMUtils.on(el, 'click', () => {
                const ta = this.ui.elements.welcomeInput;
                if (!ta) return;
                const val = c.prompt;
                ta.value = val;
                DOMUtils.autoResizeTextarea(ta);
                ta.focus();
            });
            quickGrid.appendChild(el);
        });

        // Son konuşmalar (3-5 örnek mesaj kartı)
        // hide empty state when no recent panel (we still show it if quick-cards empty)
        if (emptyState) emptyState.style.display = 'block';
    }

    /**
     * Mesaj işleme
     * @param {string} text - Mesaj metni
     * @param {string} model - Model
     */
    async processMessage(text, model) {
        // Yeni konuşma oluştur (geçici başlık ile)
        if (!this.conversation.currentConversationId) {
            const conversation = this.conversation.createConversationWithTempTitle(text, model);
            this.conversation.setCurrentConversation(conversation.id);
            
            // Sidebar'da konuşmayı göster
            this.renderConversationHistory();
            
            // Başlık üretimini asenkron olarak başlat
            this.conversation.onTitleUpdated = (conversationId, newTitle, isLoading) => {
                this.updateConversationTitleInUI(conversationId, newTitle, isLoading);
            };
            this.conversation.updateConversationTitleAsync(conversation.id, text, model);
        }

        // Kullanıcı mesajını ekle
        this.ui.appendMessage(text, 'user');

        // Kullanıcı mesajını konuşmaya kaydet (sadece mevcut konuşmaya ekleniyorsa)
        const currentConversation = this.conversation.getCurrentConversation();
        if (currentConversation && currentConversation.messages.length > 0) {
            this.conversation.updateConversation(this.conversation.currentConversationId, { 
                role: 'user', 
                content: text 
            });
        }

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

            // Stream durduruldu mu kontrol et
            if (this.isStreaming) {
                const reply = HelperUtils.extractTextFromResponse(data) || 'Boş yanıt';

                // Bot mesajını konuşmaya kaydet
                this.conversation.updateConversation(this.conversation.currentConversationId, { 
                    role: 'bot', 
                    content: reply 
                });

                // Bot mesajını oluştur ve typewriter efekti ile render et
                const botMessageContainer = this.ui.createBotMessage();
                const contentEl = botMessageContainer.querySelector('.message-content');
                await this.markdown.typeWriteMarkdown(contentEl, reply, 0.1, () => {
                    this.ui.smartScroll();
                });

                // Embed raw ADMET data for export
                if (data.rawAdmetData) {
                    const scriptEl = DOMUtils.create('script', {
                        type: 'application/json',
                        id: 'admet-raw-data',
                        textContent: JSON.stringify(data.rawAdmetData)
                    });
                    botMessageContainer.appendChild(scriptEl);
                }

                // Final enhancements
                this.markdown.applySyntaxHighlighting(contentEl);
                this.markdown.addCopyButtons(contentEl);
                this.renderAdmetChart(contentEl);
                this.addExportButtons(botMessageContainer);
            } else {
                // Stream durduruldu, sadece thinking indicator'ı kaldır
                console.log('Stream durduruldu, response işlenmedi');
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
     * Karşılaştırma işleme
     * @param {string[]} molecules - Molekül listesi
     * @param {string} model - Model
     */
    async processComparison(molecules, model) {
        const userMessage = `Bu molekülleri karşılaştır: ${molecules.join(', ')}`;
        // Yeni konuşma oluştur
        if (!this.conversation.currentConversationId) {
            const conversation = this.conversation.createConversation(userMessage, model);
            this.conversation.setCurrentConversation(conversation.id);
        }

        this.ui.appendMessage(userMessage, 'user');
        this.conversation.updateConversation(this.conversation.currentConversationId, { role: 'user', content: userMessage });

        const typingEl = this.ui.showThinkingIndicator();
        await new Promise(resolve => setTimeout(resolve, 50));
        this.isStreaming = true;
        this.ui.setStreamingState(true);

        try {
            const controller = new AbortController();
            this.ui.setAbortController(controller);

            const data = await this.api.sendComparisonRequest(molecules, model, controller.signal);

            this.ui.removeThinkingIndicator(typingEl);

            if (this.isStreaming) {
                const reply = HelperUtils.extractTextFromResponse(data) || 'Boş yanıt';
                this.conversation.updateConversation(this.conversation.currentConversationId, { role: 'bot', content: reply });

                const botMessageContainer = this.ui.createBotMessage();
                const contentEl = botMessageContainer.querySelector('.message-content');
                await this.markdown.typeWriteMarkdown(contentEl, reply, 0.1, () => this.ui.smartScroll());

                // Embed raw comparison data for export
                if (data.rawComparisonData) {
                    const scriptEl = DOMUtils.create('script', {
                        type: 'application/json',
                        id: 'admet-raw-data', // Reuse the same ID as single ADMET reports
                        textContent: JSON.stringify(data.rawComparisonData)
                    });
                    botMessageContainer.appendChild(scriptEl);
                }

                this.markdown.applySyntaxHighlighting(contentEl);
                this.markdown.addCopyButtons(contentEl);
                // Call addExportButtons for comparison reports as well
                this.addExportButtons(botMessageContainer);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                this.ui.removeThinkingIndicator(typingEl);
                this.ui.appendMessage('Sunucu hatası: ' + String(err), 'bot');
            }
        } finally {
            this.isStreaming = false;
            this.ui.setStreamingState(false);
            this.ui.setAbortController(null);
            this.ui.setInputsEnabled(true);
        }
    }

    /**
     * Renders a radar chart for ADMET analysis if data is available.
     * @param {HTMLElement} messageElement The bot message element containing the chart data.
     */
    renderAdmetChart(messageElement) {
        const dataScript = messageElement.querySelector('#admet-radar-chart-data');
        const canvas = messageElement.querySelector('#admet-radar-chart');

        if (!dataScript || !canvas) {
            return; // No chart data or canvas found
        }

        try {
            const chartData = JSON.parse(dataScript.textContent);
            const ctx = canvas.getContext('2d');

            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Risk Profile (0=low, 1=high)',
                        data: chartData.values,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        pointBackgroundColor: 'rgba(255, 99, 132, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: {
                                color: 'rgba(255, 255, 255, 0.2)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.2)'
                            },
                            pointLabels: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                font: {
                                    size: 12
                                }
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                backdropColor: 'rgba(0, 0, 0, 0.5)',
                                stepSize: 0.2,
                                max: 1,
                                min: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Failed to render ADMET chart:", e);
        }
    }

    /**
     * Adds export buttons to a message if it contains ADMET data.
     * @param {HTMLElement} messageElement The bot message element.
     */
    addExportButtons(messageElement) {
        console.log("addExportButtons called for messageElement:", messageElement);
        const rawDataScript = messageElement.querySelector('#admet-raw-data');
        if (!rawDataScript) {
            console.log("rawDataScript not found for messageElement:", messageElement);
            return;
        }
        console.log("rawDataScript found:", rawDataScript);

        const actionsContainer = messageElement.querySelector('.message-actions');
        if (!actionsContainer) {
            console.log("actionsContainer not found for messageElement:", messageElement);
            return;
        }
        console.log("actionsContainer found:", actionsContainer);

        try {
            const rawData = JSON.parse(rawDataScript.textContent);
            console.log("Parsed rawData:", rawData);

            // Determine if it's a single ADMET report or a comparison report
            const isComparison = rawData.successfulResults && Array.isArray(rawData.successfulResults);
            console.log("isComparison:", isComparison);

            const pdfButton = DOMUtils.create('button', { 
                className: 'message-action-btn', 
                textContent: 'PDF',
                title: isComparison ? 'Karşılaştırma Raporunu PDF olarak indir' : 'Raporu PDF olarak indir'
            });
            DOMUtils.on(pdfButton, 'click', () => this.exportToPdf(rawData, isComparison));

            const csvButton = DOMUtils.create('button', { 
                className: 'message-action-btn', 
                textContent: 'CSV',
                title: isComparison ? 'Karşılaştırma Verilerini CSV olarak indir' : 'Tahminleri CSV olarak indir'
            });
            DOMUtils.on(csvButton, 'click', () => this.exportToCsv(rawData, isComparison));

            actionsContainer.appendChild(pdfButton);
            actionsContainer.appendChild(csvButton);
            console.log("PDF and CSV buttons appended to actionsContainer.");

        } catch (e) {
            console.error("Failed to add export buttons (exception caught):", e);
        }
    }

    /**
     * Exports ADMET prediction data to a CSV file.
     * @param {object} rawData The full raw data from the analysis.
     */
    exportToCsv(rawData, isComparison = false) {
        let csvContent = "data:text/csv;charset=utf-8,";
        let fileName = "report.csv";

        if (isComparison) {
            fileName = "comparison_report.csv";
            csvContent += "Molecule,Property,Prediction,Error\r\n"; // Header for comparison

            rawData.successfulResults.forEach(mol => {
                mol.data.admetPredictions.forEach(p => {
                    csvContent += `${mol.data.moleculeName || mol.identifier},${p.property},${p.prediction},\r\n`;
                });
            });
            rawData.failedResults.forEach(mol => {
                csvContent += `${mol.identifier},,,${mol.error}\r\n`;
            });

        } else {
            if (!rawData || !rawData.admetPredictions) return;
            fileName = `${rawData.moleculeName || rawData.smiles}_admet_report.csv`;
            csvContent += "Property,Prediction\r\n"; // Header for single ADMET

            rawData.admetPredictions.forEach(p => {
                const row = `${p.property},${p.prediction}`;
                csvContent += row + "\r\n";
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Exports the full ADMET report to a PDF file.
     * @param {object} rawData The full raw data from the analysis.
     */
    exportToPdf(rawData, isComparison = false) {
        if (!rawData || !window.jspdf) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let yPos = 22;

        if (isComparison) {
            const title = `Molecule Comparison Report`;
            doc.setFontSize(18);
            doc.text(title, 14, yPos);
            yPos += 10;

            rawData.successfulResults.forEach(mol => {
                doc.setFontSize(14);
                doc.text(`Molecule: ${mol.data.moleculeName || mol.identifier}`, 14, yPos);
                yPos += 7;
                doc.setFontSize(10);
                doc.text(`SMILES: ${mol.data.smiles}`, 14, yPos);
                yPos += 5;
                doc.text(`Overall Risk Score: ${mol.data.riskScore.toFixed(1)}/100`, 14, yPos);
                yPos += 10;

                const tableData = mol.data.admetPredictions.map(p => [p.property, p.prediction]);
                doc.autoTable({
                    startY: yPos,
                    head: [['Property', 'Prediction']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [22, 160, 133] },
                });
                yPos = doc.lastAutoTable.finalY + 10;
            });

            if (rawData.failedResults.length > 0) {
                doc.setFontSize(14);
                doc.text('Failed Analyses:', 14, yPos);
                yPos += 7;
                rawData.failedResults.forEach(mol => {
                    doc.setFontSize(10);
                    doc.text(`- ${mol.identifier}: ${mol.error}`, 14, yPos);
                    yPos += 5;
                });
            }

            doc.save(`comparison_report.pdf`);

        } else {
            const title = `ADMET Analysis Report: ${rawData.moleculeName || rawData.smiles}`;
            doc.setFontSize(18);
            doc.text(title, 14, yPos);
            yPos += 10;

            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`SMILES: ${rawData.smiles}`, 14, yPos);
            yPos += 6;
            doc.text(`Overall Risk Score: ${rawData.riskScore.toFixed(1)}/100`, 14, yPos);
            yPos += 12;

            const tableData = rawData.admetPredictions.map(p => [p.property, p.prediction]);

            doc.autoTable({
                startY: yPos,
                head: [['Property', 'Prediction']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133] },
            });

            const finalY = doc.lastAutoTable.finalY || 100;
            doc.setFontSize(12);
            doc.text("Pharmacokinetic Profile", 14, finalY + 15);
            doc.setFontSize(10);
            doc.text(rawData.pkProfile.replace(/\*\*/g, ''), 14, finalY + 22, { maxWidth: 180 });

            doc.save(`${rawData.moleculeName || rawData.smiles}_admet_report.pdf`);
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
                    if (idx === 0) {
                        optWelcome.selected = true;
                        this.ui.elements.modelSelectWelcome.value = model;
                    }
                    this.ui.elements.modelSelectWelcome.appendChild(optWelcome);
                }

                // Chat model select'e ekle (gizli)
                if (this.ui.elements.modelSelectChat) {
                    const optChat = DOMUtils.create('option', { 
                        value: model, 
                        textContent: model 
                    });
                    if (idx === 0) {
                        optChat.selected = true;
                        this.ui.elements.modelSelectChat.value = model;
                    }
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
                        className: 'panel-item select-option-input',
                        dataset: { value: model },
                        textContent: model
                    });

                    if (idx === 0) {
                        DOMUtils.addClass(welcomeOption, 'selected');
                    }

                    DOMUtils.on(welcomeOption, 'click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.selectInputOption('welcome', model, model);
                    });

                    this.ui.elements.selectOptionsWelcome.appendChild(welcomeOption);
                }

                // Chat dropdown seçeneklerine ekle (görsel)
                if (this.ui.elements.selectOptionsChat) {
                    const chatOption = DOMUtils.create('div', {
                        className: 'panel-item select-option-input',
                        dataset: { value: model },
                        textContent: model
                    });

                    if (idx === 0) {
                        DOMUtils.addClass(chatOption, 'selected');
                    }

                    DOMUtils.on(chatOption, 'click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
        this.renderPinnedConversations();
        this.renderUnpinnedConversations();
    }

    /**
     * Pinli konuşmaları render et
     */
    renderPinnedConversations() {
        const pinnedList = document.getElementById('pinned-list');
        pinnedList.innerHTML = '';

        const pinnedConversations = this.conversation.getPinnedConversations();
        pinnedConversations.forEach(conversation => {
            const historyItem = this.createHistoryItem(conversation);
            pinnedList.appendChild(historyItem);
        });

        // Pinli konuşma yoksa bölümü gizle
        const pinnedSection = document.getElementById('pinned-conversations');
        if (pinnedConversations.length === 0) {
            pinnedSection.style.display = 'none';
        } else {
            pinnedSection.style.display = 'flex';
        }
    }

    /**
     * Pinli olmayan konuşmaları render et
     */
    renderUnpinnedConversations() {
        this.ui.elements.historyList.innerHTML = '';

        const unpinnedConversations = this.conversation.getUnpinnedConversations();
        unpinnedConversations.forEach(conversation => {
            const historyItem = this.createHistoryItem(conversation);
            this.ui.elements.historyList.appendChild(historyItem);
        });
    }

    /**
     * Konuşma öğesi oluştur
     * @param {Object} conversation - Konuşma objesi
     * @param {boolean} isLoading - Loading durumu
     */
    createHistoryItem(conversation, isLoading = false) {
        const historyItem = DOMUtils.create('div', { 
            className: 'panel-item history-item'
        });
        
        if (conversation.id === this.conversation.currentConversationId) {
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
                this.loadConversation(conversation.id);
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
        
        const allItems = [
            ...pinnedList.querySelectorAll('.history-item'),
            ...historyList.querySelectorAll('.history-item')
        ];

        return allItems.find(item => {
            const editInput = item.querySelector('.history-item-edit');
            return editInput && editInput.dataset.conversationId === conversationId;
        });
    }

    /**
     * Konuşma başlığını UI'da güncelle
     * @param {string} conversationId - Konuşma ID'si
     * @param {string|null} newTitle - Yeni başlık (null ise loading veya hata)
     * @param {boolean} isLoading - Loading durumu
     */
    updateConversationTitleInUI(conversationId, newTitle, isLoading) {
        console.log('updateConversationTitleInUI called:', { conversationId, newTitle, isLoading });
        
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
                    const botMessageContainer = DOMUtils.create('div', { className: 'message bot' });
                    const contentEl = DOMUtils.create('div', { 
                        className: 'message-content',
                        innerHTML: this.markdown.renderToHtml(msg.content)
                    });
                    const actionsEl = DOMUtils.create('div', { className: 'message-actions' });
                    botMessageContainer.appendChild(actionsEl);
                    botMessageContainer.appendChild(contentEl);
                    this.ui.elements.messagesEl.appendChild(botMessageContainer);

                    // Final enhancements
                    this.markdown.applySyntaxHighlighting(contentEl);
                    this.markdown.addCopyButtons(contentEl);
                    this.renderAdmetChart(contentEl);
                    this.addExportButtons(botMessageContainer);
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
     * Compare modal aç
     */
    openCompareModal() {
        if (!this.ui.elements.compareModal) return;
        DOMUtils.addClass(this.ui.elements.compareModal, 'open');
        this.ui.elements.compareInput.focus();
    }

    /**
     * Compare modal kapat
     */
    closeCompareModal() {
        if (!this.ui.elements.compareModal) return;
        DOMUtils.removeClass(this.ui.elements.compareModal, 'open');
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
        
        // Tüm stilleri temizle
        elements.selectOptions.style.position = '';
        elements.selectOptions.style.top = '';
        elements.selectOptions.style.bottom = '';
        elements.selectOptions.style.left = '';
        elements.selectOptions.style.right = '';
        elements.selectOptions.style.width = '';
        elements.selectOptions.style.zIndex = '';
        
        // Chat ekranında yukarı açılma için özel sınıf ekle
        if (type === 'chat') {
            DOMUtils.addClass(elements.selectOptions, 'open-upward');
        } else {
            DOMUtils.removeClass(elements.selectOptions, 'open-upward');
        }
        
        // Menüyü göster
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
        
        // Tüm sınıfları ve stilleri temizle
        DOMUtils.removeClass(elements.selectOptions, 'open');
        DOMUtils.removeClass(elements.selectOptions, 'open-upward');
        DOMUtils.removeClass(elements.selectTrigger, 'active');
        elements.selectTrigger.setAttribute('aria-expanded', 'false');
        
        // Tüm inline stilleri sıfırla
        elements.selectOptions.style.position = '';
        elements.selectOptions.style.top = '';
        elements.selectOptions.style.bottom = '';
        elements.selectOptions.style.left = '';
        elements.selectOptions.style.right = '';
        elements.selectOptions.style.width = '';
        elements.selectOptions.style.zIndex = '';
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
        
        // Event delegation için models list'e click listener ekle
        this.setupModelsListEventDelegation();
        
        // Arama özelliğini kur
        this.setupModelsSearch();
    }

    /**
     * Settings modal kapat
     */
    closeSettingsModal() {
        if (!this.ui.elements.settingsModal) return;
        
        DOMUtils.removeClass(this.ui.elements.settingsModal, 'open');
        
        // Event delegation listener'ını kaldır
        this.removeModelsListEventDelegation();
        
        // Arama özelliğini temizle
        this.removeModelsSearch();
    }

    /**
     * Models list için event delegation kur
     */
    setupModelsListEventDelegation() {
        if (!this.ui.elements.modelsList) return;
        
        // Eski listener'ı kaldır
        this.removeModelsListEventDelegation();
        
        // Yeni listener ekle
        this.modelsListClickHandler = (e) => {
            const switchElement = e.target.closest('.model-switch');
            if (switchElement) {
                e.stopPropagation();
                const modelName = switchElement.dataset.modelName || switchElement.dataset.model;
                if (modelName) {
                    this.toggleModelActive(modelName, switchElement);
                }
            }
        };
        
        DOMUtils.on(this.ui.elements.modelsList, 'click', this.modelsListClickHandler);
    }

    /**
     * Models list event delegation'ını kaldır
     */
    removeModelsListEventDelegation() {
        if (this.ui.elements.modelsList && this.modelsListClickHandler) {
            DOMUtils.off(this.ui.elements.modelsList, 'click', this.modelsListClickHandler);
            this.modelsListClickHandler = null;
        }
    }

    /**
     * Models arama özelliğini kur
     */
    setupModelsSearch() {
        const searchInput = document.getElementById('models-search');
        if (!searchInput) return;
        
        // Eski listener'ı kaldır
        this.removeModelsSearch();
        
        // Debounced search handler
        this.modelsSearchHandler = this.debounce((e) => {
            const query = e.target.value.toLowerCase().trim();
            this.filterModels(query);
        }, 300);
        
        DOMUtils.on(searchInput, 'input', this.modelsSearchHandler);
        
        // Arama input'una focus
        searchInput.focus();
    }

    /**
     * Models arama özelliğini kaldır
     */
    removeModelsSearch() {
        const searchInput = document.getElementById('models-search');
        if (searchInput && this.modelsSearchHandler) {
            DOMUtils.off(searchInput, 'input', this.modelsSearchHandler);
            this.modelsSearchHandler = null;
            searchInput.value = '';
        }
    }

    /**
     * Modelleri filtrele
     * @param {string} query - Arama sorgusu
     */
    filterModels(query) {
        if (!this.ui.elements.modelsList) return;
        
        const modelItems = this.ui.elements.modelsList.querySelectorAll('.model-item');
        let visibleCount = 0;
        
        modelItems.forEach(item => {
            const modelName = item.querySelector('.model-name');
            if (!modelName) return;
            
            const modelText = modelName.textContent.toLowerCase();
            const isVisible = !query || modelText.includes(query);
            
            if (isVisible) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Eğer hiç sonuç yoksa mesaj göster
        this.showNoResultsMessage(visibleCount === 0 && query);
    }

    /**
     * Sonuç bulunamadı mesajını göster/gizle
     * @param {boolean} show - Göster/gizle
     */
    showNoResultsMessage(show) {
        let noResultsEl = this.ui.elements.modelsList.querySelector('.no-results');
        
        if (show && !noResultsEl) {
            noResultsEl = DOMUtils.create('div', {
                className: 'no-results',
                innerHTML: '<div class="no-results-text">Arama kriterlerinize uygun model bulunamadı</div>'
            });
            this.ui.elements.modelsList.appendChild(noResultsEl);
        } else if (!show && noResultsEl) {
            noResultsEl.remove();
        }
    }

    /**
     * Debounce utility
     * @param {Function} func - Fonksiyon
     * @param {number} wait - Bekleme süresi (ms)
     * @returns {Function} - Debounced fonksiyon
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Models listesini doldur (Optimized)
     */
    async populateModelsList() {
        if (!this.ui.elements.modelsList) return;
        
        // Loading state göster
        this.ui.elements.modelsList.innerHTML = '<div class="model-item loading">Modeller yükleniyor...</div>';
        
        try {
            const models = await this.model.getAllModels();

            // DocumentFragment kullanarak performansı artır
            const fragment = document.createDocumentFragment();
            
            // Batch processing ile modelleri işle (57 model için)
            const batchSize = 15; // Her seferde 15 model işle
            let currentIndex = 0;
            
            const processBatch = () => {
                const endIndex = Math.min(currentIndex + batchSize, models.length);
                
                for (let i = currentIndex; i < endIndex; i++) {
                    const model = models[i];
                    const modelItem = this.createModelItem(model);
                    fragment.appendChild(modelItem);
                }
                
                currentIndex = endIndex;
                
                // Eğer daha model varsa, bir sonraki batch'i işle
                if (currentIndex < models.length) {
                    // UI'yi güncelle ve sonraki batch'i işle
                    this.ui.elements.modelsList.appendChild(fragment.cloneNode(true));
                    requestAnimationFrame(processBatch);
                } else {
                    // Son batch - loading state'i kaldır ve fragment'i ekle
                    this.ui.elements.modelsList.innerHTML = '';
                    this.ui.elements.modelsList.appendChild(fragment);
                }
            };
            
            // İlk batch'i başlat
            requestAnimationFrame(processBatch);
            
        } catch (error) {
            this.ui.elements.modelsList.innerHTML = '<div class="model-item error">Modeller yüklenemedi</div>';
        }
    }

    /**
     * Tek bir model item'ı oluştur (Optimized)
     * @param {string} model - Model adı
     * @returns {HTMLElement} - Model item elementi
     */
    createModelItem(model) {
                const modelItem = DOMUtils.create('div', { 
            className: 'panel-item model-item',
                    innerHTML: `
                <span class="panel-item-text model-name">${model}</span>
                <div class="panel-item-controls model-controls">
                            <span class="model-status">free</span>
                            <div class="model-switch ${this.model.isModelActive(model) ? 'active' : ''}" data-model="${model}"></div>
                        </div>
                    `
                });

        // Event delegation kullanarak performansı artır
                const switchElement = modelItem.querySelector('.model-switch');
                if (switchElement) {
            // Data attribute ile model bilgisini sakla
            switchElement.dataset.modelName = model;
        }

        return modelItem;
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
     * Compare modal aç
     */
    openCompareModal() {
        if (!this.ui.elements.compareModal) return;
        DOMUtils.addClass(this.ui.elements.compareModal, 'open');
        this.ui.elements.compareInput.focus();
    }

    /**
     * Compare modal kapat
     */
    closeCompareModal() {
        if (!this.ui.elements.compareModal) return;
        DOMUtils.removeClass(this.ui.elements.compareModal, 'open');
    }

    /**
     * Molekül görselleştirmesini güncelle
     */
    updateMoleculeDisplay() {
        if (!this.ui.elements.smilesInput) return;
        
        const smiles = this.ui.elements.smilesInput.value.trim();
        this.molecule.updateDisplay(smiles);
        
        // Molekül bilgilerini güncelle
        if (smiles) {
            this.updateMoleculeInfo(smiles);
        } else {
            this.hideMoleculeInfo();
        }
    }

    /**
     * Molekül bilgilerini güncelle
     */
    updateMoleculeInfo(smiles) {
        const infoPanel = document.getElementById('molecule-info-panel');
        if (!infoPanel) return;

        // SMILES'i güncelle
        const smilesElement = document.getElementById('info-smiles');
        if (smilesElement) {
            smilesElement.textContent = smiles;
        }

        // Sol paneldeki SMILES display'i güncelle
        const smilesDisplay = document.getElementById('smiles-display');
        // Eğer kullanıcı şu anda inline olarak düzenliyorsa, overlay içeriğini değiştirme
        if (smilesDisplay && !smilesDisplay.isContentEditable) {
            smilesDisplay.textContent = smiles;
        }

        // Basit molekül analizi
        this.analyzeMolecule(smiles);

        // Eğer kullanıcı inline olarak düzenlemiyorsa ve SMILES değiştiyse, otomatik PubChem ara
        try {
            const smilesDisplay = document.getElementById('smiles-display');
            if (smiles && smilesDisplay && !smilesDisplay.isContentEditable) {
                if (this._lastPubChemSmiles !== smiles) {
                    this._lastPubChemSmiles = smiles;
                    this.loadPubChemPanel(smiles);
                }
            }
        } catch (err) {
            // ignore any auto-load error
        }
    }

    /**
     * Molekül analizi yap
     */
    analyzeMolecule(smiles) {
        // Disabled local/hardcoded molecule analysis. We prefer PubChem data.
        // Clear local-derived fields so only PubChem-provided values are shown.
        try {
            const atomCountElement = document.getElementById('info-atom-count');
            if (atomCountElement) atomCountElement.textContent = '-';
            const weightElement = document.getElementById('info-molecular-weight');
            if (weightElement) weightElement.textContent = '-';
            const formulaElement = document.getElementById('info-formula');
            if (formulaElement) formulaElement.textContent = '-';
            const bondCountElement = document.getElementById('info-bond-count');
            if (bondCountElement) bondCountElement.textContent = '-';
            const ringCountElement = document.getElementById('info-ring-count');
            if (ringCountElement) ringCountElement.textContent = '-';
        } catch (error) {
            // non-fatal
        }
    }

    // Local molecule analysis helpers removed — PubChem is used as the source of truth.

    /**
     * Kimyasal formülü subscript ile biçimlendirir. Örn: C6H6 => C<sub>6</sub>H<sub>6</sub>
     * Orijinal metni XSS'e karşı escape edip sadece kendi eklediğimiz <sub> etiketlerini bırakırız.
     * @param {string} formula
     * @returns {string} HTML string
     */
    formatMolecularFormula(formula) {
        if (!formula) return '-';
        const escaped = DOMUtils.escapeHtml(String(formula));
        // Harf veya kapanış parantezinden sonra gelen sayıları alt indis yap
        const withSubs = escaped.replace(/([A-Za-z\)\]])(\d+)/g, (m, symbol, digits) => `${symbol}<sub>${digits}</sub>`);
        return `<span class="chem-formula">${withSubs}</span>`;
    }

    /**
     * Molekül bilgi panelini gizle
     */
    hideMoleculeInfo() {
        // Sol paneldeki SMILES display'i temizle
        const smilesDisplay = document.getElementById('smiles-display');
        if (smilesDisplay) {
            smilesDisplay.textContent = '-';
        }

        // Sağ paneldeki bilgileri temizle
        const smilesElement = document.getElementById('info-smiles');
        if (smilesElement) {
            smilesElement.textContent = '-';
        }
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
     * Molekül kontrolleri için event listener'ları kur
     */
    setupMoleculeControls() {
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const resetViewBtn = document.getElementById('reset-view');
        const toggleHBtn = document.getElementById('toggle-hydrogens');

        if (zoomInBtn) {
            DOMUtils.on(zoomInBtn, 'click', () => {
                this.molecule.zoomIn();
            });
        }

        if (zoomOutBtn) {
            DOMUtils.on(zoomOutBtn, 'click', () => {
                this.molecule.zoomOut();
            });
        }

        if (resetViewBtn) {
            DOMUtils.on(resetViewBtn, 'click', () => {
                this.molecule.resetView();
            });
        }

        if (toggleHBtn) {
            // toggleHBtn is checkbox input now
            DOMUtils.on(toggleHBtn, 'change', (e) => {
                const checked = e.currentTarget.checked;
                if (this.molecule) {
                    this.molecule.showHydrogens = checked;
                    if (this.molecule.drawer) this.molecule.drawer.showHydrogens = checked;
                    // if a graph is already drawn, redraw to reflect change
                    if (this.molecule.drawer && this.molecule.drawer.currentGraph) {
                        this.molecule.drawer.parseAndDrawFromGraph(this.molecule.drawer.currentGraph);
                    } else if (this.molecule.isInitialized) {
                        // if no graph yet but input exists, trigger update
                        const smiles = this.ui.elements.smilesInput ? this.ui.elements.smilesInput.value.trim() : '';
                        if (smiles) this.molecule.updateDisplay(smiles);
                    }
                }
            });
        }

        // Make the SMILES display editable inline when clicked
        try {
            const smilesDisplay = document.getElementById('smiles-display');
            if (smilesDisplay) {
                smilesDisplay.style.cursor = 'text';

                // Click to enter edit mode
                DOMUtils.on(smilesDisplay, 'click', (e) => {
                    e.stopPropagation();
                    if (smilesDisplay.isContentEditable) return;
                    smilesDisplay.contentEditable = true;
                    smilesDisplay.classList.add('editing');

                    // select all text for convenience
                    const range = document.createRange();
                    range.selectNodeContents(smilesDisplay);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                });

                // Commit current edit: update hidden smiles input and redraw
                const commitEdit = () => {
                    smilesDisplay.contentEditable = false;
                    smilesDisplay.classList.remove('editing');
                    let newVal = smilesDisplay.textContent.trim();
                    if (!newVal) newVal = '-';
                    smilesDisplay.textContent = newVal;

                    const hidden = this.ui.elements.smilesInput;
                    if (hidden) {
                        hidden.value = newVal === '-' ? '' : newVal;
                        this.updateMoleculeDisplay();
                    }
                };

                // Live update while typing (instant) and preserve caret position
                function getCaretCharacterOffsetWithin(element) {
                    const selection = window.getSelection();
                    if (!selection || selection.rangeCount === 0) return 0;
                    const range = selection.getRangeAt(0);
                    const preRange = range.cloneRange();
                    preRange.selectNodeContents(element);
                    preRange.setEnd(range.endContainer, range.endOffset);
                    return preRange.toString().length;
                }

                function setCaretPosition(element, chars) {
                    if (chars <= 0) {
                        element.focus();
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        const r = document.createRange();
                        r.setStart(element, 0);
                        r.collapse(true);
                        sel.addRange(r);
                        return;
                    }
                    const nodeStack = [element];
                    let node, found = null;
                    let charCount = 0;
                    while ((node = nodeStack.shift())) {
                        if (node.nodeType === 3) { // text node
                            const nextCharCount = charCount + node.textContent.length;
                            if (chars <= nextCharCount) {
                                found = { node, offset: chars - charCount };
                                break;
                            }
                            charCount = nextCharCount;
                        } else {
                            let i = 0;
                            while (i < node.childNodes.length) {
                                nodeStack.push(node.childNodes[i]);
                                i++;
                            }
                        }
                    }

                    if (found) {
                        element.focus();
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        const r = document.createRange();
                        r.setStart(found.node, Math.min(found.offset, found.node.textContent.length));
                        r.collapse(true);
                        sel.addRange(r);
                    }
                }

                DOMUtils.on(smilesDisplay, 'input', (e) => {
                    // Save caret offset
                    const caret = getCaretCharacterOffsetWithin(smilesDisplay);
                    const text = smilesDisplay.textContent;
                    const hidden = this.ui.elements.smilesInput;
                    if (hidden) hidden.value = text;

                    // Update visualization immediately
                    try {
                        this.updateMoleculeDisplay();
                    } catch (err) {
                        console.error('Immediate molecule update failed', err);
                    }

                    // Restore caret position (try/catch to avoid breaking on edge cases)
                    try {
                        setCaretPosition(smilesDisplay, caret);
                    } catch (err) {
                        // ignore
                    }
                });

                // Keyboard handling: Enter commits, Escape cancels
                DOMUtils.on(smilesDisplay, 'keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commitEdit();
                        smilesDisplay.blur();
                    } else if (e.key === 'Escape') {
                        const hidden = this.ui.elements.smilesInput;
                        smilesDisplay.textContent = hidden ? (hidden.value || '-') : '-';
                        smilesDisplay.contentEditable = false;
                        smilesDisplay.classList.remove('editing');
                        smilesDisplay.blur();
                    }
                });

                // On blur commit
                DOMUtils.on(smilesDisplay, 'blur', () => {
                    if (smilesDisplay.isContentEditable) commitEdit();
                });
            }
        } catch (e) {
            // non-fatal
            console.error('Could not initialize editable SMILES display', e);
        }
    }

    /**
     * Molekül aksiyonları için event listener'ları kur
     */
    setupMoleculeActions() {
        // Search and export removed from molecule input area. No handlers attached.
    }

    /**
     * PubChem'de molekül ara
     */
    searchMoleculeInPubChem() {
        if (!this.ui.elements.smilesInput) return;
        
        const smiles = this.ui.elements.smilesInput.value.trim();
        if (!smiles) {
            alert('Lütfen önce bir SMILES formatı girin.');
            return;
        }

        // Eğer kullanıcı Ctrl/Meta ile tıkladıysa yeni sekmede aç (progressive enhancement)
        // Aksi halde inline paneli doldur
        try {
            // Inline PubChem panelini doldur
            this.loadPubChemPanel(smiles);
        } catch (err) {
            console.error('Inline PubChem panel load failed', err);
            const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles)}`;
            const infoPanel = document.getElementById('molecule-info-panel');
            const content = infoPanel ? infoPanel.querySelector('.info-content') : null;
            if (content) {
                const note = document.createElement('div');
                note.className = 'info-item';
                note.innerHTML = `<span class="info-label">PubChem:</span><span class="info-value"><a href="${searchUrl}" target="_blank" rel="noopener">PubChem'de aç</a></span>`;
                content.appendChild(note);
            } else {
                alert('PubChem bilgileri yüklenemedi. Bağlantı: ' + searchUrl);
            }
        }
    }

    /**
     * Molekül bilgi panelinde PubChem verilerini render et
     */
    async loadPubChemPanel(smiles) {
        const infoPanel = document.getElementById('molecule-info-panel');
        if (!infoPanel) return;

        // Show a lightweight loading state
        const content = infoPanel.querySelector('.info-content');
        if (!content) return;
        const prevHTML = content.innerHTML;
        content.innerHTML = `<div class="info-item"><span class="info-label">PubChem:</span><span class="info-value">Yükleniyor...</span></div>`;

        try {
            const res = await fetch('/api/chat/pubchem-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'No data');

            // Render compact PubChem card
            const p = data.properties || {};
            const rows = [
                ['CID', data.cid || '-'],
                ['IUPAC', p.iupacName || '-'],
                ['Formül', p.molecularFormula || '-'],
                ['Ağırlık', p.molecularWeight ? `${Number(p.molecularWeight).toFixed(2)} g/mol` : '-'],
                ['XLogP', p.xlogP ?? '-'],
                ['H-Donör', p.hBondDonorCount ?? '-'],
                ['H-Akseptör', p.hBondAcceptorCount ?? '-'],
                ['Döndürülebilir Bağ', p.rotatableBondCount ?? '-'],
                ['Ağır Atom', p.heavyAtomCount ?? '-'],
                ['InChIKey', p.inchiKey || '-']
            ];

            // update existing top fields too if empty
            const formulaElement = document.getElementById('info-formula');
            if (formulaElement && p.molecularFormula) formulaElement.innerHTML = this.formatMolecularFormula(p.molecularFormula);
            const weightElement = document.getElementById('info-molecular-weight');
            if (weightElement && p.molecularWeight) weightElement.textContent = `${Number(p.molecularWeight).toFixed(2)} g/mol`;
            const atomCountElement = document.getElementById('info-atom-count');
            if (atomCountElement && typeof p.heavyAtomCount !== 'undefined') atomCountElement.textContent = String(p.heavyAtomCount);

            const desc = data.description ? `<div class="info-item"><span class="info-label">Açıklama:</span><span class="info-value">${DOMUtils.escapeHtml(data.description)}</span></div>` : '';

            content.innerHTML = `
                <div class="info-item"><span class="info-label">PubChem</span><span class="info-value">CID ${rows[0][1]}</span></div>
                ${desc}
                ${rows.slice(1).map(([k,v]) => {
                    const value = k === 'Formül' ? this.formatMolecularFormula(v) : DOMUtils.escapeHtml(String(v));
                    return `<div class="info-item"><span class="info-label">${k}:</span><span class="info-value">${value}</span></div>`;
                }).join('')}
                <div class="info-item"><span class="info-label">Bağlantı:</span><span class="info-value"><a href="https://pubchem.ncbi.nlm.nih.gov/compound/${rows[0][1]}" target="_blank" rel="noopener">PubChem'de aç</a></span></div>
            `;
        } catch (err) {
            console.error('PubChem inline render error', err);
            // Restore previous content on failure and show link instead of forcing new tab
            content.innerHTML = prevHTML + `
                <div class="info-item"><span class="info-label">PubChem:</span><span class="info-value"><a href="https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles)}" target="_blank" rel="noopener">PubChem'de aç</a></span></div>
            `;
        }
    }

    /**
     * Molekülü dışa aktar
     */
    exportMolecule() {
        if (!this.ui.elements.smilesInput) return;
        
        const smiles = this.ui.elements.smilesInput.value.trim();
        if (!smiles) {
            alert('Lütfen önce bir SMILES formatı girin.');
            return;
        }

        // Export seçenekleri göster
        const exportOptions = [
            { name: 'PNG', action: () => this.exportAsPNG() },
            { name: 'SVG', action: () => this.exportAsSVG() },
            { name: 'SMILES', action: () => this.exportAsSMILES() }
        ];

        // Basit export menüsü (şimdilik sadece SMILES)
        this.exportAsSMILES();
    }

    /**
     * SMILES olarak dışa aktar
     */
    exportAsSMILES() {
        const smiles = this.ui.elements.smilesInput.value.trim();
        if (!smiles) return;

        const blob = new Blob([smiles], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `molecule_${Date.now()}.smiles`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * PNG olarak dışa aktar
     */
    exportAsPNG() {
        const canvas = document.getElementById('molecule-canvas');
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `molecule_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * SVG olarak dışa aktar
     */
    exportAsSVG() {
        // SVG export için basit bir implementasyon
        const smiles = this.ui.elements.smilesInput.value.trim();
        if (!smiles) return;

        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
            <text x="200" y="150" text-anchor="middle" fill="white" font-family="monospace">${smiles}</text>
        </svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `molecule_${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
        
        // Diğer dropdown'ları kapat ve bu dropdown'ı aç
        this.closeAllToolsDropdowns();
        this.closeAllAddDropdowns();
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
        // Chips UI'ı güncelle
        this.renderFileChips(files, type);

        // İçeriği input'a ekleme davranışını koru (yalnızca text tabanlılarda okunur)
        files.forEach(file => {
            const isTextLike = /\.(txt|md)$/i.test(file.name);
            if (!isTextLike) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const fileName = file.name;
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
     * Yüklenen dosyaları input alanının altında chip olarak göster
     * @param {File[]} files
     * @param {'welcome'|'chat'} type
     */
    renderFileChips(files, type) {
        const container = type === 'welcome' ? this.ui.elements.welcomeFileChips : this.ui.elements.chatFileChips;
        if (!container) return;

        // Göster ve üst divider'ı görünür yap
        container.style.display = 'flex';
        const topDivider = container.nextElementSibling;
        if (topDivider && topDivider.classList && topDivider.classList.contains('chips-divider')) {
            topDivider.style.display = 'block';
        }

        // Var olanlara ekle: her çağrıda yeni batch'i ekle
        files.forEach((file) => {
            const chip = document.createElement('div');
            chip.className = 'file-chip';

            const extMatch = file.name.match(/\.([^.]+)$/);
            const ext = extMatch ? extMatch[1].toUpperCase() : '';

            const nameEl = document.createElement('span');
            nameEl.className = 'file-name';
            nameEl.textContent = file.name;

            if (ext) {
                const extEl = document.createElement('span');
                extEl.className = 'file-ext';
                extEl.textContent = ext;
                chip.appendChild(extEl);
            }

            chip.appendChild(nameEl);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-chip';
            removeBtn.setAttribute('aria-label', 'Dosyayı kaldır');
            // Use an SVG 'X' icon so it looks crisp and can inherit color
            removeBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;

            removeBtn.addEventListener('click', () => {
                chip.remove();

                // Eğer artık chip kalmadıysa container ve top divider'ı gizle
                if (container.children.length === 0) {
                    container.style.display = 'none';
                    if (topDivider && topDivider.classList && topDivider.classList.contains('chips-divider')) {
                        topDivider.style.display = 'none';
                    }
                }
            });

            chip.appendChild(removeBtn);
            container.appendChild(chip);
        });
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
     * AdMet tool handler
     */
    handleAdmetTool() {
        // Tool'u aktif/pasif yap
        if (this.activeTool === 'admet') {
            this.activeTool = null;
            this.updateToolButtonState();
        } else {
            this.activeTool = 'admet';
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
        const inputWrapper = isInChatMode ? this.ui.elements.inputWrapper : this.ui.elements.welcomeInputWrapper;
        
        if (toolsBtn) {
            if (this.activeTool === 'admet') {
                DOMUtils.addClass(toolsBtn, 'active');
                // Input wrapper'a ADMET aktif class'ı ekle
                if (inputWrapper) {
                    DOMUtils.addClass(inputWrapper, 'admet-active');
                }
                toolsBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 14 5 C 12.90625 5 12 5.90625 12 7 L 12 8 L 6 8 C 4.355469 8 3 9.355469 3 11 L 3 26 L 29 26 L 29 11 C 29 9.355469 27.644531 8 26 8 L 20 8 L 20 7 C 20 5.90625 19.09375 5 18 5 Z M 14 7 L 18 7 L 18 8 L 14 8 Z M 6 10 L 26 10 C 26.566406 10 27 10.433594 27 11 L 27 24 L 5 24 L 5 11 C 5 10.433594 5.433594 10 6 10 Z M 15 13 L 15 16 L 12 16 L 12 18 L 15 18 L 15 21 L 17 21 L 17 18 L 20 18 L 20 16 L 17 16 L 17 13 Z" fill="currentColor"/>
                    </svg>
                    <span>AdMet</span>
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
                // Input wrapper'dan ADMET aktif class'ını kaldır
                if (inputWrapper) {
                    DOMUtils.removeClass(inputWrapper, 'admet-active');
                }
                toolsBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Tools
                `;
            }
        }
    }

    /**
     * Context menu işlevleri
     */
    toggleConversationMenu(event, conversationId) {
        event.preventDefault();
        event.stopPropagation();
        
        const menu = document.getElementById('conversation-menu');
        const isVisible = menu.classList.contains('show');
        
        if (isVisible) {
            this.hideConversationMenu();
            return;
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
        
        // Menüyü tekrar gizle (show class'ı ile tekrar gösterilecek)
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
        setTimeout(() => {
            document.addEventListener('click', this.handleMenuOutsideClick.bind(this), { once: true });
        }, 0);
        
        // Menu butonlarına event listener ekle
        this.setupMenuEventListeners();
        
        // Pin butonunun görünümünü güncelle
        this.updatePinButtonAppearance();
    }
    
    hideConversationMenu() {
        const menu = document.getElementById('conversation-menu');
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
    }
    
    handleMenuOutsideClick(event) {
        const menu = document.getElementById('conversation-menu');
        if (!menu.contains(event.target)) {
            this.hideConversationMenu();
        }
    }
    
    setupMenuEventListeners() {
        const menuPin = document.getElementById('menu-pin');
        const menuRename = document.getElementById('menu-rename');
        const menuDelete = document.getElementById('menu-delete');
        
        // Eski event listener'ları temizle
        menuPin.replaceWith(menuPin.cloneNode(true));
        menuRename.replaceWith(menuRename.cloneNode(true));
        menuDelete.replaceWith(menuDelete.cloneNode(true));
        
        // Yeni referansları al
        const newMenuPin = document.getElementById('menu-pin');
        const newMenuRename = document.getElementById('menu-rename');
        const newMenuDelete = document.getElementById('menu-delete');
        
        newMenuPin.addEventListener('click', () => {
            this.pinConversation(this.currentMenuConversationId);
            this.hideConversationMenu();
        });
        
        newMenuRename.addEventListener('click', () => {
            this.renameConversation(this.currentMenuConversationId);
            this.hideConversationMenu();
        });
        
        newMenuDelete.addEventListener('click', () => {
            this.deleteConversation(this.currentMenuConversationId);
            this.hideConversationMenu();
        });
    }
    
    updatePinButtonAppearance() {
        const conversation = this.conversation.loadConversation(this.currentMenuConversationId);
        const menuPin = document.getElementById('menu-pin');
        const menuIcon = menuPin.querySelector('.menu-icon');
        const menuText = menuPin.querySelector('.menu-text');
        
        if (conversation && conversation.pinned) {
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
        this.renderConversationHistory();
    }
    
    renameConversation(conversationId) {
        const conversation = this.conversation.loadConversation(conversationId);
        if (!conversation) return;
        
        // Konuşma öğesini bul
        const historyItem = this.findHistoryItemById(conversationId);
        if (!historyItem) return;
        
        // Edit moduna geç
        DOMUtils.addClass(historyItem, 'editing');
        const editInput = historyItem.querySelector('.history-item-edit');
        
        // Input'u seç ve focus et
        editInput.focus();
        editInput.select();
        
        // Event listener'ları ekle
        const handleSave = () => {
            const newTitle = editInput.value.trim();
            if (newTitle && newTitle !== conversation.title) {
                conversation.title = newTitle;
                this.conversation.saveConversations();
                this.renderConversationHistory();
            } else {
                // Değişiklik yoksa eski haline döndür
                editInput.value = conversation.title;
                DOMUtils.removeClass(historyItem, 'editing');
            }
        };
        
        const handleCancel = () => {
            editInput.value = conversation.title;
            DOMUtils.removeClass(historyItem, 'editing');
        };
        
        // Enter tuşu ile kaydet
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });
        
        // Focus kaybında kaydet
        editInput.addEventListener('blur', handleSave);
        
        // Dışarı tıklama ile iptal
        const handleOutsideClick = (e) => {
            if (!historyItem.contains(e.target)) {
                handleCancel();
                document.removeEventListener('click', handleOutsideClick);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 0);
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

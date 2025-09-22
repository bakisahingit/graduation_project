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
                        this.ui.elements.selectValueSidebar.textContent = 'Model seçiliyor...';
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

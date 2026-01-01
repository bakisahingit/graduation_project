/**
 * ChatManager
 * Sohbet mantığı ve API etkileşimleri
 */
import { DOMUtils } from '../utils/dom.js';
import { HelperUtils } from '../utils/helpers.js';

export class ChatManager {
    constructor(app, apiService, conversationService, markdownComponent) {
        this.app = app; // Main App instance (access to UI, etc.)
        this.api = apiService;
        this.conversation = conversationService;
        this.markdown = markdownComponent;
        this.isStreaming = false;
        this.activeTool = null; // null or 'admet'
        this.activeFiles = []; // Array to store uploaded files
    }

    init() {
        this.bindEvents();
        this.renderConversationHistory();
    }

    bindEvents() {
        // Form submit handlers
        if (this.app.ui.elements.welcomeForm) {
            DOMUtils.on(this.app.ui.elements.welcomeForm, 'submit', (e) => {
                e.preventDefault();
                this.handleWelcomeSubmit();
            });
        }

        if (this.app.ui.elements.form) {
            DOMUtils.on(this.app.ui.elements.form, 'submit', (e) => {
                e.preventDefault();
                this.handleChatSubmit();
            });
        }

        // File Upload Handlers (delegated to hidden inputs)
        const handleUpload = (e) => this.handleFileUpload(e);
        if (this.app.ui.elements.welcomeFileUpload) DOMUtils.on(this.app.ui.elements.welcomeFileUpload, 'change', handleUpload);
        if (this.app.ui.elements.chatFileUpload) DOMUtils.on(this.app.ui.elements.chatFileUpload, 'change', handleUpload);

        // Triggers for file upload (in Add Dropdown)
        const triggerUpload = (e) => {
            e.preventDefault();
            e.stopPropagation(); // prevent closing dropdown immediately inside click
            const input = this.app.ui.isWelcomeMode ? this.app.ui.elements.welcomeFileUpload : this.app.ui.elements.chatFileUpload;
            if (input) input.click();
            // Close dropdowns
            this.app.layoutManager.closeAddDropdown();
        };

        // Attach to buttons with data-action="upload-file"
        const addFileBtns = document.querySelectorAll('[data-action="upload-file"]');
        addFileBtns.forEach(btn => {
            DOMUtils.on(btn, 'click', triggerUpload);
        });
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Dosya boyutu kontrolü (örn. 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
            return;
        }

        // Dosya türü kontrolü
        const allowedTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
            alert('Desteklenmeyen dosya formatı.');
            return;
        }

        // Add File Chip to UI
        this.addFileChip(file);

        // Reset input
        event.target.value = '';
    }

    addFileChip(file) {
        const container = this.app.ui.isWelcomeMode ? this.app.ui.elements.welcomeFileChips : this.app.ui.elements.chatFileChips;
        if (!container) return;

        container.style.display = 'flex';
        const divider = container.nextElementSibling;
        if (divider && divider.classList.contains('chips-divider')) divider.style.display = 'block';

        const chip = DOMUtils.create('div', { className: 'file-chip' });
        chip.innerHTML = `
            <span class="file-icon">📄</span>
            <span class="file-name">${DOMUtils.escapeHtml(file.name)}</span>
            <button class="file-remove">&times;</button>
        `;

        const removeBtn = chip.querySelector('.file-remove');
        const removeHandler = () => {
            chip.remove();
            this.activeFiles = this.activeFiles.filter(f => f !== file);
            if (this.activeFiles.length === 0) {
                container.style.display = 'none';
                if (divider) divider.style.display = 'none';
            }
        };

        DOMUtils.on(removeBtn, 'click', removeHandler);
        container.appendChild(chip);

        if (!this.activeFiles) this.activeFiles = [];
        this.activeFiles.push(file);
    }

    async handleWelcomeSubmit() {
        const text = this.app.ui.elements.welcomeInput.value.trim();
        if (!text) return;

        const selectedModel = this.app.ui.elements.modelSelectWelcome ? this.app.ui.elements.modelSelectWelcome.value : null;

        // UI'da chat moduna geç
        this.app.layoutManager.switchToChatMode();

        // Chat moduna geçtikten sonra model seçimi aktarılıyor mu?
        // UIComponent.switchToChatMode syncs the model select, so we rely on that or set it explicitly if needed.

        // Mesajı işle
        await this.processMessage(text, selectedModel);
    }

    async handleChatSubmit() {
        const text = this.app.ui.elements.input.value.trim();
        if (!text) return;

        const model = this.app.ui.elements.modelSelectChat ? this.app.ui.elements.modelSelectChat.value : null;

        // Clear input and resize
        this.app.ui.elements.input.value = '';
        DOMUtils.autoResizeTextarea(this.app.ui.elements.input);

        await this.processMessage(text, model);
    }

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
        this.app.ui.appendMessage(text, 'user');

        // Kullanıcı mesajını konuşmaya kaydet
        this.conversation.updateConversation(this.conversation.currentConversationId, { role: 'user', content: text });

        // Input'ları deaktif et
        this.app.ui.setInputsEnabled(false, true);

        // "Thinking" animasyonunu göster
        const typingEl = this.app.ui.showThinkingIndicator();
        await new Promise(resolve => setTimeout(resolve, 50));

        this.isStreaming = true;
        this.app.ui.setStreamingState(true);

        try {
            const controller = new AbortController();
            this.app.ui.setAbortController(controller);

            const currentConversation = this.conversation.getCurrentConversation();
            const conversationHistoryForAPI = currentConversation ? currentConversation.messages : [];

            // Get selected ADMET parameters if the tool is active
            let admetProperties = null;
            if (this.activeTool === 'admet') {
                admetProperties = this.getSelectedAdmetParameters();
            }

            // Prepare content (include files)
            let contextContent = text;
            if (this.activeFiles && this.activeFiles.length > 0) {
                for (const file of this.activeFiles) {
                    try {
                        const content = await this.readFileContent(file);
                        contextContent += `\n\n--- Attached File: ${file.name} ---\n${content}\n--- End File ---\n`;
                    } catch (e) {
                        console.error("Error reading file", file.name, e);
                    }
                }
                // Clear files after sending
                this.activeFiles = [];
                this.clearFileChips();
            }

            const data = await this.api.sendMessage(contextContent, model, conversationHistoryForAPI, controller.signal, this.activeTool, admetProperties);

            if (data.type === 'async') {
                // ASENKRON GÖREV BAŞLADI
                this.setupWebSocket(data.sessionId, typingEl);
            } else {
                // SENKRON (NORMAL) CEVAP
                this.app.ui.removeThinkingIndicator(typingEl);

                if (this.isStreaming) {
                    const reply = HelperUtils.extractTextFromResponse(data) || 'Boş yanıt';
                    this.conversation.updateConversation(this.conversation.currentConversationId, { role: 'bot', content: reply }, data.rawAdmetData);

                    const botMessageContainer = this.app.ui.createBotMessage();
                    const contentEl = botMessageContainer.querySelector('.message-content');
                    await this.markdown.typeWriteMarkdown(contentEl, reply, 0.1, () => this.app.ui.smartScroll());

                    if (data.rawAdmetData) {
                        const scriptEl = DOMUtils.create('script', { type: 'application/json', id: 'admet-raw-data', textContent: JSON.stringify(data.rawAdmetData) });
                        botMessageContainer.appendChild(scriptEl);
                    }

                    this.markdown.applySyntaxHighlighting(contentEl);
                    this.markdown.addCopyButtons(contentEl);

                    if (this.app.moleculeManager) {
                        this.renderAdmetChart(contentEl);
                        this.addExportButtons(botMessageContainer);
                    }
                }
                // Senkron akış için durumu sıfırla
                this.isStreaming = false;
                this.app.ui.setStreamingState(false);
                this.app.ui.setAbortController(null);
                this.app.ui.setInputsEnabled(true);
            }
        } catch (err) {
            this.app.ui.removeThinkingIndicator(typingEl);
            if (err.name === 'AbortError' || err.message === 'Request aborted') {
                console.log('Request was aborted by the user.');
                this.app.ui.appendMessage('İstek iptal edildi.', 'bot');
            } else {
                console.error('An error occurred:', err);
                this.app.ui.appendMessage('Sunucu hatası: ' + String(err), 'bot');
            }
            this.isStreaming = false;
            this.app.ui.setStreamingState(false);
            this.app.ui.setAbortController(null);
            this.app.ui.setInputsEnabled(true);
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    clearFileChips() {
        if (this.app.ui.elements.welcomeFileChips) {
            this.app.ui.elements.welcomeFileChips.innerHTML = '';
            this.app.ui.elements.welcomeFileChips.style.display = 'none';
        }
        if (this.app.ui.elements.chatFileChips) {
            this.app.ui.elements.chatFileChips.innerHTML = '';
            this.app.ui.elements.chatFileChips.style.display = 'none';
        }
        document.querySelectorAll('.chips-divider').forEach(el => el.style.display = 'none');
    }

    setupWebSocket(sessionId, placeholderEl) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}?sessionId=${sessionId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`WebSocket connection opened for session: ${sessionId}`);
        };

        ws.onmessage = async (event) => {
            console.log(`WebSocket message received for session: ${sessionId}`, event.data);
            const result = JSON.parse(event.data);

            const botMessageContainer = this.app.ui.createBotMessage();
            placeholderEl.replaceWith(botMessageContainer);
            const contentEl = botMessageContainer.querySelector('.message-content');

            if (result.status === 'success') {
                const reply = result.output || 'Analiz tamamlandı ancak sonuç boş.';
                const rawData = result.rawAdmetData || result.rawComparisonData;
                this.conversation.updateConversation(this.conversation.currentConversationId, { role: 'bot', content: reply }, rawData);

                await this.markdown.typeWriteMarkdown(contentEl, reply, 0.1, () => this.app.ui.smartScroll());

                if (rawData) {
                    const scriptEl = DOMUtils.create('script', {
                        type: 'application/json',
                        id: 'admet-raw-data',
                        textContent: JSON.stringify(rawData)
                    });
                    botMessageContainer.appendChild(scriptEl);
                }

                this.markdown.applySyntaxHighlighting(contentEl);
                this.markdown.addCopyButtons(contentEl);
                this.renderAdmetChart(contentEl);
                this.addExportButtons(botMessageContainer);

            } else {
                const errorMessage = result.output || 'Analiz sırasında bilinmeyen bir hata oluştu.';
                this.conversation.updateConversation(this.conversation.currentConversationId, { role: 'bot', content: errorMessage });
                contentEl.innerHTML = this.markdown.renderToHtml(`**Hata:** ${errorMessage}`);
            }

            ws.close();
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for session: ${sessionId}`, error);
            this.app.ui.removeThinkingIndicator(placeholderEl);
            this.app.ui.appendMessage('Sonuçlar alınırken bir bağlantı hatası oluştu.', 'bot');
            this.isStreaming = false;
            this.app.ui.setStreamingState(false);
            this.app.ui.setAbortController(null);
            this.app.ui.setInputsEnabled(true);
        };

        ws.onclose = () => {
            console.log(`WebSocket connection closed for session: ${sessionId}`);
            this.isStreaming = false;
            this.app.ui.setStreamingState(false);
            this.app.ui.setAbortController(null);
            this.app.ui.setInputsEnabled(true);
        };

        if (this.app.ui.abortController) {
            this.app.ui.abortController.signal.addEventListener('abort', () => {
                console.log('User aborted, closing WebSocket.');
                ws.close();
            });
        }
    }

    renderConversationHistory() {
        const historyList = document.getElementById('history-list');
        const pinnedList = document.getElementById('pinned-list');

        if (!historyList || !this.conversation) return;

        const conversations = this.conversation.getHistory();
        const pinnedConversations = this.conversation.getPinnedConversations();

        historyList.innerHTML = '';
        if (pinnedList) pinnedList.innerHTML = '';

        const renderItem = (chat) => {
            const item = DOMUtils.create('div', { className: 'history-item' });
            if (chat.id === this.conversation.currentConversationId) {
                DOMUtils.addClass(item, 'active');
            }

            const titleSpan = DOMUtils.create('span', {
                className: 'history-title-text',
                textContent: chat.title || 'Yeni Sohbet'
            });

            if (chat.isTitleGenerating) {
                const spinner = DOMUtils.create('span', { className: 'title-spinner' });
                titleSpan.appendChild(spinner);
            }

            item.appendChild(titleSpan);

            DOMUtils.on(item, 'click', (e) => {
                e.preventDefault();
                this.loadConversation(chat.id);
            });

            DOMUtils.on(item, 'contextmenu', (e) => {
                e.preventDefault();
                this.app.ui.showContextMenu(e.clientX, e.clientY, chat.id, !!chat.pinned);
            });

            return item;
        };

        conversations.forEach(chat => {
            historyList.appendChild(renderItem(chat));
        });

        if (pinnedList) {
            pinnedConversations.forEach(chat => {
                pinnedList.appendChild(renderItem(chat));
            });
            const pinnedContainer = document.getElementById('pinned-conversations');
            if (pinnedContainer) {
                pinnedContainer.style.display = pinnedConversations.length > 0 ? 'block' : 'none';
            }
        }
    }

    loadConversation(id) {
        const conversation = this.conversation.getConversation(id);
        if (conversation) {
            this.conversation.setCurrentConversation(id);
            this.app.ui.switchToChatMode(conversation.model);
            this.app.ui.clearMessages();

            conversation.messages.forEach(msg => {
                if (msg.role === 'bot') {
                    const botMsg = this.app.ui.appendMessage(msg.content, 'bot');
                    const contentEl = botMsg.querySelector('.message-content');
                    contentEl.innerHTML = this.markdown.renderToHtml(msg.content);
                    this.markdown.applySyntaxHighlighting(contentEl);
                    this.markdown.addCopyButtons(contentEl);

                    if (msg.admetData) {
                        const scriptEl = DOMUtils.create('script', { type: 'application/json', id: 'admet-raw-data', textContent: JSON.stringify(msg.admetData) });
                        botMsg.appendChild(scriptEl);
                        this.renderAdmetChart(contentEl);
                        this.addExportButtons(botMsg);
                    }

                } else {
                    this.app.ui.appendMessage(msg.content, 'user');
                }
            });

            this.renderConversationHistory();
        }
    }

    updateConversationTitleInUI(conversationId, newTitle, isLoading) {
        this.renderConversationHistory();
    }

    getSelectedAdmetParameters() {
        const checkboxes = document.querySelectorAll('input[name="admet_param"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    renderAdmetChart(messageElement) {
        const dataScript = messageElement.querySelector('#admet-radar-chart-data');
        const canvas = messageElement.querySelector('#admet-radar-chart');

        if (!dataScript || !canvas) {
            return;
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
                            angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                            grid: { color: 'rgba(255, 255, 255, 0.2)' },
                            pointLabels: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 12 } },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                backdropColor: 'rgba(0, 0, 0, 0.5)',
                                stepSize: 0.2, max: 1, min: 0
                            }
                        }
                    },
                    plugins: { legend: { labels: { color: 'rgba(255, 255, 255, 0.7)' } } }
                }
            });
        } catch (e) {
            console.error("Failed to render ADMET chart:", e);
        }
    }

    addExportButtons(messageElement) {
        const rawDataScript = messageElement.querySelector('#admet-raw-data');
        if (!rawDataScript) return;

        const actionsContainer = messageElement.querySelector('.message-actions');
        if (!actionsContainer) return;

        try {
            const rawData = JSON.parse(rawDataScript.textContent);
            const isComparison = rawData.successfulResults && Array.isArray(rawData.successfulResults);

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

        } catch (e) {
            console.error("Failed to add export buttons:", e);
        }
    }

    exportToCsv(rawData, isComparison = false) {
        let csvContent = "data:text/csv;charset=utf-8,";
        let fileName = "admet_report.csv";

        if (isComparison && rawData.successfulResults?.length > 0) {
            fileName = "admet_comparison.csv";
            const moleculeNames = rawData.successfulResults.map(mol => mol.data.moleculeName || mol.identifier);
            const allProperties = new Set();
            rawData.successfulResults.forEach(mol => {
                mol.data.admetPredictions.forEach(p => allProperties.add(p.property));
            });
            const sortedProperties = Array.from(allProperties).sort();

            const dataMap = new Map();
            rawData.successfulResults.forEach(mol => {
                const name = mol.data.moleculeName || mol.identifier;
                const propMap = new Map();
                mol.data.admetPredictions.forEach(p => propMap.set(p.property, p.prediction));
                dataMap.set(name, propMap);
            });

            csvContent += `"Property",${moleculeNames.map(name => `"${name}"`).join(',')}\r\n`;
            sortedProperties.forEach(prop => {
                const row = [prop];
                moleculeNames.forEach(name => {
                    const prediction = dataMap.get(name)?.get(prop) || 'N/A';
                    row.push(`"${prediction}"`);
                });
                csvContent += row.join(',') + '\r\n';
            });

        } else if (!isComparison) {
            if (!rawData || !rawData.admetPredictions) return;
            fileName = `${rawData.moleculeName || rawData.smiles}_admet_report.csv`;
            csvContent += "Property,Prediction\r\n";
            rawData.admetPredictions.forEach(p => {
                csvContent += `"${p.property}","${p.prediction}"\r\n`;
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

    exportToPdf(rawData, isComparison = false) {
        if (!rawData || !window.jspdf) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        let yPos = 22;

        if (isComparison && rawData.successfulResults?.length > 0) {
            const title = `Molecule Comparison Report`;
            doc.setFontSize(18);
            doc.text(title, 14, yPos);
            yPos += 15;

            const moleculeNames = rawData.successfulResults.map(mol => mol.data.moleculeName || mol.identifier);
            const allProperties = new Set();
            rawData.successfulResults.forEach(mol => {
                mol.data.admetPredictions.forEach(p => allProperties.add(p.property));
            });
            const sortedProperties = Array.from(allProperties).sort();

            const dataMap = new Map();
            rawData.successfulResults.forEach(mol => {
                const name = mol.data.moleculeName || mol.identifier;
                const propMap = new Map();
                mol.data.admetPredictions.forEach(p => propMap.set(p.property, p.prediction));
                dataMap.set(name, propMap);
            });

            const tableHead = [['Property', ...moleculeNames]];
            const tableBody = [];
            sortedProperties.forEach(prop => {
                const row = [prop];
                moleculeNames.forEach(name => {
                    row.push(dataMap.get(name)?.get(prop) || 'N/A');
                });
                tableBody.push(row);
            });

            doc.autoTable({
                startY: yPos,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133], halign: 'center' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
            });

            yPos = doc.lastAutoTable.finalY + 15;

            if (rawData.failedResults && rawData.failedResults.length > 0) {
                doc.setFontSize(14);
                doc.text('Failed Analyses:', 14, yPos);
                yPos += 7;
                rawData.failedResults.forEach(mol => {
                    doc.setFontSize(10);
                    doc.text(`- ${mol.identifier}: ${mol.error || 'Unknown error'}`, 14, yPos);
                    yPos += 5;
                });
            }

            doc.save(`admet_comparison_report.pdf`);

        } else if (!isComparison) {
            const title = `ADMET Analysis Report: ${rawData.moleculeName || rawData.smiles}`;
            doc.setFontSize(18);
            doc.text(title, 14, yPos);
            yPos += 10;
            const tableData = rawData.admetPredictions.map(p => [p.property, p.prediction]);
            doc.autoTable({
                startY: yPos,
                head: [['Property', 'Prediction']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133] },
            });
            doc.save(`${rawData.moleculeName || rawData.smiles}_admet_report.pdf`);
        }
    }
}

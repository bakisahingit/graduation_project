/**
 * Tool Handler
 * ADMET tool, comparison tool, export ve chart rendering işlemlerini yönetir
 */

import { DOMUtils } from '../utils/dom.js';

export class ToolHandler {
    constructor(ui, conversation, api, activeTool, setActiveTool, updateToolButtonState, closeAllToolsDropdowns, closeCompareModal, setupWebSocket) {
        this.ui = ui;
        this.conversation = conversation;
        this.api = api;

        // Tool state değişkenleri
        this.getActiveTool = () => activeTool;
        this.setActiveTool = setActiveTool;
        this.updateToolButtonState = updateToolButtonState;
        this.closeAllToolsDropdowns = closeAllToolsDropdowns;
        this.closeCompareModal = closeCompareModal;
        this.setupWebSocket = setupWebSocket;
    }

    /**
     * AdMet tool handler
     */
    handleAdmetTool() {
        const currentTool = this.getActiveTool();

        // Tool'u aktif/pasif yap
        if (currentTool === 'admet') {
            this.setActiveTool(null);
        } else {
            this.setActiveTool('admet');
        }

        this.updateToolButtonState();
        this.closeAllToolsDropdowns();
    }

    /**
     * AdMet tool'u sadece aktif et
     */
    activateAdmetTool() {
        if (this.getActiveTool() !== 'admet') {
            this.setActiveTool('admet');
            this.updateToolButtonState();
        }

        this.closeAllToolsDropdowns();
    }

    /**
     * Comparison form submit handler
     */
    async handleComparisonSubmit() {
        const tags = document.querySelectorAll('#molecule-tags-container .molecule-tag');
        const molecules = Array.from(tags).map(tag => tag.querySelector('span').textContent);

        if (molecules.length < 2) {
            alert('Lütfen karşılaştırmak için en az 2 molekül ekleyin.');
            return;
        }

        const properties = Array.from(document.querySelectorAll('input[name="admet_property"]:checked')).map(cb => cb.value);
        if (properties.length === 0) {
            alert('Lütfen karşılaştırmak için en az 1 özellik seçin.');
            return;
        }

        this.closeCompareModal();

        const model = this.ui.elements.modelSelectChat ? this.ui.elements.modelSelectChat.value : null;

        const isInChatMode = this.ui.elements.chatInterface.style.display !== 'none';
        if (!isInChatMode) {
            this.ui.switchToChatMode(model);
        }

        await this.processComparison(molecules, model, properties);
    }

    /**
     * Karşılaştırma işleme
     * @param {string[]} molecules - Molekül listesi
     * @param {string} model - Model
     */
    async processComparison(molecules, model, properties) {
        const userMessage = `Bu molekülleri şu özelliklere göre karşılaştır: ${properties.join(', ')} - ${molecules.join(', ')}`;

        if (!this.conversation.currentConversationId) {
            const conversation = this.conversation.createConversation(userMessage, model);
            this.conversation.setCurrentConversation(conversation.id);
        }

        this.ui.appendMessage(userMessage, 'user');
        this.conversation.updateConversation(this.conversation.currentConversationId, { role: 'user', content: userMessage });

        this.ui.setInputsEnabled(false, true);
        const typingEl = this.ui.showThinkingIndicator();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Streaming state'i main.js'den kontrol et
        if (window.app) {
            window.app.isStreaming = true;
        }
        this.ui.setStreamingState(true);

        try {
            const controller = new AbortController();
            this.ui.setAbortController(controller);

            const data = await this.api.sendComparisonRequest(molecules, model, properties, controller.signal);

            if (data.type === 'async') {
                // Karşılaştırma için asenkron görev başladı
                this.setupWebSocket(data.sessionId, typingEl);
            } else {
                // Hata veya beklenmedik senkron cevap
                this.ui.removeThinkingIndicator(typingEl);
                const errorMessage = data.output || data.message || 'Karşılaştırma başlatılırken bir hata oluştu.';
                this.ui.appendMessage(errorMessage, 'bot');

                if (window.app) {
                    window.app.isStreaming = false;
                }
                this.ui.setStreamingState(false);
                this.ui.setAbortController(null);
                this.ui.setInputsEnabled(true);
            }
        } catch (err) {
            this.ui.removeThinkingIndicator(typingEl);

            if (err.name === 'AbortError' || err.message === 'Request aborted') {
                console.log('Comparison request was aborted by the user.');
                this.ui.appendMessage('Karşılaştırma isteği iptal edildi.', 'bot');
            } else {
                this.ui.appendMessage('Sunucu hatası: ' + String(err), 'bot');
            }

            // Hata durumunda temizlik
            if (window.app) {
                window.app.isStreaming = false;
            }
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
        const rawDataScript = messageElement.querySelector('#admet-raw-data');
        if (!rawDataScript) {
            return;
        }

        const actionsContainer = messageElement.querySelector('.message-actions');
        if (!actionsContainer) {
            return;
        }

        try {
            const rawData = JSON.parse(rawDataScript.textContent);

            // Determine if it's a single ADMET report or a comparison report
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
            console.error("Failed to add export buttons (exception caught):", e);
        }
    }

    /**
     * Exports the full ADMET report to a PDF file.
     * @param {object} rawData The full raw data from the analysis.
     * @param {boolean} isComparison Whether this is a comparison report.
     */
    exportToPdf(rawData, isComparison = false) {
        if (!rawData || !window.jspdf) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        let yPos = 22;

        if (isComparison && rawData.successfulResults?.length > 0) {
            // Karşılaştırma raporu
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
            // Tekli analiz raporu
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

    /**
     * Exports ADMET prediction data to a CSV file.
     * @param {object} rawData The full raw data from the analysis.
     * @param {boolean} isComparison Whether this is a comparison report.
     */
    exportToCsv(rawData, isComparison = false) {
        let csvContent = "data:text/csv;charset=utf-8,";
        let fileName = "admet_report.csv";

        if (isComparison && rawData.successfulResults?.length > 0) {
            // Karşılaştırma CSV
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

            csvContent += `\"Property\",${moleculeNames.map(name => `\"${name}\"`).join(',')}\r\n`;

            sortedProperties.forEach(prop => {
                const row = [prop];
                moleculeNames.forEach(name => {
                    const prediction = dataMap.get(name)?.get(prop) || 'N/A';
                    row.push(`\"${prediction}\"`);
                });
                csvContent += row.join(',') + '\r\n';
            });

        } else if (!isComparison) {
            // Tekli analiz CSV
            if (!rawData || !rawData.admetPredictions) return;
            fileName = `${rawData.moleculeName || rawData.smiles}_admet_report.csv`;
            csvContent += "Property,Prediction\r\n";
            rawData.admetPredictions.forEach(p => {
                csvContent += `\"${p.property}\",\"${p.prediction}\"\r\n`;
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
}

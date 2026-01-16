/**
 * Tool Handler
 * ADMET tool, comparison tool ve tool UI yönetimi
 */

import { DOMUtils } from '../core/dom.js';
import { CsvExporter, PdfExporter } from './exporters/index.js';
import { ChartRenderer } from './ChartRenderer.js';

export class ToolHandler {
    constructor(ui, conversationService, apiService) {
        this.ui = ui;
        this.conversation = conversationService;
        this.api = apiService;

        // Tool state
        this.activeTool = null;

        // Callbacks (will be set by main app)
        this.onToolStateChange = null;
        this.onWebSocketSetup = null;
    }

    /**
     * Callback'leri ayarla
     * @param {object} callbacks - { onToolStateChange, onWebSocketSetup }
     */
    setCallbacks(callbacks) {
        this.onToolStateChange = callbacks.onToolStateChange || null;
        this.onWebSocketSetup = callbacks.onWebSocketSetup || null;
    }

    /**
     * Aktif tool'u al
     * @returns {string|null}
     */
    getActiveTool() {
        return this.activeTool;
    }

    /**
     * Aktif tool'u ayarla
     * @param {string|null} tool - Tool adı ('admet', 'compare', null)
     */
    setActiveTool(tool) {
        this.activeTool = tool;
        if (this.onToolStateChange) {
            this.onToolStateChange(tool);
        }
    }

    /**
     * ADMET tool handler - toggle
     */
    handleAdmetTool() {
        if (this.activeTool === 'admet') {
            this.setActiveTool(null);
        } else {
            this.setActiveTool('admet');
        }
        this.updateToolButtonState();
        this.closeAllToolsDropdowns();
    }

    /**
     * ADMET tool'u sadece aktif et
     */
    activateAdmetTool() {
        if (this.activeTool !== 'admet') {
            this.setActiveTool('admet');
            this.updateToolButtonState();
        }
        this.closeAllToolsDropdowns();
    }

    /**
     * ADMET tool'u deaktif et
     */
    deactivateAdmetTool() {
        if (this.activeTool === 'admet') {
            this.setActiveTool(null);
            this.updateToolButtonState();
        }
    }

    /**
     * Tool buton durumlarını güncelle
     */
    updateToolButtonState() {
        const isAdmetActive = this.activeTool === 'admet';

        // Welcome tools
        if (this.ui.elements.welcomeAdmetTool) {
            if (isAdmetActive) {
                DOMUtils.addClass(this.ui.elements.welcomeAdmetTool, 'active');
            } else {
                DOMUtils.removeClass(this.ui.elements.welcomeAdmetTool, 'active');
            }
        }

        // Chat tools
        if (this.ui.elements.chatAdmetTool) {
            if (isAdmetActive) {
                DOMUtils.addClass(this.ui.elements.chatAdmetTool, 'active');
            } else {
                DOMUtils.removeClass(this.ui.elements.chatAdmetTool, 'active');
            }
        }

        // Tools butonlarının durumunu güncelle
        if (this.ui.elements.welcomeToolsBtn) {
            if (this.activeTool) {
                DOMUtils.addClass(this.ui.elements.welcomeToolsBtn, 'has-active-tool');
            } else {
                DOMUtils.removeClass(this.ui.elements.welcomeToolsBtn, 'has-active-tool');
            }
        }

        if (this.ui.elements.chatToolsBtn) {
            if (this.activeTool) {
                DOMUtils.addClass(this.ui.elements.chatToolsBtn, 'has-active-tool');
            } else {
                DOMUtils.removeClass(this.ui.elements.chatToolsBtn, 'has-active-tool');
            }
        }
    }

    /**
     * Tools dropdown toggle
     * @param {string} mode - 'welcome' veya 'chat'
     */
    toggleToolsDropdown(mode) {
        const dropdown = mode === 'welcome'
            ? this.ui.elements.welcomeToolsDropdown
            : this.ui.elements.chatToolsDropdown;

        if (dropdown) {
            dropdown.classList.toggle('open');
        }
    }

    /**
     * Tüm tools dropdown'larını kapat
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
     * Seçili ADMET özelliklerini al
     * @returns {string[]}
     */
    getSelectedAdmetProperties() {
        const checkboxes = document.querySelectorAll('input[name="admet_param"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /**
     * ADMET radar grafiği render et
     * @param {HTMLElement} messageElement - Mesaj elementi
     */
    renderAdmetChart(messageElement) {
        ChartRenderer.renderAdmetChart(messageElement);
    }

    /**
     * Export butonlarını ekle
     * @param {HTMLElement} messageElement - Mesaj elementi
     */
    addExportButtons(messageElement) {
        const rawDataScript = messageElement.querySelector('#admet-raw-data');
        if (!rawDataScript) return;

        const actionsContainer = messageElement.querySelector('.message-actions');
        if (!actionsContainer) return;

        try {
            const rawData = JSON.parse(rawDataScript.textContent);
            const isComparison = rawData.successfulResults && Array.isArray(rawData.successfulResults);

            // PDF butonu
            const pdfButton = DOMUtils.create('button', {
                className: 'message-action-btn',
                textContent: 'PDF',
                title: isComparison ? 'Karşılaştırma Raporunu PDF olarak indir' : 'Raporu PDF olarak indir'
            });
            DOMUtils.on(pdfButton, 'click', () => PdfExporter.export(rawData, isComparison));

            // CSV butonu
            const csvButton = DOMUtils.create('button', {
                className: 'message-action-btn',
                textContent: 'CSV',
                title: isComparison ? 'Karşılaştırma Verilerini CSV olarak indir' : 'Tahminleri CSV olarak indir'
            });
            DOMUtils.on(csvButton, 'click', () => CsvExporter.export(rawData, isComparison));

            actionsContainer.appendChild(pdfButton);
            actionsContainer.appendChild(csvButton);
        } catch (e) {
            console.error("Failed to add export buttons:", e);
        }
    }

    /**
     * CSV export wrapper
     * @param {object} rawData - Ham veri
     * @param {boolean} isComparison - Karşılaştırma mı
     */
    exportToCsv(rawData, isComparison = false) {
        CsvExporter.export(rawData, isComparison);
    }

    /**
     * PDF export wrapper
     * @param {object} rawData - Ham veri
     * @param {boolean} isComparison - Karşılaştırma mı
     */
    exportToPdf(rawData, isComparison = false) {
        PdfExporter.export(rawData, isComparison);
    }
}

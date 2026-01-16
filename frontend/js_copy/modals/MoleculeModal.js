/**
 * Molecule Modal
 * Molekül çizim modal'ı için özel işlemler
 */

import { DOMUtils } from '../core/dom.js';

export class MoleculeModal {
    constructor(ui, moleculeComponent, apiService) {
        this.ui = ui;
        this.moleculeComponent = moleculeComponent;
        this.apiService = apiService;
        this.onInsertToChat = null; // Callback for inserting molecule to chat
    }

    /**
     * Insert callback'ini set et
     * @param {Function} callback - Chat'e molekül eklemek için callback
     */
    setInsertCallback(callback) {
        this.onInsertToChat = callback;
    }

    /**
     * Event listener'ları kur
     */
    setupEventListeners() {
        // SMILES input değişikliği
        if (this.ui.elements.smilesInput) {
            DOMUtils.on(this.ui.elements.smilesInput, 'input', () => {
                this.updateMoleculeDisplay();
            });
        }

        // Clear butonu
        if (this.ui.elements.clearMoleculeBtn) {
            DOMUtils.on(this.ui.elements.clearMoleculeBtn, 'click', () => {
                this.clearMolecule();
            });
        }

        // Insert butonu
        if (this.ui.elements.insertMoleculeBtn) {
            DOMUtils.on(this.ui.elements.insertMoleculeBtn, 'click', () => {
                this.insertMoleculeToChat();
            });
        }

        // Query input (yeni akış)
        this.setupQueryInput();
    }

    /**
     * Molekül sorgulama input'unu kur
     */
    setupQueryInput() {
        const moleculeQueryInput = DOMUtils.select('#molecule-query-input');
        const moleculeQuerySend = DOMUtils.select('#molecule-query-send');

        if (moleculeQueryInput && moleculeQuerySend) {
            DOMUtils.on(moleculeQuerySend, 'click', async (e) => {
                e.preventDefault();
                await this.handleMoleculeQuery(moleculeQueryInput.value.trim());
                moleculeQueryInput.value = '';
                DOMUtils.autoResizeTextarea(moleculeQueryInput);
            });

            // Submit on Enter (without Shift)
            DOMUtils.on(moleculeQueryInput, 'keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    moleculeQuerySend.click();
                }
            });
        }
    }

    /**
     * Molekül sorgusunu işle
     * @param {string} query - Kullanıcı sorgusu
     */
    async handleMoleculeQuery(query) {
        if (!query) return;

        try {
            const model = this.ui.elements.modelSelectChat ? this.ui.elements.modelSelectChat.value : null;
            const response = await fetch('/api/chat/extract-smiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: query,
                    model: model
                })
            });

            const data = await response.json();

            if (data.success && data.smiles) {
                // Update the SMILES display
                if (this.ui.elements.smilesInput) this.ui.elements.smilesInput.value = data.smiles;
                const smilesDisplay = document.getElementById('smiles-display');
                if (smilesDisplay) smilesDisplay.textContent = data.smiles;

                // Show loading state in canvas area while waiting for PubChem 2D coords
                this.showMoleculeLoading();

                // Trigger PubChem panel load which will fetch 2D coordinates and draw
                if (this.moleculeComponent) {
                    this.moleculeComponent.loadPubChemPanel(data.smiles);
                }
            } else {
                alert(data.message || 'Molekül bulunamadı. Lütfen geçerli bir molekül ismi veya SMILES formatı girin.');
            }
        } catch (error) {
            console.error('Molecule resolution failed:', error);
            alert('Molekül çözümleme hatası: ' + error.message);
        }
    }

    /**
     * Molekül yükleniyor göster
     */
    showMoleculeLoading() {
        const canvas = document.getElementById('molecule-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Yükleniyor...', canvas.width / 2, canvas.height / 2);
        }
    }

    /**
     * Molekül görüntüsünü güncelle
     */
    updateMoleculeDisplay() {
        if (!this.moleculeComponent || !this.ui.elements.smilesInput) return;

        const smiles = this.ui.elements.smilesInput.value.trim();
        if (smiles) {
            this.moleculeComponent.updateDisplay(smiles);
        } else {
            this.moleculeComponent.showPlaceholder();
        }
    }

    /**
     * Molekülü temizle
     */
    clearMolecule() {
        if (this.ui.elements.smilesInput) {
            this.ui.elements.smilesInput.value = '';
        }

        const smilesDisplay = document.getElementById('smiles-display');
        if (smilesDisplay) {
            smilesDisplay.textContent = '';
        }

        if (this.moleculeComponent) {
            this.moleculeComponent.showPlaceholder();
        }
    }

    /**
     * Molekülü chat'e ekle
     */
    insertMoleculeToChat() {
        const smiles = this.ui.elements.smilesInput?.value.trim();
        if (!smiles) {
            alert('Lütfen önce bir molekül çizin veya SMILES girin.');
            return;
        }

        if (this.onInsertToChat) {
            this.onInsertToChat(smiles);
        }
    }

    /**
     * Molekül adını SMILES'a çözümle (PubChem üzerinden)
     * @param {string} name - Molekül adı
     * @returns {Promise<string|null>}
     */
    async resolveNameToSmiles(name) {
        if (!name || !this.apiService) return null;
        return await this.apiService.getSmilesFromName(name);
    }
}

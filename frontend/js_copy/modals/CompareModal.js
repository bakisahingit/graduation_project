/**
 * Compare Modal
 * Molekül karşılaştırma modal'ı için özel işlemler
 */

import { DOMUtils } from '../core/dom.js';

export class CompareModal {
    constructor(ui, onComparisonSubmit) {
        this.ui = ui;
        this.onComparisonSubmit = onComparisonSubmit;
        this.moleculeTags = [];
    }

    /**
     * Event listener'ları kur
     */
    setupEventListeners() {
        // Run comparison butonu
        if (this.ui.elements.runComparisonBtn) {
            DOMUtils.on(this.ui.elements.runComparisonBtn, 'click', () => {
                this.handleSubmit();
            });
        }

        // Molekül input alanı için Enter tuşu
        this.setupMoleculeInput();
    }

    /**
     * Molekül input alanını kur
     */
    setupMoleculeInput() {
        const moleculeInput = DOMUtils.select('#compare-molecule-input');
        const addMoleculeBtn = DOMUtils.select('#add-molecule-btn');

        if (moleculeInput && addMoleculeBtn) {
            // Add butonu
            DOMUtils.on(addMoleculeBtn, 'click', () => {
                this.addMoleculeTag(moleculeInput.value.trim());
                moleculeInput.value = '';
            });

            // Enter tuşu ile ekleme
            DOMUtils.on(moleculeInput, 'keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addMoleculeTag(moleculeInput.value.trim());
                    moleculeInput.value = '';
                }
            });
        }
    }

    /**
     * Molekül tag'i ekle
     * @param {string} molecule - Molekül adı veya SMILES
     */
    addMoleculeTag(molecule) {
        if (!molecule) return;

        // Zaten ekli mi kontrol et
        if (this.moleculeTags.includes(molecule)) {
            alert('Bu molekül zaten ekli.');
            return;
        }

        this.moleculeTags.push(molecule);
        this.renderTags();
    }

    /**
     * Molekül tag'ini kaldır
     * @param {string} molecule - Kaldırılacak molekül
     */
    removeMoleculeTag(molecule) {
        this.moleculeTags = this.moleculeTags.filter(m => m !== molecule);
        this.renderTags();
    }

    /**
     * Tag'leri render et
     */
    renderTags() {
        const container = document.getElementById('molecule-tags-container');
        if (!container) return;

        container.innerHTML = '';

        this.moleculeTags.forEach(molecule => {
            const tag = DOMUtils.create('div', {
                className: 'molecule-tag'
            });
            tag.innerHTML = `
                <span>${DOMUtils.escapeHtml(molecule)}</span>
                <button class="tag-remove" title="Kaldır">&times;</button>
            `;

            const removeBtn = tag.querySelector('.tag-remove');
            DOMUtils.on(removeBtn, 'click', () => {
                this.removeMoleculeTag(molecule);
            });

            container.appendChild(tag);
        });
    }

    /**
     * Karşılaştırma submit handler
     */
    async handleSubmit() {
        // DOM'dan tag'leri al (varsa)
        const tags = document.querySelectorAll('#molecule-tags-container .molecule-tag');
        const molecules = tags.length > 0
            ? Array.from(tags).map(tag => tag.querySelector('span').textContent)
            : this.moleculeTags;

        if (molecules.length < 2) {
            alert('Lütfen karşılaştırmak için en az 2 molekül ekleyin.');
            return;
        }

        // Seçili özellikleri al
        const properties = Array.from(
            document.querySelectorAll('input[name="admet_property"]:checked')
        ).map(cb => cb.value);

        if (properties.length === 0) {
            alert('Lütfen karşılaştırmak için en az 1 özellik seçin.');
            return;
        }

        // Callback'i çağır
        if (this.onComparisonSubmit) {
            await this.onComparisonSubmit(molecules, properties);
        }

        // Modal'ı temizle ve kapat (callback içinde yapılabilir)
        this.clearTags();
    }

    /**
     * Tüm tag'leri temizle
     */
    clearTags() {
        this.moleculeTags = [];
        this.renderTags();
    }

    /**
     * Modal kapandığında çağır
     */
    onClose() {
        // Optionally clear tags when modal closes
        // this.clearTags();
    }

    /**
     * Modal açıldığında çağır
     */
    onOpen() {
        // Focus to input
        const moleculeInput = DOMUtils.select('#compare-molecule-input');
        if (moleculeInput) {
            moleculeInput.focus();
        }
    }
}

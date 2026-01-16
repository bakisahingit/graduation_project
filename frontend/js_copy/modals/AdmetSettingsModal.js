/**
 * ADMET Settings Modal
 * ADMET analiz ayarları modal'ı için özel işlemler
 */

import { DOMUtils } from '../core/dom.js';

export class AdmetSettingsModal {
    constructor(ui, onSave) {
        this.ui = ui;
        this.onSave = onSave;
        this.selectedProperties = new Set();

        // Varsayılan ADMET özellikleri
        this.defaultProperties = [
            'Hepatotoxicity',
            'hERG Inhibition',
            'CYP2D6 Inhibition',
            'CYP3A4 Inhibition',
            'BBB Penetration',
            'Bioavailability',
            'Solubility',
            'Plasma Protein Binding'
        ];
    }

    /**
     * Event listener'ları kur
     */
    setupEventListeners() {
        // Save butonu
        if (this.ui.elements.saveAdmetSettingsBtn) {
            DOMUtils.on(this.ui.elements.saveAdmetSettingsBtn, 'click', () => {
                this.handleSave();
            });
        }

        // Cancel butonu
        if (this.ui.elements.admetSettingsCancelBtn) {
            DOMUtils.on(this.ui.elements.admetSettingsCancelBtn, 'click', () => {
                // Modal kapatma işlemi ModalManager tarafından yapılacak
            });
        }

        // Checkbox değişiklikleri
        this.setupCheckboxListeners();
    }

    /**
     * Checkbox listener'larını kur
     */
    setupCheckboxListeners() {
        const checkboxes = this.ui.elements.admetSettingsCheckboxes;
        if (!checkboxes) return;

        checkboxes.forEach(checkbox => {
            DOMUtils.on(checkbox, 'change', () => {
                if (checkbox.checked) {
                    this.selectedProperties.add(checkbox.value);
                } else {
                    this.selectedProperties.delete(checkbox.value);
                }
            });
        });
    }

    /**
     * Seçili özellikleri al
     * @returns {string[]}
     */
    getSelectedProperties() {
        // DOM'dan okuma
        const checkboxes = document.querySelectorAll('input[name="admet_param"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /**
     * Kaydet handler
     */
    handleSave() {
        const properties = this.getSelectedProperties();

        if (properties.length === 0) {
            alert('Lütfen en az bir ADMET özelliği seçin.');
            return;
        }

        if (this.onSave) {
            this.onSave(properties);
        }
    }

    /**
     * Tüm özellikleri seç
     */
    selectAll() {
        const checkboxes = document.querySelectorAll('input[name="admet_param"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedProperties.add(checkbox.value);
        });
    }

    /**
     * Tüm seçimleri kaldır
     */
    deselectAll() {
        const checkboxes = document.querySelectorAll('input[name="admet_param"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.selectedProperties.clear();
    }

    /**
     * Varsayılan seçimleri uygula
     */
    applyDefaults() {
        this.deselectAll();

        const checkboxes = document.querySelectorAll('input[name="admet_param"]');
        checkboxes.forEach(checkbox => {
            if (this.defaultProperties.includes(checkbox.value)) {
                checkbox.checked = true;
                this.selectedProperties.add(checkbox.value);
            }
        });
    }

    /**
     * Modal açıldığında çağır
     */
    onOpen() {
        // Varsayılan seçimleri uygula (opsiyonel)
        // this.applyDefaults();
    }

    /**
     * Modal kapandığında çağır
     */
    onClose() {
        // Cleanup if needed
    }

    /**
     * Özellik gruplarını render et (dinamik)
     * @param {Object} groups - Özellik grupları
     */
    renderPropertyGroups(groups) {
        const container = document.getElementById('admet-properties-container');
        if (!container) return;

        container.innerHTML = '';

        Object.entries(groups).forEach(([groupName, properties]) => {
            const groupEl = DOMUtils.create('div', { className: 'property-group' });
            groupEl.innerHTML = `
                <h4 class="group-title">${DOMUtils.escapeHtml(groupName)}</h4>
                <div class="group-properties"></div>
            `;

            const propertiesContainer = groupEl.querySelector('.group-properties');

            properties.forEach(prop => {
                const label = DOMUtils.create('label', { className: 'property-checkbox' });
                label.innerHTML = `
                    <input type="checkbox" name="admet_param" value="${DOMUtils.escapeHtml(prop)}">
                    <span>${DOMUtils.escapeHtml(prop)}</span>
                `;
                propertiesContainer.appendChild(label);
            });

            container.appendChild(groupEl);
        });

        // Yeni checkbox'lar için listener'ları kur
        this.setupCheckboxListeners();
    }
}

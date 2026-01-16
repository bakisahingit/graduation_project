/**
 * Modal Manager
 * Tüm modal pencere işlemlerini yönetir
 */

import { DOMUtils } from '../utils/dom.js';

export class ModalManager {
    constructor(ui, molecule) {
        this.ui = ui;
        this.molecule = molecule;
    }

    /**
     * Settings modal'ı aç
     * @param {Function} onOpen - Modal açıldıktan sonra çalışacak callback (opsiyonel)
     */
    openSettings(onOpen = null) {
        if (!this.ui.elements.settingsModal) return;

        DOMUtils.addClass(this.ui.elements.settingsModal, 'open');

        // İlk tab'ı aktif et (models)
        const firstTab = this.ui.elements.settingsModal.querySelector('.settings-tab');
        const firstNav = this.ui.elements.settingsModal.querySelector('.settings-nav-btn');

        if (firstTab) firstTab.style.display = 'block';
        if (firstNav) DOMUtils.addClass(firstNav, 'active');

        // Callback varsa çalıştır (populateModelsList, setupModelsSearch vb.)
        if (onOpen && typeof onOpen === 'function') {
            onOpen();
        }
    }

    /**
     * Settings modal'ı kapat
     * @param {Function} onClose - Modal kapandıktan sonra çalışacak callback (opsiyonel)
     */
    closeSettings(onClose = null) {
        if (!this.ui.elements.settingsModal) return;

        DOMUtils.removeClass(this.ui.elements.settingsModal, 'open');

        // Callback varsa çalıştır (cleanup fonksiyonları için)
        if (onClose && typeof onClose === 'function') {
            onClose();
        }
    }

    /**
     * Molecule modal'ı aç
     */
    openMolecule() {
        if (!this.ui.elements.moleculeModal) return;

        DOMUtils.addClass(this.ui.elements.moleculeModal, 'open');

        if (this.ui.elements.smilesInput) {
            this.ui.elements.smilesInput.focus();
        }

        // Molekül çizim sistemini başlat
        if (this.molecule && !this.molecule.isInitialized) {
            this.molecule.initialize();
        }
    }

    /**
     * Molecule modal'ı kapat
     */
    closeMolecule() {
        if (!this.ui.elements.moleculeModal) return;
        DOMUtils.removeClass(this.ui.elements.moleculeModal, 'open');
    }

    /**
     * Compare modal'ı aç
     */
    openCompare() {
        if (!this.ui.elements.compareModal) return;
        DOMUtils.addClass(this.ui.elements.compareModal, 'open');

        if (this.ui.elements.compareInput) {
            this.ui.elements.compareInput.focus();
        }
    }

    /**
     * Compare modal'ı kapat
     */
    closeCompare() {
        if (!this.ui.elements.compareModal) return;

        // Kapanış animasyonunu tetikle
        DOMUtils.addClass(this.ui.elements.compareModal, 'closing');

        // Animasyon bittikten sonra modal'ı kaldır
        setTimeout(() => {
            DOMUtils.removeClass(this.ui.elements.compareModal, 'open');
            DOMUtils.removeClass(this.ui.elements.compareModal, 'closing');
        }, 300); // CSS'teki animasyon süresiyle aynı olmalı
    }

    /**
     * ADMET settings modal'ı aç
     */
    openAdmetSettings() {
        if (!this.ui.elements.admetSettingsModal) return;
        DOMUtils.addClass(this.ui.elements.admetSettingsModal, 'open');
    }

    /**
     * ADMET settings modal'ı kapat
     */
    closeAdmetSettings() {
        if (!this.ui.elements.admetSettingsModal) return;

        DOMUtils.addClass(this.ui.elements.admetSettingsModal, 'closing');

        setTimeout(() => {
            DOMUtils.removeClass(this.ui.elements.admetSettingsModal, 'open');
            DOMUtils.removeClass(this.ui.elements.admetSettingsModal, 'closing');
        }, 300);
    }

    /**
     * Tüm modal'ları kapat
     */
    closeAll() {
        this.closeSettings();
        this.closeMolecule();
        this.closeCompare();
        this.closeAdmetSettings();
    }

    /**
     * ESC tuşu ile modal kapatma
     */
    handleEscapeKey() {
        if (this.ui.elements.settingsModal?.classList.contains('open')) {
            this.closeSettings();
        } else if (this.ui.elements.moleculeModal?.classList.contains('open')) {
            this.closeMolecule();
        } else if (this.ui.elements.compareModal?.classList.contains('open')) {
            this.closeCompare();
        } else if (this.ui.elements.admetSettingsModal?.classList.contains('open')) {
            this.closeAdmetSettings();
        }
    }
}

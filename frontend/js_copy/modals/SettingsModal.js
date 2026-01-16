/**
 * Settings Modal
 * Ayarlar modal'ı için özel işlemler
 */

import { DOMUtils } from '../core/dom.js';
import { HelperUtils } from '../core/helpers.js';

export class SettingsModal {
    constructor(ui, modelService, onModelsUpdated) {
        this.ui = ui;
        this.modelService = modelService;
        this.onModelsUpdated = onModelsUpdated;

        // Event handlers (cleanup için)
        this.modelsListClickHandler = null;
        this.modelsSearchHandler = null;
    }

    /**
     * Modal açıldığında çağrılacak setup
     */
    onOpen() {
        this.populateModelsList();
        this.setupModelsListEventDelegation();
        this.setupModelsSearch();
    }

    /**
     * Modal kapandığında çağrılacak cleanup
     */
    onClose() {
        this.removeModelsListEventDelegation();
        this.removeModelsSearch();
    }

    /**
     * Model listesini doldur
     */
    async populateModelsList() {
        if (!this.ui.elements.modelsList) return;

        const models = await this.modelService.getAllModels();
        this.ui.elements.modelsList.innerHTML = '';

        models.forEach(model => {
            const isActive = this.modelService.isModelActive(model);
            const modelItem = this.createModelItem(model, isActive);
            this.ui.elements.modelsList.appendChild(modelItem);
        });
    }

    /**
     * Model öğesi oluştur
     * @param {string} modelName - Model adı
     * @param {boolean} isActive - Aktif mi
     * @returns {HTMLElement}
     */
    createModelItem(modelName, isActive) {
        const item = DOMUtils.create('div', { className: 'model-item' });
        item.innerHTML = `
            <div class="model-info">
                <span class="model-name">${DOMUtils.escapeHtml(modelName)}</span>
            </div>
            <button class="model-switch ${isActive ? 'active' : ''}" 
                    data-model-name="${DOMUtils.escapeHtml(modelName)}"
                    title="${isActive ? 'Modeli devre dışı bırak' : 'Modeli aktif et'}">
                <span class="switch-track">
                    <span class="switch-thumb"></span>
                </span>
            </button>
        `;
        return item;
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
     * Model aktif/deaktif toggle
     * @param {string} modelName - Model adı
     * @param {HTMLElement} switchElement - Switch elementi
     */
    toggleModelActive(modelName, switchElement) {
        const isNowActive = this.modelService.toggleModel(modelName);

        if (isNowActive) {
            DOMUtils.addClass(switchElement, 'active');
            switchElement.title = 'Modeli devre dışı bırak';
        } else {
            DOMUtils.removeClass(switchElement, 'active');
            switchElement.title = 'Modeli aktif et';
        }

        // UI'daki model select'leri güncelle
        if (this.onModelsUpdated) {
            this.onModelsUpdated();
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
        this.modelsSearchHandler = HelperUtils.debounce((e) => {
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
}

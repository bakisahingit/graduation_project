/**
 * Molecule Controls
 * Molekül görüntüleyici kontrolleri (Zoom, Pan, Reset, View Mode)
 */

import { DOMUtils } from '../core/dom.js';

export class MoleculeControls {
    constructor(component) {
        this.component = component;

        // State
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
    }

    /**
     * Kontrolleri başlat
     */
    init() {
        this.bindZoomControls();
        this.bindViewToggle();
        this.bindCanvasInteractions();
    }

    /**
     * Zoom butonlarını bağla
     */
    bindZoomControls() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const resetBtn = document.getElementById('reset-view-btn');

        if (zoomInBtn) DOMUtils.on(zoomInBtn, 'click', () => this.component.zoomIn());
        if (zoomOutBtn) DOMUtils.on(zoomOutBtn, 'click', () => this.component.zoomOut());
        if (resetBtn) DOMUtils.on(resetBtn, 'click', () => this.component.resetView());
    }

    /**
     * 2D/3D geçiş butonlarını bağla
     */
    bindViewToggle() {
        const btn2D = document.getElementById('view-2d-btn');
        const btn3D = document.getElementById('view-3d-btn');

        if (btn2D) {
            DOMUtils.on(btn2D, 'click', () => {
                this.component.setViewMode('2D');
                this.updateToggleUI('2D');
            });
        }

        if (btn3D) {
            DOMUtils.on(btn3D, 'click', () => {
                this.component.setViewMode('3D');
                this.updateToggleUI('3D');
            });
        }
    }

    /**
     * Toggle UI güncelle
     */
    updateToggleUI(mode) {
        const btn2D = document.getElementById('view-2d-btn');
        const btn3D = document.getElementById('view-3d-btn');

        if (mode === '2D') {
            btn2D?.classList.add('active');
            btn3D?.classList.remove('active');

            // Kontrollerin görünürlüğünü ayarla
            document.getElementById('molecule-controls-2d').style.display = 'flex';
            document.getElementById('molecule-controls-3d').style.display = 'none';
        } else {
            btn2D?.classList.remove('active');
            btn3D?.classList.add('active');

            document.getElementById('molecule-controls-2d').style.display = 'none';
            document.getElementById('molecule-controls-3d').style.display = 'flex';
        }
    }

    /**
     * Canvas etkileşimlerini bağla (Pan/Zoom)
     */
    bindCanvasInteractions() {
        // Canvas olayları aslında Drawer üzerinden yönetilir ama Pan mantığı
        // Component üzerindeki offset değerlerini değiştirir.
        // Bu logic Component veya Drawer içinde olabilir.
        // Şimdilik Drawer içinde tutacağız çünkü canvas elementine bağlı.
        // Buradan sadece tetikleyebiliriz.
    }

    /**
     * 3D Kontrollerini başlat (3D Viewer yüklendikten sonra çağrılır)
     */
    init3DControls(viewer) {
        const styleSelect = document.getElementById('style-select');
        const colorSelect = document.getElementById('color-select');
        const surfaceCheck = document.getElementById('surface-check');
        const spinCheck = document.getElementById('spin-check');

        if (styleSelect) {
            DOMUtils.on(styleSelect, 'change', (e) => {
                this.component.viewer3D.setStyle(e.target.value);
            });
        }

        // Diğer 3D kontrolleri...
    }
}

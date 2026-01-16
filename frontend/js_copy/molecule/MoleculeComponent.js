/**
 * Molecule Component
 * Molekül modülü koordinatörü
 */

import { SmilesParser } from './SmilesParser.js';
import { MoleculeDrawer } from './MoleculeDrawer.js';
import { Molecule3DViewer } from './Molecule3DViewer.js';
import { MoleculeControls } from './MoleculeControls.js';

export class MoleculeComponent {
    constructor() {
        // Alt bileşenler
        this.parser = new SmilesParser();
        this.drawer = null;
        this.viewer3D = null;
        this.controls = new MoleculeControls(this);

        // State
        this.currentSmiles = null;
        this.currentGraph = null;
        this.viewMode = '2D'; // 2D vs 3D
        this.container2D = null;
        this.container3D = null;
    }

    /**
     * Component'i başlat
     */
    initialize() {
        const canvas = document.getElementById('molecule-canvas');
        if (canvas) {
            this.drawer = new MoleculeDrawer(canvas);

            // Pan/Zoom etkileşimlerini başlat
            this.drawer.enableInteraction(() => {
                if (this.currentGraph && this.viewMode === '2D') {
                    this.drawer.draw(this.currentGraph);
                }
            });
        }

        this.viewer3D = new Molecule3DViewer('molecule-3d-viewer');
        this.controls.init();

        this.container2D = document.getElementById('molecule-view-2d');
        this.container3D = document.getElementById('molecule-view-3d');
    }

    /**
     * Molekül görüntüle
     * @param {string} smiles 
     * @param {number|null} cid 
     */
    render(smiles, cid = null) {
        this.currentSmiles = smiles;

        // 2D Parse & Draw
        try {
            this.currentGraph = this.parser.parse(smiles);
            this.parser.layout(this.currentGraph);
            this.parser.addImplicitHydrogens(this.currentGraph);

            if (this.drawer && this.viewMode === '2D') {
                this.drawer.draw(this.currentGraph);
            }
        } catch (e) {
            console.error('Molecule render error:', e);
        }

        // 3D Load (Eğer mod 3D ise)
        if (this.viewMode === '3D') {
            this.viewer3D.loadMolecule(smiles, cid);
        }
    }

    /**
     * Görünüm modunu değiştir
     * @param {'2D'|'3D'} mode 
     */
    setViewMode(mode) {
        this.viewMode = mode;

        if (mode === '2D') {
            if (this.container2D) this.container2D.style.display = 'block';
            if (this.container3D) this.container3D.style.display = 'none';
            if (this.drawer && this.currentGraph) {
                this.drawer.draw(this.currentGraph);
            }
        } else {
            if (this.container2D) this.container2D.style.display = 'none';
            if (this.container3D) this.container3D.style.display = 'block';
            // 3D render (eğer daha önce yüklenmediyse)
            // TODO: CID bilgisini App'ten almak lazım, şimdilik eksik olabilir
            this.viewer3D.resize();
        }
    }

    /**
     * Zoom In
     */
    zoomIn() {
        if (this.viewMode === '2D' && this.drawer) {
            this.drawer.zoom *= 1.2;
            this.drawer.draw(this.currentGraph);
        }
        // 3D zoom eklenebilir
    }

    /**
     * Zoom Out
     */
    zoomOut() {
        if (this.viewMode === '2D' && this.drawer) {
            this.drawer.zoom /= 1.2;
            this.drawer.draw(this.currentGraph);
        }
    }

    /**
     * Reset View
     */
    resetView() {
        if (this.viewMode === '2D' && this.drawer) {
            this.drawer.resetView();
            this.drawer.draw(this.currentGraph);
        }
    }

    /**
     * Update display (Legacy compatibility wrapper for render)
     * @param {string} smiles 
     * @param {number|null} cid 
     */
    updateDisplay(smiles, cid = null) {
        this.render(smiles, cid);
    }

    /**
     * Show placeholder when no molecule is displayed
     * @param {string} smiles 
     * @param {boolean} isValid 
     */
    showPlaceholder(smiles = '', isValid = false) {
        if (!this.drawer) return;

        this.drawer.clear();
        const ctx = this.drawer.ctx;
        const width = this.drawer.canvas.width / this.drawer.dpr;
        const height = this.drawer.canvas.height / this.drawer.dpr;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.save();
        ctx.fillStyle = isValid ? '#4caf50' : '#666';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';

        if (smiles) {
            ctx.fillText(`SMILES: ${smiles}`, centerX, centerY - 10);
            if (!isValid) {
                ctx.fillStyle = '#ff6b6b';
                ctx.font = '14px Arial';
                ctx.fillText('Geçersiz veya çizilemeyen molekül', centerX, centerY + 15);
            }
        } else {
            ctx.fillText('Molekül çizimi için SMILES girin', centerX, centerY);
        }

        ctx.restore();
    }

    /**
     * Load PubChem Panel (Legacy compatibility)
     * Fetches 2D coordinates from PubChem and renders
     * @param {string} smiles
     */
    async loadPubChemPanel(smiles) {
        // Bu metod orijinal molecule.js'de yoksa bile MoleculeModal çağırıyor olabilir.
        // Şimdilik render'a yönlendirelim, çünkü render zaten parse edip çiziyor.
        // Eğer PubChem'den özel veri çekilmesi gerekirse buraya eklenebilir.
        this.render(smiles);
    }

    /**
     * Resize handler
     */
    resize() {
        if (this.drawer) {
            this.drawer.setupCanvas();
            // Resize sonrası redraw gerekebilir
            if (this.currentGraph && this.viewMode === '2D') {
                this.drawer.draw(this.currentGraph);
            }
        }
        if (this.viewer3D) this.viewer3D.resize();
    }
}

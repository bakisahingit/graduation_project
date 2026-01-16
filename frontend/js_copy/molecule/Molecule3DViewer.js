/**
 * Molecule 3D Viewer
 * 3Dmol.js entegrasyonu
 */

export class Molecule3DViewer {
    constructor(containerId) {
        this.containerId = containerId;
        this.viewer = null;
        this.model = null;

        // Settings
        this.currentStyle = 'stick'; // stick, line, cross, sphere, cartoon
        this.currentBackgroundColor = 'white'; // white, black
    }

    /**
     * Viewer'ı başlat
     */
    init() {
        if (!window.$3Dmol) {
            console.warn('3Dmol.js not loaded');
            return false;
        }

        const element = document.getElementById(this.containerId);
        if (!element) return false;

        const config = { backgroundColor: this.currentBackgroundColor };
        this.viewer = window.$3Dmol.createViewer(element, config);

        return true;
    }

    /**
     * Molekül yükle (SMILES -> 3D)
     * Not: 3D koordinatlar için PubChem veya RDKit backend'e ihtiyaç duyar.
     * Burada PubChem CID veya harici bir SDF verisi gerekir.
     * SMILES'tan direkt 3D üretimi frontend'de (RDKit-JS olmadan) zordur.
     * Bu örnek PubChem API üzerinden SDF çeker.
     * @param {string} smiles 
     * @param {number|null} cid - PubChem CID (varsa)
     */
    async loadMolecule(smiles, cid = null) {
        if (!this.viewer) this.init();
        if (!this.viewer) return;

        this.viewer.clear();

        try {
            let data = null;
            let format = 'sdf';

            if (cid) {
                // PubChem'den 3D konformasyonu çek
                const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/SDF/?record_type=3d&response_type=display`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('PubChem 3D fetch failed');
                data = await response.text();
            } else {
                // Eğer CID yoksa, SMILES'tan 3D oluşturma servisi kullanılmalı
                // Veya şimdilik "2D to 3D" yapan basit bir fallback (önerilmez)
                // Şimdilik sadece uyarı verelim
                console.warn('3D görüntüleme için CID gerekli.');
                return;
            }

            this.model = this.viewer.addModel(data, format);
            this.applyStyle();
            this.viewer.zoomTo();
            this.viewer.render();

        } catch (error) {
            console.error('3D Mol yükleme hatası:', error);
        }
    }

    /**
     * Stili uygula
     * @param {string} styleName 
     */
    setStyle(styleName) {
        this.currentStyle = styleName;
        this.applyStyle();
        this.viewer.render();
    }

    /**
     * Mevcut stili uygula
     */
    applyStyle() {
        if (!this.viewer || !this.model) return;

        this.viewer.setStyle({}, {}); // Reset

        switch (this.currentStyle) {
            case 'stick':
                this.viewer.setStyle({}, { stick: {} });
                break;
            case 'line':
                this.viewer.setStyle({}, { line: {} });
                break;
            case 'sphere':
                this.viewer.setStyle({}, { sphere: {} });
                break;
            case 'cartoon': // Proteinler için
                this.viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
                break;
            default:
                this.viewer.setStyle({}, { stick: {} });
        }
    }

    /**
     * Arka plan rengini ayarla
     * @param {string} color 
     */
    setBackgroundColor(color) {
        this.currentBackgroundColor = color;
        if (this.viewer) {
            this.viewer.setBackgroundColor(color);
        }
    }

    /**
     * Resize (pencere boyutu değişince)
     */
    resize() {
        if (this.viewer) {
            this.viewer.resize();
        }
    }
}

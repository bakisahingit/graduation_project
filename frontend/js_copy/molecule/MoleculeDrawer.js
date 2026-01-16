/**
 * Molecule Drawer
 * HTML5 Canvas üzerinde 2D molekül çizimi
 */

export class MoleculeDrawer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Görüntü ayarları
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;

        // Stil ayarları
        this.colors = {
            'C': '#909090',
            'N': '#3050F8',
            'O': '#FF0D0D',
            'S': '#FFFF30',
            'F': '#90E050',
            'Cl': '#1FF01F',
            'Br': '#A62929',
            'I': '#940094',
            'H': '#C0C0C0',
            'P': '#FF8000',
            'default': '#FF00FF'
        };

        this.bondWidth = 2;
        this.atomRadius = 4;
        this.fontSize = 14;

        this.currentGraph = null;

        // High DPI ayarı
        this.dpr = window.devicePixelRatio || 1;
        this.setupCanvas();
    }

    /**
     * Canvas boyut ve DPI ayarları
     */
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    /**
     * Temizle
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    }

    /**
     * Graph çiz
     * @param {{atoms: Array, bonds: Array}} graph
     */
    draw(graph) {
        this.currentGraph = graph;
        this.clear();

        this.ctx.save();
        // Zoom ve Pan uygula (Graph koordinatları zaten layout tarafından belirlendi)
        // Merkez noktayı bulmak için canvas ve graph merkezini hizalamamız gerekir.
        // Ama şimdilik basit bir offset ile idare edelim.

        const centerX = (this.canvas.width / this.dpr) / 2;
        const centerY = (this.canvas.height / this.dpr) / 2;

        this.ctx.translate(centerX + this.offsetX, centerY + this.offsetY);
        this.ctx.scale(this.zoom, this.zoom);

        // Bondları çiz
        graph.bonds.forEach(bond => {
            const a1 = graph.atoms[bond.a];
            const a2 = graph.atoms[bond.b];
            this.drawBond(a1, a2, bond.type);
        });

        // Atomları çiz
        graph.atoms.forEach(atom => {
            this.drawAtom(atom);
        });

        this.ctx.restore();
    }

    /**
     * Bağ çiz
     */
    drawBond(a1, a2, type) {
        this.ctx.strokeStyle = '#81d4fa'; // Tema uyumlu açık mavi
        this.ctx.lineWidth = this.bondWidth;
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(a1.x, a1.y);
        this.ctx.lineTo(a2.x, a2.y);

        if (type === 'double') {
            // Basit çift bağ (offsetli)
            const dx = a2.x - a1.x;
            const dy = a2.y - a1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / len * 3;
            const perpY = dx / len * 3;

            this.ctx.stroke(); // Merkez

            // Yan çizgi
            this.ctx.beginPath();
            this.ctx.moveTo(a1.x + perpX, a1.y + perpY);
            this.ctx.lineTo(a2.x + perpX, a2.y + perpY);
            this.ctx.stroke();
        } else {
            this.ctx.stroke();
        }
    }

    /**
     * Atom çiz
     */
    drawAtom(atom) {
        if (atom.symbol === 'C') return; // Karbonları gizle (opsiyonel)

        this.ctx.fillStyle = this.colors[atom.symbol] || this.colors.default;
        this.ctx.font = `bold ${this.fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Background (bağları gizlemek için)
        const textMetrics = this.ctx.measureText(atom.symbol);
        const w = textMetrics.width;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(atom.x, atom.y, w / 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        this.ctx.fillText(atom.symbol, atom.x, atom.y);
    }

    /**
     * Canvas etkileşimlerini (Pan/Zoom) dinle
     * @param {function} onUpdate - Çizim güncellendiğinde çağrılır
     */
    enableInteraction(onUpdate) {
        let isDragging = false;
        let lastX, lastY;

        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const dx = e.clientX - lastX;
                const dy = e.clientY - lastY;
                this.offsetX += dx;
                this.offsetY += dy;
                lastX = e.clientX;
                lastY = e.clientY;
                onUpdate();
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scale = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= scale;
            onUpdate();
        });
    }

    /**
     * Görünümü sıfırla
     */
    resetView() {
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    /**
     * PNG Export
     */
    toDataURL() {
        return this.canvas.toDataURL('image/png');
    }
}

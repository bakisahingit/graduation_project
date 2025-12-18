/**
 * Molecule Component
 * Molekül çizim ve görselleştirme bileşeni
 */

import { DOMUtils } from '../utils/dom.js';

export class MoleculeComponent {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.drawer = null;
        this.isInitialized = false;
    }

    /**
     * Molekül çizim sistemini başlat
     */
    initialize() {
        this.canvas = DOMUtils.select('#molecule-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.drawer = new MoleculeDrawer(this.canvas, this.ctx);
            this.isInitialized = true;
            // default: hide implicit hydrogens
            this.showHydrogens = false;
            // Attach pan/zoom listeners
            this._attachCanvasInteractions();

            // Keep canvas resolution in sync with container size
            window.addEventListener('resize', () => {
                if (!this.drawer) return;
                this.drawer._adjustCanvasForHiDPI();
                if (this.drawer.currentGraph) {
                    this.drawer.parseAndDrawFromGraph(this.drawer.currentGraph);
                }
            });
        }
    }

    _attachCanvasInteractions() {
        if (!this.canvas) return;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        // tooltip element (styled via CSS)
        let tooltip = document.querySelector('.molecule-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'molecule-tooltip';
            document.body.appendChild(tooltip);
        }

        // Wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -e.deltaY;
            const zoomFactor = delta > 0 ? 1.1 : 0.9;
            const rect = this.canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;

            // animate zoom around cursor for smoothness
            const oldZoom = this.drawer.targetZoom || this.drawer.zoom;
            const newZoom = Math.max(0.25, Math.min(4, oldZoom * zoomFactor));

            // compute target offsets so zoom focuses on cursor (in CSS pixel space)
            const localX = cx;
            const localY = cy;
            const tOffX = localX - (localX - this.drawer.offsetX) * (newZoom / oldZoom);
            const tOffY = localY - (localY - this.drawer.offsetY) * (newZoom / oldZoom);

            this.drawer.targetZoom = newZoom;
            this.drawer.targetOffsetX = tOffX;
            this.drawer.targetOffsetY = tOffY;
            this.drawer._startAnimation();
        }, { passive: false });

        // Drag to pan
        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            // apply to target offsets for smooth panning
            this.drawer.targetOffsetX += dx;
            this.drawer.targetOffsetY += dy;
            this.drawer._startAnimation();
        });

        // Hover handling for tooltip (and highlight)
        this.canvas.addEventListener('mousemove', (e) => {
            if (isDragging) return;
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const atoms = this.drawer.atoms || [];
            let found = null;
            for (let i = 0; i < atoms.length; i++) {
                const a = atoms[i];
                const dx = mx - a.x;
                const dy = my - a.y;
                const r = Math.max(3.5, this.drawer.baseAtomRadius * this.drawer.zoom) * 1.02;
                if (dx * dx + dy * dy <= r * r) {
                    found = a;
                    break;
                }
            }

            if (found) {
                tooltip.classList.add('visible');
                tooltip.textContent = `${found.symbol}` + (found.implicit ? ' (H implicit)' : '') + (found.index !== undefined ? ` — idx:${found.index}` : '');
                tooltip.style.left = (e.clientX + 12) + 'px';
                tooltip.style.top = (e.clientY + 12) + 'px';

                // set hover flag on graph atom and redraw
                if (this.drawer.currentGraph && typeof found.index === 'number') {
                    this.drawer.currentGraph.atoms.forEach(a => a._hover = false);
                    const ga = this.drawer.currentGraph.atoms[found.index];
                    if (ga) ga._hover = true;
                    this.drawer.parseAndDrawFromGraph(this.drawer.currentGraph);
                }
            } else {
                tooltip.classList.remove('visible');
                if (this.drawer.currentGraph) {
                    this.drawer.currentGraph.atoms.forEach(a => a._hover = false);
                    this.drawer.parseAndDrawFromGraph(this.drawer.currentGraph);
                }
            }
        });

        // Click to select atom (toggle)
        this.canvas.addEventListener('click', (e) => {
            if (isDragging) return;
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const atoms = this.drawer.atoms || [];
            let found = null;
            for (let i = 0; i < atoms.length; i++) {
                const a = atoms[i];
                const dx = mx - a.x;
                const dy = my - a.y;
                const r = Math.max(3.5, this.drawer.baseAtomRadius * this.drawer.zoom) * 1.02;
                if (dx * dx + dy * dy <= r * r) { found = a; break; }
            }
            if (found && this.drawer.currentGraph && typeof found.index === 'number') {
                const ga = this.drawer.currentGraph.atoms[found.index];
                if (ga) {
                    ga.selected = !ga.selected;
                    this.drawer.parseAndDrawFromGraph(this.drawer.currentGraph);
                }
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * SMILES formatını doğrula
     * @param {string} smiles - SMILES string
     * @returns {boolean}
     */
    validateSMILES(smiles) {
        if (!smiles || typeof smiles !== 'string') {
            return false;
        }

        // Temel SMILES doğrulama
        const smilesRegex = /^[A-Za-z0-9@+\-\[\]()=#\\\/%]+$/;
        if (!smilesRegex.test(smiles)) {
            return false;
        }

        // Parantez ve köşeli parantez dengesini kontrol et
        let parenCount = 0;
        let bracketCount = 0;

        for (let char of smiles) {
            if (char === '(') parenCount++;
            else if (char === ')') parenCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;

            if (parenCount < 0 || bracketCount < 0) {
                return false;
            }
        }

        return parenCount === 0 && bracketCount === 0;
    }

    /**
     * Molekül görselleştirmesini güncelle
     * @param {string} smiles - SMILES string
     */
    updateDisplay(smiles) {
        const placeholder = DOMUtils.select('#molecule-placeholder');
        const canvas = this.canvas;
        const error = DOMUtils.select('#molecule-error');

        // Ensure canvas resolution matches current CSS size before any draw
        if (this.drawer && typeof this.drawer._adjustCanvasForHiDPI === 'function') {
            this.drawer._adjustCanvasForHiDPI();
        }

        // Tüm elementleri gizle
        if (placeholder) placeholder.style.display = 'none';
        if (canvas) canvas.style.display = 'none';
        if (error) error.style.display = 'none';

        if (smiles) {
            if (this.validateSMILES(smiles)) {
                if (this.drawer && this.drawer.parseAndDraw(smiles)) {
                    if (canvas) {
                        canvas.style.display = 'block';
                        // After becoming visible, recompute size and redraw to fill container
                        this.drawer._adjustCanvasForHiDPI();
                        if (this.drawer.currentGraph) {
                            this.drawer.parseAndDrawFromGraph(this.drawer.currentGraph);
                        }
                    }
                } else {
                    this.showPlaceholder(smiles, true);
                }
            } else {
                if (error) error.style.display = 'flex';
            }
        } else {
            this.showPlaceholder();
        }
    }

    /**
     * Placeholder göster
     * @param {string} smiles - SMILES string (opsiyonel)
     * @param {boolean} isValid - Geçerli mi
     */
    showPlaceholder(smiles = '', isValid = false) {
        const placeholder = DOMUtils.select('#molecule-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';

            if (smiles && isValid) {
                placeholder.innerHTML = `
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>Geçerli SMILES formatı: ${smiles}</p>
                    <p class="placeholder-hint">Molekül görselleştirme yükleniyor...</p>
                `;
            } else {
                placeholder.innerHTML = `
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>Molekül yapısı burada görünecek</p>
                    <p class="placeholder-hint">SMILES formatında bir molekül girin (örn: CCO, C1=CC=CC=C1)</p>
                `;
            }
        }
    }

    /**
     * Zoom in
     */
    zoomIn() {
        if (this.drawer) {
            this.drawer.zoomIn();
        }
    }

    /**
     * Zoom out
     */
    zoomOut() {
        if (this.drawer) {
            this.drawer.zoomOut();
        }
    }

    /**
     * Reset view
     */
    resetView() {
        if (this.drawer) {
            this.drawer.resetView();
        }
    }
}

/**
 * Molekül çizici sınıfı
 */
class MoleculeDrawer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.atoms = [];
        this.bonds = [];
        // logical (CSS) center - will be set by adjustCanvasForHiDPI
        this.centerX = 0;
        this.centerY = 0;
        // Visual scaling and base sizes
        // Reduce defaults to make molecules appear smaller and more compact
        this.baseAtomRadius = 9;
        // Increase base bond width so bonds appear bolder while atoms remain small
        this.baseBondWidth = 1.8;
        this.scale = 1;
        this.padding = 32; // padding when fitting to canvas
        // Pan/zoom state
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        // target values for smooth animations
        this.targetZoom = this.zoom;
        this.targetOffsetX = this.offsetX;
        this.targetOffsetY = this.offsetY;
        this._animating = false;
        this._dpr = window.devicePixelRatio || 1;
        // initialize canvas resolution for crisp rendering
        this._adjustCanvasForHiDPI();
        this.currentGraph = null; // last parsed graph
    }

    /**
     * Ensure canvas uses devicePixelRatio to avoid pixelation
     */
    _adjustCanvasForHiDPI() {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        this._dpr = dpr;
        const cssW = Math.max(100, this.canvas.clientWidth || this.canvas.width);
        const cssH = Math.max(100, this.canvas.clientHeight || this.canvas.height);
        // set internal resolution
        this.canvas.width = Math.round(cssW * dpr);
        this.canvas.height = Math.round(cssH * dpr);
        // scale drawing operations so we can continue using CSS pixels
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // logical CSS dimensions
        this.cssWidth = cssW;
        this.cssHeight = cssH;
        this.centerX = cssW / 2;
        this.centerY = cssH / 2;
    }

    _startAnimation() {
        if (this._animating) return;
        this._animating = true;
        const step = () => {
            // interpolate values toward targets
            const dz = (this.targetZoom - this.zoom) * 0.2;
            const dx = (this.targetOffsetX - this.offsetX) * 0.2;
            const dy = (this.targetOffsetY - this.offsetY) * 0.2;

            this.zoom += dz;
            this.offsetX += dx;
            this.offsetY += dy;

            // redraw using current graph
            if (this.currentGraph) this.parseAndDrawFromGraph(this.currentGraph);

            // stop when close enough
            if (Math.abs(this.targetZoom - this.zoom) < 0.001 && Math.abs(this.targetOffsetX - this.offsetX) < 0.5 && Math.abs(this.targetOffsetY - this.offsetY) < 0.5) {
                this.zoom = this.targetZoom;
                this.offsetX = this.targetOffsetX;
                this.offsetY = this.targetOffsetY;
                this._animating = false;
                if (this.currentGraph) this.parseAndDrawFromGraph(this.currentGraph);
                return;
            }

            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /**
     * Canvas'ı temizle
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.atoms = [];
        this.bonds = [];
    }

    /**
     * Atom çiz
     * @param {number} x - X koordinatı
     * @param {number} y - Y koordinatı
     * @param {string} symbol - Atom sembolü
     * @param {string} color - Renk
     */
    drawAtom(x, y, symbol, color = '#4caf50', meta = {}) {
        const z = this.zoom || this.scale || 1;
        const radius = Math.max(6, this.baseAtomRadius * z);

        this.ctx.save();

        // If this is an implicit H atom and hydrogens are hidden, don't draw it
        if (meta && meta.implicit && !this.showHydrogens) {
            this.ctx.restore();
            return;
        }

        // soft shadow / glow for hover or selected
        if (meta && (meta.selected || meta._hover)) {
            this.ctx.shadowColor = 'rgba(255,235,59,0.9)';
            this.ctx.shadowBlur = Math.max(10, 18 * z);
        } else {
            this.ctx.shadowColor = 'rgba(0,0,0,0.6)';
            this.ctx.shadowBlur = Math.max(4, 6 * z);
        }

        // radial gradient fill for more depth
        const grad = this.ctx.createRadialGradient(x - radius * 0.25, y - radius * 0.25, radius * 0.15, x, y, radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.85)');
        grad.addColorStop(0.6, color);
        grad.addColorStop(1, 'rgba(0,0,0,0.15)');

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        // Outline (thinner white ring; selected/invalid still noticeable but reduced)
        if (meta && meta.invalid) {
            this.ctx.strokeStyle = '#e53935';
            this.ctx.lineWidth = Math.max(1.2, 1.6 * z);
        } else if (meta && (meta.selected || meta._hover)) {
            this.ctx.strokeStyle = '#ffeb3b';
            this.ctx.lineWidth = Math.max(1.2, 1.6 * z);
        } else {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = Math.max(0.6, 1.0 * z);
        }
        this.ctx.stroke();

        // Atom symbol (crisp, layered for contrast)
        this.ctx.shadowColor = 'transparent';
        this.ctx.fillStyle = '#ffffff';
        const fontSize = Math.max(10, Math.round(radius * 0.78));
        this.ctx.font = '600 ' + fontSize + 'px "Segoe UI", Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(symbol, x, y);

        this.ctx.restore();

        const atomEntry = {
            x, y, symbol, color,
            index: (meta && typeof meta.index === 'number') ? meta.index : undefined,
            implicit: !!(meta && meta.implicit),
            invalid: !!(meta && meta.invalid),
            selected: !!(meta && meta.selected),
            _hover: !!(meta && meta._hover)
        };
        this.atoms.push(atomEntry);
    }

    /**
     * Hidrojenleri implicit olarak ekle (basit valans tablosuna göre)
     * Eklenen hidrojeni gerçek atom listesine ekler ve bond oluşturur
     */
    _addImplicitHydrogens(graph) {
        const valenceMap = { 'H': 1, 'C': 4, 'N': 3, 'O': 2, 'S': 2, 'P': 3, 'F': 1, 'Cl': 1, 'Br': 1, 'I': 1 };

        // compute current bond counts
        const bondCount = new Array(graph.atoms.length).fill(0);
        graph.bonds.forEach(b => {
            bondCount[b.a] += (b.type === 'double' ? 2 : (b.type === 'triple' ? 3 : 1));
            bondCount[b.b] += (b.type === 'double' ? 2 : (b.type === 'triple' ? 3 : 1));
        });

        // For each atom, add hydrogens to satisfy typical valence (simple heuristic)
        const additions = [];
        graph.atoms.forEach((atom, idx) => {
            const v = valenceMap[atom.symbol] || 0;
            const need = Math.max(0, v - bondCount[idx]);
            for (let i = 0; i < need; i++) {
                const hIdx = graph.atoms.length + additions.length;
                additions.push({ symbol: 'H', id: hIdx, implicit: true, parent: idx });
                graph.bonds.push({ a: idx, b: hIdx, type: 'single' });
            }
        });

        // Append added H atoms at positions near their parent (will be laid out by fit)
        additions.forEach(h => {
            graph.atoms.push({ symbol: h.symbol, id: h.id, implicit: true, parent: h.parent });
            // place near parent - slightly offset
            const p = graph.atoms[h.parent];
            graph.atoms[h.id].x = (p.x || this.centerX) + (Math.random() - 0.5) * 20;
            graph.atoms[h.id].y = (p.y || this.centerY) + (Math.random() - 0.5) * 20;
        });
    }

    /**
     * Basit valans kontrolü: atomların toplam bağ sayısını tipik valans ile karşılaştır
     * Eğer bir atomun valansı aşılıyorsa, atom.invalid = true olarak işaretle
     */
    _checkValence(graph) {
        const valenceMap = { 'H': 1, 'C': 4, 'N': 3, 'O': 2, 'S': 2, 'P': 3, 'F': 1, 'Cl': 1, 'Br': 1, 'I': 1 };
        const bondCount = new Array(graph.atoms.length).fill(0);
        graph.bonds.forEach(b => {
            const order = b.type === 'double' ? 2 : (b.type === 'triple' ? 3 : 1);
            bondCount[b.a] += order;
            bondCount[b.b] += order;
        });

        graph.atoms.forEach((atom, idx) => {
            const v = valenceMap[atom.symbol] || 0;
            atom.invalid = v > 0 && bondCount[idx] > v;
        });
    }

    /**
     * Bağ çiz
     * @param {number} x1 - Başlangıç X
     * @param {number} y1 - Başlangıç Y
     * @param {number} x2 - Bitiş X
     * @param {number} y2 - Bitiş Y
     * @param {string} type - Bağ türü
     * @param {string} color - Renk
     */
    drawBond(x1, y1, x2, y2, type = 'single', color = '#81d4fa', meta = {}) {
        // Accept optional stereo parameter via arguments[6]
        const stereo = arguments.length >= 7 ? arguments[6] : null;

        this.ctx.save();

        // If this bond connects to an implicit H atom and hydrogens are hidden, don't draw it
        if (meta && meta.hasImplicitH && !this.showHydrogens) {
            this.ctx.restore();
            return;
        }

        // create subtle gradient along bond
        const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255,255,255,0.12)');
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'rgba(255,255,255,0.08)');
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = Math.max(1, this.baseBondWidth * this.scale);
        this.ctx.lineCap = 'round';

        // If stereo wedge/hash should be drawn, draw it and return
        if (stereo === 'wedge' || stereo === 'hash') {
            this._drawWedgeOrHash(x1, y1, x2, y2, color, stereo);
        } else if (type === 'single') {
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        } else if (type === 'double') {
            // Çift bağ çiz (offset proportional to size)
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpOffset = Math.max(2, Math.round(this.baseBondWidth * this.scale));
            const perpX = -dy / length * perpOffset;
            const perpY = dx / length * perpOffset;

            this.ctx.beginPath();
            this.ctx.moveTo(x1 + perpX, y1 + perpY);
            this.ctx.lineTo(x2 + perpX, y2 + perpY);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(x1 - perpX, y1 - perpY);
            this.ctx.lineTo(x2 - perpX, y2 - perpY);
            this.ctx.stroke();
        } else if (type === 'triple') {
            // Üçlü bağ: üç paralel çizgi
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpOffset = Math.max(2, Math.round(this.baseBondWidth * this.scale));
            const perpX = -dy / length * perpOffset;
            const perpY = dx / length * perpOffset;

            // center line
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            // two outer lines
            this.ctx.beginPath();
            this.ctx.moveTo(x1 + perpX, y1 + perpY);
            this.ctx.lineTo(x2 + perpX, y2 + perpY);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(x1 - perpX, y1 - perpY);
            this.ctx.lineTo(x2 - perpX, y2 - perpY);
            this.ctx.stroke();
        }

        // Slash/backslash for E/Z - draw small marker near middle
        if (stereo === 'slash' || stereo === 'backslash') {
            this._drawSlashMarker(x1, y1, x2, y2, stereo, color);
        }

        this.ctx.restore();
        this.bonds.push({ x1, y1, x2, y2, type, color, stereo });
    }

    _drawWedgeOrHash(x1, y1, x2, y2, color, mode) {
        // Draw a filled wedge (solid triangle) for 'wedge', or hashed wedge for 'hash'
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;

        // base center nearer to x1
        const baseCenterX = x1 + dx * 0.25;
        const baseCenterY = y1 + dy * 0.25;

        // perpendicular vector
        const perpX = -dy / length;
        const perpY = dx / length;

        const width = Math.max(6, this.baseAtomRadius * this.zoom * 0.9);

        const blX = baseCenterX + perpX * width;
        const blY = baseCenterY + perpY * width;
        const brX = baseCenterX - perpX * width;
        const brY = baseCenterY - perpY * width;

        if (mode === 'wedge') {
            this.ctx.beginPath();
            this.ctx.moveTo(x2, y2);
            this.ctx.lineTo(blX, blY);
            this.ctx.lineTo(brX, brY);
            this.ctx.closePath();
            this.ctx.fillStyle = color;
            this.ctx.fill();
        } else {
            // hashed wedge: draw multiple short parallel lines between base and apex
            const steps = Math.max(4, Math.round(6 * this.scale));
            for (let i = 0; i < steps; i++) {
                const t = i / (steps - 1);
                const sx = blX + (brX - blX) * t;
                const sy = blY + (brY - blY) * t;
                const ex = sx + (x2 - sx) * (0.9 - t * 0.4);
                const ey = sy + (y2 - sy) * (0.9 - t * 0.4);
                this.ctx.beginPath();
                this.ctx.moveTo(sx, sy);
                this.ctx.lineTo(ex, ey);
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = Math.max(1, Math.round(1 * this.scale));
                this.ctx.stroke();
            }
        }
    }

    _drawSlashMarker(x1, y1, x2, y2, stereo, color) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / length;
        const perpY = dx / length;

        const len = Math.max(8, 10 * this.zoom);
        const sign = stereo === 'slash' ? 1 : -1;
        const sx = mx - dx / length * (len / 2) + perpX * sign * (len / 3);
        const sy = my - dy / length * (len / 2) + perpY * sign * (len / 3);
        const ex = mx + dx / length * (len / 2) + perpX * sign * (len / 3);
        const ey = my + dy / length * (len / 2) + perpY * sign * (len / 3);

        this.ctx.beginPath();
        this.ctx.moveTo(sx, sy);
        this.ctx.lineTo(ex, ey);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = Math.max(1, Math.round(2 * this.zoom));
        this.ctx.stroke();
    }

    /**
     * Halka çiz
     * @param {number} centerX - Merkez X
     * @param {number} centerY - Merkez Y
     * @param {number} radius - Yarıçap
     * @param {Array} atoms - Atom listesi
     * @param {Array} bonds - Bağ listesi
     */
    drawRing(centerX, centerY, radius, atoms, bonds) {
        const angleStep = (2 * Math.PI) / atoms.length;

        // Atomları çiz
        atoms.forEach((atom, i) => {
            const angle = i * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            this.drawAtom(x, y, atom.symbol, atom.color);
        });

        // Bağları çiz
        bonds.forEach((bond, i) => {
            const angle1 = i * angleStep;
            const angle2 = ((i + 1) % atoms.length) * angleStep;
            const x1 = centerX + radius * Math.cos(angle1);
            const y1 = centerY + radius * Math.sin(angle1);
            const x2 = centerX + radius * Math.cos(angle2);
            const y2 = centerY + radius * Math.sin(angle2);
            this.drawBond(x1, y1, x2, y2, bond.type, bond.color);
        });
    }

    /**
     * SMILES'i parse et ve çiz
     * @param {string} smiles - SMILES string
     * @returns {boolean}
     */
    parseAndDraw(smiles) {
        // Adjust canvas to current display size for crisp rendering
        this._adjustCanvasForHiDPI();
        this.clear();

        // Background gradient for depth
        const bgGrad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        bgGrad.addColorStop(0, '#0f1113');
        bgGrad.addColorStop(1, '#151517');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // subtle vignette
        this.ctx.fillStyle = 'rgba(0,0,0,0.06)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Basit SMILES parser ve genel çizim mantığı
        try {
            const graph = this._parseSMILES(smiles);
            if (!graph || graph.atoms.length === 0) {
                throw new Error('Parse failed');
            }

            // Always add implicit hydrogens to the graph
            this._addImplicitHydrogens(graph);

            // Check valence violations and mark atoms
            this._checkValence(graph);

            this._layoutGraph(graph);

            // keep reference to original smiles for potential redraws
            graph.smiles = smiles;

            // Save current graph for pan/zoom interactions
            this.currentGraph = graph;

            // Çizimleri yap (özel: bondları arkada, atomları önde)
            graph.bonds.forEach(b => {
                const a1 = graph.atoms[b.a];
                const a2 = graph.atoms[b.b];
                if (a1 && a2 && typeof a1.x === 'number' && typeof a2.x === 'number') {
                    const x1 = this.centerX + (a1.x - this.centerX) * this.zoom + this.offsetX;
                    const y1 = this.centerY + (a1.y - this.centerY) * this.zoom + this.offsetY;
                    const x2 = this.centerX + (a2.x - this.centerX) * this.zoom + this.offsetX;
                    const y2 = this.centerY + (a2.y - this.centerY) * this.zoom + this.offsetY;
                    // Check if this bond connects to an implicit H atom
                    const hasImplicitH = (a1.implicit && a1.symbol === 'H') || (a2.implicit && a2.symbol === 'H');
                    this.drawBond(x1, y1, x2, y2, b.type, '#81d4fa', { hasImplicitH });
                }
            });

            graph.atoms.forEach((atom, idx) => {
                const color = this._atomColor(atom.symbol);
                const tx = this.centerX + (atom.x - this.centerX) * this.zoom + this.offsetX;
                const ty = this.centerY + (atom.y - this.centerY) * this.zoom + this.offsetY;
                // subpixel translate for crisper rendering
                const subx = Math.round(tx * this._dpr) / this._dpr;
                const suby = Math.round(ty * this._dpr) / this._dpr;
                this.drawAtom(subx, suby, atom.symbol, color, { index: idx, implicit: !!atom.implicit, invalid: !!atom.invalid, selected: !!atom.selected, _hover: !!atom._hover });
            });

            return true;
        } catch (e) {
            // Eğer parse edilemezse basit placeholder göster
            this.ctx.fillStyle = '#4caf50';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`SMILES: ${smiles}`, this.centerX, this.centerY - 20);
            this.ctx.fillStyle = '#81d4fa';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('Molekül otomatik olarak çizilemedi', this.centerX, this.centerY + 10);
            return false;
        }
    }

    /**
     * Convenience: redraw from an already parsed graph (used for pan/zoom)
     */
    parseAndDrawFromGraph(graph) {
        if (!graph) return false;
        // Adjust canvas to current display size in case container changed
        this._adjustCanvasForHiDPI();
        this.clear();
        // draw background
        this.ctx.fillStyle = 'rgba(26, 26, 26, 0.0)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // draw bonds then atoms using current zoom/offset
        graph.bonds.forEach(b => {
            const a1 = graph.atoms[b.a];
            const a2 = graph.atoms[b.b];
            if (!a1 || !a2) return;

            // For PubChem graphs, skip hydrogen bonds if showHydrogens is false
            if (graph.isPubChem && !this.showHydrogens) {
                if (a1.isHydrogen || a2.isHydrogen || a1.symbol === 'H' || a2.symbol === 'H') return;
            }

            const x1 = this.centerX + (a1.x - this.centerX) * this.zoom + this.offsetX;
            const y1 = this.centerY + (a1.y - this.centerY) * this.zoom + this.offsetY;
            const x2 = this.centerX + (a2.x - this.centerX) * this.zoom + this.offsetX;
            const y2 = this.centerY + (a2.y - this.centerY) * this.zoom + this.offsetY;
            // Check if this bond connects to an implicit H atom
            const hasImplicitH = (a1.implicit && a1.symbol === 'H') || (a2.implicit && a2.symbol === 'H');
            // draw bonds slightly below atom layer for better overlap
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'destination-over';
            this.drawBond(x1, y1, x2, y2, b.type, b.color, { hasImplicitH });
            this.ctx.restore();
        });

        graph.atoms.forEach((atom, idx) => {
            // For PubChem graphs, skip hydrogen atoms if showHydrogens is false
            if (graph.isPubChem && !this.showHydrogens) {
                if (atom.isHydrogen || atom.symbol === 'H') return;
            }

            const color = this._atomColor(atom.symbol);
            const tx = this.centerX + (atom.x - this.centerX) * this.zoom + this.offsetX;
            const ty = this.centerY + (atom.y - this.centerY) * this.zoom + this.offsetY;
            const subx = Math.round(tx * this._dpr) / this._dpr;
            const suby = Math.round(ty * this._dpr) / this._dpr;
            this.drawAtom(subx, suby, atom.symbol, color, { index: idx, implicit: !!atom.implicit, invalid: !!atom.invalid, selected: !!atom.selected, _hover: !!atom._hover });
        });

        return true;
    }

    /**
     * PubChem 2D koordinat verisinden molekül çiz
     * @param {Object} data - { atoms: [{id, symbol, x, y}], bonds: [{from, to, order}] }
     * @returns {boolean}
     */
    drawFromPubChemCoords(data) {
        if (!data || !data.atoms || data.atoms.length === 0) return false;

        this._adjustCanvasForHiDPI();
        this.clear();

        // Build graph structure from PubChem data
        const graph = {
            atoms: [],
            bonds: [],
            isPubChem: true
        };

        // Create ID to index mapping
        const idToIndex = new Map();
        data.atoms.forEach((atom, idx) => {
            idToIndex.set(atom.id, idx);
            graph.atoms.push({
                id: atom.id,
                symbol: atom.symbol,
                x: atom.x,
                y: atom.y,
                _placed: true,
                isHydrogen: atom.symbol === 'H'
            });
        });

        // Convert bonds
        data.bonds.forEach(bond => {
            const aIdx = idToIndex.get(bond.from);
            const bIdx = idToIndex.get(bond.to);
            if (aIdx !== undefined && bIdx !== undefined) {
                const orderMap = { 1: 'single', 2: 'double', 3: 'triple' };
                graph.bonds.push({
                    a: aIdx,
                    b: bIdx,
                    type: orderMap[bond.order] || 'single'
                });
            }
        });

        // Scale and center the molecule to fit canvas
        this._fitPubChemToCanvas(graph);

        // Save current graph for pan/zoom
        this.currentGraph = graph;

        // Draw bonds first (filter out hydrogen bonds if showHydrogens is false)
        graph.bonds.forEach(b => {
            const a1 = graph.atoms[b.a];
            const a2 = graph.atoms[b.b];
            if (!a1 || !a2) return;

            // Skip bonds involving hydrogens if showHydrogens is false
            if (!this.showHydrogens && (a1.isHydrogen || a2.isHydrogen)) return;

            const x1 = this.centerX + (a1.x - this.centerX) * this.zoom + this.offsetX;
            const y1 = this.centerY + (a1.y - this.centerY) * this.zoom + this.offsetY;
            const x2 = this.centerX + (a2.x - this.centerX) * this.zoom + this.offsetX;
            const y2 = this.centerY + (a2.y - this.centerY) * this.zoom + this.offsetY;
            this.drawBond(x1, y1, x2, y2, b.type, '#81d4fa', {});
        });

        // Draw atoms on top (filter out hydrogens if showHydrogens is false)
        graph.atoms.forEach((atom, idx) => {
            // Skip hydrogen atoms if showHydrogens is false
            if (!this.showHydrogens && atom.isHydrogen) return;

            const color = this._atomColor(atom.symbol);
            const tx = this.centerX + (atom.x - this.centerX) * this.zoom + this.offsetX;
            const ty = this.centerY + (atom.y - this.centerY) * this.zoom + this.offsetY;
            const subx = Math.round(tx * this._dpr) / this._dpr;
            const suby = Math.round(ty * this._dpr) / this._dpr;
            this.drawAtom(subx, suby, atom.symbol, color, { index: idx });
        });

        return true;
    }

    /**
     * PubChem koordinatlarını canvas'a sığdır ve ölçekle
     */
    _fitPubChemToCanvas(graph) {
        if (!graph || !graph.atoms || graph.atoms.length === 0) return;

        // Find bounding box
        const xs = graph.atoms.map(a => a.x);
        const ys = graph.atoms.map(a => a.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const contentW = (maxX - minX) || 1;
        const contentH = (maxY - minY) || 1;

        // Available canvas space with padding
        const availW = this.cssWidth - this.padding * 2;
        const availH = this.cssHeight - this.padding * 2;

        // Calculate scale to fit
        const scaleX = availW / contentW;
        const scaleY = availH / contentH;
        const fitScale = Math.min(scaleX, scaleY, 60); // Cap at 60 to prevent oversized molecules

        // Center point of molecule
        const centerMolX = minX + contentW / 2;
        const centerMolY = minY + contentH / 2;

        // Transform atom positions to canvas coordinates
        graph.atoms.forEach(a => {
            a.x = this.centerX + (a.x - centerMolX) * fitScale;
            a.y = this.centerY + (a.y - centerMolY) * fitScale;
        });

        // Update scale and reset pan
        this.scale = 1;
        this.zoom = 1;
        this.targetZoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
    }

    /**
     * Export current canvas content as PNG data URL (high DPI support)
     * @param {number} scaleFactor - optional scale (e.g. 2 for 2x)
     * @returns {string} dataURL
     */
    exportPNG(scaleFactor = 1) {
        const srcCanvas = this.canvas;
        const w = srcCanvas.width;
        const h = srcCanvas.height;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = Math.round(w * scaleFactor);
        exportCanvas.height = Math.round(h * scaleFactor);
        const ectx = exportCanvas.getContext('2d');

        ectx.scale(scaleFactor, scaleFactor);
        // draw the same background
        ectx.fillStyle = 'rgba(26, 26, 26, 0.8)';
        ectx.fillRect(0, 0, w, h);

        // Re-draw graph onto export canvas using currentGraph but without UI transforms
        if (this.currentGraph) {
            // draw bonds
            this.currentGraph.bonds.forEach(b => {
                const a1 = this.currentGraph.atoms[b.a];
                const a2 = this.currentGraph.atoms[b.b];
                if (!a1 || !a2) return;
                // use positions already in atom coords
                this._drawExportBond(ectx, a1.x, a1.y, a2.x, a2.y, b.type, b.stereo);
            });

            // draw atoms
            this.currentGraph.atoms.forEach(atom => {
                this._drawExportAtom(ectx, atom.x, atom.y, atom.symbol, this._atomColor(atom.symbol));
            });
        }

        return exportCanvas.toDataURL('image/png');
    }

    _drawExportAtom(ectx, x, y, symbol, color) {
        const radius = Math.max(6, this.baseAtomRadius * this.scale);
        ectx.beginPath();
        ectx.arc(x, y, radius, 0, 2 * Math.PI);
        ectx.fillStyle = color;
        ectx.fill();
        ectx.strokeStyle = '#ffffff';
        ectx.lineWidth = Math.max(1, Math.round(2 * this.scale));
        ectx.stroke();

        ectx.fillStyle = '#ffffff';
        const fontSize = Math.max(10, Math.round(radius * 0.8));
        ectx.font = 'bold ' + fontSize + 'px Arial';
        ectx.textAlign = 'center';
        ectx.textBaseline = 'middle';
        ectx.fillText(symbol, x, y);
    }

    _drawExportBond(ectx, x1, y1, x2, y2, type, stereo) {
        ectx.strokeStyle = '#81d4fa';
        ectx.lineWidth = Math.max(1, this.baseBondWidth * this.scale);
        ectx.lineCap = 'round';

        if (type === 'single') {
            ectx.beginPath(); ectx.moveTo(x1, y1); ectx.lineTo(x2, y2); ectx.stroke();
        } else if (type === 'double') {
            const dx = x2 - x1, dy = y2 - y1; const length = Math.sqrt(dx * dx + dy * dy) || 1;
            const perp = Math.max(2, Math.round(this.baseBondWidth * this.scale));
            const px = -dy / length * perp, py = dx / length * perp;
            ectx.beginPath(); ectx.moveTo(x1 + px, y1 + py); ectx.lineTo(x2 + px, y2 + py); ectx.stroke();
            ectx.beginPath(); ectx.moveTo(x1 - px, y1 - py); ectx.lineTo(x2 - px, y2 - py); ectx.stroke();
        } else if (type === 'triple') {
            const dx = x2 - x1, dy = y2 - y1; const length = Math.sqrt(dx * dx + dy * dy) || 1;
            const perp = Math.max(2, Math.round(this.baseBondWidth * this.scale));
            const px = -dy / length * perp, py = dx / length * perp;
            ectx.beginPath(); ectx.moveTo(x1, y1); ectx.lineTo(x2, y2); ectx.stroke();
            ectx.beginPath(); ectx.moveTo(x1 + px, y1 + py); ectx.lineTo(x2 + px, y2 + py); ectx.stroke();
            ectx.beginPath(); ectx.moveTo(x1 - px, y1 - py); ectx.lineTo(x2 - px, y2 - py); ectx.stroke();
        }

        // stereo markers not drawn in export for simplicity
    }

    /**
     * Basit SMILES tokenizer & parser (desteklenen: atom sembolleri, =,#, parantez, rakamlar için halka kapanışı)
     * @param {string} smiles
     * @returns {{atoms: Array, bonds: Array}}
     */
    _parseSMILES(smiles) {
        const atoms = [];
        const bonds = [];

        const branchStack = [];
        const ringMap = {}; // digit -> atomIndex

        let lastAtom = -1;
        let bondType = 'single';
        let bondStereoToken = null; // '/' or '\\' between atoms indicates double-bond stereo
        let pendingChiral = null; // '@' or '@@' before an atom

        for (let i = 0; i < smiles.length; i++) {
            const ch = smiles[i];

            if (ch === '(') {
                branchStack.push(lastAtom);
                continue;
            }

            if (ch === ')') {
                lastAtom = branchStack.pop() ?? lastAtom;
                continue;
            }

            if (ch === '=') { bondType = 'double'; continue; }
            if (ch === '#') { bondType = 'triple'; continue; }
            if (ch === '-') { bondType = 'single'; continue; }
            // Double-bond stereo markers
            if (ch === '/' || ch === '\\') { bondStereoToken = ch; continue; }

            // Chirality markers: '@' or '@@'
            if (ch === '@') {
                if (i + 1 < smiles.length && smiles[i + 1] === '@') {
                    pendingChiral = '@@';
                    i += 1;
                } else {
                    pendingChiral = '@';
                }
                continue;
            }

            // Ring closure digits (1-9)
            if (/[0-9]/.test(ch)) {
                const digit = ch;
                if (ringMap[digit] === undefined) {
                    // mark current atom as ring start
                    ringMap[digit] = lastAtom;
                } else if (lastAtom !== -1) {
                    // create bond between lastAtom and stored
                    bonds.push({ a: lastAtom, b: ringMap[digit], type: bondType });
                    delete ringMap[digit];
                    bondType = 'single';
                }
                continue;
            }

            // Bracketed atoms [NH4+]
            if (ch === '[') {
                let end = smiles.indexOf(']', i + 1);
                if (end === -1) throw new Error('Unclosed bracket');
                const symbol = smiles.slice(i + 1, end);
                i = end;

                const atomIdx = atoms.length;
                atoms.push({ symbol: symbol.replace(/[^A-Za-z]/g, ''), id: atomIdx });
                if (lastAtom !== -1) {
                    bonds.push({ a: lastAtom, b: atomIdx, type: bondType });
                    bondType = 'single';
                }
                lastAtom = atomIdx;
                continue;
            }

            // Element symbols: uppercase optionally followed by lowercase (Cl, Br)
            if (/[A-Z]/.test(ch) || /[a-z]/.test(ch)) {
                let symbol = ch;

                // If uppercase and next is lowercase, include it
                if (/[A-Z]/.test(ch) && i + 1 < smiles.length && /[a-z]/.test(smiles[i + 1])) {
                    symbol = smiles[i] + smiles[i + 1];
                    i += 1;
                } else if (/[a-z]/.test(ch)) {
                    // aromatic lowercase -- treat as uppercase atom for now
                    symbol = ch.toUpperCase();
                }

                const atomIdx = atoms.length;
                atoms.push({ symbol, id: atomIdx });
                if (lastAtom !== -1) {
                    bonds.push({ a: lastAtom, b: atomIdx, type: bondType });
                    bondType = 'single';
                }
                lastAtom = atomIdx;
                continue;
            }

            // Ignore any other characters
        }

        return { atoms, bonds };
    }

    /**
     * Basit kuvvet-temelli olmayan layout: ağaç-gezintisi ile düğümleri yerleştir
     * @param {{atoms: Array, bonds: Array}} graph
     */
    _layoutGraph(graph) {
        const step = 80;
        const adj = new Map();
        graph.atoms.forEach((a, idx) => adj.set(idx, []));
        graph.bonds.forEach(b => {
            adj.get(b.a).push({ to: b.b });
            adj.get(b.b).push({ to: b.a });
        });

        // initialize positions
        graph.atoms.forEach(a => { a.x = null; a.y = null; a._placed = false; });

        // Place first atom in center-left to make structure centered later
        if (graph.atoms.length === 0) return;
        graph.atoms[0].x = this.centerX - step;
        graph.atoms[0].y = this.centerY;
        graph.atoms[0]._placed = true;

        const visited = new Set();
        const stack = [{ idx: 0, parent: -1, angle: 0 }];

        while (stack.length) {
            const node = stack.pop();
            const neighbors = adj.get(node.idx) || [];
            // Spread child angles
            let childCount = neighbors.filter(n => !graph.atoms[n.to]._placed).length;
            let childIndex = 0;

            for (let n of neighbors) {
                const ni = n.to;
                if (ni === node.parent) continue;
                if (graph.atoms[ni]._placed) continue;

                // angle assignment: distribute children around parent
                const spread = Math.PI / 3; // 60 degrees
                let ang = node.angle;
                if (childCount > 1) {
                    ang = node.angle - spread / 2 + (childIndex * (spread / Math.max(1, childCount - 1)));
                } else {
                    ang = node.angle;
                }

                graph.atoms[ni].x = graph.atoms[node.idx].x + step * Math.cos(ang);
                graph.atoms[ni].y = graph.atoms[node.idx].y + step * Math.sin(ang);
                graph.atoms[ni]._placed = true;

                // Push child to stack with a rotated angle for its children
                stack.push({ idx: ni, parent: node.idx, angle: ang });
                childIndex++;
            }
        }

        // If there are unplaced atoms (due to rings), place them near center temporarily
        graph.atoms.forEach(a => {
            if (!a._placed) {
                a.x = this.centerX + (Math.random() - 0.5) * 40;
                a.y = this.centerY + (Math.random() - 0.5) * 40;
            }
        });

        // Detect simple cycles (rings) and layout them geometrically
        const cycles = this._findCycles(graph);
        if (cycles && cycles.length > 0) {
            this._layoutRings(graph, cycles, step);
        }

        // Fit graph to canvas and compute scale
        this._fitToCanvas(graph);
    }

    /**
     * Basit döngü (ring) tespiti: DFS ile yolda tekrar karşılaşılan düğümlerden döngü çıkar
     * Döngülerin tekrarını önlemek için normalize eder (küçük indeksle başlamaya kaydır)
     * @param {{atoms: Array, bonds: Array}} graph
     * @returns {Array<Array<number>>} cycles - list of atom index arrays
     */
    _findCycles(graph) {
        const adj = new Map();
        graph.atoms.forEach((a, i) => adj.set(i, []));
        graph.bonds.forEach(b => {
            adj.get(b.a).push(b.b);
            adj.get(b.b).push(b.a);
        });

        const cycles = new Set();
        const visited = new Set();

        const dfs = (start, current, parent, path, seenSet) => {
            seenSet.add(current);
            path.push(current);

            for (const nb of adj.get(current) || []) {
                if (nb === parent) continue;
                if (nb === start && path.length >= 3) {
                    // found a cycle
                    const cycle = [...path];
                    // normalize cycle representation (rotate so smallest index first, and unify direction)
                    const minIdx = cycle.reduce((m, v, i) => v < cycle[m] ? i : m, 0);
                    const rotated = cycle.slice(minIdx).concat(cycle.slice(0, minIdx));
                    const rev = [...rotated].reverse();
                    const key = rotated.join(',') < rev.join(',') ? rotated.join(',') : rev.join(',');
                    cycles.add(key);
                } else if (!seenSet.has(nb) && path.length < 12) {
                    dfs(start, nb, current, path, seenSet);
                }
            }

            path.pop();
            seenSet.delete(current);
        };

        for (let i = 0; i < graph.atoms.length; i++) {
            dfs(i, i, -1, [], new Set());
            visited.add(i);
        }

        // Convert keys back to arrays
        return Array.from(cycles).map(k => k.split(',').map(s => parseInt(s, 10)));
    }

    /**
     * Döngüleri geometrik olarak yerleştirir: her döngüdeki atomları düzgün bir çember üzerine koyar
     * @param {{atoms:Array,bonds:Array}} graph
     * @param {Array<Array<number>>} cycles
     * @param {number} baseStep
     */
    _layoutRings(graph, cycles, baseStep) {
        // Sort cycles by length (shorter first)
        cycles.sort((a, b) => a.length - b.length);

        for (const cycle of cycles) {
            // compute centroid of current atom positions
            const pts = cycle.map(idx => graph.atoms[idx]);
            const cx = pts.reduce((s, p) => s + (p.x || this.centerX), 0) / pts.length;
            const cy = pts.reduce((s, p) => s + (p.y || this.centerY), 0) / pts.length;

            // radius based on cycle size and baseStep
            const radius = Math.max(baseStep * 0.6, (cycle.length / (2 * Math.PI)) * baseStep);
            const angleStep = (2 * Math.PI) / cycle.length;

            for (let i = 0; i < cycle.length; i++) {
                const idx = cycle[i];
                const angle = i * angleStep - Math.PI / 2; // rotate so first is top
                graph.atoms[idx].x = cx + radius * Math.cos(angle);
                graph.atoms[idx].y = cy + radius * Math.sin(angle);
                graph.atoms[idx]._placed = true;
            }
        }
    }

    /**
     * Atom sembolüne göre renk belirle
     */
    _atomColor(symbol) {
        const map = {
            'H': '#ffffff',
            'C': '#4caf50',
            'O': '#ff9800',
            'N': '#2196f3',
            'S': '#ffd54f',
            'P': '#ffb74d',
            'F': '#aed581',
            'Cl': '#9ccc65',
            'Br': '#8d6e63',
            'I': '#b39ddb'
        };
        return map[symbol] || '#90a4ae';
    }

    /**
     * Fit the laid out graph into the canvas by computing a uniform scale and translating atom positions
     */
    _fitToCanvas(graph) {
        if (!graph || !graph.atoms || graph.atoms.length === 0) return;

        const xs = graph.atoms.map(a => a.x);
        const ys = graph.atoms.map(a => a.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const contentW = maxX - minX || 1;
        const contentH = maxY - minY || 1;

        const availW = this.canvas.width - this.padding * 2;
        const availH = this.canvas.height - this.padding * 2;

        const scaleX = availW / contentW;
        const scaleY = availH / contentH;
        this.scale = Math.min(1, Math.min(scaleX, scaleY));

        // Center translation
        const centerContentX = minX + contentW / 2;
        const centerContentY = minY + contentH / 2;

        const offsetX = this.centerX - centerContentX;
        const offsetY = this.centerY - centerContentY;

        // Apply scale and offset to atom positions
        graph.atoms.forEach(a => {
            a.x = this.centerX + (a.x - centerContentX) * this.scale;
            a.y = this.centerY + (a.y - centerContentY) * this.scale;
        });

        // Update zoom base
        this.zoom = this.scale;
        // reset pan offsets
        this.offsetX = 0;
        this.offsetY = 0;
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.targetZoom = Math.min(this.targetZoom * 1.2, 5);
        this._animateToTarget();
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.targetZoom = Math.max(this.targetZoom / 1.2, 0.1);
        this._animateToTarget();
    }

    /**
     * Reset view
     */
    resetView() {
        this.targetZoom = this.scale;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this._animateToTarget();
    }

    /**
     * Animate to target values
     */
    _animateToTarget() {
        if (this._animating) return;

        this._animating = true;
        const animate = () => {
            const diff = 0.1;
            let changed = false;

            if (Math.abs(this.zoom - this.targetZoom) > 0.01) {
                this.zoom += (this.targetZoom - this.zoom) * diff;
                changed = true;
            }

            if (Math.abs(this.offsetX - this.targetOffsetX) > 0.01) {
                this.offsetX += (this.targetOffsetX - this.offsetX) * diff;
                changed = true;
            }

            if (Math.abs(this.offsetY - this.targetOffsetY) > 0.01) {
                this.offsetY += (this.targetOffsetY - this.offsetY) * diff;
                changed = true;
            }

            if (changed) {
                this.redraw();
                requestAnimationFrame(animate);
            } else {
                this._animating = false;
            }
        };

        animate();
    }

    /**
     * Redraw the molecule
     */
    redraw() {
        if (this.currentGraph) {
            this.parseAndDraw(this.currentGraph.smiles || '');
        }
    }
}

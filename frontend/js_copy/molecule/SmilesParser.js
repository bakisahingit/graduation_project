/**
 * SMILES Parser
 * SMILES string'ini parse edip 2D graph yapısına dönüştürür.
 * Ayrıca basit layout algoritmalarını içerir.
 */

export class SmilesParser {
    constructor() {
        // Layout yapılandırması
        this.step = 80;
    }

    /**
     * SMILES string'i parse et ve graph oluştur
     * @param {string} smiles
     * @returns {{atoms: Array, bonds: Array}}
     */
    parse(smiles) {
        if (!smiles) return { atoms: [], bonds: [] };

        const atoms = [];
        const bonds = [];

        const branchStack = [];
        const ringMap = {}; // digit -> atomIndex

        let lastAtom = -1;
        let bondType = 'single';
        let bondStereoToken = null; // '/' or '\\'
        let pendingChiral = null; // '@' or '@@'

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
            if (ch === '/' || ch === '\\') { bondStereoToken = ch; continue; }

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
                    ringMap[digit] = lastAtom;
                } else if (lastAtom !== -1) {
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

            // Element symbols
            if (/[A-Z]/.test(ch) || /[a-z]/.test(ch)) {
                let symbol = ch;

                if (/[A-Z]/.test(ch) && i + 1 < smiles.length && /[a-z]/.test(smiles[i + 1])) {
                    symbol = smiles[i] + smiles[i + 1];
                    i += 1;
                } else if (/[a-z]/.test(ch)) {
                    symbol = ch.toUpperCase();
                }

                const atomIdx = atoms.length;
                // Placeholders for layout logic
                atoms.push({
                    symbol,
                    id: atomIdx,
                    x: null,
                    y: null,
                    _placed: false
                });

                if (lastAtom !== -1) {
                    bonds.push({ a: lastAtom, b: atomIdx, type: bondType });
                    bondType = 'single';
                }
                lastAtom = atomIdx;
                continue;
            }
        }

        return { atoms, bonds };
    }

    /**
     * Graph yapısına layout uygula (koordinatları hesapla)
     * @param {{atoms: Array, bonds: Array}} graph
     */
    layout(graph) {
        if (!graph || graph.atoms.length === 0) return;

        const adj = new Map();
        graph.atoms.forEach((a, idx) => adj.set(idx, []));
        graph.bonds.forEach(b => {
            adj.get(b.a).push({ to: b.b });
            adj.get(b.b).push({ to: b.a });
        });

        // Initialize positions
        graph.atoms.forEach(a => { a.x = 0; a.y = 0; a._placed = false; });

        // İlk atomu merkeze yerleştir
        graph.atoms[0].x = 0;
        graph.atoms[0].y = 0;
        graph.atoms[0]._placed = true;

        const stack = [{ idx: 0, parent: -1, angle: 0 }];

        while (stack.length) {
            const node = stack.pop();
            const neighbors = adj.get(node.idx) || [];

            // Henüz yerleşmemiş komşuları bul
            let unplacedNeighbors = neighbors.filter(n => !graph.atoms[n.to]._placed);
            let childCount = unplacedNeighbors.length;
            let childIndex = 0;

            for (let n of neighbors) {
                const ni = n.to;
                if (ni === node.parent) continue;
                if (graph.atoms[ni]._placed) continue;

                // Açı dağılımı
                const spread = Math.PI * 0.8; // Geniş açı
                let ang = node.angle;

                if (childCount > 1) {
                    ang = node.angle - spread / 2 + (childIndex * (spread / Math.max(1, childCount - 1)));
                } else {
                    // Tek çocuk varsa dümdüz veya hafif kıvrımlı devam et
                    ang = node.angle + (Math.random() - 0.5) * 0.5;
                }

                graph.atoms[ni].x = graph.atoms[node.idx].x + this.step * Math.cos(ang);
                graph.atoms[ni].y = graph.atoms[node.idx].y + this.step * Math.sin(ang);
                graph.atoms[ni]._placed = true;

                stack.push({ idx: ni, parent: node.idx, angle: ang });
                childIndex++;
            }
        }

        // Yerleşmemiş atomları (ring closure vb. nedeniyle) idare et
        graph.atoms.forEach(a => {
            if (!a._placed) {
                a.x = (Math.random() - 0.5) * this.step;
                a.y = (Math.random() - 0.5) * this.step;
            }
        });

        // Döngüleri düzelt
        const cycles = this._findCycles(graph);
        if (cycles && cycles.length > 0) {
            this._layoutRings(graph, cycles);
        }
    }

    /**
     * Döngü tespiti (DFS)
     */
    _findCycles(graph) {
        const adj = new Map();
        graph.atoms.forEach((a, i) => adj.set(i, []));
        graph.bonds.forEach(b => {
            adj.get(b.a).push(b.b);
            adj.get(b.b).push(b.a);
        });

        const cycles = new Set();

        const dfs = (start, current, parent, path, seenSet) => {
            seenSet.add(current);
            path.push(current);

            for (const nb of adj.get(current) || []) {
                if (nb === parent) continue;
                if (nb === start && path.length >= 3) {
                    // Found cycle
                    const cycle = [...path];
                    // Normalize
                    const minIdx = cycle.reduce((m, v, i) => v < cycle[m] ? i : m, 0);
                    const rotated = cycle.slice(minIdx).concat(cycle.slice(0, minIdx));
                    const key = rotated.join(',');
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
        }

        return Array.from(cycles).map(k => k.split(',').map(Number));
    }

    /**
     * Ring layout düzeltmesi (Basit geometrik düzenleme)
     */
    _layoutRings(graph, cycles) {
        cycles.forEach(cycle => {
            if (cycle.length < 3) return;

            // Döngü merkezi
            let centerX = 0, centerY = 0;
            cycle.forEach(idx => {
                centerX += graph.atoms[idx].x;
                centerY += graph.atoms[idx].y;
            });
            centerX /= cycle.length;
            centerY /= cycle.length;

            // Düzgün çokgen olarak yerleştir
            const radius = (this.step * cycle.length) / (2 * Math.PI);
            const startAngle = Math.atan2(graph.atoms[cycle[0]].y - centerY, graph.atoms[cycle[0]].x - centerX);

            cycle.forEach((idx, i) => {
                const angle = startAngle + (i * 2 * Math.PI) / cycle.length;
                graph.atoms[idx].x = centerX + radius * Math.cos(angle);
                graph.atoms[idx].y = centerY + radius * Math.sin(angle);
            });
        });
    }

    /**
     * Implicit hidrojenleri hesapla ve ekle
     */
    addImplicitHydrogens(graph) {
        const valenceMap = {
            'C': 4, 'N': 3, 'O': 2, 'S': 2, 'F': 1, 'Cl': 1, 'Br': 1, 'I': 1, 'H': 1, 'P': 5
        };

        graph.atoms.forEach((atom, idx) => {
            if (atom.explicitH) return; // Zaten varsa atla

            let currentValence = 0;
            // Mevcut bağları say
            graph.bonds.forEach(b => {
                if (b.a === idx || b.b === idx) {
                    const order = b.type === 'double' ? 2 : (b.type === 'triple' ? 3 : 1);
                    currentValence += order;
                }
            });

            const maxValence = valenceMap[atom.symbol] || 0;
            const hCount = Math.max(0, maxValence - currentValence);

            // Graph'e H atomları eklemiyoruz, sadece görsel işaret veya atom özelliği olarak tutuyoruz
            // Parsing aşamasında flag olarak eklemek daha performanslı
            atom.implicitHCount = hCount;
        });
    }
}

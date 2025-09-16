/**
 * Markdown Component
 * Markdown render ve syntax highlighting bileşeni
 */

import { DOMUtils } from '../utils/dom.js';

export class MarkdownComponent {
    constructor() {
        this.isMarkedLoaded = typeof marked !== 'undefined';
        this.isDOMPurifyLoaded = typeof DOMPurify !== 'undefined';
        this.isPrismLoaded = typeof Prism !== 'undefined';
    }

    /**
     * Markdown'ı HTML'e çevir
     * @param {string} markdown - Markdown metni
     * @returns {string} - HTML string
     */
    renderToHtml(markdown) {
        if (!markdown) return '';
        
        // Kütüphane tabanlı render tercih edilir
        if (this.isMarkedLoaded && this.isDOMPurifyLoaded) {
            try {
                // Prism.js entegrasyonu
                if (this.isPrismLoaded) {
                    marked.setOptions({
                        highlight: function(code, lang) {
                            try {
                                if (lang && Prism.languages[lang]) {
                                    return Prism.highlight(code, Prism.languages[lang], lang);
                                }
                                return Prism.highlight(code, Prism.languages.auto, 'auto');
                            } catch (e) {
                                return DOMUtils.escapeHtml(code);
                            }
                        }
                    });
                }

                const raw = marked.parse(markdown);
                // HTML'i sanitize et
                return DOMPurify.sanitize(raw, {ADD_ATTR: ['target']});
            } catch (e) {
                console.error('marked/DOMPurify render failed', e);
                // Fallback: basit escape
                return DOMUtils.escapeHtml(markdown).replace(/\n/g, '<br>');
            }
        }

        // Fallback: basit renderer
        return DOMUtils.escapeHtml(markdown).replace(/\n/g, '<br>');
    }

    /**
     * Typewriter efekti ile markdown render
     * @param {Element} element - Hedef element
     * @param {string} text - Render edilecek metin
     * @param {number} speed - Yazma hızı
     * @param {Function} onProgress - İlerleme callback'i
     * @returns {Promise}
     */
    async typeWriteMarkdown(element, text, speed = 0.1, onProgress = null) {
        return new Promise((resolve) => {
            let i = 0;
            let buffer = '';
            element.innerHTML = '';
            
            const step = () => {
                if (i < text.length) {
                    buffer += text[i++];
                    try {
                        const html = this.renderToHtml(buffer);
                        element.innerHTML = html;
                        
                        // Syntax highlighting uygula
                        if (this.isPrismLoaded) {
                            element.querySelectorAll('pre code').forEach(block => { 
                                try { 
                                    Prism.highlightElement(block); 
                                } catch(e) {} 
                            });
                        }
                        
                        // Copy butonları ekle
                        this.addCopyButtons(element);
                        
                        if (onProgress) onProgress();
                    } catch (e) {
                        // Fallback: plain text
                        element.textContent = buffer;
                    }
                    
                    const jitter = Math.random() * 0.05;
                    setTimeout(step, speed + jitter);
                } else {
                    resolve();
                }
            };
            
            step();
        });
    }

    /**
     * Copy butonları ekle
     * @param {Element} container - Container element
     */
    addCopyButtons(container) {
        if (!container) return;
        
        const pres = container.querySelectorAll('pre');
        pres.forEach(pre => {
            if (pre.dataset.copy === 'true') return;
            pre.dataset.copy = 'true';
            pre.style.position = 'relative';
            
            const btn = DOMUtils.create('button', {
                className: 'copy-btn',
                type: 'button',
                title: 'Kodu kopyala',
                textContent: 'Copy'
            });
            
            DOMUtils.on(btn, 'click', async () => {
                try {
                    await navigator.clipboard.writeText(pre.innerText);
                    const old = btn.textContent;
                    btn.textContent = 'Copied';
                    setTimeout(() => btn.textContent = old, 1500);
                } catch (e) {
                    btn.textContent = 'Err';
                    setTimeout(() => btn.textContent = 'Copy', 1500);
                }
            });
            
            pre.appendChild(btn);
        });
    }

    /**
     * Syntax highlighting uygula
     * @param {Element} container - Container element
     */
    applySyntaxHighlighting(container) {
        if (!this.isPrismLoaded || !container) return;
        
        try {
            container.querySelectorAll('pre code').forEach(block => { 
                try { 
                    Prism.highlightElement(block); 
                } catch(e) {} 
            });
        } catch (e) {
            console.error('Syntax highlighting failed', e);
        }
    }

    /**
     * Kütüphane durumunu kontrol et
     * @returns {Object}
     */
    getLibraryStatus() {
        return {
            marked: this.isMarkedLoaded,
            dompurify: this.isDOMPurifyLoaded,
            prism: this.isPrismLoaded
        };
    }
}


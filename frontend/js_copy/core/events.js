/**
 * Event Manager
 * Event listener'ları merkezi olarak yönetir ve cleanup sağlar
 */

// NOT: DOMUtils import'u kaldırıldı çünkü bu dosyada kullanılmıyor
// Orijinalde import vardı ama hiçbir yerde kullanılmamış

export class EventManager {
    constructor() {
        // Tüm event listener'ları takip et
        this.listeners = new Map();
        this.listenerIdCounter = 0;
    }

    /**
     * Event listener ekle ve takip et
     * @param {Element|Document|Window} element - Element
     * @param {string} event - Event tipi
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     * @returns {string} Listener ID (cleanup için)
     */
    on(element, event, handler, options = {}) {
        const listenerId = `listener_${this.listenerIdCounter++}`;

        // Listener'ı ekle
        element.addEventListener(event, handler, options);

        // Takip için kaydet
        if (!this.listeners.has(element)) {
            this.listeners.set(element, []);
        }

        this.listeners.get(element).push({
            id: listenerId,
            event,
            handler,
            options
        });

        return listenerId;
    }

    /**
     * Belirli bir listener'ı kaldır
     * @param {string} listenerId - Listener ID
     */
    off(listenerId) {
        for (const [element, elementListeners] of this.listeners.entries()) {
            const index = elementListeners.findIndex(l => l.id === listenerId);
            if (index !== -1) {
                const listener = elementListeners[index];
                element.removeEventListener(listener.event, listener.handler, listener.options);
                elementListeners.splice(index, 1);

                // Element'in listener'ı kalmadıysa Map'ten kaldır
                if (elementListeners.length === 0) {
                    this.listeners.delete(element);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Bir element'in tüm listener'larını kaldır
     * @param {Element} element - Element
     */
    offElement(element) {
        const elementListeners = this.listeners.get(element);
        if (elementListeners) {
            elementListeners.forEach(listener => {
                element.removeEventListener(listener.event, listener.handler, listener.options);
            });
            this.listeners.delete(element);
        }
    }

    /**
     * Belirli bir event tipinin tüm listener'larını kaldır
     * @param {string} event - Event tipi
     */
    offEvent(event) {
        for (const [element, elementListeners] of this.listeners.entries()) {
            const filtered = elementListeners.filter(listener => {
                if (listener.event === event) {
                    element.removeEventListener(listener.event, listener.handler, listener.options);
                    return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                this.listeners.delete(element);
            } else {
                this.listeners.set(element, filtered);
            }
        }
    }

    /**
     * Event delegation ile listener ekle
     * @param {Element} parent - Parent element
     * @param {string} selector - Child selector
     * @param {string} event - Event tipi
     * @param {Function} handler - Event handler
     * @returns {string} Listener ID
     */
    delegate(parent, selector, event, handler) {
        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && parent.contains(target)) {
                handler.call(target, e, target);
            }
        };

        return this.on(parent, event, delegatedHandler);
    }

    /**
     * Debounced event listener ekle
     * @param {Element} element - Element
     * @param {string} event - Event tipi
     * @param {Function} handler - Event handler
     * @param {number} delay - Debounce delay (ms)
     * @returns {string} Listener ID
     */
    debounce(element, event, handler, delay = 300) {
        let timeoutId = null;

        const debouncedHandler = (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handler(...args);
            }, delay);
        };

        return this.on(element, event, debouncedHandler);
    }

    /**
     * Throttled event listener ekle
     * @param {Element} element - Element
     * @param {string} event - Event tipi
     * @param {Function} handler - Event handler
     * @param {number} limit - Throttle limit (ms)
     * @returns {string} Listener ID
     */
    throttle(element, event, handler, limit = 300) {
        let inThrottle = false;

        const throttledHandler = (...args) => {
            if (!inThrottle) {
                handler(...args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };

        return this.on(element, event, throttledHandler);
    }

    /**
     * Bir kere çalışacak event listener ekle
     * @param {Element} element - Element
     * @param {string} event - Event tipi
     * @param {Function} handler - Event handler
     * @returns {string} Listener ID
     */
    once(element, event, handler) {
        const listenerId = this.on(element, event, (e) => {
            handler(e);
            this.off(listenerId);
        });
        return listenerId;
    }

    /**
     * Tüm event listener'ları temizle
     */
    cleanup() {
        for (const [element, elementListeners] of this.listeners.entries()) {
            elementListeners.forEach(listener => {
                element.removeEventListener(listener.event, listener.handler, listener.options);
            });
        }
        this.listeners.clear();
        console.log('EventManager: All event listeners cleaned up');
    }

    /**
     * Debug için: aktif listener sayısını göster
     */
    getListenerCount() {
        let count = 0;
        for (const elementListeners of this.listeners.values()) {
            count += elementListeners.length;
        }
        return count;
    }

    /**
     * Debug için: tüm listener'ları listele
     */
    debug() {
        console.group('EventManager Debug');
        console.log('Total listeners:', this.getListenerCount());

        for (const [element, elementListeners] of this.listeners.entries()) {
            console.group(element.tagName || 'Unknown element');
            elementListeners.forEach(listener => {
                console.log(`${listener.event}: ${listener.id}`);
            });
            console.groupEnd();
        }

        console.groupEnd();
    }
}

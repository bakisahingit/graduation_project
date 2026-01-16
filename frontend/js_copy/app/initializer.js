/**
 * Initializer
 * Uygulama başlangıç sekansı
 */

import { App } from './App.js';

/**
 * DOM yüklendiğinde uygulamayı başlat
 */
document.addEventListener('DOMContentLoaded', () => {
    // Uygulama örneğini oluştur
    const app = new App();

    // Başlat
    app.init().catch(err => {
        console.error('Uygulama başlatılırken kritik hata oluştu:', err);
    });
});

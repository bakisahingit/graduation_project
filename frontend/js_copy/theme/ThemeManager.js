/**
 * Theme Manager
 * Tema yönetimi - koyu/açık mod geçişi ve kalıcılık
 */

import { StorageUtils } from '../core/storage.js';

export class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'admet_theme';
        this.DARK_CLASS = 'dark-theme';
        this.LIGHT_CLASS = 'light-theme';

        // Varsayılan tema
        this.defaultTheme = 'dark';

        // Mevcut tema
        this.currentTheme = this.defaultTheme;
    }

    /**
     * Tema sistemini başlat
     */
    init() {
        // Storage'dan tema al veya sistem tercihini kullan
        const savedTheme = StorageUtils.get(this.STORAGE_KEY);

        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
            // Sistem tercihini kontrol et
            this.currentTheme = this.getSystemPreference();
        }

        // Temayı uygula
        this.apply(this.currentTheme);

        // Sistem tercihi değişikliklerini dinle
        this.watchSystemPreference();
    }

    /**
     * Sistem tema tercihini al
     * @returns {'dark'|'light'}
     */
    getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Sistem tercihi değişikliklerini dinle
     */
    watchSystemPreference() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Sadece kullanıcı tercihi yoksa sistem tercihini uygula
                const savedTheme = StorageUtils.get(this.STORAGE_KEY);
                if (!savedTheme) {
                    this.apply(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Temayı uygula
     * @param {'dark'|'light'} theme - Tema adı
     */
    apply(theme) {
        this.currentTheme = theme;

        if (theme === 'dark') {
            document.documentElement.classList.remove(this.LIGHT_CLASS);
            document.documentElement.classList.add(this.DARK_CLASS);
            document.body.classList.remove(this.LIGHT_CLASS);
            document.body.classList.add(this.DARK_CLASS);
        } else {
            document.documentElement.classList.remove(this.DARK_CLASS);
            document.documentElement.classList.add(this.LIGHT_CLASS);
            document.body.classList.remove(this.DARK_CLASS);
            document.body.classList.add(this.LIGHT_CLASS);
        }

        // Meta theme-color güncelle (mobil tarayıcılar için)
        this.updateMetaThemeColor(theme);
    }

    /**
     * Temayı toggle et
     * @returns {'dark'|'light'} Yeni tema
     */
    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.apply(newTheme);
        this.save(newTheme);
        return newTheme;
    }

    /**
     * Temayı kaydet
     * @param {'dark'|'light'} theme - Tema adı
     */
    save(theme) {
        StorageUtils.set(this.STORAGE_KEY, theme);
    }

    /**
     * Mevcut temayı al
     * @returns {'dark'|'light'}
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * Koyu tema mı kontrol et
     * @returns {boolean}
     */
    isDark() {
        return this.currentTheme === 'dark';
    }

    /**
     * Açık tema mı kontrol et
     * @returns {boolean}
     */
    isLight() {
        return this.currentTheme === 'light';
    }

    /**
     * Meta theme-color güncelle
     * @param {'dark'|'light'} theme - Tema adı
     */
    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');

        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }

        // Tema renklerini ayarla
        metaThemeColor.content = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    }

    /**
     * Tema tercihini sıfırla (sistem tercihine dön)
     */
    reset() {
        StorageUtils.remove(this.STORAGE_KEY);
        this.currentTheme = this.getSystemPreference();
        this.apply(this.currentTheme);
    }

    /**
     * Tema butonunu güncelle
     * @param {HTMLElement} button - Tema toggle butonu
     */
    updateButton(button) {
        if (!button) return;

        const icon = button.querySelector('img, svg');
        const text = button.querySelector('span');

        if (icon) {
            icon.src = this.currentTheme === 'dark' ? 'assets/sun.svg' : 'assets/moon.svg';
            icon.alt = this.currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }

        if (text) {
            text.textContent = this.currentTheme === 'dark' ? 'Açık Mod' : 'Koyu Mod';
        }
    }
}

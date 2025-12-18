/**
 * Frontend Configuration
 * Merkezi yapılandırma dosyası - tüm sabit değerler burada tanımlanır
 */

export const config = {
    // API ayarları
    api: {
        baseUrl: '/api'
    },

    // Model ayarları
    models: {
        list: ['AdmetGPT Fast', 'AdmetGPT High'],
        default: 'AdmetGPT Fast'
    },

    // LocalStorage keys
    storage: {
        theme: 'admetgpt-theme',
        activeModels: 'admetgpt-active-models',
        conversations: 'admetgpt-conversations',
        shortcutMolecule: 'shortcut_molecule',
        shortcutAdmet: 'shortcut_admet'
    },

    // Default keyboard shortcuts
    shortcuts: {
        molecule: 'Alt+M',
        admet: 'Alt+N'
    },

    // UI text/defaults
    ui: {
        defaultChatTitle: 'Yeni Sohbet',
        defaultTheme: 'dark',
        maxTitleWords: 4,
        modalOverlayOpacity: 0.7  // Modal arkaplan kararma oranı (0-1)
    }
};

// frontend/js/services/authService.js
/**
 * Kimlik Doğrulama API İstemci Servisi
 */

const API_BASE = '/api/auth';

/**
 * Kullanıcı kaydı
 */
export async function register(email, password, name) {
    const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
    });
    const data = await response.json();

    if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
}

/**
 * Kullanıcı girişi
 */
export async function login(email, password) {
    const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
}

/**
 * Çıkış yap
 */
export function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
}

/**
 * Mevcut kullanıcıyı getir
 */
export function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Token kontrolü
 */
export function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}

/**
 * Token getir
 */
export function getToken() {
    return localStorage.getItem('authToken');
}

/**
 * Auth header oluştur
 */
export function getAuthHeader() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Kullanıcı bilgilerini sunucudan yenile
 */
export async function refreshUser() {
    const token = getToken();
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            return data.user;
        }
    } catch (e) {
        console.error('User refresh error:', e);
    }

    return null;
}

export default {
    register,
    login,
    logout,
    getCurrentUser,
    isLoggedIn,
    getToken,
    getAuthHeader,
    refreshUser
};

// backend/src/routes/authRoutes.js
import express from 'express';
import {
    loginUser,
    registerUser,
    findUserById,
    updateUserSettings
} from '../services/authService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register - Yeni kullanıcı kaydı
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email, şifre ve isim gerekli'
            });
        }

        const result = await registerUser(email, password, name);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Kayıt işlemi sırasında hata oluştu'
        });
    }
});

/**
 * POST /api/auth/login - Kullanıcı girişi
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email ve şifre gerekli'
            });
        }

        const result = await loginUser(email, password);

        if (!result.success) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Giriş işlemi sırasında hata oluştu'
        });
    }
});

/**
 * GET /api/auth/me - Mevcut kullanıcı bilgileri
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await findUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı bilgileri alınırken hata oluştu'
        });
    }
});

/**
 * PUT /api/auth/settings - Kullanıcı ayarlarını güncelle
 */
router.put('/settings', authenticateToken, async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings) {
            return res.status(400).json({
                success: false,
                message: 'Ayarlar gerekli'
            });
        }

        const user = await updateUserSettings(req.user.id, settings);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar güncellenirken hata oluştu'
        });
    }
});

export default router;

// backend/src/services/authService.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import redisClient from './redisService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'admetgpt-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

/**
 * Kullanıcı oluşturma
 */
export async function createUser(email, password, name, role = 'pharmacist') {
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = {
        id: userId,
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role, // 'pharmacist', 'admin'
        createdAt: new Date().toISOString(),
        settings: {
            theme: 'dark',
            language: 'tr'
        }
    };

    // Redis'e kaydet
    await redisClient.set(`user:${userId}`, JSON.stringify(user));
    await redisClient.set(`user:email:${user.email}`, userId);

    // Password'ü döndürme
    const { password: _, ...safeUser } = user;
    return safeUser;
}

/**
 * Email ile kullanıcı bulma
 */
export async function findUserByEmail(email) {
    const userId = await redisClient.get(`user:email:${email.toLowerCase()}`);
    if (!userId) return null;

    const userData = await redisClient.get(`user:${userId}`);
    return userData ? JSON.parse(userData) : null;
}

/**
 * ID ile kullanıcı bulma
 */
export async function findUserById(userId) {
    const userData = await redisClient.get(`user:${userId}`);
    if (!userData) return null;

    const user = JSON.parse(userData);
    const { password, ...safeUser } = user;
    return safeUser;
}

/**
 * Giriş yapma
 */
export async function loginUser(email, password) {
    const user = await findUserByEmail(email);

    if (!user) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
        return { success: false, message: 'Hatalı şifre' };
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );

    const { password: _, ...safeUser } = user;

    return {
        success: true,
        token,
        user: safeUser
    };
}

/**
 * Kayıt olma
 */
export async function registerUser(email, password, name) {
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
        return { success: false, message: 'Bu email zaten kayıtlı' };
    }

    if (password.length < 6) {
        return { success: false, message: 'Şifre en az 6 karakter olmalı' };
    }

    const user = await createUser(email, password, name);

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );

    return {
        success: true,
        token,
        user
    };
}

/**
 * Kullanıcı ayarlarını güncelleme
 */
export async function updateUserSettings(userId, settings) {
    const userData = await redisClient.get(`user:${userId}`);
    if (!userData) return null;

    const user = JSON.parse(userData);
    user.settings = { ...user.settings, ...settings };

    await redisClient.set(`user:${userId}`, JSON.stringify(user));

    const { password, ...safeUser } = user;
    return safeUser;
}

/**
 * Token doğrula ve kullanıcı bilgilerini getir
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

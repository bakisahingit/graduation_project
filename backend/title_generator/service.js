/**
 * Title Generator Service
 * Otomatik başlık üretimi için ayrı LLM servisi
 */

import { titleModel, titleGeneratorConfig } from '../src/config/index.js';

// Gemma modeli mi kontrol et
function isGemmaModel(modelName) {
    return modelName && modelName.toLowerCase().includes('gemma');
}

class TitleGeneratorService {
    constructor() {
        // Kısa ve öz system prompt (token tasarrufu için)
        this.systemPrompt = `Kullanıcının mesajından kısa, çekici bir Türkçe sohbet başlığı üret.
Kurallar: Maksimum ${titleGeneratorConfig.maxTitleLength} karakter, emoji yok, tırnak yok, sadece başlığı yaz.
Örnek: "JavaScript nasıl öğrenilir?" → JavaScript Yolculuğu`;
    }

    /**
     * Kullanıcının ilk mesajından başlık üret
     * @param {string} firstMessage - Kullanıcının ilk mesajı
     * @param {Object} openaiClient - OpenAI client instance
     * @param {string} model - Kullanılacak model (artık kullanılmıyor, config'den alınır)
     * @returns {Promise<string>} - Üretilen başlık
     */
    async generateTitle(firstMessage, openaiClient, model = null) {
        try {
            console.log('Başlık üretimi başlatılıyor:', firstMessage.substring(0, 100) + '...');

            // Config'den title generation modelini kullan
            console.log(`Başlık üretimi için model: ${titleModel}`);

            let messages;

            // Gemma modelleri için system mesajını user mesajına birleştir
            if (isGemmaModel(titleModel)) {
                console.log('Gemma model detected: System message merged into user message');
                messages = [
                    {
                        role: 'user',
                        content: `[Talimat]: ${this.systemPrompt}\n\n[Mesaj]: ${firstMessage.substring(0, 200)}`
                    }
                ];
            } else {
                messages = [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: firstMessage.substring(0, 200) }
                ];
            }

            const completion = await openaiClient.chat.completions.create({
                model: titleModel,
                messages: messages,
                max_tokens: titleGeneratorConfig.maxTokens,
                temperature: titleGeneratorConfig.temperature
            });

            // Debug: API yanıtını logla
            console.log('Başlık API yanıtı:', JSON.stringify(completion, null, 2));

            const generatedTitle = completion.choices[0]?.message?.content?.trim();

            if (!generatedTitle) {
                console.error('Başlık içeriği boş. Completion:', completion);
                throw new Error('Başlık üretilemedi');
            }

            // Başlığı temizle (tırnak işaretlerini kaldır)
            const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();

            console.log('Başlık üretildi:', cleanTitle);
            return cleanTitle;

        } catch (error) {
            console.error('Başlık üretimi hatası:', error.message);
            console.error('Hata detayları:', error);
            // Fallback başlık
            return this.generateFallbackTitle(firstMessage);
        }
    }

    /**
     * Fallback başlık üret (LLM başarısız olursa)
     * @param {string} message - Kullanıcı mesajı
     * @returns {string} - Fallback başlık
     */
    generateFallbackTitle(message) {
        const words = message.split(' ').slice(0, 4);
        const fallbackTitle = words.join(' ') + (message.split(' ').length > 4 ? '...' : '');
        return fallbackTitle.length > titleGeneratorConfig.maxTitleLength
            ? fallbackTitle.substring(0, titleGeneratorConfig.maxTitleLength - 3) + '...'
            : fallbackTitle;
    }

    /**
     * Başlık geçerliliğini kontrol et
     * @param {string} title - Kontrol edilecek başlık
     * @returns {boolean} - Geçerli mi?
     */
    isValidTitle(title) {
        return title &&
            title.length > 0 &&
            title.length <= titleGeneratorConfig.maxTitleLength &&
            title.trim().length > 0;
    }
}

export default TitleGeneratorService;


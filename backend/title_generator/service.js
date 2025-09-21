/**
 * Title Generator Service
 * Otomatik başlık üretimi için ayrı LLM servisi
 */

class TitleGeneratorService {
    constructor() {
        this.systemPrompt = `Sen bir yaratıcı sohbet başlığı üreticisisin. Kullanıcının mesajına bakarak, sohbetin ana konusunu yansıtan çekici ve profesyonel bir başlık üret.

KURALLAR:
- Başlık maksimum 50 karakter olmalı
- Türkçe olmalı
- Yaratıcı ve çekici olmalı
- Sohbetin ana konusunu yansıtmalı
- Emoji kullanma
- Sadece başlığı döndür, açıklama yapma
- Başlık tırnak içinde olmamalı
- Kullanıcının mesajını kopyalamak yerine, konuyu özetleyen güzel bir başlık üret

ÖRNEKLER:
- "JavaScript öğrenmek istiyorum, nereden başlamalıyım?" → "JavaScript Yolculuğu"
- "React projesi için yardım istiyorum, state management nasıl yapılır?" → "React State Yönetimi"
- "Veritabanı tasarımı konusunda sorun yaşıyorum" → "Veritabanı Tasarım Rehberi"
- "API entegrasyonu nasıl yapılır? REST API'ler hakkında bilgi ver" → "API Entegrasyon Rehberi"
- "Python ile makine öğrenmesi projesi yapmak istiyorum" → "Python ML Projesi"
- "CSS Grid ve Flexbox arasındaki farklar nelerdir?" → "CSS Layout Karşılaştırması"
- "Node.js ile backend geliştirme nasıl yapılır?" → "Node.js Backend Geliştirme"
- "Git versiyon kontrolü hakkında temel bilgiler" → "Git Temel Rehberi"`;
    }

    /**
     * Kullanıcının ilk mesajından başlık üret
     * @param {string} firstMessage - Kullanıcının ilk mesajı
     * @param {Object} openaiClient - OpenAI client instance
     * @param {string} model - Kullanılacak model
     * @returns {Promise<string>} - Üretilen başlık
     */
    async generateTitle(firstMessage, openaiClient, model = 'openai/gpt-3.5-turbo') {
        try {
            console.log('Başlık üretimi başlatılıyor:', firstMessage.substring(0, 100) + '...');
            
            const messages = [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: firstMessage }
            ];

            const completion = await openaiClient.chat.completions.create({
                model: model,
                messages: messages,
                max_tokens: 50,
                temperature: 0.7
            });

            const generatedTitle = completion.choices[0]?.message?.content?.trim();
            
            if (!generatedTitle) {
                throw new Error('Başlık üretilemedi');
            }

            // Başlığı temizle (tırnak işaretlerini kaldır)
            const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
            
            console.log('Başlık üretildi:', cleanTitle);
            return cleanTitle;

        } catch (error) {
            console.error('Başlık üretimi hatası:', error);
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
        return fallbackTitle.length > 50 ? fallbackTitle.substring(0, 47) + '...' : fallbackTitle;
    }

    /**
     * Başlık geçerliliğini kontrol et
     * @param {string} title - Kontrol edilecek başlık
     * @returns {boolean} - Geçerli mi?
     */
    isValidTitle(title) {
        return title && 
               title.length > 0 && 
               title.length <= 50 && 
               title.trim().length > 0;
    }
}

module.exports = TitleGeneratorService;

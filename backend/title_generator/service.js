/**
 * Title Generator Service
 * Otomatik başlık üretimi için ayrı LLM servisi
 */

class TitleGeneratorService {
    constructor() {
        // Kısa ve öz system prompt (token tasarrufu için)
        this.systemPrompt = `Kullanıcının mesajından kısa, çekici bir Türkçe sohbet başlığı üret.
Kurallar: Maksimum 50 karakter, emoji yok, tırnak yok, sadece başlığı yaz.
Örnek: "JavaScript nasıl öğrenilir?" → JavaScript Yolculuğu`;
    }

    /**
     * Kullanıcının ilk mesajından başlık üret
     * @param {string} firstMessage - Kullanıcının ilk mesajı
     * @param {Object} openaiClient - OpenAI client instance
     * @param {string} model - Kullanılacak model (artık kullanılmıyor, sabit model kullanılır)
     * @returns {Promise<string>} - Üretilen başlık
     */
    async generateTitle(firstMessage, openaiClient, model = null) {
        try {
            console.log('Başlık üretimi başlatılıyor:', firstMessage.substring(0, 100) + '...');

            // Başlık üretimi için sabit ucuz model kullan (quota tasarrufu)
            // gemini-2.0-flash-lite kullanıyoruz çünkü OpenAI-uyumlu endpoint sadece Gemini modellerini destekliyor
            const titleModel = 'gemma-3-12b';
            console.log(`Başlık üretimi için model: ${titleModel}`);

            const messages = [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: firstMessage.substring(0, 200) } // Mesajı da kısalt
            ];

            const completion = await openaiClient.chat.completions.create({
                model: titleModel,
                messages: messages,
                max_tokens: 256, // Gemini için daha yüksek token limiti
                temperature: 0.5 // Daha tutarlı sonuçlar için düşürüldü
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

export default TitleGeneratorService;

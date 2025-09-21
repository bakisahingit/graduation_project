/**
 * API Service
 * Backend ile iletişim için API servisi
 */

export class ApiService {
    constructor() {
        this.baseUrl = '/api';
    }

    /**
     * Chat mesajı gönder
     * @param {string} message - Mesaj
     * @param {string} model - Model
     * @param {Array} conversationHistory - Konuşma geçmişi
     * @param {AbortSignal} signal - Abort signal
     * @param {string} activeTool - Aktif tool (null, 'ADMET', vs.)
     * @returns {Promise<any>}
     */
    async sendMessage(message, model, conversationHistory = [], signal = null, activeTool = null) {
        const requestBody = { 
            message, 
            model, 
            conversationHistory 
        };

        // Tools bilgisi varsa ekle
        if (activeTool) {
            requestBody.tools = {
                active: activeTool
            };
        }

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        };

        if (signal) {
            requestOptions.signal = signal;
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat`, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request aborted');
            }
            throw error;
        }
    }

    /**
     * Mevcut modelleri getir
     * @returns {Promise<Array>}
     */
    async fetchModels() {
        // Şimdilik statik liste döndürüyoruz
        // Gelecekte backend'den dinamik olarak alınabilir
        return [
            "deepseek/deepseek-chat-v3.1:free",
            "deepseek/deepseek-chat-v3-0324:free",
            "deepseek/deepseek-r1-0528:free",
            "deepseek/deepseek-r1:free",
            "tngtech/deepseek-r1t2-chimera:free",
            "qwen/qwen3-coder:free",
            "z-ai/glm-4.5-air:free",
            "tngtech/deepseek-r1t-chimera:free",
            "moonshotai/kimi-k2:free",
            "qwen/qwen3-235b-a22b:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "microsoft/mai-ds-r1:free",
            "mistralai/mistral-small-3.2-24b-instruct:free",
            "openai/gpt-oss-20b:free",
            "qwen/qwen2.5-vl-72b-instruct:free",
            "deepseek/deepseek-r1-0528-qwen3-8b:free",
            "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
            "meta-llama/llama-4-maverick:free",
            "qwen/qwen3-14b:free",
            "mistralai/mistral-nemo:free",
            "deepseek/deepseek-r1-distill-llama-70b:free",
            "google/gemma-3-27b-it:free",
            "qwen/qwen-2.5-coder-32b-instruct:free",
            "moonshotai/kimi-dev-72b:free",
            "meta-llama/llama-3.1-405b-instruct:free",
            "agentica-org/deepcoder-14b-preview:free",
            "mistralai/mistral-7b-instruct:free",
            "qwen/qwen3-30b-a3b:free",
            "meta-llama/llama-3.3-8b-instruct:free",
            "meta-llama/llama-4-scout:free",
            "qwen/qwen-2.5-72b-instruct:free",
            "mistralai/mistral-small-3.1-24b-instruct:free",
            "qwen/qwen3-8b:free",
            "qwen/qwen3-4b:free",
            "qwen/qwq-32b:free",
            "cognitivecomputations/dolphin3.0-mistral-24b:free",
            "shisa-ai/shisa-v2-llama3.3-70b:free",
            "mistralai/devstral-small-2505:free",
            "nousresearch/deephermes-3-llama-3-8b-preview:free",
            "meta-llama/llama-3.2-3b-instruct:free",
            "qwen/qwen2.5-vl-32b-instruct:free",
            "moonshotai/kimi-vl-a3b-thinking:free",
            "nvidia/nemotron-nano-9b-v2:free",
            "openai/gpt-oss-120b:free",
            "tencent/hunyuan-a13b-instruct:free",
            "mistralai/mistral-small-24b-instruct-2501:free",
            "google/gemma-3n-e2b-it:free",
            "google/gemma-2-9b-it:free",
            "google/gemma-3-12b-it:free",
            "arliai/qwq-32b-arliai-rpr-v1:free",
            "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
            "google/gemma-3-4b-it:free",
            "google/gemma-3n-e4b-it:free",
            "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
            "rekaai/reka-flash-3:free",
            "deepseek/deepseek-r1-distill-qwen-14b:free"
        ];
    }
}


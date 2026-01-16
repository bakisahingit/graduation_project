// backend/server.js

import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { config } from './src/config/index.js';
import chatRoutes from './src/routes/chatRoutes.js';
import { connectQueue } from './src/services/queueService.js';
import { createWebSocketServer, notifyClient } from './src/services/notificationService.js';
import redisClient from './src/services/redisService.js';
import { getChatCompletion } from './src/services/llmService.js';
import { formatAdmetReport } from './src/utils/formatters.js';
import { admetContextPrompt } from './src/utils/constants.js';
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Limit each IP to 10000 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    validate: false, // Required for reverse proxy (Azure Container Apps)
});


async function processSingleAnalysis(sessionId, data, selected_parameters) {
    if (!data || !data.smiles) { /* ... hata kontrolü ... */ return; }

    const paramsKey = (selected_parameters && selected_parameters.length > 0) ? JSON.stringify(selected_parameters.sort()) : 'all';
    const summaryCacheKey = `summary_cache:${data.smiles}:${paramsKey}`;

    try {
        const cachedSummary = await redisClient.get(summaryCacheKey);
        if (cachedSummary) {
            console.log(`✅✅ Cache hit for FINAL SUMMARY: ${data.smiles} with params ${paramsKey}. Sending instantly.`);
            notifyClient(sessionId, { status: 'success', output: cachedSummary, rawAdmetData: data });
            return;
        }
    } catch (e) { console.error("Summary cache check failed:", e); }

    console.log(`Summary not cached for ${data.smiles} with params ${paramsKey}. Generating with LLM...`);

    try {
        let admetReportText = `Molecule: ${data.moleculeName || 'N/A'}\nSMILES: ${data.smiles}\nOverall Risk Score: ${data.riskScore?.toFixed(1) || 'N/A'}\n\nPredictions:\n`;
        if (data.admetPredictions && Array.isArray(data.admetPredictions)) {
            data.admetPredictions.forEach(pred => {
                admetReportText += `- ${pred.property}: ${pred.prediction}\n`;
            });
        } else { throw new Error("Analysis data is missing 'admetPredictions' array."); }

        if (typeof admetContextPrompt !== 'string') { throw new Error("admetContextPrompt is not a valid string."); }

        const propertiesToConsider = (selected_parameters && selected_parameters.length > 0) ? selected_parameters : ['Ames', 'hERG', 'DILI', 'HIA', 'BBB'];
        const focusInstruction = `Özellikle şu parametrelere odaklan: ${propertiesToConsider.join(', ')}.`;

        // ★★★ YENİ TEKLİ ANALİZ PROMPT'U ★★★
        const finalMessage = `
Sen, ADMET verilerini yorumlayan uzman bir farmakoloji asistanısın. Aşağıdaki ham ADMET raporunu bir ilaç kimyageri için profesyonelce, anlaşılır ve tamamen Türkçe olarak yorumlayacaksın. Cevabını aşağıdaki formata göre yapılandır:

1.  **Genel Değerlendirme:** Molekülün risk profilini (örneğin, "düşük riskli ve umut verici", "orta riskli ve dikkatli olunması gereken", "yüksek riskli") tek bir cümleyle özetle.
2.  **Kritik Bulgular:** En önemli 3-5 bulguyu maddeler halinde listele. ${focusInstruction} Her maddenin ne anlama geldiğini kısaca açıkla (örn: "hERG inhibisyon riski düşüktür, bu da kardiyak güvenlik açısından çok olumludur.").
3.  **Sonuç:** Molekülün ilaç adayı olma potansiyeli hakkında genel bir sonuç paragrafı yaz.

ADMET ANALYSIS REPORT:
---
${admetReportText}`;


        const messages = [
            { role: 'system', content: admetContextPrompt },
            { role: 'user', content: finalMessage.trim() }
        ];

        const completion = await getChatCompletion(messages);
        let llmContent = completion.choices[0].message.content;
        llmContent = llmContent.replace(/<\｜begin of sentence\｜>/g, '').trim();

        await redisClient.set(summaryCacheKey, llmContent, { EX: 86400 });
        notifyClient(sessionId, { status: 'success', output: llmContent, rawAdmetData: data });

    } catch (llmError) {
        console.error(`Background task LLM Error for session ${sessionId}:`, llmError);
        notifyClient(sessionId, { status: 'error', output: 'An error occurred while summarizing the results with the AI model.' });
    }
}

async function processComparisonAnalysis(sessionId, finalBatch, properties) {
    try {
        const { successfulResults, failedResults } = finalBatch;

        let dataSummary = successfulResults.map(res => {
            if (!res.data || !res.data.admetPredictions) {
                return `--- MOLECULE: ${res.identifier} (Analysis data is missing or corrupt) ---`;
            }

            const predictionsText = res.data.admetPredictions
                .filter(p => properties.includes(p.property))
                .map(p => `- ${p.property}: ${p.prediction}`) // Corrected: Removed unnecessary backticks around property and prediction
                .join('\n');

            return `
--- MOLECULE: ${res.data.moleculeName || res.identifier} ---
SMILES: ${res.data.smiles}
Overall Risk Score: ${typeof res.data.riskScore === 'number' ? res.data.riskScore.toFixed(1) : 'N/A'}/100
Key Predictions:
${predictionsText}
            `.trim();
        }).join('\n\n');

        if (failedResults && failedResults.length > 0) {
            dataSummary += '\n\n--- FAILED ANALYSES ---\n';
            dataSummary += failedResults.map(res => `- ${res.identifier}: ${res.error || 'Unknown error'}`).join('\n');
        }

        const propertiesList = properties.join(', ');

        const finalMessage = `
Sen, birden fazla ilaç adayını karşılaştıran uzman bir farmakoloji danışmanısın. Aşağıdaki moleküllerin ADMET verilerini analiz ederek hangisinin ilaç geliştirme için daha umut verici olduğunu belirleyeceksin. Cevabını profesyonelce, tamamen Türkçe olarak ve aşağıdaki formata göre yapılandır:

1.  **Karşılaştırma Tablosu:** Şu ADMET özelliklerini (${propertiesList}) içeren bir markdown tablosu oluştur.
2.  **Detaylı Analiz:** Tablodan sonra, her bir molekülün **Güçlü Yönleri** ve **Zayıf Yönleri**'ni ayrı alt başlıklar altında maddeler halinde analiz et. Özellikle "projeyi bitirebilecek" kritik riskleri (örn: yüksek mutajenite, güçlü hERG blokajı) vurgula.
3.  **Nihai Karar ve Sıralama:** Sonuç olarak, bu molekülleri en umut vericiden en riskliye doğru sırala. Bu sıralamanın arkasındaki temel gerekçeleri net bir şekilde açıkla.
4.  **Başarısız Analizler:** Eğer analizi başarısız olan moleküller varsa, bunları en sonda listele.

--- MOLEKÜL VERİLERİ ---
${dataSummary}`;

        const messages = [
            { role: 'system', content: admetContextPrompt },
            { role: 'user', content: finalMessage.trim() }
        ];

        const completion = await getChatCompletion(messages);
        let llmContent = completion.choices[0].message.content;
        llmContent = llmContent.replace(/<\｜begin of sentence\｜>/g, '').trim();
        notifyClient(sessionId, { status: 'success', output: llmContent, rawComparisonData: finalBatch });

    } catch (llmError) {
        console.error(`Background task Comparison LLM Error for session ${sessionId}:`, llmError);
        notifyClient(sessionId, {
            status: 'error',
            output: 'An error occurred while summarizing the comparison with the AI model.'
        });
    }
}

// --- ANA UYGULAMA KURULUMU ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (Azure Container Apps)
app.set('trust proxy', 1);

// Apply rate limiting
app.use(limiter);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

connectQueue();

app.use('/api/chat', chatRoutes);

// Worker'dan gelen görev tamamlama bildirimlerini işleyen endpoint
app.post('/api/task-complete', async (req, res) => {
    const { sessionId, status, data, type, identifier, selected_parameters } = req.body;
    if (!sessionId) {
        return res.status(400).json({ message: 'Session ID is required.' });
    }

    console.log(`Received task completion for session: ${sessionId}, type: ${type}, status: ${status}`);

    if (type === 'comparison') {
        const batchKey = `batch:${sessionId}`;
        const rawBatchInfo = await redisClient.get(batchKey);

        if (!rawBatchInfo) {
            console.error(`No batch info found in Redis for session: ${sessionId}`);
            return res.status(404).json({ message: 'Batch session not found.' });
        }

        const batchInfo = JSON.parse(rawBatchInfo);
        batchInfo.results.push({ identifier, status, data });

        if (batchInfo.results.length >= batchInfo.total) {
            console.log(`All ${batchInfo.total} results received for comparison batch: ${sessionId}`);

            const finalBatch = {
                successfulResults: batchInfo.results.filter(r => r.status === 'success'),
                failedResults: [...batchInfo.failedResolutions, ...batchInfo.results.filter(r => r.status !== 'success')]
            };

            await processComparisonAnalysis(sessionId, finalBatch, batchInfo.properties);
            await redisClient.del(batchKey);
        } else {
            console.log(`${batchInfo.results.length}/${batchInfo.total} results for batch: ${sessionId}. Waiting...`);
            await redisClient.set(batchKey, JSON.stringify(batchInfo), { KEEPTTL: true });
        }
    } else { // Tekli analiz
        if (status === 'success') {
            // Ham ADMET verisini parametrelerle birlikte cache'le
            if (data && data.smiles) {
                const paramsKey = (selected_parameters && selected_parameters.length > 0) ? JSON.stringify(selected_parameters.sort()) : 'all';
                const cacheKey = `admet_cache:${data.smiles}:${paramsKey}`;
                await redisClient.set(cacheKey, JSON.stringify(data), { EX: 86400 });
                console.log(`Saved raw ADMET data to cache for ${data.smiles} with params ${paramsKey}`);
            }
            // Özetleme ve bildirme işini merkezi fonksiyona devret
            await processSingleAnalysis(sessionId, data, selected_parameters);
        } else {
            notifyClient(sessionId, {
                status: 'error',
                output: data.error || 'An unknown error occurred during the analysis.'
            });
        }
    }

    res.status(200).json({ message: 'Notification processed.' });
});

const server = http.createServer(app);
createWebSocketServer(server);

server.listen(config.port, () => console.log(`Server listening on http://localhost:${config.port}`));

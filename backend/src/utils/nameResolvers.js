// src/utils/nameResolvers.js

/**
 * Extracts a chemical name from common sentence patterns using regular expressions. (Fallback Method)
 * @param {string} text - The user's message.
 * @returns {string|null} - The extracted chemical name or null if no match is found.
 */
// Türkçe kimyasal isimler için sözlük
const turkishChemicalNames = {
    'kafeini': 'caffeine',
    'kafein': 'caffeine',
    'aspirin': 'aspirin',
    'parasetamol': 'paracetamol',
    'ibuprofen': 'ibuprofen',
    'metformin': 'metformin',
    'warfarin': 'warfarin',
    'digoksin': 'digoxin',
    'furosemid': 'furosemide',
    'simvastatin': 'simvastatin'
};

export function extractChemicalNameByRegex(text) {
    console.log("Falling back to Regex-based extraction...");
    const cleanedText = text.toLowerCase().trim();
    
    // Önce Türkçe isimleri kontrol et
    for (const [turkish, english] of Object.entries(turkishChemicalNames)) {
        if (cleanedText.includes(turkish)) {
            console.log(`Found Turkish chemical name: ${turkish} -> ${english}`);
            return english;
        }
    }
    
    const patterns = [
        /(.*?)\s*(?:için|adlı|molekülünün|molekülü)?\s*ADMET\s*analizi/i,
        /ADMET\s*analizi\s*[:\s]\s*(.*)/i,
        /(?:bana|benim için)?\s*(.*?)\s*(?:'i|'ı|'ni|'nı)?\s*analiz\s*(?:et|eder misin|yap)/i
    ];
    for (const pattern of patterns) {
        const match = cleanedText.match(pattern);
        if (match && match[1]) {
            const result = match[1].replace(/(ADMET|analizi|analiz|yap|et|molekülü)/gi, '').trim();
            if (result) return result;
        }
    }
    return null;
}

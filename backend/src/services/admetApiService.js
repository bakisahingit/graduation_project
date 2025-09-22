// src/services/admetApiService.js

import { httpClient, config } from '../config/index.js';

// In-memory cache for ADMET results
const admetCache = new Map();

export async function getAdmetPredictions(smiles, name) {
    // Check cache first
    if (admetCache.has(smiles)) {
        console.log(`Cache hit for SMILES: ${smiles}`);
        return admetCache.get(smiles);
    }

    try {
        console.log(`Calling ADMET API for SMILES: ${smiles} (from name: ${name || 'N/A'})`);
        const requestBody = { smiles, name };
        const response = await httpClient.post(`${config.admetApiUrl}/predict`, requestBody);

        // Validate the response to ensure it contains the necessary data
        if (response.data && Array.isArray(response.data.admetPredictions) && typeof response.data.riskScore !== 'undefined') {
            // Store successful and valid response in cache
            admetCache.set(smiles, response.data);
            return response.data;
        } else {
            console.error('ADMET API returned an invalid or incomplete response:', response.data);
            return null;
        }
    } catch (apiError) {
        console.error('ADMET API call failed:', apiError.response ? apiError.response.data : apiError.message);
        return null;
    }
}
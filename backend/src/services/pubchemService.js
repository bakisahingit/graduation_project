// src/services/pubchemService.js

import { httpClient } from '../config/index.js';

export async function getSmilesFromName(name) {
    const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/CanonicalSMILES/JSON`;
    try {
        console.log(`Querying PubChem at: ${pubchemUrl}`);
        const response = await httpClient.get(pubchemUrl);
        
        if (response.data?.PropertyTable?.Properties?.[0]) {
            const properties = response.data.PropertyTable.Properties[0];
            return properties.CanonicalSMILES || properties.ConnectivitySMILES || null;
        }
        return null;
    } catch (error) {
        console.error(`!!! PubChem API request failed for "${name}" !!!`, error.response ? `Request failed with status code ${error.response.status}` : error.message);
        return null;
    }
}
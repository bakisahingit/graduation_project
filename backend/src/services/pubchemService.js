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

/**
 * Fetch PubChem compound summary and basic properties by SMILES via PUG REST.
 * Strategy: first resolve to CID using the 'smiles' namespace, then fetch properties.
 */
export async function getPubChemInfoBySmiles(smiles) {
    try {
        // 1) Resolve CID from SMILES
        const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON`;
        const cidRes = await httpClient.get(cidUrl);
        const cid = cidRes.data?.IdentifierList?.CID?.[0];
        if (!cid) return null;

        // 2) Fetch a property bundle
        const props = [
            'MolecularFormula',
            'MolecularWeight',
            'IUPACName',
            'CanonicalSMILES',
            'IsomericSMILES',
            'InChI',
            'InChIKey',
            'XLogP',
            'HBondDonorCount',
            'HBondAcceptorCount',
            'RotatableBondCount',
            'HeavyAtomCount'
        ];
        const propsUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/${props.join(',')}/JSON`;
        const propsRes = await httpClient.get(propsUrl);
        const prop = propsRes.data?.PropertyTable?.Properties?.[0] || {};

        // 3) Optional: fetch description/record summary
        let description = null;
        try {
            const descUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON/?heading=Description`;
            const descRes = await httpClient.get(descUrl);
            const sections = descRes.data?.Record?.Section || [];
            // Find first non-empty description string
            const flat = JSON.stringify(sections);
            const match = flat.match(/"Description"\s*:\s*\{"TOCHeading":"Description"[\s\S]*?"String":"([\s\S]*?)"/);
            if (match) description = match[1];
        } catch (_) {}

        return {
            cid,
            description,
            properties: {
                molecularFormula: prop.MolecularFormula || null,
                molecularWeight: prop.MolecularWeight || null,
                iupacName: prop.IUPACName || null,
                canonicalSmiles: prop.CanonicalSMILES || null,
                isomericSmiles: prop.IsomericSMILES || null,
                inchi: prop.InChI || null,
                inchiKey: prop.InChIKey || null,
                xlogP: prop.XLogP ?? null,
                hBondDonorCount: prop.HBondDonorCount ?? null,
                hBondAcceptorCount: prop.HBondAcceptorCount ?? null,
                rotatableBondCount: prop.RotatableBondCount ?? null,
                heavyAtomCount: prop.HeavyAtomCount ?? null
            }
        };
    } catch (error) {
        console.error('PubChem info fetch failed:', error.response ? error.response.data : error.message);
        return null;
    }
}
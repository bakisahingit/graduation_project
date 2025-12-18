// src/services/pubchemService.js

// YENİLİKLER:
// - Redis client import edildi.
// - Fonksiyonun en başına Redis'ten önbellek kontrolü eklendi.
// - API'den başarılı sonuç alındığında Redis'e kayıt yapılıyor (24 saat geçerli).

import { httpClient, cacheConfig } from '../config/index.js';
import redisClient from './redisService.js';

const CACHE_TTL_SECONDS = cacheConfig.pubchemTtlSeconds;

export async function getSmilesFromName(name) {
    const normalizedName = name.trim().toLowerCase();
    const cacheKey = `pubchem:${normalizedName}`;

    // 1. Önce Redis'i kontrol et
    try {
        const cachedSmiles = await redisClient.get(cacheKey);
        if (cachedSmiles) {
            console.log(`✅ Cache hit for PubChem name: "${normalizedName}"`);
            return cachedSmiles;
        }
    } catch (e) {
        console.error("PubChem Redis cache check failed:", e);
    }

    // 2. Cache'te yoksa PubChem API'sine git
    const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/CanonicalSMILES/JSON`;

    try {
        console.log(`Querying PubChem for "${name}"`);
        const response = await httpClient.get(pubchemUrl);

        if (response.data?.PropertyTable?.Properties?.[0]) {
            const properties = response.data.PropertyTable.Properties[0];
            const smiles = properties.CanonicalSMILES || properties.ConnectivitySMILES || null;

            // 3. Geçerli bir sonuç varsa Redis'e kaydet
            if (smiles) {
                try {
                    await redisClient.set(cacheKey, smiles, { EX: CACHE_TTL_SECONDS });
                    console.log(`Cached PubChem result for "${normalizedName}"`);
                } catch (e) {
                    console.error("PubChem Redis cache set failed:", e);
                }
            }
            return smiles;
        }
        return null;
    } catch (error) {
        // PubChem'de bulunamayan isimler için 404 hatası normaldir, bunu error olarak loglamaya gerek yok.
        if (error.response && error.response.status !== 404) {
            console.error(`!!! PubChem API request failed for "${name}" !!!`, error.response ? `Status: ${error.response.status}` : error.message);
        }
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
        } catch (_) { }

        // Construct 2D structure image URL
        const imageUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=300x300`;

        return {
            cid,
            imageUrl,
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

/**
 * Atomic number to element symbol mapping
 */
const ELEMENT_MAP = {
    1: 'H', 2: 'He', 3: 'Li', 4: 'Be', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 10: 'Ne',
    11: 'Na', 12: 'Mg', 13: 'Al', 14: 'Si', 15: 'P', 16: 'S', 17: 'Cl', 18: 'Ar',
    19: 'K', 20: 'Ca', 26: 'Fe', 29: 'Cu', 30: 'Zn', 35: 'Br', 53: 'I'
};

/**
 * Fetch 2D coordinates for a molecule by CID from PubChem.
 * Returns atom positions and bond information for custom visualization.
 * @param {number} cid - PubChem Compound ID
 * @returns {Object|null} { atoms: [{id, symbol, x, y}], bonds: [{from, to, order}] }
 */
export async function getPubChem2DCoordinates(cid) {
    try {
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/JSON?record_type=2d`;
        console.log(`Fetching PubChem 2D coordinates for CID ${cid}`);
        const response = await httpClient.get(url);

        const compound = response.data?.PC_Compounds?.[0];
        if (!compound) return null;

        // Parse atoms
        const atomIds = compound.atoms?.aid || [];
        const elements = compound.atoms?.element || [];

        // Parse coordinates
        const coords = compound.coords?.[0]?.conformers?.[0];
        const xCoords = coords?.x || [];
        const yCoords = coords?.y || [];

        // Build atoms array with positions
        const atoms = atomIds.map((aid, index) => ({
            id: aid,
            symbol: ELEMENT_MAP[elements[index]] || 'X',
            x: xCoords[index] || 0,
            y: yCoords[index] || 0
        }));

        // Parse bonds
        const bondAid1 = compound.bonds?.aid1 || [];
        const bondAid2 = compound.bonds?.aid2 || [];
        const bondOrders = compound.bonds?.order || [];

        const bonds = bondAid1.map((from, index) => ({
            from: from,
            to: bondAid2[index],
            order: bondOrders[index] || 1 // 1=single, 2=double, 3=triple
        }));

        console.log(`Parsed ${atoms.length} atoms and ${bonds.length} bonds for CID ${cid}`);

        return {
            cid,
            atoms,
            bonds
        };
    } catch (error) {
        console.error('PubChem 2D coordinates fetch failed:', error.response ? error.response.data : error.message);
        return null;
    }
}
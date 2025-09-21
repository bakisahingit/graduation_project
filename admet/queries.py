# admet/queries.py

import pubchempy as pcp
from chembl_webresource_client.new_client import new_client

from .config import chembl_activity


def name_to_smiles(name: str) -> str | None:
    """Converts a molecule name to a SMILES string using PubChem."""
    if not name:
        return None
    try:
        compounds = pcp.get_compounds(name, "name")
        if compounds:
            # Return canonical SMILES for consistency
            return compounds[0].canonical_smiles
        return None
    except Exception:
        # Broad exception to catch any pcp error
        return None


# --- PubChem Query Function ---
def query_pubchem(smiles: str):
    """Queries PubChem for compound synonyms and literature count."""
    try:
        compounds = pcp.get_compounds(smiles, "smiles")
        if not compounds:
            return {"error": "Compound not found in PubChem."}

        compound = compounds[0]
        cid = compound.cid

        synonyms = compound.synonyms[:5] if compound.synonyms else []

        return {
            "cid": cid,
            "synonyms": synonyms,
            "molecular_formula": compound.molecular_formula,
            "molecular_weight": compound.molecular_weight,
        }
    except Exception as e:
        return {"error": f"PubChem query failed: {str(e)}"}


# --- ChEMBL Query Function ---
def query_chembl(smiles: str, limit=5):
    """Queries ChEMBL for key bioactivity data."""
    if not chembl_activity:
        return {"error": "ChEMBL client is not available."}
    try:
        res = new_client.molecule.filter(molecule_structures__canonical_smiles=smiles)
        if not res:
            return {
                "error": "Compound not found in ChEMBL.",
                "assay_count": 0,
                "records": [],
            }

        chembl_id = res[0]["molecule_chembl_id"]
        activities = new_client.activity.filter(molecule_chembl_id=chembl_id).order_by(
            "-pchembl_value"
        )

        assay_count = len(activities)
        records = []

        for act in activities[:limit]:
            record = {
                "target_name": act.get("target_pref_name", "N/A"),
                "activity_type": act.get("standard_type", "N/A"),
                "value": f"{act.get('standard_value', 'N/A')} {act.get('standard_units', '')}".strip(),
                "relation": act.get("standard_relation", ""),
                "pchembl_value": act.get("pchembl_value", "N/A"),
            }
            records.append(record)

        return {"chembl_id": chembl_id, "assay_count": assay_count, "records": records}

    except Exception as e:
        return {
            "error": f"ChEMBL query failed: {str(e)}",
            "assay_count": 0,
            "records": [],
        }

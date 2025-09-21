# admet/pipeline.py

from fastapi import HTTPException

from .analysis import (
    aggregate_risk,
    run_rule_based_alerts,
    simplified_pk_profile,
    uncertainty_notes,
)
from .config import rule_based_catalog
from admet_ai import ADMETModel
from .queries import query_chembl, query_pubchem, name_to_smiles
from .utils import mol_to_base64_image, rdkit_descriptors, smiles_to_mol

def run_analysis_pipeline(name: str | None, smiles: str | None):
    """Orchestrates the full analysis including ML models and external database queries."""

    user_input = (smiles or name or "").strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="Molecule name or SMILES string cannot be empty.")

    # 1. Try to interpret the input as a SMILES string
    mol = smiles_to_mol(user_input)
    
    if mol:
        # Input is a valid SMILES
        final_smiles = user_input
        molecule_name = name # Keep original name if provided
        # If name is missing or same as SMILES, try to find a proper name
        if not molecule_name or molecule_name == final_smiles:
            try:
                pubchem_data_for_name = query_pubchem(final_smiles)
                if pubchem_data_for_name and pubchem_data_for_name.get("synonyms"):                        
                    molecule_name = pubchem_data_for_name["synonyms"][0].capitalize()
                else:
                    molecule_name = "Unnamed Molecule"
            except Exception:
                molecule_name = "Unnamed Molecule"
    else:
        # Input is not a valid SMILES, so treat it as a name
        molecule_name = user_input
        final_smiles = name_to_smiles(molecule_name)
        if not final_smiles:
            raise HTTPException(
                status_code=404,
                detail=f'Could not find a valid molecule named "{molecule_name}". Please check the name or provide a SMILES string.'
            )
    
    # At this point, we must have a valid SMILES string. Re-create mol object for safety.
    mol = smiles_to_mol(final_smiles)
    if mol is None:
        raise HTTPException(status_code=500, detail="An unexpected error occurred while processing the molecule structure.")

    # 2. Internal models and calculations
    admet_model = ADMETModel()
    descriptors = rdkit_descriptors(mol)
    predictions = admet_model.predict(smiles=final_smiles)
    alerts = run_rule_based_alerts(mol)
    risk_score, keymap = aggregate_risk(predictions, descriptors)
    pk_profile = simplified_pk_profile(predictions, keymap)
    notes = uncertainty_notes(mol, predictions, keymap)

    # 3. External database queries
    pubchem_data = query_pubchem(final_smiles)
    chembl_data = query_chembl(final_smiles)

    # 4. Format predictions for easier frontend consumption
    admet_predictions_list = [
        {"property": prop, "prediction": str(val)} for prop, val in predictions.items()
    ]

    # 5. Assemble the final rich JSON payload
    return {
        "smiles": final_smiles,
        "image_base64": mol_to_base64_image(mol),
        "moleculeName": molecule_name,
        "riskScore": risk_score,
        "physChem": descriptors,
        "admetPredictions": admet_predictions_list,
        "structuralAlerts": alerts,
        "pkProfile": pk_profile,
        "uncertaintyNotes": notes,
        "experimentalData": {
            "pubchem": pubchem_data,
            "chembl": chembl_data,
        },
    }

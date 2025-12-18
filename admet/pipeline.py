# admet/pipeline.py

import os
import requests
import traceback
from concurrent.futures import ThreadPoolExecutor

from .analysis import (
    aggregate_risk,
    run_rule_based_alerts,
    simplified_pk_profile,
    uncertainty_notes,
)
from admet_ai import ADMETModel
from .queries import query_chembl, query_pubchem, name_to_smiles
from .utils import mol_to_base64_image, rdkit_descriptors, smiles_to_mol, find_keys

# --- Model Pre-loading ---
print("Loading ADMET-AI model...")
admet_model = ADMETModel()
print("ADMET-AI model loaded successfully.")
# -------------------------

# Import notify_backend from centralized module
from .notifications import notify_backend

def run_analysis_pipeline(
    name: str | None,
    smiles: str | None,
    session_id: str | None = None, # Made optional
    identifier: str | None = None, # Made optional
    type: str | None = None,       # Made optional
    selected_parameters: list[str] | None = None,
    notify: bool = True,           # New parameter
):
    """Manages the entire analysis process and optionally notifies the backend."""
    if notify:
        print(f"Starting analysis for identifier: '{identifier}', session: {session_id}")
    else:
        print(f"Starting analysis for SMILES: {smiles}")

    if selected_parameters:
        print(f"Running with selected parameters: {selected_parameters}")
    
    task_result = {}
    status = "success"
    
    # Define parameter groups
    PARAM_PHYSCHEM = "Physico-Chemical Properties"
    PARAM_ALERTS = "Structural Alerts"
    PARAM_PK_PROFILE = "Pharmacokinetic Profile"
    PARAM_UNCERTAINTY = "Uncertainty Notes"
    PARAM_EXPERIMENTAL = "Experimental Data"
    PK_PROPS = ["Clearance", "VDss"]

    # Determine which modules to run
    run_all = not selected_parameters
    
    try:
        # 1. Input Resolution and Molecule Preparation
        final_smiles = None
        molecule_name = name

        if smiles:
            mol = smiles_to_mol(smiles)
            if mol:
                final_smiles = smiles
                if not molecule_name or molecule_name == final_smiles:
                    try:
                        pubchem_data = query_pubchem(final_smiles)
                        if pubchem_data and pubchem_data.get("synonyms"):
                            molecule_name = pubchem_data["synonyms"][0].capitalize()
                        else:
                            molecule_name = "Unnamed Molecule"
                    except Exception:
                        molecule_name = "Unnamed Molecule"
            else:
                raise ValueError(f"Provided SMILES string is invalid: '{smiles}'")
        elif name:
            molecule_name = name
            final_smiles = name_to_smiles(molecule_name)
            if not final_smiles:
                raise ValueError(f'Could not find a valid molecule named "{molecule_name}".')
        else:
            raise ValueError("Molecule name or SMILES string must be provided.")

        mol = smiles_to_mol(final_smiles)
        if mol is None:
            raise ValueError("Failed to process the final molecule structure from SMILES.")

        # 2. Parallel Heavy Lifting
        results = {}
        with ThreadPoolExecutor(max_workers=3) as executor:
            pred_future = executor.submit(admet_model.predict, smiles=final_smiles)
            
            # Conditionally run experimental data queries
            if run_all or PARAM_EXPERIMENTAL in selected_parameters:
                pubchem_future = executor.submit(query_pubchem, final_smiles)
                chembl_future = executor.submit(query_chembl, final_smiles)
                results["pubchem_data"] = pubchem_future.result()
                results["chembl_data"] = chembl_future.result()

            results["predictions"] = pred_future.result()

        predictions = results.get("predictions", {})
        pubchem_data = results.get("pubchem_data", {})
        chembl_data = results.get("chembl_data", {})
        
        keymap = find_keys(predictions)

        # 3. Conditional Remaining Calculations
        descriptors = {}
        if run_all or PARAM_PHYSCHEM in selected_parameters:
            descriptors = rdkit_descriptors(mol)

        alerts = "Not calculated."
        if run_all or PARAM_ALERTS in selected_parameters:
            alerts = run_rule_based_alerts(mol)

        # Pass selected_parameters to aggregate_risk
        risk_score, _ = aggregate_risk(predictions, descriptors, selected_parameters=selected_parameters)

        pk_profile = "Not calculated."
        # Check if any PK properties are selected, or if the general PK profile is selected
        run_pk = any(p in selected_parameters for p in PK_PROPS) if not run_all else True
        if run_all or run_pk or PARAM_PK_PROFILE in selected_parameters:
            pk_profile = simplified_pk_profile(predictions, keymap)

        notes = "Not calculated."
        if run_all or PARAM_UNCERTAINTY in selected_parameters:
            notes = uncertainty_notes(mol, predictions, keymap)

        # 4. Format Results
        # Filter predictions based on keymap and selected_parameters
        mapped_predictions = {tag: predictions.get(prop_name) for tag, prop_name in keymap.items()}
        
        if not run_all:
            # Filter mapped_predictions to only include selected parameters
            filtered_mapped_predictions = {}
            for p in selected_parameters:
                if p in mapped_predictions:
                    filtered_mapped_predictions[p] = mapped_predictions[p]
            mapped_predictions = filtered_mapped_predictions

        # Also add descriptors if they were calculated
        if descriptors:
            mapped_predictions.update(descriptors)

        task_result = {
            "smiles": final_smiles,
            "image_base64": mol_to_base64_image(mol),
            "moleculeName": molecule_name,
            "riskScore": risk_score,
            "physChem": descriptors,
            "admetPredictions": [
                {"property": prop, "prediction": str(val)}
                for prop, val in mapped_predictions.items()
            ],
            "structuralAlerts": alerts,
            "pkProfile": pk_profile,
            "uncertaintyNotes": notes,
            "experimentalData": {"pubchem": pubchem_data, "chembl": chembl_data},
        }

    except Exception as e:
        print(f"---! ADMET ANALYSIS FAILED for identifier: '{identifier or smiles}' !---")
        traceback.print_exc()
        print("---! End of Error Report !---")
        status = "error"
        task_result = {"error": f"Analysis failed: {e}"}

    # 5. Notify Backend (if requested)
    if notify:
        notification_payload = {
            "sessionId": session_id,
            "status": status,
            "data": task_result,
            "type": type,
            "identifier": identifier,
        }
        notify_backend(notification_payload)
        print(f"Finished analysis for identifier: '{identifier}', session: {session_id}")
        return notification_payload
    else:
        # Or just return the raw results
        return task_result
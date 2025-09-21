# admet/config.py

import os
from rdkit.Chem import FilterCatalog
from admet_ai import ADMETModel

# ==============================================================================
# 1. LOAD MODELS & CLIENTS
# ==============================================================================

# ADMET-AI model will be loaded on demand
# os.environ["CUDA_VISIBLE_DEVICES"] = ""
# admet_model = ADMETModel()
# print("ADMET-AI (Machine Learning Model) is ready on the CPU.")

# Rule-based filters (PAINS/Brenk)
params = FilterCatalog.FilterCatalogParams()
params.AddCatalog(FilterCatalog.FilterCatalogParams.FilterCatalogs.PAINS)
params.AddCatalog(FilterCatalog.FilterCatalogParams.FilterCatalogs.BRENK)
rule_based_catalog = FilterCatalog.FilterCatalog(params)
print("Rule-Based Filter Catalog (PAINS/Brenk) is ready.")

# ChEMBL client is initialized lazily to prevent startup crashes
_chembl_client = None
_chembl_initialized = False

def get_chembl_client():
    """
    Initializes and returns the ChEMBL client, caching it after the first call.
    """
    global _chembl_client, _chembl_initialized
    if _chembl_initialized:
        return _chembl_client

    try:
        from chembl_webresource_client.new_client import new_client
        _chembl_client = new_client
        print("ChEMBL client is ready.")
    except Exception as e:
        _chembl_client = None
        print(f"Warning: ChEMBL client could not be initialized: {e}")
    
    _chembl_initialized = True
    return _chembl_client

# ==============================================================================
# 2. CONSTANTS
# ==============================================================================

ALIAS = {
    "Ames": ["ames"],
    "BBB": ["bbbp", "bbb"],
    "Bioavailability": ["bioavailability"],
    "Caco2": ["caco2"],
    "CYP2C9_inhib": ["cyp2c9"],
    "CYP2D6_inhib": ["cyp2d6"],
    "CYP3A4_inhib": ["cyp3a4"],
    "Clearance": ["clearance", "cl"],
    "DILI": ["dili"],
    "HIA": ["hia"],
    "Hepatotoxicity": ["hepatotox"],
    "Pgp_inh": ["pgp_inh"],
    "Pgp_sub": ["pgp_sub"],
    "Solubility": ["solubility", "logs"],
    "VDss": ["vdss", "vd"],
    "hERG": ["herg"],
}
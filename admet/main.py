# admet/main.py

import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rdkit import RDLogger

# Fix PyTorch weights_only issue for PyTorch 2.6+
import torch
# Monkey patch torch.load to use weights_only=False by default
original_torch_load = torch.load
def patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return original_torch_load(*args, **kwargs)
torch.load = patched_torch_load

from .pipeline import run_analysis_pipeline

# Suppress RDKit verbose logs
RDLogger.DisableLog("rdApp.*")

# ==============================================================================
# API SETUP
# ==============================================================================

app = FastAPI(
    title="ADMET Analysis API",
    description="An API for running ADMET predictions, physicochemical calculations, and querying external databases.",
    version="1.0.0",
)

# In-memory cache
admet_cache = {}

class PredictionRequest(BaseModel):
    name: str | None = None
    smiles: str | None = None
    selected_parameters: list[str] | None = None


@app.post("/predict")
async def predict_admet(request: PredictionRequest):
    """Run the full analysis pipeline for a given SMILES string."""
    
    # Create a cache key from SMILES and sorted parameters
    params_key = json.dumps(request.selected_parameters, sort_keys=True) if request.selected_parameters else "{}"
    cache_key = f"{request.smiles}:{params_key}"

    # Check cache first
    if cache_key in admet_cache:
        print(f"Cache hit for key: {cache_key}")
        return admet_cache[cache_key]
    
    print(f"Cache miss for key: {cache_key}")

    try:
        # Call the pipeline without notification
        result = run_analysis_pipeline(
            name=request.name, 
            smiles=request.smiles, 
            selected_parameters=request.selected_parameters,
            notify=False
        )
        # Store result in cache
        admet_cache[cache_key] = result
        return result
    except HTTPException as e:
        # Re-raise HTTPException to let FastAPI handle it
        raise e
    except Exception as e:
        # Log the unexpected error for debugging
        print(f"An unexpected error occurred: {e}")
        # Return a generic 500 error to the client
        raise HTTPException(
            status_code=500, detail=f"An internal error occurred: {str(e)}"
        )


@app.get("/", tags=["General"])
def read_root():
    """Root endpoint providing API status."""
    return {"status": "ADMET API with external data sources is running"}

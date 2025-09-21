# admet/utils.py

import base64
import math
from io import BytesIO

from rdkit import Chem
from rdkit.Chem import Crippen, Descriptors, Draw, rdMolDescriptors

from .config import ALIAS

def find_keys(preds_dict):
    keys = list(preds_dict.keys())
    found = {}
    for tag, alist in ALIAS.items():
        for k in keys:
            if any(a in k.lower() for a in alist):
                found.setdefault(tag, k)
                break
    return found

def to_probish(x):
    if x is None:
        return None
    try:
        xv = float(x)
        if 0.0 <= xv <= 1.0:
            return xv
        return 1 / (1 + math.exp(-xv * 0.5))
    except (ValueError, TypeError):
        s = str(x).strip().lower()
        if s in {"true", "yes", "positive", "active"}:
            return 0.9
        if s in {"false", "no", "negative", "inactive"}:
            return 0.1
        return None

def smiles_to_mol(smiles: str):
    return Chem.MolFromSmiles(smiles)

def mol_to_base64_image(mol, size=(350, 250)):
    if mol is None:
        return None
    try:
        img = Draw.MolToImage(mol, size=size)
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")
    except Exception:
        return None

def rdkit_descriptors(mol):
    if mol is None:
        return {}
    return {
        "MolWt": Descriptors.MolWt(mol),
        "LogP": Crippen.MolLogP(mol),
        "TPSA": rdMolDescriptors.CalcTPSA(mol),
        "HBD": rdMolDescriptors.CalcNumHBD(mol),
        "HBA": rdMolDescriptors.CalcNumHBA(mol),
        "RotB": rdMolDescriptors.CalcNumRotatableBonds(mol),
        "AromaticRings": rdMolDescriptors.CalcNumAromaticRings(mol),
        "HeavyAtomCount": mol.GetNumHeavyAtoms(),
        "FractionCSP3": rdMolDescriptors.CalcFractionCSP3(mol),
        "FormalCharge": Chem.GetFormalCharge(mol),
    }

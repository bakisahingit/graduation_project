# admet/analysis.py

from rdkit import Chem

from .config import rule_based_catalog
from .utils import find_keys, to_probish

def aggregate_risk(admet_preds, mol_desc):
    keymap = find_keys(admet_preds)
    weights = {
        "Ames": 25,
        "DILI": 20,
        "Hepatotoxicity": 10,
        "hERG": 25,
        "CYP2C9_inhib": 3,
        "CYP2D6_inhib": 4,
        "CYP3A4_inhib": 6,
        "Pgp_inh": 3,
        "BBB": -5,
        "HIA": -5,
        "Solubility": 6,
    }
    total_score, total_weight = 0.0, 0.0
    for tag, w in weights.items():
        k = keymap.get(tag)
        if not k:
            continue
        v = admet_preds.get(k)
        p = to_probish(v)
        if p is None:
            if tag == "Solubility":
                try:
                    p = 0.9 if float(v) < -5 else (0.5 if float(v) < -4 else 0.1)
                except (ValueError, TypeError):
                    continue
            else:
                continue
        total_score += abs(w) * p if w > 0 else abs(w) * (1 - p)
        total_weight += abs(w)
    if total_weight == 0:
        return 50.0, keymap
    return float(100.0 * total_score / total_weight), keymap

def uncertainty_notes(mol, admet_preds, keymap):
    notes = []
    if mol is None:
        notes.append("SMILES parse edilemedi; tüm tahminler belirsiz.")
        return notes
    if mol.GetNumHeavyAtoms() > 70:
        notes.append(
            "Molekül çok büyük (>70 ağır atom); modellerin eğitim alanının dışında olabilir."
        )
    if Chem.FindMolChiralCenters(mol, includeUnassigned=True):
        notes.append(
            "Kiral merkezler mevcut; stereospesifik etkiler belirsizlik yaratabilir."
        )
    for tag, k in keymap.items():
        p = to_probish(admet_preds.get(k))
        if p is not None and 0.4 <= p <= 0.6:
            notes.append(
                f"{tag} tahmini sınıra yakın (~{p:.2f}), bu nedenle belirsizliği yüksek."
            )
    return notes

def simplified_pk_profile(preds, keymap):
    profile = []
    cl_key = keymap.get("Clearance")
    if cl_key:
        try:
            cl_val = float(preds[cl_key])
            if cl_val > 50:
                profile.append(
                    f"**Yüksek Klerens Riski** ({cl_val:.2f} mL/min/kg): Vücuttan çok hızlı atılabilir, etki süresi kısa olabilir."
                )
            elif cl_val < 5:
                profile.append(
                    f"**Düşük Klerens** ({cl_val:.2f} mL/min/kg): Yavaş atılır, birikim ve toksisite riski olabilir."
                )
            else:
                profile.append(
                    f"**Orta Düzey Klerens** ({cl_val:.2f} mL/min/kg): İstenen aralıkta."
                )
        except (ValueError, TypeError):
            pass
    vdss_key = keymap.get("VDss")
    if vdss_key:
        try:
            vdss_val = float(preds[vdss_key])
            if vdss_val > 5:
                profile.append(
                    f"**Yüksek Dağılım Hacmi** ({vdss_val:.2f} L/kg): Dokularda yüksek oranda birikir, plazma konsantrasyonu düşük kalabilir."
                )
            elif vdss_val < 0.5:
                profile.append(
                    f"**Düşük Dağılım Hacmi** ({vdss_val:.2f} L/kg): Genellikle plazmada kalır, doku penetrasyonu sınırlı olabilir."
                )
            else:
                profile.append(
                    f"**Orta Düzey Dağılım Hacmi** ({vdss_val:.2f} L/kg): İstenen aralıkta."
                )
        except (ValueError, TypeError):
            pass
    if not profile:
        return "Farmakokinetik parametreler (Klerens, VDss) güvenilir bir şekilde tahmin edilemedi."
    return "\n".join(f"- {p}" for p in profile)

def run_rule_based_alerts(mol):
    if mol is None:
        return "Molekül geçersiz; uyarılar kontrol edilemedi."
    matches = rule_based_catalog.GetMatches(mol)
    if not matches:
        return "✅ Molekülde bilinen PAINS veya Brenk uyarısı bulunmadı."
    alerts = [f"🚨 **Uyarı:** {match.GetDescription()}" for match in matches]
    return "\n".join(alerts)

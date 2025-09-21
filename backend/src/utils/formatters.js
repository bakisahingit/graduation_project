// src/utils/formatters.js

export function formatAdmetReport(data) {
    const moleculeName = data.moleculeName ? data.moleculeName.charAt(0).toUpperCase() + data.moleculeName.slice(1) : data.smiles;
    let report = `## 🧪 ADMET Analysis Report: ${moleculeName}\n\n`;
    report += `**SMILES:** \`${data.smiles}\`\n`;
    report += `**Overall Risk Score:** ${data.riskScore.toFixed(1)}/100 (Lower is better)\n\n`;
    
    if (data.structuralAlerts && !data.structuralAlerts.includes("✅")) {
        report += `### 🚨 Structural Alerts\n${data.structuralAlerts}\n\n`;
    }
    if (data.pkProfile) {
        report += `### 💊 Pharmacokinetic Profile\n${data.pkProfile}\n\n`;
    }

    report += "### 📊 Key Predictions\n";
    const keyProps = ["Hepatotoxicity", "hERG", "Ames", "DILI", "BBB", "HIA"];
    data.admetPredictions.forEach(p => {
        if (keyProps.some(k => p.property.toLowerCase().includes(k.toLowerCase()))) {
            report += `- **${p.property}:** ${p.prediction}\n`;
        }
    });
    report += "\n";

    if (data.uncertaintyNotes && data.uncertaintyNotes.length > 0) {
        report += `### ⚠️ Uncertainty Notes\n- ${data.uncertaintyNotes.join('\n- ')}\n\n`;
    }
    return report;
}
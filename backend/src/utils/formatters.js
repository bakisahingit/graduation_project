// src/utils/formatters.js

export function formatAdmetReport(data) {
    const moleculeName = data.moleculeName ? data.moleculeName.charAt(0).toUpperCase() + data.moleculeName.slice(1) : data.smiles;
    let report = `## 🧪 ADMET Analysis Report: ${moleculeName}\n\n`;
    report += `**SMILES:** \`${data.smiles}\`\n`;
    report += `**Overall Risk Score:** ${data.riskScore.toFixed(1)}/100 (Lower is better)\n\n`;

    // --- START: Radar Chart Data ---
    const chartProperties = ['Ames', 'hERG', 'DILI', 'Hepatotoxicity', 'CYP2C9_inhib', 'CYP3A4_inhib'];
    const chartData = {
        labels: [],
        values: []
    };
    const predictionsMap = new Map(data.admetPredictions.map(p => [p.property, parseFloat(p.prediction)]));

    chartProperties.forEach(prop => {
        if (predictionsMap.has(prop)) {
            chartData.labels.push(prop.replace('_inhib', ' Inh.')); // Shorten label
            const value = predictionsMap.get(prop);
            chartData.values.push(isNaN(value) ? 0 : Math.max(0, Math.min(1, value)));
        }
    });

    // Embed chart canvas and data into the report
    if (chartData.labels.length > 2) { // A radar chart needs at least 3 points
        report += `### 📈 Risk Profile\n\n`;
        report += `<div class="chart-container" style="position: relative; max-width: 500px; margin: 1rem auto;"><canvas id="admet-radar-chart"></canvas></div>\n\n`;
        report += `<script type="application/json" id="admet-radar-chart-data">${JSON.stringify(chartData)}</script>\n\n`;
    }
    // --- END: Radar Chart Data ---
    
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

    // Embed the full raw data for frontend features like exporting
    report += `<script type="application/json" id="admet-raw-data">${JSON.stringify(data)}</script>`;

    return report;
}

/**
 * CSV Exporter
 * ADMET verilerini CSV formatında dışa aktarma
 */

export class CsvExporter {
    /**
     * ADMET verilerini CSV dosyasına aktar
     * @param {object} rawData - Ham ADMET verileri
     * @param {boolean} isComparison - Karşılaştırma raporu mu?
     */
    static export(rawData, isComparison = false) {
        let csvContent = "data:text/csv;charset=utf-8,";
        let fileName = "admet_report.csv";

        if (isComparison && rawData.successfulResults?.length > 0) {
            // Karşılaştırma CSV
            fileName = "admet_comparison.csv";
            csvContent += this.buildComparisonCsv(rawData);
        } else if (!isComparison) {
            // Tekli analiz CSV
            if (!rawData || !rawData.admetPredictions) return;
            fileName = `${rawData.moleculeName || rawData.smiles}_admet_report.csv`;
            csvContent += this.buildSingleCsv(rawData);
        }

        this.downloadFile(csvContent, fileName);
    }

    /**
     * Karşılaştırma CSV içeriği oluştur
     * @param {object} rawData - Ham veri
     * @returns {string} CSV içeriği
     */
    static buildComparisonCsv(rawData) {
        let content = "";

        // Molekül isimleri
        const moleculeNames = rawData.successfulResults.map(
            mol => mol.data.moleculeName || mol.identifier
        );

        // Tüm özellikleri topla
        const allProperties = new Set();
        rawData.successfulResults.forEach(mol => {
            mol.data.admetPredictions.forEach(p => allProperties.add(p.property));
        });
        const sortedProperties = Array.from(allProperties).sort();

        // Veri haritası oluştur
        const dataMap = new Map();
        rawData.successfulResults.forEach(mol => {
            const name = mol.data.moleculeName || mol.identifier;
            const propMap = new Map();
            mol.data.admetPredictions.forEach(p => propMap.set(p.property, p.prediction));
            dataMap.set(name, propMap);
        });

        // Başlık satırı
        content += `"Property",${moleculeNames.map(name => `"${name}"`).join(',')}\r\n`;

        // Veri satırları
        sortedProperties.forEach(prop => {
            const row = [`"${prop}"`];
            moleculeNames.forEach(name => {
                const prediction = dataMap.get(name)?.get(prop) || 'N/A';
                row.push(`"${prediction}"`);
            });
            content += row.join(',') + '\r\n';
        });

        return content;
    }

    /**
     * Tekli analiz CSV içeriği oluştur
     * @param {object} rawData - Ham veri
     * @returns {string} CSV içeriği
     */
    static buildSingleCsv(rawData) {
        let content = "Property,Prediction\r\n";
        rawData.admetPredictions.forEach(p => {
            content += `"${p.property}","${p.prediction}"\r\n`;
        });
        return content;
    }

    /**
     * Dosyayı indir
     * @param {string} content - Dosya içeriği
     * @param {string} fileName - Dosya adı
     */
    static downloadFile(content, fileName) {
        const encodedUri = encodeURI(content);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Karşılaştırma verisini tablo formatına dönüştür
     * @param {object} rawData - Ham veri
     * @returns {object} { headers: string[], rows: string[][] }
     */
    static prepareTableData(rawData) {
        if (!rawData.successfulResults?.length) {
            return { headers: [], rows: [] };
        }

        const moleculeNames = rawData.successfulResults.map(
            mol => mol.data.moleculeName || mol.identifier
        );

        const allProperties = new Set();
        rawData.successfulResults.forEach(mol => {
            mol.data.admetPredictions.forEach(p => allProperties.add(p.property));
        });
        const sortedProperties = Array.from(allProperties).sort();

        const dataMap = new Map();
        rawData.successfulResults.forEach(mol => {
            const name = mol.data.moleculeName || mol.identifier;
            const propMap = new Map();
            mol.data.admetPredictions.forEach(p => propMap.set(p.property, p.prediction));
            dataMap.set(name, propMap);
        });

        const headers = ['Property', ...moleculeNames];
        const rows = sortedProperties.map(prop => {
            const row = [prop];
            moleculeNames.forEach(name => {
                row.push(dataMap.get(name)?.get(prop) || 'N/A');
            });
            return row;
        });

        return { headers, rows };
    }
}

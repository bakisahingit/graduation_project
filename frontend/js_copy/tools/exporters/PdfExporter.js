/**
 * PDF Exporter
 * ADMET verilerini PDF formatında dışa aktarma
 * jsPDF ve jspdf-autotable kütüphanelerini kullanır
 */

export class PdfExporter {
    /**
     * ADMET verilerini PDF dosyasına aktar
     * @param {object} rawData - Ham ADMET verileri
     * @param {boolean} isComparison - Karşılaştırma raporu mu?
     */
    static export(rawData, isComparison = false) {
        if (!rawData || !window.jspdf) {
            console.error('jsPDF library not loaded');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        if (isComparison && rawData.successfulResults?.length > 0) {
            this.buildComparisonPdf(doc, rawData);
            doc.save('admet_comparison_report.pdf');
        } else if (!isComparison) {
            this.buildSinglePdf(doc, rawData);
            doc.save(`${rawData.moleculeName || rawData.smiles}_admet_report.pdf`);
        }
    }

    /**
     * Karşılaştırma PDF'i oluştur
     * @param {jsPDF} doc - jsPDF instance
     * @param {object} rawData - Ham veri
     */
    static buildComparisonPdf(doc, rawData) {
        let yPos = 22;

        // Başlık
        doc.setFontSize(18);
        doc.text('Molecule Comparison Report', 14, yPos);
        yPos += 15;

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

        // Tablo başlıkları ve gövdesi
        const tableHead = [['Property', ...moleculeNames]];
        const tableBody = [];
        sortedProperties.forEach(prop => {
            const row = [prop];
            moleculeNames.forEach(name => {
                row.push(dataMap.get(name)?.get(prop) || 'N/A');
            });
            tableBody.push(row);
        });

        // Tabloyu çiz
        doc.autoTable({
            startY: yPos,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133], halign: 'center' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // Başarısız analizler
        if (rawData.failedResults && rawData.failedResults.length > 0) {
            doc.setFontSize(14);
            doc.text('Failed Analyses:', 14, yPos);
            yPos += 7;
            rawData.failedResults.forEach(mol => {
                doc.setFontSize(10);
                doc.text(`- ${mol.identifier}: ${mol.error || 'Unknown error'}`, 14, yPos);
                yPos += 5;
            });
        }
    }

    /**
     * Tekli analiz PDF'i oluştur
     * @param {jsPDF} doc - jsPDF instance
     * @param {object} rawData - Ham veri
     */
    static buildSinglePdf(doc, rawData) {
        let yPos = 22;

        // Başlık
        const title = `ADMET Analysis Report: ${rawData.moleculeName || rawData.smiles}`;
        doc.setFontSize(18);
        doc.text(title, 14, yPos);
        yPos += 10;

        // Tablo verileri
        const tableData = rawData.admetPredictions.map(p => [p.property, p.prediction]);

        // Tabloyu çiz
        doc.autoTable({
            startY: yPos,
            head: [['Property', 'Prediction']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] },
        });
    }

    /**
     * PDF'e özel sayfa ekle
     * @param {jsPDF} doc - jsPDF instance
     * @param {string} content - Sayfa içeriği
     */
    static addCustomPage(doc, content) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text(content, 14, 22);
    }

    /**
     * jsPDF kütüphanesinin yüklenip yüklenmediğini kontrol et
     * @returns {boolean}
     */
    static isAvailable() {
        return typeof window !== 'undefined' && window.jspdf !== undefined;
    }
}

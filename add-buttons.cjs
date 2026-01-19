const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'frontend', 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');

const pharmacyButtons = `
								<div style="border-top: 1px solid var(--border-color); margin: 4px 0;"></div>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('interaction')">
									<span style="font-size: 16px; margin-right: 4px;">💊</span>İlaç Etkileşimi
								</button>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('pregnancy')">
									<span style="font-size: 16px; margin-right: 4px;">🤰</span>Hamilelik Güvenliği
								</button>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('dose')">
									<span style="font-size: 16px; margin-right: 4px;">💉</span>Doz Hesaplama
								</button>
								<div style="border-top: 1px solid var(--border-color); margin: 4px 0;"></div>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('icd10')">
									<span style="font-size: 16px; margin-right: 4px;">🏥</span>ICD-10 Kodları
								</button>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('titck')">
									<span style="font-size: 16px; margin-right: 4px;">🇹🇷</span>Türkiye İlaç
								</button>`;

// Butonları ekle
const newContent = content.replace(
    /(id="welcome-compare-tool"[\s\S]*?Molekül Karşılaştır\s*<\/button>)/,
    '$1' + pharmacyButtons
);

if (newContent !== content) {
    fs.writeFileSync(htmlPath, newContent, 'utf8');
    console.log('✅ Butonlar eklendi!');
} else {
    console.log('❌ Pattern bulunamadı');
}

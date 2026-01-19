const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'frontend', 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Mevcut dropdown'a eczacılık butonlarını ekle - orijinal yapıyı koru
const pharmacyButtons = `
								<div style="border-top: 1px solid var(--border-color); margin: 4px 0;"></div>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('interaction')">
									💊 İlaç Etkileşimi
								</button>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('pregnancy')">
									🤰 Hamilelik Güvenliği
								</button>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('dose')">
									💉 Doz Hesaplama
								</button>
								<div style="border-top: 1px solid var(--border-color); margin: 4px 0;"></div>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('icd10')">
									🏥 ICD-10 Hastalık Kodları
								</button>
								<button type="button" class="panel-item tool-option" onclick="window.openPharmacyModal('titck')">
									🇹🇷 Türkiye İlaç (TİTCK)
								</button>`;

// "Molekül Karşılaştır" butonunun kapanışından sonra ekle
// Pattern: </button> ve ardından </div> (panel-content sonu)
const pattern = /(id="welcome-compare-tool"[\s\S]*?Molekül Karşılaştır[\s\S]*?<\/button>)(\s*<\/div>)/;

if (pattern.test(content)) {
    content = content.replace(pattern, '$1' + pharmacyButtons + '$2');
    console.log('✅ Eczacılık butonları eklendi!');
} else {
    console.log('❌ Pattern bulunamadı');
}

fs.writeFileSync(htmlPath, content, 'utf8');

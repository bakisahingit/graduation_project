const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'frontend', 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Yeni basit dropdown HTML
const simpleDropdown = `<div class="tools-dropdown-simple" id="welcome-tools-dropdown">
							<div class="tools-category-label">ADMET Araçları</div>
							<button type="button" class="tool-item" id="welcome-admet-tool">
								<div class="tool-item-icon admet">📊</div>
								<div class="tool-item-text">
									<span class="tool-item-title">ADMET Analizi</span>
									<span class="tool-item-desc">Molekül risk değerlendirmesi</span>
								</div>
							</button>
							<button type="button" class="tool-item" id="welcome-compare-tool">
								<div class="tool-item-icon compare">📈</div>
								<div class="tool-item-text">
									<span class="tool-item-title">Molekül Karşılaştır</span>
									<span class="tool-item-desc">İki molekülü karşılaştır</span>
								</div>
							</button>
							<button type="button" class="tool-item" id="welcome-molecule-draw-mega">
								<div class="tool-item-icon molecule">🔬</div>
								<div class="tool-item-text">
									<span class="tool-item-title">Molekül Çiz</span>
									<span class="tool-item-desc">2D/3D yapı çizimi</span>
								</div>
							</button>
							
							<div class="tools-divider"></div>
							<div class="tools-category-label">Eczacılık</div>
							
							<button type="button" class="tool-item" onclick="window.openPharmacyModal('interaction')">
								<div class="tool-item-icon interaction">⚠️</div>
								<div class="tool-item-text">
									<span class="tool-item-title">İlaç Etkileşimi</span>
									<span class="tool-item-desc">İlaç-ilaç kontrolü</span>
								</div>
							</button>
							<button type="button" class="tool-item" onclick="window.openPharmacyModal('pregnancy')">
								<div class="tool-item-icon pregnancy">🤰</div>
								<div class="tool-item-text">
									<span class="tool-item-title">Hamilelik Güvenliği</span>
									<span class="tool-item-desc">Gebelik kategorisi</span>
								</div>
							</button>
							<button type="button" class="tool-item" onclick="window.openPharmacyModal('dose')">
								<div class="tool-item-icon dose">💉</div>
								<div class="tool-item-text">
									<span class="tool-item-title">Doz Hesaplama</span>
									<span class="tool-item-desc">Pediatrik/Renal doz</span>
								</div>
							</button>
							
							<div class="tools-divider"></div>
							<div class="tools-category-label">Veritabanları</div>
							
							<button type="button" class="tool-item" onclick="window.openPharmacyModal('icd10')">
								<div class="tool-item-icon icd10">🏥</div>
								<div class="tool-item-text">
									<span class="tool-item-title">ICD-10 Kodları</span>
									<span class="tool-item-desc">Hastalık kodları ara</span>
								</div>
							</button>
							<button type="button" class="tool-item" onclick="window.openPharmacyModal('titck')">
								<div class="tool-item-icon titck">🇹🇷</div>
								<div class="tool-item-text">
									<span class="tool-item-title">Türkiye İlaç (TİTCK)</span>
									<span class="tool-item-desc">SGK bilgisi, ticari isimler</span>
								</div>
							</button>
						</div>`;

// Eski mega menu veya dropdown'ı bul ve değiştir
// tools-mega-menu veya welcome-tools-dropdown ID'li div'i ara
const megaMenuRegex = /<div class="tools-mega-menu" id="welcome-tools-dropdown">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
const oldDropdownRegex = /<div class="panel-container tools-dropdown" id="welcome-tools-dropdown">[\s\S]*?<\/div>\s*<\/div>/;
const simpleDropdownRegex = /<div class="tools-dropdown-simple" id="welcome-tools-dropdown">[\s\S]*?<\/div>/;

if (megaMenuRegex.test(content)) {
    content = content.replace(megaMenuRegex, simpleDropdown);
    console.log('✅ Mega menu bulundu ve basit dropdown ile değiştirildi!');
} else if (simpleDropdownRegex.test(content)) {
    content = content.replace(simpleDropdownRegex, simpleDropdown);
    console.log('✅ Mevcut basit dropdown güncellendi!');
} else if (oldDropdownRegex.test(content)) {
    content = content.replace(oldDropdownRegex, simpleDropdown);
    console.log('✅ Eski dropdown basit dropdown ile değiştirildi!');
} else {
    // Manuel arama - welcome-tools-dropdown ID'sini bul
    const searchStr = 'id="welcome-tools-dropdown"';
    const idx = content.indexOf(searchStr);
    if (idx > -1) {
        // Div'in başlangıcını bul
        let divStart = content.lastIndexOf('<div', idx);
        // Kapatma tag'lerini say ve bul
        let pos = idx;
        let depth = 1;
        pos = content.indexOf('>', pos) + 1;

        while (depth > 0 && pos < content.length) {
            const nextOpenDiv = content.indexOf('<div', pos);
            const nextCloseDiv = content.indexOf('</div>', pos);

            // En yakın tag'i bul
            if (nextOpenDiv !== -1 && (nextOpenDiv < nextCloseDiv || nextCloseDiv === -1)) {
                depth++;
                pos = nextOpenDiv + 4;
            } else if (nextCloseDiv !== -1) {
                depth--;
                if (depth > 0) {
                    pos = nextCloseDiv + 6;
                } else {
                    pos = nextCloseDiv + 6;
                }
            } else {
                break;
            }
        }

        content = content.substring(0, divStart) + simpleDropdown + content.substring(pos);
        console.log('✅ Manuel parsing ile değiştirildi!');
    } else {
        console.log('❌ Dropdown bulunamadı');
    }
}

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('✅ Basit Tools Dropdown eklendi!');

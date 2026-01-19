const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'frontend', 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Yeni Tools Mega Menu HTML
const newToolsMenu = `<div class="tools-mega-menu" id="welcome-tools-dropdown">
							<div class="tools-mega-header">
								<span class="tools-mega-title">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
									</svg>
									Araçlar ve Kaynaklar
								</span>
							</div>
							
							<div class="tools-mega-grid">
								<!-- ADMET Araçları -->
								<div class="tools-category">
									<div class="tools-category-header">
										<div class="tools-category-icon admet">🧬</div>
										<span class="tools-category-title">ADMET Araçları</span>
									</div>
									<div class="tools-category-items">
										<div class="tool-card" id="welcome-admet-tool">
											<div class="tool-card-icon admet-analysis">📊</div>
											<div class="tool-card-title">ADMET Analizi</div>
											<div class="tool-card-desc">Molekül risk değerlendirmesi</div>
										</div>
										<div class="tool-card" id="welcome-compare-tool">
											<div class="tool-card-icon compare">📈</div>
											<div class="tool-card-title">Karşılaştır</div>
											<div class="tool-card-desc">Molekül karşılaştırma</div>
										</div>
										<div class="tool-card" id="welcome-molecule-draw-mega">
											<div class="tool-card-icon molecule">🔬</div>
											<div class="tool-card-title">Molekül Çiz</div>
											<div class="tool-card-desc">2D/3D yapı çizimi</div>
										</div>
									</div>
								</div>
								
								<!-- Veritabanları -->
								<div class="tools-category">
									<div class="tools-category-header">
										<div class="tools-category-icon database">🗄️</div>
										<span class="tools-category-title">Veritabanları</span>
									</div>
									<div class="tools-category-items">
										<div class="tool-card" onclick="window.openPharmacyModal('icd10')">
											<div class="tool-card-icon icd10">🏥</div>
											<div class="tool-card-title">ICD-10</div>
											<div class="tool-card-desc">Hastalık kodları</div>
										</div>
										<div class="tool-card" onclick="window.openPharmacyModal('titck')">
											<div class="tool-card-icon titck">🇹🇷</div>
											<div class="tool-card-title">TİTCK</div>
											<div class="tool-card-desc">Türkiye ilaç veritabanı</div>
										</div>
									</div>
								</div>
								
								<!-- Eczacılık Araçları (Full Width) -->
								<div class="tools-category full-width">
									<div class="tools-category-header">
										<div class="tools-category-icon pharmacy">💊</div>
										<span class="tools-category-title">Eczacılık Araçları</span>
									</div>
									<div class="tools-category-items">
										<div class="tool-card" onclick="window.openPharmacyModal('interaction')">
											<div class="tool-card-icon interaction">⚠️</div>
											<div class="tool-card-title">İlaç Etkileşimi</div>
											<div class="tool-card-desc">İlaç-ilaç kontrolü</div>
										</div>
										<div class="tool-card" onclick="window.openPharmacyModal('pregnancy')">
											<div class="tool-card-icon pregnancy">🤰</div>
											<div class="tool-card-title">Hamilelik</div>
											<div class="tool-card-desc">Gebelik güvenliği</div>
										</div>
										<div class="tool-card" onclick="window.openPharmacyModal('dose')">
											<div class="tool-card-icon dose">💉</div>
											<div class="tool-card-title">Doz Hesapla</div>
											<div class="tool-card-desc">Pediatrik/Renal doz</div>
										</div>
										<div class="tool-card" onclick="window.openPharmacyModal('auth')">
											<div class="tool-card-icon" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);">🔐</div>
											<div class="tool-card-title">Giriş Yap</div>
											<div class="tool-card-desc">Hesap yönetimi</div>
										</div>
									</div>
								</div>
							</div>
						</div>`;

// Eski dropdown'ı bul ve değiştir
// id="welcome-tools-dropdown" olan div'i ara
const oldDropdownRegex = /<div class="panel-container tools-dropdown" id="welcome-tools-dropdown">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const altDropdownRegex = /(<div class="panel-container tools-dropdown" id="welcome-tools-dropdown">[\s\S]*?Türkiye İlaç<\/button>[\s\S]*?<\/div>\s*<\/div>)/;

if (oldDropdownRegex.test(content)) {
    content = content.replace(oldDropdownRegex, newToolsMenu);
    console.log('✅ Eski dropdown bulundu ve değiştirildi!');
} else if (altDropdownRegex.test(content)) {
    content = content.replace(altDropdownRegex, newToolsMenu);
    console.log('✅ Alternatif pattern ile değiştirildi!');
} else {
    // Manuel arama
    const startIdx = content.indexOf('id="welcome-tools-dropdown"');
    if (startIdx > -1) {
        console.log('Found at index:', startIdx);
        // Div'in başlangıcını bul
        let divStart = content.lastIndexOf('<div', startIdx);
        // Kapatma tag'ini bul - panel-content içeren
        let searchStart = startIdx;
        let depth = 1;
        let pos = content.indexOf('>', searchStart) + 1;

        while (depth > 0 && pos < content.length) {
            const nextOpen = content.indexOf('<div', pos);
            const nextClose = content.indexOf('</div>', pos);

            if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                pos = nextOpen + 4;
            } else if (nextClose !== -1) {
                depth--;
                pos = nextClose + 6;
            } else {
                break;
            }
        }

        // Değiştir
        content = content.substring(0, divStart) + newToolsMenu + content.substring(pos);
        console.log('✅ Manuel parsing ile değiştirildi!');
    } else {
        console.log('❌ Dropdown bulunamadı');
    }
}

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('✅ Tools Mega Menu eklendi!');

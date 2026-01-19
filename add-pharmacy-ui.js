// add-pharmacy-ui.js - Eczacılık UI bileşenlerini ekle
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'frontend', 'index.html');

// Dosyayı oku
let content = fs.readFileSync(htmlPath, 'utf8');

// Eczacılık butonları
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

// Eczacılık modalleri
const pharmacyModals = `
	<!-- Eczacılık Modalleri -->
	
	<!-- İlaç Etkileşim Modal -->
	<div class="pharmacy-modal" id="interaction-modal">
		<div class="pharmacy-modal-overlay" id="interaction-overlay"></div>
		<div class="pharmacy-modal-content">
			<div class="pharmacy-modal-header">
				<h2><span>💊</span> İlaç Etkileşim Kontrolü</h2>
				<button class="pharmacy-modal-close" id="interaction-close">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				</button>
			</div>
			<div class="pharmacy-modal-body">
				<div class="pharmacy-form-group">
					<label>İlaç Ekle</label>
					<div style="display: flex; gap: 8px;">
						<input type="text" class="pharmacy-input" id="interaction-drug-input" placeholder="İlaç adı yazın...">
						<button class="pharmacy-btn pharmacy-btn-secondary" id="interaction-add-btn">Ekle</button>
					</div>
				</div>
				<div id="interaction-drug-tags" class="drug-tags-container">
					<span class="pharmacy-empty">En az 2 ilaç ekleyin</span>
				</div>
				<div class="pharmacy-form-group" style="margin-top: 12px;">
					<label><input type="checkbox" id="interaction-ai-analysis"> AI Analizi Ekle</label>
				</div>
				<div class="pharmacy-results" id="interaction-results" style="display: none;"></div>
			</div>
			<div class="pharmacy-modal-footer">
				<button class="pharmacy-btn pharmacy-btn-secondary" id="interaction-clear">Temizle</button>
				<button class="pharmacy-btn pharmacy-btn-primary" id="interaction-check">Kontrol Et</button>
			</div>
		</div>
	</div>

	<!-- Hamilelik Güvenliği Modal -->
	<div class="pharmacy-modal" id="pregnancy-modal">
		<div class="pharmacy-modal-overlay" id="pregnancy-overlay"></div>
		<div class="pharmacy-modal-content">
			<div class="pharmacy-modal-header">
				<h2><span>🤰</span> Hamilelik Güvenliği</h2>
				<button class="pharmacy-modal-close" id="pregnancy-close">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				</button>
			</div>
			<div class="pharmacy-modal-body">
				<div class="pharmacy-form-group">
					<label>İlaç Adı</label>
					<input type="text" class="pharmacy-input" id="pregnancy-drug-input" placeholder="İlaç adı yazın...">
				</div>
				<div class="pharmacy-form-group">
					<label>Trimester (Opsiyonel)</label>
					<select class="pharmacy-input pharmacy-select" id="pregnancy-trimester">
						<option value="">Tümü</option>
						<option value="1">1. Trimester</option>
						<option value="2">2. Trimester</option>
						<option value="3">3. Trimester</option>
					</select>
				</div>
				<div class="pharmacy-results" id="pregnancy-results" style="display: none;"></div>
			</div>
			<div class="pharmacy-modal-footer">
				<button class="pharmacy-btn pharmacy-btn-primary" id="pregnancy-check">Kontrol Et</button>
			</div>
		</div>
	</div>

	<!-- Doz Hesaplama Modal -->
	<div class="pharmacy-modal" id="dose-modal">
		<div class="pharmacy-modal-overlay" id="dose-overlay"></div>
		<div class="pharmacy-modal-content">
			<div class="pharmacy-modal-header">
				<h2><span>💉</span> Doz Hesaplama</h2>
				<button class="pharmacy-modal-close" id="dose-close">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				</button>
			</div>
			<div class="pharmacy-modal-body">
				<div class="pharmacy-form-group">
					<label>İlaç Adı</label>
					<input type="text" class="pharmacy-input" id="dose-drug-input" placeholder="İlaç adı...">
				</div>
				<div class="pharmacy-form-group">
					<label>Hesaplama Tipi</label>
					<select class="pharmacy-input pharmacy-select" id="dose-type">
						<option value="pediatric">Pediatrik Doz</option>
						<option value="renal">Böbrek Yetmezliği</option>
						<option value="hepatic">Karaciğer Yetmezliği</option>
					</select>
				</div>
				<div id="dose-pediatric-fields">
					<div class="pharmacy-form-group">
						<label>Vücut Ağırlığı (kg)</label>
						<input type="number" class="pharmacy-input" id="dose-weight" placeholder="kg">
					</div>
				</div>
				<div id="dose-renal-fields" style="display: none;">
					<div class="pharmacy-form-group">
						<label>CrCl (mL/dk)</label>
						<input type="number" class="pharmacy-input" id="dose-crcl" placeholder="mL/dk">
					</div>
				</div>
				<div id="dose-hepatic-fields" style="display: none;">
					<div class="pharmacy-form-group">
						<label>Child-Pugh Sınıfı</label>
						<select class="pharmacy-input pharmacy-select" id="dose-childpugh">
							<option value="A">Child-Pugh A (Hafif)</option>
							<option value="B">Child-Pugh B (Orta)</option>
							<option value="C">Child-Pugh C (Ağır)</option>
						</select>
					</div>
				</div>
				<div class="pharmacy-results" id="dose-results" style="display: none;"></div>
			</div>
			<div class="pharmacy-modal-footer">
				<button class="pharmacy-btn pharmacy-btn-primary" id="dose-calculate">Hesapla</button>
			</div>
		</div>
	</div>

	<!-- ICD-10 Modal -->
	<div class="pharmacy-modal" id="icd10-modal">
		<div class="pharmacy-modal-overlay" id="icd10-overlay"></div>
		<div class="pharmacy-modal-content">
			<div class="pharmacy-modal-header">
				<h2><span>🏥</span> ICD-10 Hastalık Kodları</h2>
				<button class="pharmacy-modal-close" id="icd10-close">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				</button>
			</div>
			<div class="pharmacy-modal-body">
				<div class="pharmacy-form-group">
					<label>Hastalık veya ICD-10 Kodu</label>
					<input type="text" class="pharmacy-input" id="icd10-search-input" placeholder="Örn: diyabet, I10, hipertansiyon">
				</div>
				<div class="pharmacy-results" id="icd10-results" style="display: none;"></div>
			</div>
			<div class="pharmacy-modal-footer">
				<button class="pharmacy-btn pharmacy-btn-primary" id="icd10-search-btn">Ara</button>
			</div>
		</div>
	</div>

	<!-- TİTCK Modal -->
	<div class="pharmacy-modal" id="titck-modal">
		<div class="pharmacy-modal-overlay" id="titck-overlay"></div>
		<div class="pharmacy-modal-content">
			<div class="pharmacy-modal-header">
				<h2><span>🇹🇷</span> Türkiye İlaç Veritabanı</h2>
				<button class="pharmacy-modal-close" id="titck-close">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				</button>
			</div>
			<div class="pharmacy-modal-body">
				<div class="pharmacy-form-group">
					<label>İlaç Adı veya Etken Madde</label>
					<input type="text" class="pharmacy-input" id="titck-search-input" placeholder="Örn: parasetamol, Parol, aspirin">
				</div>
				<div class="pharmacy-results" id="titck-results" style="display: none;"></div>
			</div>
			<div class="pharmacy-modal-footer">
				<button class="pharmacy-btn pharmacy-btn-secondary" id="titck-sgk-btn">SGK'lı İlaçlar</button>
				<button class="pharmacy-btn pharmacy-btn-primary" id="titck-search-btn">Ara</button>
			</div>
		</div>
	</div>

	<!-- Auth Modal -->
	<div class="pharmacy-modal" id="auth-modal">
		<div class="pharmacy-modal-overlay" id="auth-overlay"></div>
		<div class="pharmacy-modal-content" style="max-width: 400px;">
			<div class="pharmacy-modal-header">
				<h2><span>🔐</span> <span id="auth-modal-title">Giriş Yap</span></h2>
				<button class="pharmacy-modal-close" id="auth-close">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				</button>
			</div>
			<div class="pharmacy-modal-body">
				<div id="login-form">
					<div class="pharmacy-form-group">
						<label>Email</label>
						<input type="email" class="pharmacy-input" id="login-email" placeholder="ornek@email.com">
					</div>
					<div class="pharmacy-form-group">
						<label>Şifre</label>
						<input type="password" class="pharmacy-input" id="login-password" placeholder="••••••••">
					</div>
					<div id="login-error" style="color: #ef4444; font-size: 13px; margin-bottom: 12px; display: none;"></div>
					<button class="pharmacy-btn pharmacy-btn-primary" style="width: 100%;" id="login-submit">Giriş Yap</button>
					<p style="text-align: center; margin-top: 16px; font-size: 13px;">
						Hesabınız yok mu? <a href="#" id="show-register" style="color: var(--accent-color);">Kayıt Ol</a>
					</p>
				</div>
				<div id="register-form" style="display: none;">
					<div class="pharmacy-form-group">
						<label>Ad Soyad</label>
						<input type="text" class="pharmacy-input" id="register-name" placeholder="Adınız Soyadınız">
					</div>
					<div class="pharmacy-form-group">
						<label>Email</label>
						<input type="email" class="pharmacy-input" id="register-email" placeholder="ornek@email.com">
					</div>
					<div class="pharmacy-form-group">
						<label>Şifre</label>
						<input type="password" class="pharmacy-input" id="register-password" placeholder="••••••••">
					</div>
					<div id="register-error" style="color: #ef4444; font-size: 13px; margin-bottom: 12px; display: none;"></div>
					<button class="pharmacy-btn pharmacy-btn-primary" style="width: 100%;" id="register-submit">Kayıt Ol</button>
					<p style="text-align: center; margin-top: 16px; font-size: 13px;">
						Zaten hesabınız var mı? <a href="#" id="show-login" style="color: var(--accent-color);">Giriş Yap</a>
					</p>
				</div>
			</div>
		</div>
	</div>`;

// 1. Molekül Karşılaştır butonundan sonra eczacılık butonlarını ekle
content = content.replace(
    /(id="welcome-compare-tool"[\s\S]*?Molekül Karşılaştır\s*<\/button>)/,
    '$1' + pharmacyButtons
);

// 2. Aurora Glow'dan önce modalleri ekle
content = content.replace(
    /(\s*)(<!-- Aurora Glow -->)/,
    pharmacyModals + '\n\n$1$2'
);

// Dosyayı kaydet
fs.writeFileSync(htmlPath, content, 'utf8');

console.log('✅ Eczacılık UI başarıyla eklendi!');
console.log('- Tools dropdown butonları eklendi');
console.log('- İlaç Etkileşim Modal eklendi');
console.log('- Hamilelik Güvenliği Modal eklendi');
console.log('- Doz Hesaplama Modal eklendi');
console.log('- ICD-10 Modal eklendi');
console.log('- TİTCK Modal eklendi');
console.log('- Auth Modal eklendi');

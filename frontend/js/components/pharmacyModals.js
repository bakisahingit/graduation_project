// frontend/js/components/pharmacyModals.js
/**
 * Eczacılık Modalleri Yönetim Bileşeni
 */

import pharmacyService from '../services/pharmacyService.js';
import authService from '../services/authService.js';

class PharmacyModals {
    constructor() {
        this.interactionDrugs = [];
        this.init();
    }

    init() {
        this.bindInteractionModal();
        this.bindPregnancyModal();
        this.bindDoseModal();
        this.bindAuthModal();
        this.bindIcd10Modal();
        this.bindTitckModal();
    }

    // ============= DRUG INTERACTION MODAL =============
    bindInteractionModal() {
        const modal = document.getElementById('interaction-modal');
        const overlay = document.getElementById('interaction-overlay');
        const closeBtn = document.getElementById('interaction-close');
        const addBtn = document.getElementById('interaction-add-btn');
        const input = document.getElementById('interaction-drug-input');
        const clearBtn = document.getElementById('interaction-clear');
        const checkBtn = document.getElementById('interaction-check');
        const tagsContainer = document.getElementById('interaction-drug-tags');

        if (!modal) return;

        // Close handlers
        [overlay, closeBtn].forEach(el => {
            if (el) el.addEventListener('click', () => this.closeModal('interaction'));
        });

        // Add drug
        if (addBtn && input) {
            addBtn.addEventListener('click', () => this.addInteractionDrug(input, tagsContainer));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addInteractionDrug(input, tagsContainer);
                }
            });
        }

        // Clear
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearInteractionDrugs(tagsContainer));
        }

        // Check
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkInteractions());
        }
    }

    addInteractionDrug(input, container) {
        const drug = input.value.trim();
        if (!drug || this.interactionDrugs.includes(drug.toLowerCase())) {
            input.value = '';
            return;
        }

        this.interactionDrugs.push(drug.toLowerCase());
        input.value = '';
        this.renderInteractionTags(container);
    }

    renderInteractionTags(container) {
        if (this.interactionDrugs.length === 0) {
            container.innerHTML = '<span class="pharmacy-empty">En az 2 ilaç ekleyin</span>';
            return;
        }

        container.innerHTML = this.interactionDrugs.map((drug, i) => `
            <span class="drug-tag">
                ${drug}
                <button class="drug-tag-remove" data-index="${i}">×</button>
            </span>
        `).join('');

        container.querySelectorAll('.drug-tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.interactionDrugs.splice(index, 1);
                this.renderInteractionTags(container);
            });
        });
    }

    clearInteractionDrugs(container) {
        this.interactionDrugs = [];
        this.renderInteractionTags(container);
        document.getElementById('interaction-results').style.display = 'none';
    }

    async checkInteractions() {
        if (this.interactionDrugs.length < 2) {
            alert('En az 2 ilaç eklemelisiniz.');
            return;
        }

        const resultsDiv = document.getElementById('interaction-results');
        const withAI = document.getElementById('interaction-ai-analysis')?.checked || false;

        resultsDiv.innerHTML = '<div class="pharmacy-loading"><div class="pharmacy-spinner"></div><span>Tüm kaynaklar kontrol ediliyor...</span></div>';
        resultsDiv.style.display = 'block';

        try {
            // Kapsamlı kontrol - hem yerel hem FDA hem RxNorm
            const result = await pharmacyService.comprehensiveCheck(this.interactionDrugs, {
                includeFda: true,
                includeRxNorm: true
            });

            let html = '';

            // Kaynak bilgisi başlık
            html += `<div style="background: var(--background-secondary); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
                <strong>📊 Veri Kaynakları:</strong> Farmakolojik Literatür, FDA (OpenFDA), RxNorm/DrugBank
            </div>`;

            // Yerel veritabanı sonuçları
            if (result.localDatabase) {
                html += '<h4 style="margin: 16px 0 8px; color: var(--text-secondary);">📚 Farmakolojik Literatür</h4>';
                html += this.renderInteractionSummary(result.localDatabase);

                if (result.localDatabase.interactions?.length > 0) {
                    html += result.localDatabase.interactions.map(i => this.renderInteractionCard(i)).join('');
                } else {
                    html += '<div class="pharmacy-result-card"><p>✅ Literatürde bilinen etkileşim bulunamadı.</p></div>';
                }
            }

            // RxNorm/DrugBank sonuçları
            if (result.rxNormInteractions?.found) {
                html += '<h4 style="margin: 20px 0 8px; color: var(--text-secondary);">🏛️ RxNorm/DrugBank</h4>';

                if (result.rxNormInteractions.interactions?.length > 0) {
                    html += result.rxNormInteractions.interactions.map(i => `
                        <div class="pharmacy-result-card severity-${i.severity?.toLowerCase() || 'moderate'}">
                            <div class="result-header">
                                <span class="result-drugs">${i.drug1 || '?'} + ${i.drug2 || '?'}</span>
                                <span class="result-severity">${i.severity || 'N/A'}</span>
                            </div>
                            <div class="result-mechanism">${i.description}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">Kaynak: ${i.source}</div>
                        </div>
                    `).join('');
                } else {
                    html += '<div class="pharmacy-result-card"><p>✅ RxNorm\'da bilinen etkileşim bulunamadı.</p></div>';
                }

                if (result.rxNormInteractions.notFound?.length > 0) {
                    html += `<div style="font-size: 12px; color: var(--text-tertiary); margin-top: 8px;">
                        ⚠️ RxNorm\'da bulunamayan ilaçlar: ${result.rxNormInteractions.notFound.join(', ')}
                    </div>`;
                }
            }

            // FDA verileri (ilk ilaç için)
            if (result.fdaData?.found && result.fdaData.drugs?.length > 0) {
                const fdaDrug = result.fdaData.drugs[0];
                html += '<h4 style="margin: 20px 0 8px; color: var(--text-secondary);">🇺🇸 FDA Etiket Bilgisi</h4>';
                html += `<div class="pharmacy-result-card">
                    <div><strong>${fdaDrug.brandName}</strong> (${fdaDrug.genericName})</div>
                    ${fdaDrug.drugInteractions ? `<div style="margin-top: 12px;"><strong>Etkileşimler:</strong><p style="font-size: 13px; margin-top: 4px;">${fdaDrug.drugInteractions.substring(0, 500)}...</p></div>` : ''}
                    ${fdaDrug.warnings ? `<div style="margin-top: 12px;"><strong>Uyarılar:</strong><p style="font-size: 13px; margin-top: 4px;">${fdaDrug.warnings.substring(0, 300)}...</p></div>` : ''}
                </div>`;
            }

            // AI analizi (opsiyonel)
            if (withAI && result.localDatabase?.interactions?.length > 0) {
                try {
                    const aiResult = await pharmacyService.checkDrugInteractions(this.interactionDrugs, true);
                    if (aiResult.aiAnalysis) {
                        html += `<div class="pharmacy-result-card" style="margin-top: 16px; border-left: 3px solid var(--accent-color);">
                            <h4 style="margin-bottom: 12px;">🤖 AI Analizi</h4>
                            <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${aiResult.aiAnalysis}</div>
                        </div>`;
                    }
                } catch (e) {
                    console.error('AI analysis error:', e);
                }
            }

            resultsDiv.innerHTML = html;
        } catch (error) {
            console.error('Interaction check error:', error);
            resultsDiv.innerHTML = '<div class="pharmacy-empty">Bağlantı hatası. Lütfen tekrar deneyin.</div>';
        }
    }

    renderInteractionSummary(result) {
        const riskClass = `risk-${result.overallRisk}`;
        const riskLabels = { critical: 'Kritik Risk', high: 'Yüksek Risk', moderate: 'Orta Risk', low: 'Düşük Risk' };
        const riskIcons = { critical: '⛔', high: '🔴', moderate: '🟠', low: '✅' };

        return `
            <div class="summary-card ${riskClass}">
                <div class="summary-icon">${riskIcons[result.overallRisk] || '❓'}</div>
                <div class="summary-text">
                    <div class="summary-title">${riskLabels[result.overallRisk] || 'Bilinmiyor'}</div>
                    <div class="summary-description">${result.summary}</div>
                </div>
            </div>
        `;
    }

    renderInteractionCard(interaction) {
        const severityLabels = { contraindicated: 'Kontraendike', serious: 'Ciddi', moderate: 'Orta', minor: 'Minör' };
        return `
            <div class="pharmacy-result-card severity-${interaction.severity}">
                <div class="result-header">
                    <span class="result-drugs">${interaction.pair.join(' + ')}</span>
                    <span class="result-severity">${severityLabels[interaction.severity] || interaction.severity}</span>
                </div>
                <div class="result-mechanism">${interaction.mechanism}</div>
                <div class="result-action">💡 ${interaction.action}</div>
            </div>
        `;
    }

    // ============= PREGNANCY MODAL =============
    bindPregnancyModal() {
        const modal = document.getElementById('pregnancy-modal');
        const overlay = document.getElementById('pregnancy-overlay');
        const closeBtn = document.getElementById('pregnancy-close');
        const checkBtn = document.getElementById('pregnancy-check');

        if (!modal) return;

        [overlay, closeBtn].forEach(el => {
            if (el) el.addEventListener('click', () => this.closeModal('pregnancy'));
        });

        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkPregnancy());
        }
    }

    async checkPregnancy() {
        const drug = document.getElementById('pregnancy-drug-input')?.value.trim();
        const trimester = document.getElementById('pregnancy-trimester')?.value;
        const resultsDiv = document.getElementById('pregnancy-results');

        if (!drug) {
            alert('Lütfen bir ilaç adı girin.');
            return;
        }

        resultsDiv.innerHTML = '<div class="pharmacy-loading"><div class="pharmacy-spinner"></div><span>Tüm kaynaklar kontrol ediliyor...</span></div>';
        resultsDiv.style.display = 'block';

        try {
            // Paralel olarak hem yerel hem FDA verilerini çek
            const [localResult, fdaResult] = await Promise.all([
                pharmacyService.checkPregnancySafety(drug, trimester),
                pharmacyService.getFdaPregnancy(drug)
            ]);

            let html = '';

            // Kaynak bilgisi başlık
            html += `<div style="background: var(--background-secondary); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
                <strong>📊 Veri Kaynakları:</strong> Farmakolojik Literatür, FDA (OpenFDA)
            </div>`;

            // Yerel veritabanı sonucu
            if (localResult.found) {
                html += '<h4 style="margin: 16px 0 8px; color: var(--text-secondary);">📚 Farmakolojik Literatür</h4>';
                html += `
                    <div class="pharmacy-result-card">
                        <div style="display: flex; align-items: center; margin-bottom: 16px;">
                            <span class="pregnancy-category cat-${localResult.category}">${localResult.category}</span>
                            <div>
                                <strong style="font-size: 16px;">${localResult.categoryInfo?.risk || 'Bilinmiyor'}</strong>
                                <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">${localResult.categoryInfo?.description || ''}</p>
                            </div>
                        </div>
                        ${localResult.trimesterNote ? `<p style="margin-bottom: 12px;"><strong>Trimester Notu:</strong> ${localResult.trimesterNote}</p>` : ''}
                        <p style="margin-bottom: 12px;"><strong>Notlar:</strong> ${localResult.notes || 'Bilgi yok'}</p>
                        <p style="margin-bottom: 12px;"><strong>Emzirme:</strong> ${localResult.lactationInfo?.description || 'Bilgi yok'}</p>
                        <div class="result-action">${localResult.recommendation || ''}</div>
                    </div>
                `;
            } else {
                html += '<h4 style="margin: 16px 0 8px; color: var(--text-secondary);">📚 Farmakolojik Literatür</h4>';
                html += `<div class="pharmacy-result-card"><p>⚠️ ${localResult.message || 'Literatürde veri bulunamadı.'}</p></div>`;
            }

            // FDA sonucu
            if (fdaResult.found) {
                html += '<h4 style="margin: 20px 0 8px; color: var(--text-secondary);">🇺🇸 FDA Prospektüs Bilgisi</h4>';
                html += `
                    <div class="pharmacy-result-card">
                        <div><strong>${fdaResult.brandName}</strong> (${fdaResult.drugName})</div>
                        ${fdaResult.pregnancy ? `<div style="margin-top: 12px;"><strong>Hamilelik:</strong><p style="font-size: 13px; margin-top: 4px; line-height: 1.5;">${fdaResult.pregnancy.substring(0, 600)}${fdaResult.pregnancy.length > 600 ? '...' : ''}</p></div>` : ''}
                        ${fdaResult.nursingMothers ? `<div style="margin-top: 12px;"><strong>Emziren Anneler:</strong><p style="font-size: 13px; margin-top: 4px; line-height: 1.5;">${fdaResult.nursingMothers.substring(0, 400)}${fdaResult.nursingMothers.length > 400 ? '...' : ''}</p></div>` : ''}
                        ${fdaResult.pediatricUse ? `<div style="margin-top: 12px;"><strong>Pediatrik Kullanım:</strong><p style="font-size: 13px; margin-top: 4px; line-height: 1.5;">${fdaResult.pediatricUse.substring(0, 300)}${fdaResult.pediatricUse.length > 300 ? '...' : ''}</p></div>` : ''}
                        <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 12px;">Kaynak: FDA Drug Label</div>
                    </div>
                `;
            } else {
                html += '<h4 style="margin: 20px 0 8px; color: var(--text-secondary);">🇺🇸 FDA Prospektüs Bilgisi</h4>';
                html += `<div class="pharmacy-result-card"><p>⚠️ FDA'da bu ilaç için hamilelik bilgisi bulunamadı.</p></div>`;
            }

            resultsDiv.innerHTML = html;
        } catch (error) {
            console.error('Pregnancy check error:', error);
            resultsDiv.innerHTML = '<div class="pharmacy-empty">Bağlantı hatası.</div>';
        }
    }

    // ============= DOSE MODAL =============
    bindDoseModal() {
        const modal = document.getElementById('dose-modal');
        const overlay = document.getElementById('dose-overlay');
        const closeBtn = document.getElementById('dose-close');
        const typeSelect = document.getElementById('dose-type');
        const calcBtn = document.getElementById('dose-calculate');

        if (!modal) return;

        [overlay, closeBtn].forEach(el => {
            if (el) el.addEventListener('click', () => this.closeModal('dose'));
        });

        if (typeSelect) {
            typeSelect.addEventListener('change', () => this.toggleDoseFields(typeSelect.value));
        }

        if (calcBtn) {
            calcBtn.addEventListener('click', () => this.calculateDose());
        }
    }

    toggleDoseFields(type) {
        document.getElementById('dose-pediatric-fields').style.display = type === 'pediatric' ? 'block' : 'none';
        document.getElementById('dose-renal-fields').style.display = type === 'renal' ? 'block' : 'none';
        document.getElementById('dose-hepatic-fields').style.display = type === 'hepatic' ? 'block' : 'none';
    }

    async calculateDose() {
        const type = document.getElementById('dose-type')?.value;
        const drug = document.getElementById('dose-drug-input')?.value.trim();
        const resultsDiv = document.getElementById('dose-results');

        if (!drug) {
            alert('Lütfen bir ilaç adı girin.');
            return;
        }

        resultsDiv.innerHTML = '<div class="pharmacy-loading"><div class="pharmacy-spinner"></div><span>Hesaplanıyor...</span></div>';
        resultsDiv.style.display = 'block';

        try {
            let result;

            if (type === 'pediatric') {
                const weight = parseFloat(document.getElementById('dose-weight')?.value);
                if (!weight) { alert('Vücut ağırlığı gerekli.'); return; }
                result = await pharmacyService.calculatePediatricDose(drug, weight);
            } else if (type === 'renal') {
                const crcl = parseFloat(document.getElementById('dose-crcl')?.value);
                if (!crcl) { alert('CrCl değeri gerekli.'); return; }
                result = await pharmacyService.calculateRenalDose(drug, { crCl: crcl });
            } else if (type === 'hepatic') {
                const childPugh = document.getElementById('dose-childpugh')?.value;
                result = await pharmacyService.calculateHepaticDose(drug, childPugh);
            }

            if (!result.found) {
                resultsDiv.innerHTML = `<div class="pharmacy-result-card"><p>⚠️ ${result.message}</p></div>`;
                return;
            }

            if (type === 'pediatric') {
                resultsDiv.innerHTML = `
                    <div class="dose-result">
                        <div class="dose-value">${result.adjustedDose} ${result.unit}</div>
                        <div class="dose-frequency">${result.frequency}</div>
                        <div class="dose-formula">${result.formula}</div>
                    </div>
                    ${result.notes ? `<p style="margin-top: 16px; text-align: center; color: var(--text-secondary);">${result.notes}</p>` : ''}
                `;
            } else {
                resultsDiv.innerHTML = `
                    <div class="pharmacy-result-card">
                        <h4 style="margin-bottom: 12px;">Doz Önerisi (${result.category || result.childPughClass})</h4>
                        <div class="result-action">${result.recommendation}</div>
                        ${result.notes ? `<p style="margin-top: 12px; color: var(--text-secondary);">${result.notes}</p>` : ''}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Dose calc error:', error);
            resultsDiv.innerHTML = '<div class="pharmacy-empty">Bağlantı hatası.</div>';
        }
    }

    // ============= AUTH MODAL =============
    bindAuthModal() {
        const modal = document.getElementById('auth-modal');
        const overlay = document.getElementById('auth-overlay');
        const closeBtn = document.getElementById('auth-close');
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');
        const loginSubmit = document.getElementById('login-submit');
        const registerSubmit = document.getElementById('register-submit');

        if (!modal) return;

        [overlay, closeBtn].forEach(el => {
            if (el) el.addEventListener('click', () => this.closeModal('auth'));
        });

        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('register-form').style.display = 'block';
                document.getElementById('auth-modal-title').textContent = 'Kayıt Ol';
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('register-form').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('auth-modal-title').textContent = 'Giriş Yap';
            });
        }

        if (loginSubmit) {
            loginSubmit.addEventListener('click', () => this.handleLogin());
        }

        if (registerSubmit) {
            registerSubmit.addEventListener('click', () => this.handleRegister());
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value;
        const errorDiv = document.getElementById('login-error');

        if (!email || !password) {
            errorDiv.textContent = 'Email ve şifre gerekli.';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const result = await authService.login(email, password);
            if (result.success) {
                this.closeModal('auth');
                window.location.reload();
            } else {
                errorDiv.textContent = result.message;
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Bağlantı hatası.';
            errorDiv.style.display = 'block';
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name')?.value.trim();
        const email = document.getElementById('register-email')?.value.trim();
        const password = document.getElementById('register-password')?.value;
        const errorDiv = document.getElementById('register-error');

        if (!name || !email || !password) {
            errorDiv.textContent = 'Tüm alanlar gerekli.';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const result = await authService.register(email, password, name);
            if (result.success) {
                this.closeModal('auth');
                window.location.reload();
            } else {
                errorDiv.textContent = result.message;
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Bağlantı hatası.';
            errorDiv.style.display = 'block';
        }
    }

    // ============= MODAL CONTROLS =============
    openModal(modalName) {
        const modal = document.getElementById(`${modalName}-modal`);
        if (modal) modal.classList.add('show');
    }

    closeModal(modalName) {
        const modal = document.getElementById(`${modalName}-modal`);
        if (modal) modal.classList.remove('show');
    }

    // ============= ICD-10 MODAL =============
    bindIcd10Modal() {
        const modal = document.getElementById('icd10-modal');
        const overlay = document.getElementById('icd10-overlay');
        const closeBtn = document.getElementById('icd10-close');
        const searchBtn = document.getElementById('icd10-search-btn');
        const input = document.getElementById('icd10-search-input');

        if (!modal) return;

        [overlay, closeBtn].forEach(el => {
            if (el) el.addEventListener('click', () => this.closeModal('icd10'));
        });

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchIcd10());
        }

        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchIcd10();
            });
        }
    }

    async searchIcd10() {
        const query = document.getElementById('icd10-search-input')?.value.trim();
        const resultsDiv = document.getElementById('icd10-results');

        if (!query) {
            alert('Lütfen bir hastalık adı veya ICD-10 kodu girin.');
            return;
        }

        resultsDiv.innerHTML = '<div class="pharmacy-loading"><div class="pharmacy-spinner"></div><span>Aranıyor...</span></div>';
        resultsDiv.style.display = 'block';

        try {
            const result = await pharmacyService.searchICD10(query);

            if (!result.found || result.count === 0) {
                resultsDiv.innerHTML = '<div class="pharmacy-result-card"><p>⚠️ Sonuç bulunamadı.</p></div>';
                return;
            }

            let html = `<div style="margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
                ${result.count} sonuç bulundu
            </div>`;

            result.results.forEach(item => {
                html += `
                    <div class="pharmacy-result-card">
                        <div class="result-header">
                            <span class="result-drugs">${item.code}</span>
                            <span class="result-severity" style="background: var(--accent-color);">${item.category}</span>
                        </div>
                        <div style="font-weight: 600; margin: 8px 0;">${item.name}</div>
                        ${item.relatedDrugs?.length > 0 ? `
                            <div style="margin-top: 12px;">
                                <strong>İlgili İlaçlar:</strong>
                                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
                                    ${item.relatedDrugs.map(d => `<span class="drug-tag">${d}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            resultsDiv.innerHTML = html;
        } catch (error) {
            console.error('ICD-10 search error:', error);
            resultsDiv.innerHTML = '<div class="pharmacy-empty">Bağlantı hatası.</div>';
        }
    }

    // ============= TİTCK MODAL =============
    bindTitckModal() {
        const modal = document.getElementById('titck-modal');
        const overlay = document.getElementById('titck-overlay');
        const closeBtn = document.getElementById('titck-close');
        const searchBtn = document.getElementById('titck-search-btn');
        const sgkBtn = document.getElementById('titck-sgk-btn');
        const input = document.getElementById('titck-search-input');

        if (!modal) return;

        [overlay, closeBtn].forEach(el => {
            if (el) el.addEventListener('click', () => this.closeModal('titck'));
        });

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchTitck());
        }

        if (sgkBtn) {
            sgkBtn.addEventListener('click', () => this.showSgkDrugs());
        }

        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchTitck();
            });
        }
    }

    async searchTitck() {
        const query = document.getElementById('titck-search-input')?.value.trim();
        const resultsDiv = document.getElementById('titck-results');

        if (!query) {
            alert('Lütfen bir ilaç adı girin.');
            return;
        }

        resultsDiv.innerHTML = '<div class="pharmacy-loading"><div class="pharmacy-spinner"></div><span>Aranıyor...</span></div>';
        resultsDiv.style.display = 'block';

        try {
            const result = await pharmacyService.getTurkishDrugDetails(query);

            if (!result.found) {
                resultsDiv.innerHTML = '<div class="pharmacy-result-card"><p>⚠️ İlaç bulunamadı.</p></div>';
                return;
            }

            resultsDiv.innerHTML = `
                <div class="pharmacy-result-card">
                    <div class="result-header">
                        <span class="result-drugs">${result.name}</span>
                        <span class="result-severity" style="background: ${result.prescription ? '#ef4444' : '#22c55e'};">
                            ${result.prescription ? 'Reçeteli' : 'OTC'}
                        </span>
                    </div>
                    <div style="margin: 12px 0;">
                        <strong>Ticari İsimler:</strong> ${result.brandNames?.join(', ') || 'Bilinmiyor'}
                    </div>
                    <div style="margin: 8px 0;">
                        <strong>Etken Madde:</strong> ${result.activeIngredient || 'Bilinmiyor'}
                    </div>
                    <div style="margin: 8px 0;">
                        <strong>Form:</strong> ${result.form || 'Bilinmiyor'}
                    </div>
                    <div style="margin: 8px 0;">
                        <strong>ATC Kodu:</strong> ${result.atcCode || 'Bilinmiyor'}
                    </div>
                    <div style="margin: 8px 0;">
                        <strong>Endikasyon:</strong> ${result.indication || 'Bilinmiyor'}
                    </div>
                    ${result.reimbursed ? '<div style="margin: 12px 0; padding: 8px; background: #22c55e20; border-radius: 6px; color: #22c55e;">✅ SGK tarafından ödenir</div>' : '<div style="margin: 12px 0; padding: 8px; background: #ef444420; border-radius: 6px; color: #ef4444;">❌ SGK kapsamı dışında</div>'}
                    ${result.turkishNotes ? `<div class="result-action">${result.turkishNotes}</div>` : ''}
                    ${result.warnings?.length > 0 ? `
                        <div style="margin-top: 12px;">
                            <strong>Uyarılar:</strong>
                            <ul style="margin: 6px 0; padding-left: 20px;">
                                ${result.warnings.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            console.error('TİTCK search error:', error);
            resultsDiv.innerHTML = '<div class="pharmacy-empty">Bağlantı hatası.</div>';
        }
    }

    async showSgkDrugs() {
        const resultsDiv = document.getElementById('titck-results');

        resultsDiv.innerHTML = '<div class="pharmacy-loading"><div class="pharmacy-spinner"></div><span>SGK listesi yükleniyor...</span></div>';
        resultsDiv.style.display = 'block';

        try {
            const result = await pharmacyService.getReimbursedDrugs();

            if (!result.found || result.count === 0) {
                resultsDiv.innerHTML = '<div class="pharmacy-result-card"><p>⚠️ Liste yüklenemedi.</p></div>';
                return;
            }

            let html = `<div style="margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
                ${result.count} SGK'lı ilaç bulundu
            </div>`;

            result.results.forEach(drug => {
                html += `
                    <div class="pharmacy-result-card" style="margin-bottom: 8px; padding: 12px;">
                        <strong>${drug.name}</strong>
                        <span style="font-size: 12px; color: var(--text-secondary);"> - ${drug.brandNames?.[0] || ''}</span>
                    </div>
                `;
            });

            resultsDiv.innerHTML = html;
        } catch (error) {
            console.error('SGK list error:', error);
            resultsDiv.innerHTML = '<div class="pharmacy-empty">Bağlantı hatası.</div>';
        }
    }
}

// Export singleton instance
const pharmacyModals = new PharmacyModals();
export default pharmacyModals;

// Expose global functions for easy access
window.openPharmacyModal = (name) => pharmacyModals.openModal(name);
window.closePharmacyModal = (name) => pharmacyModals.closeModal(name);

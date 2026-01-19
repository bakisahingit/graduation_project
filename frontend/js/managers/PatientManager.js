/**
 * Patient Manager
 * Hasta profillerini yönetir (LocalStorage tabanlı MVP)
 */
import { DOMUtils } from '../utils/dom.js';

export class PatientManager {
    constructor(app) {
        this.app = app;
        this.patients = this.loadPatients();
        this.currentPatient = null;
    }

    init() {
        this.renderSidebarButton();
        this.setupModal();
    }

    loadPatients() {
        const data = localStorage.getItem('admet_patients');
        return data ? JSON.parse(data) : [];
    }

    savePatients() {
        localStorage.setItem('admet_patients', JSON.stringify(this.patients));
        this.renderPatientList();
    }

    addPatient(patientData) {
        const newPatient = {
            id: Date.now().toString(),
            name: patientData.name,
            age: patientData.age,
            gender: patientData.gender,
            conditions: patientData.conditions ? patientData.conditions.split(',') : [],
            medications: patientData.medications ? patientData.medications.split(',') : [], // Split by comma
            createdAt: new Date().toISOString()
        };
        this.patients.push(newPatient);
        this.savePatients();
        this.selectPatient(newPatient.id);
        return newPatient;
    }

    selectPatient(id) {
        this.currentPatient = this.patients.find(p => p.id === id);
        this.updateUI();
        // Notify user or update Chat Context
        if (this.currentPatient) {
            console.log(`Patient selected: ${this.currentPatient.name}`);
            // In a full implementation, we would inject this context into the Chat System
        }
    }

    deletePatient(id) {
        this.patients = this.patients.filter(p => p.id !== id);
        if (this.currentPatient && this.currentPatient.id === id) {
            this.currentPatient = null;
        }
        this.savePatients();
        this.updateUI();
    }

    // --- UI Rendering ---

    renderSidebarButton() {
        // Inject into Sidebar Actions (below New Chat)
        const actions = document.querySelector('.sidebar-actions');
        if (!actions) return;

        // Check if already exists
        if (actions.querySelector('.patient-btn')) return;

        const btn = DOMUtils.create('button', {
            className: 'new-chat-btn patient-btn', // Reuse New Chat pill style
            title: 'Hasta Profilleri'
        });

        // Add specific style for stacking
        btn.style.marginTop = '8px';

        btn.innerHTML = `
            <i class="fa-solid fa-users"></i>
            <span class="btn-text">Hasta Profilleri</span>
        `;

        DOMUtils.on(btn, 'click', () => this.openModal());
        actions.appendChild(btn);
    }

    setupModal() {
        // Create Modal HTML dynamically if not exists (or we can add to index.html)
        // For this MVP, I'll inject it.
        if (document.getElementById('patient-modal')) return;

        const modalHtml = `
            <div id="patient-modal-overlay" class="modal-overlay"></div>
            <div class="modal-content settings-content">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fa-solid fa-bed-pulse"></i> Hasta Yönetimi</h3>
                    <button id="patient-close" class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="patient-actions" style="display:flex; flex-direction: column; gap:10px; margin-bottom:15px;">
                        <input type="text" id="new-patient-name" placeholder="Ad Soyad" class="models-search">
                        <div style="display: flex; gap: 10px;">
                             <input type="number" id="new-patient-age" placeholder="Yaş" class="models-search" style="flex: 1;">
                             <select id="new-patient-gender" class="models-search" style="flex: 1;">
                                <option value="">Cinsiyet Seçiniz</option>
                                <option value="Erkek">Erkek</option>
                                <option value="Kadın">Kadın</option>
                             </select>
                        </div>
                        <input type="text" id="new-patient-conditions" placeholder="Kronik Rahatsızlıklar (örn: Diyabet, Tansiyon)" class="models-search">
                        <input type="text" id="new-patient-medications" placeholder="Kullandığı İlaçlar (örn: Metformin)" class="models-search">
                        <button id="add-patient-btn" class="model-switch active" style="width:100%; border-radius:8px; margin-top: 5px;">Hasta Ekle</button>
                    </div>
                    <div id="patient-list" class="models-list" style="max-height: 400px;">
                        <!-- List here -->
                    </div>
                </div>
            </div>
        `;

        const modalContainer = DOMUtils.create('div', {
            id: 'patient-modal',
            className: 'modal'
        });
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // Events
        DOMUtils.on(document.getElementById('patient-close'), 'click', () => this.closeModal());
        DOMUtils.on(document.getElementById('patient-modal-overlay'), 'click', () => this.closeModal());

        DOMUtils.on(document.getElementById('add-patient-btn'), 'click', () => {
            const name = document.getElementById('new-patient-name').value;
            const age = document.getElementById('new-patient-age').value;
            const gender = document.getElementById('new-patient-gender').value;
            const conditions = document.getElementById('new-patient-conditions').value;
            const medications = document.getElementById('new-patient-medications').value;

            if (name) {
                this.addPatient({ name, age, gender, conditions, medications });
                // Clear inputs
                ['name', 'age', 'gender', 'conditions', 'medications'].forEach(id => {
                    document.getElementById('new-patient-' + id).value = '';
                });
            }
        });
    }

    renderPatientList() {
        const list = document.getElementById('patient-list');
        if (!list) return;
        list.innerHTML = '';

        if (this.patients.length === 0) {
            list.innerHTML = '<div class="empty-state">Henüz hasta kaydı yok.</div>';
            return;
        }

        this.patients.forEach(p => {
            const el = DOMUtils.create('div', { className: 'theme-option-content' }); // Reusing style
            el.style.flexDirection = 'row';
            el.style.justifyContent = 'space-between';
            el.style.marginBottom = '8px';
            el.style.cursor = 'pointer';

            if (this.currentPatient && this.currentPatient.id === p.id) {
                el.style.borderColor = 'var(--primary)';
                el.style.backgroundColor = 'var(--bg-glass-hover)';
            }

            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar" style="width:32px; height:32px; background:var(--primary-dark); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;">${p.name.charAt(0)}</div>
                    <div>
                        <div style="font-weight:600; color:var(--gray-100)">${p.name}</div>
                        <div style="font-size:12px; color:var(--gray-400)">${p.age ? p.age + ' Yaş' : ''}</div>
                    </div>
                </div>
                <button class="settings-nav-btn delete-p-btn" data-id="${p.id}" style="color:var(--error); border-color:var(--error);"><i class="fa-solid fa-trash"></i></button>
            `;

            DOMUtils.on(el, 'click', (e) => {
                if (!e.target.closest('.delete-p-btn')) {
                    this.selectPatient(p.id);
                }
            });

            const delBtn = el.querySelector('.delete-p-btn');
            DOMUtils.on(delBtn, 'click', (e) => {
                e.stopPropagation();
                if (confirm('Bu hasta kaydını silmek istediğinize emin misiniz?')) {
                    this.deletePatient(p.id);
                }
            });

            list.appendChild(el);
        });
    }

    openModal() {
        const modal = document.getElementById('patient-modal');
        if (modal) {
            DOMUtils.addClass(modal, 'open');
            this.renderPatientList();
        }
    }

    closeModal() {
        const modal = document.getElementById('patient-modal');
        if (modal) DOMUtils.removeClass(modal, 'open');
    }

    updateUI() {
        this.renderPatientList();
        // Update a global indicator if needed
    }
}

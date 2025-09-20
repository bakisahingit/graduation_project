# 🚀 Bitirme Projesi - Sprint 1 ToDo Listesi
## 📅 **Tarih: 16-23 Eylül 2024**

---

## 👥 **Ekip Üyeleri**
- **Baki** (Molekül Yapısı Branch)
- **Çağrı** (AdmedLab API Entegrasyonu)

---

## 🎯 **SPRINT 1 HEDEFLERİ**
Bu sprint'te molekül çizim sistemi ve AdmedLab API entegrasyonu tamamlanacak.

---

## 👨‍💻 **BAKİ'NİN GÖREVLERİ**

### 🎨 **UI/UX İyileştirmeleri**
- [x] **Molekül Yapısı Butonu Geliştirme** ✅ **TAMAMLANDI**
  - [x] Buton tasarımını daha estetik hale getir ✅
  - [x] Hover ve active state'leri ekle ✅
  - [x] İkon ve metin düzenlemesi ✅
  - [x] Responsive tasarım optimizasyonu ✅
  - [x] Animasyon efektleri ekle ✅

### 💬 **LLM Entegrasyonu - Molekül İstekleri**
- [ ] **Molekül İstek Paneli Oluşturma**
  - [ ] Panel tasarımı ve layout
  - [ ] Input alanı (molekül ismi girişi)
  - [ ] "Molekül İste" butonu
  - [ ] Loading state gösterimi
  - [ ] Error handling

- [ ] **LLM API Entegrasyonu**
  - [ ] Mevcut chat API'sini kullanarak molekül istekleri
  - [ ] Prompt engineering (SMILES format isteği)
  - [ ] Response parsing (SMILES formatını ayıklama)
  - [ ] SMILES formatını otomatik olarak input'a yazma

### 🧪 **Molekül Çizim Sistemi**
- [ ] **SMILES Format Entegrasyonu**
  - [ ] SMILES string'ini mevcut çizim sistemine entegre et
  - [ ] Otomatik molekül çizimi
  - [ ] Çizim kalitesi optimizasyonu
  - [ ] Hata durumları için fallback

- [ ] **Sohbete Aktarma Sistemi**
  - [ ] "Sohbete Ekle" butonu
  - [ ] Molekül görselini sohbet mesajı olarak gönderme
  - [ ] Estetik mesaj formatı
  - [ ] Molekül bilgilerini mesajla birlikte gönderme

### 🔧 **Teknik Geliştirmeler**
- [ ] **Kod Optimizasyonu**
  - [ ] Molekül bileşenini refactor et
  - [ ] Performance optimizasyonu
  - [ ] Memory leak kontrolü
  - [ ] Error boundary'ler ekle

- [ ] **Test ve Kalite**
  - [ ] Molekül çizim fonksiyonlarını test et
  - [ ] UI bileşenlerini test et
  - [ ] Cross-browser compatibility kontrolü

---

## 👨‍💻 **ÇAĞRI'NIN GÖREVLERİ**

### 🔗 **AdmedLab API Entegrasyonu**
- [ ] **API Araştırma ve Dokümantasyon**
  - [ ] AdmedLab API dokümantasyonunu incele
  - [ ] API endpoint'lerini belirle
  - [ ] Authentication yöntemini öğren
  - [ ] Rate limit ve kullanım kısıtlamalarını araştır

- [ ] **Backend API Geliştirme**
  - [ ] AdmedLab API wrapper oluştur
  - [ ] Molekül analizi endpoint'i
  - [ ] Error handling ve retry logic
  - [ ] API key yönetimi
  - [ ] Response caching sistemi

### 🤖 **LLM Rapor Sistemi**
- [ ] **Rapor Oluşturma API'si**
  - [ ] AdmedLab response'unu LLM'e gönderme
  - [ ] Rapor formatı prompt'u oluşturma
  - [ ] Markdown formatında rapor üretme
  - [ ] Rapor kalitesi optimizasyonu

- [ ] **Frontend Entegrasyonu**
  - [ ] Rapor görüntüleme bileşeni
  - [ ] Markdown render sistemi
  - [ ] Rapor kaydetme özelliği
  - [ ] Rapor paylaşma özelliği

### 🔧 **Backend Altyapı**
- [ ] **Veritabanı Entegrasyonu**
  - [ ] MongoDB/PostgreSQL kurulumu
  - [ ] Molekül verilerini saklama
  - [ ] Rapor geçmişini saklama
  - [ ] User session yönetimi

- [ ] **API Güvenliği**
  - [ ] Rate limiting
  - [ ] Input validation
  - [ ] CORS konfigürasyonu
  - [ ] Error logging

---

## 🔄 **ORTAK GÖREVLER**

### 🤝 **Entegrasyon ve Test**
- [ ] **API Entegrasyonu**
  - [ ] Frontend-Backend API bağlantısı
  - [ ] End-to-end test senaryoları
  - [ ] Error handling koordinasyonu
  - [ ] Performance testleri

### 📋 **Proje Yönetimi**
- [ ] **Günlük Standup**
  - [ ] Her gün 15 dakika toplantı
  - [ ] İlerleme raporu
  - [ ] Blocker'ları belirleme
  - [ ] Görev koordinasyonu

- [ ] **Code Review**
  - [ ] Her commit'i review etme
  - [ ] Code quality kontrolü
  - [ ] Best practice'leri uygulama
  - [ ] Git workflow'u takip etme

---

## 📊 **SPRINT 1 HEDEFLERİ**

### ✅ **Tamamlanması Gerekenler**
1. **Molekül Yapısı Butonu** - Estetik ve kullanışlı hale getirildi
2. **LLM Molekül İstek Sistemi** - "Etanol çiz" gibi istekler çalışıyor
3. **SMILES Format Entegrasyonu** - Otomatik molekül çizimi
4. **Sohbete Aktarma** - Moleküller sohbette estetik görünüyor
5. **AdmedLab API Entegrasyonu** - Molekül analizi çalışıyor
6. **LLM Rapor Sistemi** - Analiz sonuçları rapor olarak sunuluyor

### 🎯 **Başarı Kriterleri**
- [ ] Kullanıcı "etanol çiz" dediğinde molekül otomatik çiziliyor
- [ ] Çizilen molekül sohbete estetik şekilde ekleniyor
- [ ] AdmedLab API'den gelen analiz sonuçları rapor halinde sunuluyor
- [ ] Tüm sistem stabil çalışıyor
- [ ] UI/UX kullanıcı dostu

---

## 🚨 **KRİTİK GÖREVLER**

### 🔥 **Yüksek Öncelik**
1. **Baki**: Molekül Yapısı Butonu UI iyileştirmesi
2. **Çağrı**: AdmedLab API dokümantasyonu ve entegrasyonu
3. **Ortak**: API entegrasyonu ve test

### ⚡ **Orta Öncelik**
1. **Baki**: LLM molekül istek sistemi
2. **Çağrı**: LLM rapor sistemi
3. **Ortak**: End-to-end testler

---

## 📞 **İLETİŞİM**

- **Günlük Standup**: Her gün saat 10:00
- **Slack/Discord**: Sürekli iletişim
- **Code Review**: Her commit sonrası
- **Sprint Review**: 23 Eylül

---

---

## 🎉 **GÜNCELLEME NOTLARI**

### ✅ **Tamamlanan Görevler (Son Güncelleme: 20.09.2025)**
- **UI/UX İyileştirmeleri**: Molekül Yapısı Butonu Geliştirme tamamen tamamlandı
  - Sade ve şık buton tasarımı
  - Gelişmiş hover/active/focus/disabled state'ler
  - Optimize edilmiş ikon ve metin düzenlemesi
  - Kapsamlı responsive tasarım (5 breakpoint)
  - Smooth animasyonlar ve micro-interactions
  - Loading, pulse ve ripple efektleri

### 📊 **İlerleme Durumu**
- **UI/UX İyileştirmeleri**: %100 ✅
- **LLM Entegrasyonu**: %0 ⏳
- **Molekül Çizim Sistemi**: %0 ⏳
- **Teknik Geliştirmeler**: %0 ⏳

---

*Son güncelleme: 20 Eylül 2025*
*Sprint durumu: UI/UX iyileştirmeleri tamamlandı*
*Hedef tarih: 23 Eylül 2025*

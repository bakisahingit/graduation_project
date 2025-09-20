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

### ✅ **Tamamlanan Görevler (Son Güncelleme: 20.12.2024)**
- **UI/UX İyileştirmeleri**: Molekül Yapısı Butonu Geliştirme tamamen tamamlandı
  - Sade ve şık buton tasarımı
  - Gelişmiş hover/active/focus/disabled state'ler
  - Optimize edilmiş ikon ve metin düzenlemesi
  - Kapsamlı responsive tasarım (5 breakpoint)
  - Smooth animasyonlar ve micro-interactions
  - Loading, pulse ve ripple efektleri

- **Input Wrapper Güncellemeleri**: Model seçme ve molekül çiz butonları eklendi
  - Input wrapper'a model seçme butonu eklendi (gönder butonunun solunda)
  - Model seçme dropdown paneli eklendi (scroll özellikli)
  - Model ekle butonu dropdown panelinin altına eklendi
  - Molekül çiz butonu "+" panelinden input wrapper'a taşındı
  - Sidebar'daki model seçme ve molekül çiz butonları kaldırıldı
  - Welcome ve chat ekranları arasında model seçimi senkronizasyonu
  - Tüm butonlar transparent tasarım ile güncellendi
  - Hover efektleri ve glass effect'ler eklendi
  - Responsive tasarım güncellemeleri

### 📊 **İlerleme Durumu**
- **UI/UX İyileştirmeleri**: %100 ✅
- **Input Wrapper Güncellemeleri**: %100 ✅
- **LLM Entegrasyonu**: %0 ⏳
- **Molekül Çizim Sistemi**: %0 ⏳
- **Teknik Geliştirmeler**: %0 ⏳

---

## 🚀 **YENİ GÖREVLER - SPRINT 2**

### 🎯 **Öncelikli Görevler**

#### 🗑️ **Konuşma Geçmişi İyileştirmeleri**
- [ ] **Konuşma Silme Butonları Güncelleme**
  - [ ] Mevcut silme butonlarının tasarımını iyileştir
  - [ ] Hover efektleri ve animasyonlar ekle
  - [ ] Onay dialog'u ekle (yanlışlıkla silmeyi önle)
  - [ ] Bulk delete özelliği (çoklu seçim)
  - [ ] Responsive tasarım optimizasyonu

#### 🧪 **Molekül Çizme Paneli Güncelleme**
- [ ] **Panel Tasarım İyileştirmeleri**
  - [ ] Modern ve kullanıcı dostu arayüz
  - [ ] Daha iyi molekül görüntüleme
  - [ ] Zoom ve pan özellikleri
  - [ ] Molekül bilgileri paneli
  - [ ] Export özellikleri (PNG, SVG)

- [ ] **Chat LLM Entegrasyonu**
  - [ ] Molekül çizme panelinde chat LLM ekle
  - [ ] Sadece sohbet yolu ile molekül çizdirme
  - [ ] "Bu molekülü çiz" gibi doğal dil komutları
  - [ ] Molekül açıklama ve bilgi alma
  - [ ] Interactive molekül düzenleme

#### ⚙️ **Model Seçimi İyileştirmeleri**
- [ ] **Model Seçimi Kalıcılığı**
  - [ ] Model seçimini localStorage'da sakla
  - [ ] Sayfa yenilendiğinde son seçilen modeli koru
  - [ ] Default model yerine kullanıcı tercihini öncelikle
  - [ ] Model geçmişi (son kullanılan modeller)
  - [ ] Favori modeller sistemi

- [ ] **Model Seçme Paneli Güncelleme**
  - [ ] Panel açılış yönünü yukarı yap
  - [ ] Daha iyi görsel hiyerarşi
  - [ ] Model kategorileri (GPT, Claude, vs.)
  - [ ] Model özellik bilgileri
  - [ ] Arama ve filtreleme özelliği

#### 🐛 **Hata Düzeltmeleri**
- [ ] **Bad Request Hatası Çözümü**
  - [ ] Modeller ile konuşurken alınan bad request hatalarını analiz et
  - [ ] API request formatını kontrol et
  - [ ] Error handling iyileştirmeleri
  - [ ] Retry mekanizması ekle
  - [ ] Kullanıcı dostu hata mesajları

#### 📁 **Dosya ve Molekül Ekleme İyileştirmeleri**
- [ ] **Input Wrapper Üst Kısmı Görüntüleme**
  - [ ] Dosya ekleme durumunda güzel görüntüleme
  - [ ] Molekül çizme durumunda güzel görüntüleme
  - [ ] Progress indicator'lar
  - [ ] Preview özellikleri
  - [ ] Drag & drop desteği

#### ⚙️ **Ayarlar Optimizasyonu**
- [ ] **Modeller Seçeneği İyileştirmeleri**
  - [ ] Model yönetimi arayüzü iyileştirme
  - [ ] Model ekleme/çıkarma sürecini optimize et
  - [ ] Model test özelliği
  - [ ] Model performans metrikleri
  - [ ] Model karşılaştırma özelliği

### 📋 **Görev Öncelik Sırası**
1. **Model Seçimi Kalıcılığı** (Yüksek Öncelik)
2. **Bad Request Hatası Çözümü** (Yüksek Öncelik)
3. **Model Seçme Paneli Yukarı Açılış** (Orta Öncelik)
4. **Konuşma Geçmişi Silme Butonları** (Orta Öncelik)
5. **Dosya/Molekül Ekleme Görüntüleme** (Orta Öncelik)
6. **Molekül Çizme Paneli Güncelleme** (Düşük Öncelik)
7. **Chat LLM Entegrasyonu** (Düşük Öncelik)
8. **Ayarlar Optimizasyonu** (Düşük Öncelik)

---

*Son güncelleme: 20 Aralık 2024*
*Sprint durumu: Input wrapper güncellemeleri tamamlandı*
*Yeni hedef: Sprint 2 görevleri başlatıldı*

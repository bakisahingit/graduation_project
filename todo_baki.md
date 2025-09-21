# TODO BAKI - Kişisel Takip Listesi

## 📋 Aktif TODO'lar

### 21.09.2025 - Eklenen TODO'lar

#### 🧪 Molekül Çizme Paneli Güncelleme
- [ ] **Molekül Rapor Sistemi**
  - [ ] Molekül ekleme paneline LLM isteği eklenecek
  - [ ] LLM isteği ile beraber molekül yapısı hakkında rapor paneli
  - [ ] Panelin sağ veya sol tarafında molekül bilgileri gösterilecek
  - [ ] Molekül yapısı hakkında detaylı bilgiler yazılacak
  - [ ] LLM entegrasyonu ile molekül analizi

### 20.09.2025 - Eklenen TODO'lar

#### 🗑️ Konuşma Geçmişi İyileştirmeleri
- [x] **Konuşma Geçmişi UI/UX İyileştirmeleri** ✅ **TAMAMLANDI**
  - [x] Konuşma geçmişi butonlarını şeffaf yapıldı, hover efektleri eklendi ✅
  - [x] Tarih bilgileri kaldırıldı, başlık fontları optimize edildi ✅
  - [x] X butonu yerine üç nokta (ellipsis) SVG butonu eklendi ✅
  - [x] Context menu sistemi eklendi (Pin, Rename, Delete) ✅
  - [x] Pin/Unpin fonksiyonalitesi eklendi, ayrı Pinned bölümü oluşturuldu ✅
  - [x] Inline rename özelliği eklendi, buton boyutu sabit kalıyor ✅
  - [x] Konuşma başlıkları tek satırda ellipsis ile kesiliyor ✅
  - [x] Estetik şeffaf scrollbar tasarımı eklendi ✅
  - [x] Flexbox layout ile responsive tasarım iyileştirildi ✅
  - [x] SVG iconlar currentColor ile dinamik renklendirme ✅

- [x] **Context Menu İyileştirmeleri**
  - [x] Üç nokta butonunda açılan paneli en aşağıdayken yukarı açılacak şekilde yapılacak
  - [x] Panel pozisyonlama algoritması iyileştirilecek
  - [x] Ekran sınırlarına göre otomatik yön değiştirme

- [ ] **Otomatik İsimlendirme Sistemi**
  - [ ] LLM'e istek atıp kısa bir sohbet için başlık isimlendirmesi istenecek
  - [ ] Yeni konuşma oluşturulduğunda otomatik başlık üretimi
  - [ ] Kullanıcı onayı ile başlık değiştirme seçeneği
  - [ ] Başlık üretimi için API entegrasyonu

#### 🧪 Molekül Çizme Paneli Güncelleme
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

#### ⚙️ Model Seçimi İyileştirmeleri
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

#### 🐛 Hata Düzeltmeleri
- [ ] **Bad Request Hatası Çözümü**
  - [ ] Modeller ile konuşurken alınan bad request hatalarını analiz et
  - [ ] API request formatını kontrol et
  - [ ] Error handling iyileştirmeleri
  - [ ] Retry mekanizması ekle
  - [ ] Kullanıcı dostu hata mesajları

#### 📁 Dosya ve Molekül Ekleme İyileştirmeleri
- [ ] **Input Wrapper Üst Kısmı Görüntüleme**
  - [ ] Dosya ekleme durumunda güzel görüntüleme
  - [ ] Molekül çizme durumunda güzel görüntüleme
  - [ ] Progress indicator'lar
  - [ ] Preview özellikleri
  - [ ] Drag & drop desteği

#### ⚙️ Ayarlar Optimizasyonu
- [ ] **Modeller Seçeneği İyileştirmeleri**
  - [ ] Model yönetimi arayüzü iyileştirme
  - [ ] Model ekleme/çıkarma sürecini optimize et
  - [ ] Model test özelliği
  - [ ] Model performans metrikleri
  - [ ] Model karşılaştırma özelliği

---

## ✅ Tamamlanan TODO'lar

### 21.09.2025 - Tamamlananlar
- [x] **Model Selection Panel Konumlandırma İyileştirmeleri** ✅ **TAMAMLANDI**
  - [x] Üç nokta butonunda açılan panelin akıllı konumlandırması (en aşağıdayken yukarı açılma) ✅
  - [x] Input wrapper model selection menüsünün akıllı konumlandırması ✅
  - [x] Welcome ekranında aşağı açılma, chat ekranında yukarı açılma ✅
  - [x] Ok simgesi yön düzeltmeleri (chat ekranında yukarı açılma için) ✅
  - [x] Panel z-index sorunları çözüldü ✅
  - [x] Sayfa scroll sorunları çözüldü (hiçbir koşulda scroll yapılmaması) ✅

- [x] **Chat Ekranı Layout İyileştirmeleri** ✅ **TAMAMLANDI**
  - [x] Sohbet penceresi ve input wrapper tek panel yapısı ✅
  - [x] Aralarındaki çizgi kaldırıldı, aynı arka plan rengi ✅
  - [x] Sohbet ekranı ile input alanı arasına güzel hafif çizgi eklendi ✅
  - [x] Çizgi tam genişlikte (sidebar'dan ekranın sağına kadar) ✅
  - [x] Model selection paneli yukarı açılabilir hale getirildi ✅

### 20.09.2025 - Tamamlananlar
- [x] **Molekül Yapısı Butonu Geliştirme** ✅ **TAMAMLANDI**
  - [x] Buton tasarımını daha estetik hale getir ✅
  - [x] Hover ve active state'leri ekle ✅
  - [x] İkon ve metin düzenlemesi ✅
  - [x] Responsive tasarım optimizasyonu ✅
  - [x] Animasyon efektleri ekle ✅

- [x] **Input Wrapper Güncellemeleri** ✅ **TAMAMLANDI**
  - [x] Input wrapper'a model seçme butonu eklendi (gönder butonunun solunda)
  - [x] Model seçme dropdown paneli eklendi (scroll özellikli)
  - [x] Model ekle butonu dropdown panelinin altına eklendi
  - [x] Molekül çiz butonu "+" panelinden input wrapper'a taşındı
  - [x] Sidebar'daki model seçme ve molekül çiz butonları kaldırıldı
  - [x] Welcome ve chat ekranları arasında model seçimi senkronizasyonu
  - [x] Tüm butonlar transparent tasarım ile güncellendi
  - [x] Hover efektleri ve glass effect'ler eklendi
  - [x] Responsive tasarım güncellemeleri

- [x] TODO sistemi oluşturuldu - 20.09.2025

---

## 📝 Güncellemeler

### 21.09.2025 - Arayüz İyileştirmeleri
- Model selection panel konumlandırma iyileştirmeleri tamamlandı
- Üç nokta butonunda açılan panelin akıllı konumlandırması eklendi
- Input wrapper model selection menüsünün akıllı konumlandırması eklendi
- Welcome ekranında aşağı açılma, chat ekranında yukarı açılma özelliği
- Ok simgesi yön düzeltmeleri (chat ekranında yukarı açılma için)
- Panel z-index sorunları çözüldü
- Sayfa scroll sorunları çözüldü (hiçbir koşulda scroll yapılmaması)
- Chat ekranı layout iyileştirmeleri tamamlandı
- Sohbet penceresi ve input wrapper tek panel yapısı
- Aralarındaki çizgi kaldırıldı, aynı arka plan rengi
- Sohbet ekranı ile input alanı arasına güzel hafif çizgi eklendi
- Çizgi tam genişlikte (sidebar'dan ekranın sağına kadar)
- Model selection paneli yukarı açılabilir hale getirildi

### 20.09.2025
- TODO takip sistemi oluşturuldu
- Basit markdown formatında yapılandırıldı
- Tarih bazlı takip sistemi eklendi
- TODO.md dosyasındaki Baki'ye ait görevler temiz bir şekilde aktarıldı
- Tamamlanan görevler ayrı bölüme taşındı
- Sadece seçilen yeni görevler aktif TODO listesine eklendi
- Diğer eski görevler kaldırıldı

### 20.09.2025 - Konuşma Geçmişi UI/UX İyileştirmeleri
- Konuşma geçmişi butonlarını şeffaf yapıldı, hover efektleri eklendi
- Tarih bilgileri kaldırıldı, başlık fontları optimize edildi
- X butonu yerine üç nokta (ellipsis) SVG butonu eklendi
- Context menu sistemi eklendi (Pin, Rename, Delete)
- Pin/Unpin fonksiyonalitesi eklendi, ayrı Pinned bölümü oluşturuldu
- Inline rename özelliği eklendi, buton boyutu sabit kalıyor
- Konuşma başlıkları tek satırda ellipsis ile kesiliyor
- Estetik şeffaf scrollbar tasarımı eklendi
- Flexbox layout ile responsive tasarım iyileştirildi
- SVG iconlar currentColor ile dinamik renklendirme
- Git commit: "feat: Konuşma geçmişi UI/UX iyileştirmeleri"

---

## 📊 İlerleme Durumu
- **UI/UX İyileştirmeleri**: %100 ✅
- **Input Wrapper Güncellemeleri**: %100 ✅
- **Model Selection Panel İyileştirmeleri**: %100 ✅
- **Chat Ekranı Layout İyileştirmeleri**: %100 ✅
- **Konuşma Geçmişi İyileştirmeleri**: %80 ⏳
- **Molekül Çizme Paneli Güncelleme**: %10 ⏳
- **Molekül Rapor Sistemi**: %0 ⏳
- **Model Seçimi İyileştirmeleri**: %0 ⏳
- **Hata Düzeltmeleri**: %0 ⏳
- **Dosya ve Molekül Ekleme İyileştirmeleri**: %0 ⏳
- **Ayarlar Optimizasyonu**: %0 ⏳

---

## 📌 Notlar
- Her yeni TODO eklerken tarih belirtin
- Tamamlanan TODO'ları "Tamamlanan TODO'lar" bölümüne taşıyın
- Güncellemeleri tarih bazlı olarak kaydedin
- Öncelik sırası: Model Seçimi Kalıcılığı > Bad Request Hatası > Model Seçme Paneli > Konuşma Geçmişi

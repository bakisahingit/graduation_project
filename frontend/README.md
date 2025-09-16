# Modüler Chat Uygulaması

Bu proje, modern JavaScript ES6 modülleri ve CSS modüler yapısı kullanılarak geliştirilmiş bir chat uygulamasıdır.

## 📁 Proje Yapısı

```
frontend/
├── css/
│   ├── base/
│   │   ├── variables.css      # CSS değişkenleri ve tema
│   │   └── reset.css          # CSS sıfırlama
│   ├── layouts/
│   │   ├── app.css            # Ana uygulama düzeni
│   │   └── sidebar.css        # Yan panel düzeni
│   ├── components/
│   │   ├── buttons.css        # Buton bileşenleri
│   │   ├── forms.css          # Form bileşenleri
│   │   ├── messages.css       # Mesaj bileşenleri
│   │   ├── history.css        # Geçmiş bileşenleri
│   │   └── modals.css         # Modal bileşenleri
│   └── main.css               # Ana CSS dosyası (tüm modülleri import eder)
├── js/
│   ├── utils/
│   │   ├── dom.js             # DOM yardımcı fonksiyonları
│   │   ├── storage.js         # LocalStorage yardımcı fonksiyonları
│   │   └── helpers.js         # Genel yardımcı fonksiyonlar
│   ├── services/
│   │   ├── api.js             # API servisi
│   │   ├── conversation.js    # Konuşma yönetimi servisi
│   │   └── model.js           # Model yönetimi servisi
│   ├── components/
│   │   ├── ui.js              # UI bileşeni
│   │   ├── markdown.js        # Markdown render bileşeni
│   │   └── molecule.js        # Molekül çizim bileşeni
│   └── main.js                # Ana uygulama dosyası
├── assets/                    # Statik dosyalar
├── index.html                 # Ana HTML dosyası
└── README.md                  # Bu dosya
```

## 🚀 Özellikler

### JavaScript Modülleri

#### Utils (Yardımcı Fonksiyonlar)
- **DOMUtils**: DOM manipülasyonu için yardımcı fonksiyonlar
- **StorageUtils**: LocalStorage işlemleri için yardımcı fonksiyonlar
- **HelperUtils**: Genel yardımcı fonksiyonlar (ID oluşturma, tarih formatlama, vb.)

#### Services (Servisler)
- **ApiService**: Backend API ile iletişim
- **ConversationService**: Konuşma geçmişi yönetimi
- **ModelService**: AI model yönetimi

#### Components (Bileşenler)
- **UIComponent**: Kullanıcı arayüzü yönetimi
- **MarkdownComponent**: Markdown render ve syntax highlighting
- **MoleculeComponent**: Molekül çizim ve görselleştirme

### CSS Modülleri

#### Base (Temel)
- **variables.css**: CSS değişkenleri, renk paleti, tipografi
- **reset.css**: CSS sıfırlama ve normalize

#### Layouts (Düzenler)
- **app.css**: Ana uygulama düzeni
- **sidebar.css**: Yan panel düzeni

#### Components (Bileşenler)
- **buttons.css**: Buton stilleri
- **forms.css**: Form stilleri
- **messages.css**: Mesaj stilleri
- **history.css**: Geçmiş stilleri
- **modals.css**: Modal stilleri

## 🛠️ Teknolojiler

- **ES6 Modules**: Modern JavaScript modül sistemi
- **CSS Custom Properties**: CSS değişkenleri
- **CSS Grid & Flexbox**: Modern CSS düzen sistemleri
- **Backdrop Filter**: Cam efekti
- **CSS Animations**: Smooth animasyonlar
- **Responsive Design**: Mobil uyumlu tasarım

## 📱 Responsive Tasarım

- **Desktop**: Tam özellikli arayüz
- **Tablet**: Optimize edilmiş düzen
- **Mobile**: Kompakt mobil arayüz

## 🎨 Tema Sistemi

CSS değişkenleri kullanılarak kolayca özelleştirilebilir tema sistemi:

```css
:root {
    --primary: #4fc3f7;
    --secondary: #4caf50;
    --bg: #0f1113;
    --accent: rgba(255,255,255,0.75);
    /* ... */
}
```

## 🔧 Geliştirme

### Yeni Bileşen Ekleme

1. **JavaScript Bileşeni**:
   ```javascript
   // js/components/yeni-bilesen.js
   export class YeniBilesen {
       constructor() {
           // Bileşen mantığı
       }
   }
   ```

2. **CSS Bileşeni**:
   ```css
   /* css/components/yeni-bilesen.css */
   .yeni-bilesen {
       /* Bileşen stilleri */
   }
   ```

3. **Import Etme**:
   ```javascript
   // main.js
   import { YeniBilesen } from './components/yeni-bilesen.js';
   ```

   ```css
   /* main.css */
   @import url('./components/yeni-bilesen.css');
   ```

### Yeni Servis Ekleme

```javascript
// js/services/yeni-servis.js
export class YeniServis {
    constructor() {
        // Servis mantığı
    }
}
```

## 📦 Modül Avantajları

1. **Organizasyon**: Kod daha düzenli ve bulunması kolay
2. **Yeniden Kullanılabilirlik**: Modüller başka projelerde kullanılabilir
3. **Bakım**: Her modül bağımsız olarak güncellenebilir
4. **Test Edilebilirlik**: Modüller ayrı ayrı test edilebilir
5. **Performans**: Sadece gerekli modüller yüklenir
6. **Takım Çalışması**: Farklı geliştiriciler farklı modüller üzerinde çalışabilir

## 🚀 Kullanım

1. Backend sunucusunu başlatın:
   ```bash
   cd backend
   node server.js
   ```

2. Frontend'i tarayıcıda açın:
   ```
   http://localhost:3000
   ```

## 📝 Notlar

- Tüm modüller ES6 import/export kullanır
- CSS modülleri @import ile birleştirilir
- Responsive tasarım mobile-first yaklaşımı kullanır
- Modern tarayıcı desteği gerekir (ES6 modules)


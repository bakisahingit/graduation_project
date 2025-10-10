# Havalı Chat Projesi

Eczacılar için molekül toksisite ve ADMET analiz asistanı.

## Proje Mimarisi

Bu proje, birkaç servisin bir arada çalıştığı bir mikroservis mimarisine sahiptir:

- **Frontend:** Kullanıcının etkileşimde bulunduğu web arayüzü. `backend` servisi tarafından statik olarak sunulur.
- **Backend:** Ana sunucu uygulaması (Node.js). API isteklerini karşılar, iş mantığını yönetir ve ağır hesaplama gerektiren görevleri `admet` worker'larına iletir.
- **Admet Worker:** ADMET analizleri gibi yoğun hesaplama gerektiren görevleri yerine getiren Python (Celery) worker'ları.
- **RabbitMQ:** `backend` ile `admet` worker'ları arasında bir mesaj kuyruğu görevi görür.
- **Redis:** Önbellekleme ve Celery backend'i için kullanılır.

## Kurulum ve Çalıştırma

Proje, Docker ve Docker Compose kullanılarak kolayca ayağa kaldırılabilir.

### Gereksinimler

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Çalıştırma Adımları

1.  Proje dosyalarını klonladıktan veya indirdikten sonra, projenin ana dizininde bir terminal açın.

2.  Aşağıdaki komutu çalıştırarak tüm servisleri başlatın:

    ```bash
    docker-compose up --build
    ```

    `--build` parametresi, imajları ilk kez oluştururken veya Dockerfile'larda bir değişiklik yaptığınızda gereklidir.

3.  Servisler başladıktan sonra, web tarayıcınızı açın ve aşağıdaki adrese gidin:

    [http://localhost:3000](http://localhost:3000)

Uygulama bu adreste çalışıyor olacaktır.

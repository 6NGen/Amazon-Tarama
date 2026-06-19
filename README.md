# Amazon-Tarama

Rainforest API üzerinden Amazon ürün araştırması yapan tek sayfalık web uygulaması.
Arama kelimesi, kategori ve "en çok satanlar" listelerini tarar; yıldız, yorum sayısı,
fiyat ve BSR'den tahmini aylık satış hesaplar; sonuçları filtrelenebilir bir tabloda
gösterir ve CSV olarak dışa aktarır.

## Mimari

- **`index.html`** — Tüm arayüz ve istemci mantığı (bağımlılık yok, saf JS).
- **`api/scan.js`** — Vercel Serverless Function. Rainforest API'ye giden güvenli proxy.
  API anahtarı yalnızca burada (ortam değişkeninde) tutulur, tarayıcıya asla inmez.
- **`vercel.json`** — Serverless fonksiyonun maksimum çalışma süresi ayarı.

İstemci → `/api/scan` → Rainforest API. CORS sorunu ve anahtar gizliliği backend'de çözülür.

## Kurulum (Vercel)

1. Bu repoyu Vercel'e bağla (Import Project).
2. **Settings → Environment Variables** bölümüne ekle:
   - `RAINFOREST_API_KEY` — Rainforest API anahtarın (zorunlu).
   - `ALLOWED_ORIGIN` — (opsiyonel) Proxy'i yalnızca bu origin'e aç,
     ör. `https://senin-projen.vercel.app`. Ayarlanmazsa isteğin kendi origin'i yansıtılır.
3. Deploy et.

## Lokal Geliştirme

```bash
npm i -g vercel
vercel dev
```

`vercel dev` hem statik `index.html`'i hem de `/api/scan` fonksiyonunu çalıştırır.

## Kullanım

1. Üstte yeşil nokta → backend ayakta ve anahtar yapılandırılmış demektir.
   (Açılış kontrolü Rainforest'a istek atmaz, kredi harcamaz.)
2. **🔬 Tanı** butonu canlı bir test isteği atarak uçtan uca bağlantıyı doğrular (1 kredi).
3. Kuyruğa arama kelimesi / kategori / bestseller ekle, **🚀 Tümünü Tara**'ya bas.
4. Sonuçları filtrele, sırala ve **📥 CSV** ile dışa aktar.

## API (`/api/scan`)

| `type`        | Gerekli parametreler        | Açıklama                          |
|---------------|-----------------------------|-----------------------------------|
| `ping`        | —                           | Sağlık kontrolü (kredi harcamaz)  |
| `search`      | `search_term`, `page`       | Anahtar kelime araması            |
| `category`    | `url`, `page`               | Kategori araması                  |
| `bestsellers` | `url`                       | En çok satanlar listesi           |
| `product`     | `asin`                      | Ürün detayı (rating, BSR vb.)     |

`domain` parametresi yalnızca izin verilen Amazon domainlerini kabul eder:
`amazon.com.tr`, `amazon.de`, `amazon.com`, `amazon.co.uk`.

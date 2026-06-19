// api/scan.js
// Vercel Serverless Function — Rainforest API güvenli proxy
// API anahtarı Vercel ortam değişkeninde (RAINFOREST_API_KEY) saklanır,
// tarayıcıya asla inmez. CORS sorunu da burada çözülür.

// Frontend'in seçebildiği Amazon domainleri (istek tahrifatını engellemek için)
const ALLOWED_DOMAINS = new Set([
  'amazon.com.tr',
  'amazon.de',
  'amazon.com',
  'amazon.co.uk',
]);

export default async function handler(req, res) {
  // CORS başlıkları.
  // Varsayılan: isteğin kendi origin'ini yansıt (aynı-origin her zaman çalışır).
  // ALLOWED_ORIGIN env'i ayarlıysa yalnızca ona izin verilir. Böylece başka
  // sitelerin tarayıcıdan bu proxy'i kullanıp API kotanı tüketmesi engellenir.
  const allowedOrigin = process.env.ALLOWED_ORIGIN || req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parametreleri al (hem GET query hem POST body destekle)
  let params = req.method === 'POST' ? req.body : req.query;
  if (typeof params === 'string') {
    try { params = JSON.parse(params); } catch (e) { params = {}; }
  }
  const { type, domain, search_term, page, url, asin } = params || {};

  if (!type) {
    return res.status(400).json({ error: 'type parametresi gerekli (ping/search/category/bestsellers/product)' });
  }

  const API_KEY = process.env.RAINFOREST_API_KEY;

  // Hafif sağlık kontrolü — Rainforest'a istek atmaz, kredi harcamaz.
  // Frontend açılışta bununla anahtarın yapılandırılıp yapılandırılmadığını öğrenir.
  if (type === 'ping') {
    return res.status(200).json({ ok: true, configured: Boolean(API_KEY) });
  }

  if (!API_KEY) {
    return res.status(500).json({
      error: 'API anahtarı yapılandırılmamış. Vercel → Settings → Environment Variables → RAINFOREST_API_KEY ekle.'
    });
  }

  // Domain whitelist — yalnızca bilinen Amazon domainlerine izin ver.
  const amazonDomain = domain || 'amazon.com.tr';
  if (!ALLOWED_DOMAINS.has(amazonDomain)) {
    return res.status(400).json({ error: 'Geçersiz domain: ' + amazonDomain });
  }

  // Rainforest API URL'ini oluştur
  const base = new URL('https://api.rainforestapi.com/request');
  base.searchParams.set('api_key', API_KEY);
  base.searchParams.set('amazon_domain', amazonDomain);

  if (type === 'search') {
    if (!search_term) {
      return res.status(400).json({ error: 'search_term parametresi gerekli' });
    }
    base.searchParams.set('type', 'search');
    base.searchParams.set('search_term', search_term);
    base.searchParams.set('page', String(page || '1'));
  } else if (type === 'category') {
    if (!url) {
      return res.status(400).json({ error: 'url parametresi gerekli (kategori)' });
    }
    base.searchParams.set('type', 'search');
    base.searchParams.set('url', url);
    base.searchParams.set('page', String(page || '1'));
  } else if (type === 'bestsellers') {
    if (!url) {
      return res.status(400).json({ error: 'url parametresi gerekli (bestsellers)' });
    }
    base.searchParams.set('type', 'bestsellers');
    base.searchParams.set('url', url);
  } else if (type === 'product') {
    if (!asin) {
      return res.status(400).json({ error: 'asin parametresi gerekli (ürün)' });
    }
    base.searchParams.set('type', 'product');
    base.searchParams.set('asin', asin);
  } else {
    return res.status(400).json({ error: 'Geçersiz type: ' + type });
  }

  try {
    const r = await fetch(base.toString());
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Rainforest JSON yerine HTML/metin döndürdü (ör. ağ geçidi hatası)
      return res.status(502).json({
        error: 'Rainforest API geçersiz yanıt döndürdü (HTTP ' + r.status + ')'
      });
    }
    // Rainforest'ın kendi HTTP durum kodunu koru (frontend request_info.success'i de kontrol eder)
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Rainforest API hatası: ' + (e.message || String(e)) });
  }
}

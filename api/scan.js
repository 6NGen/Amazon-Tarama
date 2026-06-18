// api/scan.js
// Vercel Serverless Function — Rainforest API güvenli proxy
// API anahtarı Vercel ortam değişkeninde (RAINFOREST_API_KEY) saklanır,
// tarayıcıya asla inmez. CORS sorunu da burada çözülür.

export default async function handler(req, res) {
  // CORS başlıkları (kendi domaininden çağrı için)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = process.env.RAINFOREST_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({
      error: 'API anahtarı yapılandırılmamış. Vercel → Settings → Environment Variables → RAINFOREST_API_KEY ekle.'
    });
  }

  // Parametreleri al (hem GET query hem POST body destekle)
  const params = req.method === 'POST' ? req.body : req.query;
  const { type, domain, search_term, page, url, asin } = params || {};

  if (!type) {
    return res.status(400).json({ error: 'type parametresi gerekli (search/category/bestsellers/product)' });
  }

  // Rainforest API URL'ini oluştur
  const base = new URL('https://api.rainforestapi.com/request');
  base.searchParams.set('api_key', API_KEY);
  base.searchParams.set('amazon_domain', domain || 'amazon.com.tr');

  if (type === 'search') {
    base.searchParams.set('type', 'search');
    base.searchParams.set('search_term', search_term || '');
    base.searchParams.set('page', page || '1');
  } else if (type === 'category') {
    base.searchParams.set('type', 'search');
    base.searchParams.set('url', url || '');
    base.searchParams.set('page', page || '1');
  } else if (type === 'bestsellers') {
    base.searchParams.set('type', 'bestsellers');
    base.searchParams.set('url', url || '');
  } else if (type === 'product') {
    base.searchParams.set('type', 'product');
    base.searchParams.set('asin', asin || '');
  } else {
    return res.status(400).json({ error: 'Geçersiz type: ' + type });
  }

  try {
    const r = await fetch(base.toString());
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Rainforest API hatası: ' + (e.message || String(e)) });
  }
}

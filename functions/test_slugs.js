const fs = require('fs');

async function extractSlugsFromCatalog() {
  const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
  const url = 'https://www.remax.com.ar/agent/joaquin-maini-cuneo';

  const res = await fetch('https://api.spider.cloud/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      return_format: 'raw',
      request: 'chrome'
    })
  });
  
  const data = await res.json();
  const content = Array.isArray(data) ? data[0].content : (data.content || Object.values(data)[0].content);
  
  const ngMatch = content.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
  if (!ngMatch) return console.log('No ng-state');
  
  const d = JSON.parse(ngMatch[1]);
  let slugs = new Set();
  
  for (const key in d) {
    const val = d[key]?.b?.data || d[key]?.b;
    if (val && Array.isArray(val.data)) {
      val.data.forEach(p => {
          if (p.slug) slugs.add(p.slug);
      });
    }
    // sometimes it's nested
    if (val && typeof val === 'object') {
        for (const k in val) {
            if (Array.isArray(val[k])) {
                val[k].forEach(p => {
                    if (p.slug) slugs.add(p.slug);
                });
            } else if (val[k] && typeof val[k] === 'object' && val[k].slug) {
                slugs.add(val[k].slug);
            }
        }
    }
  }
  
  console.log('Extracted slugs:', Array.from(slugs));
}

extractSlugsFromCatalog();

const fs = require('fs');

async function testCatalogData() {
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
  
  const d = JSON.parse(ngMatch[1].trim());
  let properties = [];
  
  for (const key in d) {
    const val = d[key]?.b?.data || d[key]?.b;
    if (val && Array.isArray(val.data) && val.data[0] && val.data[0].slug) {
      properties = val.data;
      break;
    }
  }
  
  console.log(`Found ${properties.length} properties in catalog.`);
  if (properties.length > 0) {
      const p = properties[0];
      console.log('Title:', p.title || p.address);
      console.log('Price:', p.price);
      console.log('Desc Length:', p.description?.length);
      console.log('Desc:', p.description?.substring(0, 100));
      console.log('Photos:', p.photos?.length, p.photos?.[0]);
  }
}

testCatalogData();

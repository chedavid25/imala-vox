const fs = require('fs');

async function checkCatalogPhotos() {
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
  
  const ngMatch = content?.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
  if (!ngMatch) return console.log('No ng-state');
  
  const d = JSON.parse(ngMatch[1].trim());
  let properties = [];
  
  const extractProperties = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
          obj.forEach(extractProperties);
      } else {
          if (obj.slug && obj.price) {
              properties.push(obj);
          }
          for (const k in obj) extractProperties(obj[k]);
      }
  };
  extractProperties(d);
  
  console.log(`Found ${properties.length} properties.`);
  if (properties.length > 0) {
      console.log('Sample Photos:', properties[0].photos || properties[0].coverPhoto || properties[0].image);
      console.log('Sample Keys:', Object.keys(properties[0]));
  }
}

checkCatalogPhotos();

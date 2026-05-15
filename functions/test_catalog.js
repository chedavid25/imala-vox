const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
const url = 'https://www.remax.com.ar/agent/joaquin-maini-cuneo';

async function testCatalog() {
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
  
  // Buscar 152000 (el precio del depto) en el catálogo
  const hasPrice = content?.includes('152000') || content?.includes('152.000');
  console.log('Catalog HTML length:', content?.length);
  console.log('Has Price 152000:', hasPrice);

  const ngMatch = content?.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
  if (ngMatch) {
     console.log('NG-STATE length:', ngMatch[1].length);
     const hasPriceInJson = ngMatch[1].includes('152000') || ngMatch[1].includes('152.000');
     console.log('Has Price inside JSON:', hasPriceInJson);
  }
}

testCatalog();

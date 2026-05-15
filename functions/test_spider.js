const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
const url = 'https://www.remax.com.ar/listings/venta-piso-exclusivo-3-dorm-parque-espana-rio';

async function test() {
  try {
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
    
    console.log('Content length:', content.length);
    
    // Buscar patrones específicos
    const nextMatch = content.match(/id="__NEXT_DATA__"/);
    const ngMatch = content.match(/id="ng-state"/);
    
    console.log('Has __NEXT_DATA__:', !!nextMatch);
    console.log('Has ng-state:', !!ngMatch);
    
    if (ngMatch) {
      const ngJson = content.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
      if (ngJson) {
        const d = JSON.parse(ngJson[1]);
        console.log('Keys in ng-state:', Object.keys(d).length);
        // Buscar un objeto con price
        for (const k in d) {
          const val = d[k]?.b?.data || d[k]?.b;
          if (val && val.price) {
            console.log('Found price in key:', k, 'Price:', val.price);
            console.log('Total Built:', val.dimensionTotalBuilt);
            console.log('Covered:', val.dimensionCovered);
            console.log('Bathrooms:', val.bathrooms);
          }
        }
      }
    }
    
    // Buscar texto visible de precio y metros
    const textSnippet = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log('Price in text (365.000):', textSnippet.includes('365.000'));
    console.log('Meters in text (185):', textSnippet.includes('185'));
    
  } catch (e) { console.error(e); }
}

test();

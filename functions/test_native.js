const fetch = require('node-fetch'); // Native fetch in Node 18+

async function testNativeFetch() {
  const url = 'https://www.remax.com.ar/agent/joaquin-maini-cuneo';
  try {
      const res = await fetch(url, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
          }
      });
      const html = await res.text();
      console.log('Status:', res.status);
      console.log('HTML length:', html.length);
      
      const ngMatch = html.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
      if (ngMatch) {
          console.log('NG-STATE FOUND natively!');
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
          console.log(`Found ${properties.length} properties natively!`);
          if (properties.length > 0) {
              const p = properties[0];
              console.log('Photos count:', p.photos?.length || p.pictures?.length);
              console.log('First photo:', p.photos?.[0] || p.pictures?.[0]);
          }
      } else {
          console.log('No ng-state. Cloudflare block?');
      }
  } catch(e) {
      console.log('Fetch error', e.message);
  }
}

testNativeFetch();

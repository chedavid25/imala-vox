const fetch = require('node-fetch');

async function testNativeFetchFicha() {
  const url = 'https://www.remax.com.ar/listings/venta-departamento-reciclado-a-nuevo-en-piso-10-sobre-entre-rios-al-1300-rosario';
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
      
      const ngMatch = html.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
      if (ngMatch) {
          const d = JSON.parse(ngMatch[1].trim());
          let description = null;
          let price = null;
          
          const search = (obj) => {
              if (!obj || typeof obj !== 'object') return;
              if (Array.isArray(obj)) {
                  obj.forEach(search);
              } else {
                  if (obj.description && obj.description.length > 50) {
                      description = obj.description;
                  }
                  if (obj.price) {
                      price = obj.price;
                  }
                  for (const k in obj) search(obj[k]);
              }
          };
          search(d);
          
          console.log('Found Price:', price);
          console.log('Found Description:', description?.length);
      }
  } catch(e) {
      console.log('Fetch error', e.message);
  }
}

testNativeFetchFicha();

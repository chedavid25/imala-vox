const fetch = require('node-fetch');

async function testNativeApi() {
  const slug = 'venta-casa-4-dormitorios-la-sexta';
  const url = `https://api-ar.redremax.com/remaxweb-ar/api/listings/findBySlug/${slug}`;
  try {
      const res = await fetch(url, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
              'Accept': 'application/json'
          }
      });
      console.log('Status:', res.status);
      if(res.ok) {
          const d = await res.json();
          console.log('Price:', d.price);
          console.log('Desc Length:', d.description?.length);
          console.log('Cover Photo:', d.photos?.[0]?.rawValue);
      }
  } catch(e) {
      console.log('Error', e.message);
  }
}

testNativeApi();

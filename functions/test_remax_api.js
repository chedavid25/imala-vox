const fetch = require('node-fetch'); // or use native fetch in node 18+

async function testRemaxApi() {
  const slug = 'venta-casa-4-dormitorios-la-sexta';
  const apiUrl = `https://api-ar.redremax.com/remaxweb-ar/api/listings/${slug}`;
  
  try {
      const res = await fetch(apiUrl, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Accept': 'application/json'
          }
      });
      
      if (!res.ok) {
          console.log('Error HTTP', res.status);
          return;
      }
      
      const data = await res.json();
      console.log('Success! Properties found in data:', Object.keys(data));
      
      if (data.data) {
          const p = data.data;
          console.log('Price:', p.price, p.currency?.value);
          console.log('M2 Totales:', p.dimensionTotalBuilt);
          console.log('M2 Cubiertos:', p.dimensionCovered);
          console.log('Baños:', p.bathrooms);
          console.log('Descripción length:', p.description?.length);
          console.log('Descripción preview:', p.description?.slice(0, 150).replace(/\n/g, ' '));
      }
  } catch (e) {
      console.log('Fetch error:', e.message);
  }
}

testRemaxApi();

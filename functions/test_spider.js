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
    console.log('Keys:', Object.keys(data));
    if (Array.isArray(data)) {
      console.log('Array detected. Length:', data.length);
      console.log('First item keys:', Object.keys(data[0]));
      console.log('First item content snippet:', data[0].content?.slice(0, 200));
    } else {
      console.log('Object content snippet:', data.content?.slice(0, 200));
    }
  } catch (e) { console.error(e); }
}

test();

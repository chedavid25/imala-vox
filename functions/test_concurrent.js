const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
const links = [
  'https://www.remax.com.ar/listings/venta-departamento-reciclado-a-nuevo-en-piso-10-sobre-entre-rios-al-1300-rosario',
  'https://www.remax.com.ar/listings/piso-exclusivo-3-dorm-parque-espana-a-reciclar'
];

async function testConcurrent() {
  const start = Date.now();
  const promises = links.map(url => fetch('https://api.spider.cloud/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      return_format: 'raw',
      request: 'chrome'
    })
  }).then(r => r.json()));

  const results = await Promise.all(promises);
  console.log(`Finished in ${(Date.now() - start)/1000}s`);
  console.log('Results lengths:', results.map(r => r[0]?.content?.length || r.content?.length));
}

testConcurrent();

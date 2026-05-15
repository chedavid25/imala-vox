const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
const url = 'https://www.remax.com.ar/listings/venta-departamento-reciclado-a-nuevo-en-piso-10-sobre-entre-rios-al-1300-rosario';

async function testWaitFor(waitForValue) {
  const res = await fetch('https://api.spider.cloud/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      request: 'chrome',
      wait_for: waitForValue
    })
  });
  const data = await res.json();
  console.log('Testing wait_for:', JSON.stringify(waitForValue), '-> Status:', res.status, res.ok ? 'SUCCESS' : data);
}

async function run() {
  await testWaitFor(5000); // Int failed
  await testWaitFor({ selector: '.remax-price' }); // Object with selector
  // What else? Maybe simply wait_for is deprecated or changed.
}

run();

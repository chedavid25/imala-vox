const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
const url = 'https://www.remax.com.ar/listings/venta-departamento-reciclado-a-nuevo-en-piso-10-sobre-entre-rios-al-1300-rosario';

async function testMarkdown() {
  const res = await fetch('https://api.spider.cloud/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      request: 'chrome',
      return_format: 'markdown'
    })
  });
  const data = await res.json();
  const content = Array.isArray(data) ? data[0].content : (data.content || Object.values(data)[0].content);
  console.log('Content:', content);
}

testMarkdown();

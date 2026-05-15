const fs = require('fs');
const url = 'https://www.remax.com.ar/listings/venta-departamento-reciclado-a-nuevo-en-piso-10-sobre-entre-rios-al-1300-rosario';
const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';

const DETAIL_EXTRACTION_SCRIPT = `
(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  await delay(3500); 

  const data = { dom: {} };
  try {
    const expandBtn = document.querySelector('.remax-description__expand, [class*="description"] .ver-mas, button.expand, .ver-mas');
    if (expandBtn) {
        expandBtn.click();
        await delay(1000); 
    }

    data.dom.title = document.title;
    data.dom.description = document.querySelector('.remax-description__content, [class*="description-text"], .property-description')?.innerText;
    data.dom.price = document.querySelector('.remax-price, [class*="price-value"], .price-value')?.innerText;
    
    const chips = Array.from(document.querySelectorAll('.remax-chips__item, .property-characteristics__item, [class*="characteristics"] li'));
    data.dom.chips = chips.map(c => c.innerText).join(' | ');

  } catch (e) {}
  return JSON.stringify(data);
})();
`;

async function test() {
  console.log('Fetching...');
  const res = await fetch('https://api.spider.cloud/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      return_format: 'raw',
      request: 'chrome',
      execution_scripts: { [url]: DETAIL_EXTRACTION_SCRIPT }
    })
  });
  
  const data = await res.json();
  const page = Array.isArray(data) ? data[0] : (data || Object.values(data)[0]);
  
  console.log('Execution Results:', page.execution_results);
}

test();

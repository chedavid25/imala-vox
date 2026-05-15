const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
const url = 'https://www.remax.com.ar/agent/joaquin-maini-cuneo';
const fs = require('fs');

const LOAD_MORE_SCRIPT = `
(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const selectores = ['.remax-button', '.button-color-grey-border', '.ver-mas', '.load-more'];
  for (let i = 0; i < 3; i++) { // Limitado para pruebas
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await delay(1200);
    let btn = null;
    for (const s of selectores) {
      const el = document.querySelector(s);
      if (el && el.getBoundingClientRect().height > 0) { btn = el; break; }
    }
    if (!btn) break;
    btn.click();
    await delay(2000);
  }
})();
`;

async function test() {
  console.log('Initiating Spider crawl...');
  try {
    const res = await fetch('https://api.spider.cloud/crawl', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        limit: 5, // Solo unas pocas para ver la estructura
        depth: 1,
        return_format: 'raw',
        request: 'chrome',
        execution_scripts: { [url]: LOAD_MORE_SCRIPT },
        filter_output: { only_main_content: true },
        wait_for: 3000,
        metadata: true
      })
    });
    
    const rawData = await res.json();
    fs.writeFileSync('spider_dump.json', JSON.stringify(rawData, null, 2));
    console.log('Spider dump saved. Is Array:', Array.isArray(rawData));
    
    let pages = [];
    if (Array.isArray(rawData)) pages = rawData;
    else if (typeof rawData === 'object' && rawData !== null) pages = Object.values(rawData);
    
    console.log('Pages found:', pages.length);
    pages.forEach((p, i) => {
      console.log(`\nPage ${i} URL:`, p.url);
      if (p.content) {
        console.log(`Content length: ${p.content.length}`);
        const hasNext = p.content.includes('id="__NEXT_DATA__"');
        const hasNgState = p.content.includes('id="ng-state"');
        console.log(`Has NEXT: ${hasNext}, Has ng-state: ${hasNgState}`);
      } else {
        console.log('NO CONTENT');
      }
    });

  } catch (e) { console.error(e); }
}

test();

const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
const url = 'https://www.remax.com.ar/listings/venta-departamento-reciclado-a-nuevo-en-piso-10-sobre-entre-rios-al-1300-rosario';

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
    const content = Array.isArray(data) ? data[0].content : (data.content || Object.values(data)[0].content);
    
    // Buscar la palabra "Excelente altura con vista abierta" (que salía en el recorte)
    const index = content.indexOf('Excelente altura con vista abierta');
    console.log('Found "Excelente altura" at:', index);
    if (index !== -1) {
      console.log('Context around found text:', content.slice(index, index + 500));
    }

    // Buscar el script ng-state
    const ngMatch = content.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
    if (ngMatch) {
      const d = JSON.parse(ngMatch[1]);
      for (const k in d) {
        const val = d[k]?.b?.data || d[k]?.b;
        if (val && (val.description || val.notes)) {
          console.log('Found description in JSON. Length:', (val.description || val.notes).length);
          console.log('Snippet:', (val.description || val.notes).slice(0, 100));
        }
      }
    }
  } catch (e) { console.error(e); }
}

test();

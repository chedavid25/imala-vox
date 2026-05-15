const SPIDER_API_KEY = 'sk-e9011244-c1c8-4420-b7d5-6bc13ee8288f';
const url = 'https://www.remax.com.ar/agent/joaquin-maini-cuneo';

function esLinkDeDetalle(href) {
  if (!href) return false;
  const h = href.toLowerCase();
  return h.includes('/listings/') || h.includes('/propiedad/') || h.includes('/ficha/') || /\/\d{6,}/.test(h);
}

async function testLinks() {
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
  
  const hrefRegex = /href="([^"]+)"/g;
  let match;
  const discoveredLinks = new Set();
  while ((match = hrefRegex.exec(content)) !== null) {
    let link = match[1];
    if (link.startsWith('/')) {
        link = 'https://www.remax.com.ar' + link;
    }
    if (esLinkDeDetalle(link)) {
        discoveredLinks.add(link);
    }
  }
  
  const arr = Array.from(discoveredLinks);
  console.log(`Discovered ${arr.length} links`);
  if (arr.length > 0) {
      console.log(arr.slice(0, 5));
  }
}

testLinks();

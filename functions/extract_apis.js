const fs = require('fs');
const html = fs.readFileSync('full_page.html', 'utf8');
const m = html.match(/https:\/\/api-ar\.redremax\.com[^"'\\]+/g);
console.log([...new Set(m)]);

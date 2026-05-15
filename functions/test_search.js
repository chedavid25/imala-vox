const fs = require('fs');

try {
  const content = fs.readFileSync('ng_state_dump.json', 'utf8');
  const d = JSON.parse(content);
  
  function searchExactValue(obj, valueToFind, currentPath = '') {
      if (!obj) return;
      if (typeof obj === 'object') {
          for (const key in obj) {
              searchExactValue(obj[key], valueToFind, currentPath + '.' + key);
          }
      } else if (String(obj).includes(String(valueToFind))) {
          console.log(`Found "${valueToFind}" at path: ${currentPath} -> ${obj}`);
      }
  }

  searchExactValue(d, '152000');
  searchExactValue(d, 'MUY LUMINOSO');
  
} catch (e) {
  console.log('Error', e);
}

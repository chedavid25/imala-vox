const fs = require('fs');
const content = fs.readFileSync('d:\\Sistemas David\\Imala-Vox\\src\\components\\crm\\ContactTable.tsx', 'utf8');

let openBraces = 0;
let closeBraces = 0;
let openJSX = 0;
let closeJSX = 0;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') closeBraces++;
    if (content[i] === '(') openJSX++;
    if (content[i] === ')') closeJSX++;
}

console.log(`Braces: { ${openBraces}, } ${closeBraces} (Diff: ${openBraces - closeBraces})`);
console.log(`Parens: ( ${openJSX}, ) ${closeJSX} (Diff: ${openJSX - closeJSX})`);

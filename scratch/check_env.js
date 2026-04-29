
require('dotenv').config({ path: '.env.local' });

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;
const jwt = process.env.ADMIN_JWT_SECRET;

console.log('--- ENV CHECK ---');
console.log('ADMIN_JWT_SECRET:', jwt ? 'PRESENT' : 'MISSING');
console.log('FIREBASE_SERVICE_ACCOUNT_KEY_B64:', b64 ? 'PRESENT' : 'MISSING');

if (b64) {
  try {
    const trimmed = b64.replace(/^["']|["']$/g, '');
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    const json = JSON.parse(decoded);
    console.log('Decoded Project ID:', json.project_id);
    console.log('Base64 Decode: SUCCESS');
  } catch (e) {
    console.error('Base64 Decode: FAILED', e.message);
  }
}

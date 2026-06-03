/**
 * Verifica un token de Meta: qué tipo es, sus scopes, vencimiento, y app dueña.
 * Uso: node scripts/check-token.js <TOKEN>
 */

const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let val = m[2].trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[m[1]] = val;
}

const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('Uso: node scripts/check-token.js <TOKEN>');
  process.exit(1);
}

const appId = process.env.NEXT_PUBLIC_META_APP_ID;
const appSecret = process.env.META_APP_SECRET;

(async () => {
  console.log('\n=== Debug del token ===\n');

  const res = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${TOKEN}&access_token=${appId}|${appSecret}`
  );
  const json = await res.json();
  const d = json.data;
  if (!d) {
    console.log('Error:', JSON.stringify(json));
    process.exit(1);
  }

  console.log(`is_valid:        ${d.is_valid}`);
  console.log(`type:            ${d.type}`);
  console.log(`app_id:          ${d.app_id}  ${d.app_id === appId ? '✅ Coincide con tu app' : '❌ NO es tu app — usa el token con la app equivocada'}`);
  console.log(`user_id:         ${d.user_id || '(N/A)'}`);
  console.log(`expires_at:      ${d.expires_at === 0 ? 'NUNCA EXPIRA ✅' : new Date(d.expires_at * 1000).toISOString()}`);
  console.log(`scopes:          ${(d.scopes || []).join(', ') || '(sin scopes)'}`);

  console.log('\n=== Permisos críticos para WhatsApp ===');
  const required = ['whatsapp_business_messaging', 'whatsapp_business_management'];
  for (const s of required) {
    console.log(`  ${(d.scopes || []).includes(s) ? '✅' : '❌'} ${s}`);
  }

  if (d.error) {
    console.log('\n⚠️  Error reportado por Meta:', d.error);
  }

  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });

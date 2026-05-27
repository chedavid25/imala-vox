/**
 * Diagnóstico de DMs de Instagram.
 * Verifica:
 *  - Si la cuenta IG tiene conversaciones reales con no-admins (vía Graph API).
 *  - Compara contra las conversaciones guardadas en Firestore.
 * Uso: node scripts/diagnose-ig-dms.js <metaPageId>
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

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64, 'base64').toString('utf8')
);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const PAGE_ID = process.argv[2];
if (!PAGE_ID) { console.error('Uso: node scripts/diagnose-ig-dms.js <metaPageId>'); process.exit(1); }

async function callMeta(url) {
  const res = await fetch(url);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

(async () => {
  console.log(`\nDIAGNÓSTICO IG DMs — pageId: ${PAGE_ID}\n`);

  // 1. Buscar canal IG en Firestore
  const wsSnap = await db.collection('espaciosDeTrabajo').get();
  let canalDoc = null;
  let wsId = null;
  for (const wsd of wsSnap.docs) {
    const c = await wsd.ref.collection('canales')
      .where('metaPageId', '==', PAGE_ID)
      .where('tipo', '==', 'instagram')
      .get();
    if (!c.empty) { canalDoc = c.docs[0]; wsId = wsd.id; break; }
  }
  if (!canalDoc) { console.log('❌ No hay canal IG con ese metaPageId'); process.exit(0); }

  const canal = canalDoc.data();
  const igUserId = canal.metaInstagramId;
  console.log(`Canal IG: ${canalDoc.id} en ws ${wsId}`);
  console.log(`metaInstagramId: ${igUserId}`);
  console.log(`metaPageId: ${PAGE_ID}\n`);

  // 2. Token
  const secret = await db.doc(`espaciosDeTrabajo/${wsId}/canales/${canalDoc.id}/secrets/config`).get();
  const token = secret.data()?.metaAccessToken;
  if (!token) { console.log('❌ Sin token'); process.exit(0); }

  // 3. Consultar conversaciones de IG via Graph API (2 endpoints distintos para confirmar)
  console.log('[Conversaciones via Page endpoint con platform=instagram]');
  const convsRes1 = await callMeta(
    `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?platform=instagram&limit=5&access_token=${encodeURIComponent(token)}`
  );
  if (!convsRes1.ok) {
    console.log('  ❌ Error:', JSON.stringify(convsRes1.data));
  } else {
    console.log(`  Total: ${(convsRes1.data.data || []).length}`);
    for (const c of (convsRes1.data.data || []).slice(0, 5)) {
      console.log(`  - ${c.id} (updated: ${c.updated_time || '?'})`);
    }
  }

  console.log('\n[Conversaciones via IG User endpoint]');
  const convsRes2 = await callMeta(
    `https://graph.facebook.com/v19.0/${igUserId}/conversations?platform=instagram&limit=5&access_token=${encodeURIComponent(token)}`
  );
  if (!convsRes2.ok) {
    console.log('  ❌ Error:', JSON.stringify(convsRes2.data));
  } else {
    console.log(`  Total: ${(convsRes2.data.data || []).length}`);
    for (const c of (convsRes2.data.data || []).slice(0, 5)) {
      console.log(`  - ${c.id} (updated: ${c.updated_time || '?'})`);
      // Pedir mensajes de esa conversación
      const msgsRes = await callMeta(
        `https://graph.facebook.com/v19.0/${c.id}?fields=messages.limit(3){from,to,message,created_time}&access_token=${encodeURIComponent(token)}`
      );
      if (msgsRes.ok && msgsRes.data?.messages?.data) {
        for (const m of msgsRes.data.messages.data) {
          const fromName = m.from?.username || m.from?.name || m.from?.id || '?';
          const direccion = m.from?.id === igUserId ? '↗️ saliente' : '↘️ entrante';
          console.log(`      ${direccion} ${m.created_time} — ${fromName}: "${(m.message || '').slice(0, 60)}"`);
        }
      }
    }
  }

  // 4. Conversaciones en Firestore (consulta simple sin compound index)
  console.log('\n[Conversaciones en Firestore (Imalá Vox)]');
  const fbConvs = await db.collection(`espaciosDeTrabajo/${wsId}/conversaciones`)
    .where('canalId', '==', canalDoc.id)
    .get();
  // ordenar en memoria
  const sorted = fbConvs.docs.sort((a, b) => {
    const aT = a.data().ultimaActividad?.toMillis?.() || 0;
    const bT = b.data().ultimaActividad?.toMillis?.() || 0;
    return bT - aT;
  }).slice(0, 10);
  console.log(`  Total: ${fbConvs.docs.length}`);
  for (const d of sorted) {
    const data = d.data();
    console.log(`  - ${d.id} — contacto: ${data.contactoNombre} — canal: ${data.canal} — última: ${data.ultimaActividad?.toDate?.()?.toISOString() || '?'}`);
  }

  // 5. App status — modo desarrollo o live?
  console.log('\n[Estado de la app de Meta]');
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const appTokenRes = await callMeta(
    `https://graph.facebook.com/v19.0/${appId}?fields=name,namespace,object_type,id&access_token=${appId}|${appSecret}`
  );
  if (appTokenRes.ok) {
    console.log(`  App: ${appTokenRes.data.name} (${appTokenRes.data.id})`);
  }

  // Verificar permisos del token de página
  console.log('\n[Permisos del token de página]');
  const dbg = await callMeta(
    `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
  );
  if (dbg.ok) {
    const d = dbg.data.data || {};
    console.log(`  Scopes: ${(d.scopes || []).join(', ')}`);
    const igRequired = ['instagram_basic', 'instagram_manage_messages', 'pages_messaging'];
    for (const s of igRequired) {
      console.log(`  ${(d.scopes || []).includes(s) ? '✅' : '❌'} ${s}`);
    }
  }

  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });

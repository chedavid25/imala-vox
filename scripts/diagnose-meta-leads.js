/**
 * Diagnóstico de conexión Meta Ads / Leads para un canal específico.
 * Uso: node scripts/diagnose-meta-leads.js <metaPageId>
 *
 * Verifica:
 *  - Estado del token (debug_token): validez, scopes, expiración
 *  - Suscripción de webhooks (subscribed_apps): ¿incluye 'leadgen'?
 *  - Formularios de Lead Ads (leadgen_forms): ¿hay formularios activos?
 *  - Últimos leads recientes en Meta vs últimos guardados en Firestore
 */

const fs = require('fs');
const path = require('path');

// Cargar .env.local manualmente (sin dotenv)
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const PAGE_ID = process.argv[2];
if (!PAGE_ID) {
  console.error('Uso: node scripts/diagnose-meta-leads.js <metaPageId>');
  process.exit(1);
}

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

async function callMeta(url) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

(async () => {
  console.log(`\n========================================`);
  console.log(`DIAGNÓSTICO META ADS para pageId: ${PAGE_ID}`);
  console.log(`========================================\n`);

  // 1. Buscar canal en Firestore (iterando workspaces para evitar dependencia de índice)
  console.log(`[1] Buscando canal en Firestore (iterando workspaces)...`);
  const wsSnap = await db.collection('espaciosDeTrabajo').get();
  console.log(`    Revisando ${wsSnap.docs.length} workspaces...`);
  const foundDocs = [];
  for (const wsDoc of wsSnap.docs) {
    const canalesSnap = await wsDoc.ref.collection('canales')
      .where('metaPageId', '==', PAGE_ID)
      .get();
    for (const c of canalesSnap.docs) foundDocs.push(c);
  }

  if (foundDocs.length === 0) {
    console.log(`❌ No se encontró ningún canal con metaPageId=${PAGE_ID}`);
    console.log(`   Verificá el ID o que el cliente haya conectado la página.`);
    process.exit(0);
  }

  console.log(`✅ ${foundDocs.length} canal(es) encontrado(s)\n`);

  for (const doc of foundDocs) {
    const canal = doc.data();
    const canalId = doc.id;
    const wsId = doc.ref.parent.parent.id;

    console.log(`--- Canal ${canalId} (workspace: ${wsId}) ---`);
    console.log(`  Tipo: ${canal.tipo}`);
    console.log(`  Nombre: ${canal.nombre}`);
    console.log(`  Status: ${canal.status}`);
    console.log(`  webhookVerified: ${canal.webhookVerified}`);
    console.log(`  Creado: ${canal.creadoEl?.toDate?.()?.toISOString() || '?'}`);
    console.log(`  Actualizado: ${canal.actualizadoEl?.toDate?.()?.toISOString() || '?'}`);

    // 2. Obtener token
    const secretSnap = await db.doc(`espaciosDeTrabajo/${wsId}/canales/${canalId}/secrets/config`).get();
    if (!secretSnap.exists) {
      console.log(`  ❌ No existe secrets/config — el canal está roto`);
      continue;
    }
    const token = secretSnap.data().metaAccessToken;
    if (!token) {
      console.log(`  ❌ metaAccessToken vacío`);
      continue;
    }
    console.log(`  ✅ Token presente (longitud: ${token.length})`);

    // 3. debug_token
    console.log(`\n[2] Verificando token (debug_token)...`);
    const dbg = await callMeta(
      `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${APP_ID}|${APP_SECRET}`
    );
    if (!dbg.ok) {
      console.log(`  ❌ debug_token falló:`, dbg.data);
    } else {
      const d = dbg.data.data || {};
      console.log(`  is_valid: ${d.is_valid}`);
      console.log(`  type: ${d.type}`);
      console.log(`  app_id: ${d.app_id}`);
      console.log(`  expires_at: ${d.expires_at === 0 ? 'NUNCA EXPIRA' : new Date(d.expires_at * 1000).toISOString()}`);
      console.log(`  data_access_expires_at: ${d.data_access_expires_at === 0 ? 'NUNCA' : new Date(d.data_access_expires_at * 1000).toISOString()}`);
      console.log(`  scopes: ${(d.scopes || []).join(', ')}`);
      if (!d.scopes?.includes('leads_retrieval')) {
        console.log(`  🚨 FALTA SCOPE 'leads_retrieval' — los leads NO se pueden suscribir`);
      } else {
        console.log(`  ✅ Tiene 'leads_retrieval'`);
      }
      if (d.error) {
        console.log(`  ❌ Error en token:`, d.error);
      }
    }

    // 4. subscribed_apps
    console.log(`\n[3] Verificando suscripción a webhooks (subscribed_apps)...`);
    const subs = await callMeta(
      `https://graph.facebook.com/v19.0/${PAGE_ID}/subscribed_apps?access_token=${encodeURIComponent(token)}`
    );
    if (!subs.ok) {
      console.log(`  ❌ subscribed_apps falló:`, JSON.stringify(subs.data));
    } else {
      const apps = subs.data.data || [];
      if (apps.length === 0) {
        console.log(`  🚨 NO HAY APPS SUSCRITAS — el webhook nunca va a llegar`);
      }
      for (const app of apps) {
        console.log(`  App: ${app.name} (id: ${app.id})`);
        const fields = (app.subscribed_fields || []).map(f => typeof f === 'string' ? f : f.name);
        console.log(`  subscribed_fields: ${fields.join(', ')}`);
        if (!fields.includes('leadgen')) {
          console.log(`  🚨 'leadgen' NO está en subscribed_fields — los leads NO llegan al webhook`);
        } else {
          console.log(`  ✅ 'leadgen' está suscrito`);
        }
      }
    }

    // 5. leadgen_forms
    console.log(`\n[4] Listando formularios de Lead Ads (leadgen_forms)...`);
    const forms = await callMeta(
      `https://graph.facebook.com/v19.0/${PAGE_ID}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=10&access_token=${encodeURIComponent(token)}`
    );
    if (!forms.ok) {
      console.log(`  ❌ leadgen_forms falló:`, JSON.stringify(forms.data));
    } else {
      const list = forms.data.data || [];
      if (list.length === 0) {
        console.log(`  ⚠️  No hay formularios de Lead Ads en esta página`);
      } else {
        console.log(`  ${list.length} formulario(s) encontrado(s):`);
        for (const f of list) {
          console.log(`    - ${f.name} (${f.id}) — status: ${f.status} — leads: ${f.leads_count} — creado: ${f.created_time}`);
        }
      }
    }

    // 6. Leads recientes en Firestore vs Meta
    console.log(`\n[5] Comparando leads recientes en Firestore vs Meta...`);
    const leadsSnap = await db
      .collection(`espaciosDeTrabajo/${wsId}/leads`)
      .where('metaPageId', '==', PAGE_ID)
      .orderBy('creadoEl', 'desc')
      .limit(5)
      .get()
      .catch(e => { console.log(`  ⚠️  Error consultando leads: ${e.message}`); return null; });
    if (leadsSnap) {
      console.log(`  Últimos ${leadsSnap.docs.length} leads en Firestore:`);
      for (const ld of leadsSnap.docs) {
        const data = ld.data();
        console.log(`    - ${data.creadoEl?.toDate?.()?.toISOString() || '?'} — ${data.nombre} — formulario: ${data.formulario}`);
      }
    }

    // Pedir últimos leads desde Meta para comparar
    if (forms.ok && (forms.data.data || []).length > 0) {
      const firstFormId = forms.data.data[0].id;
      const recentLeads = await callMeta(
        `https://graph.facebook.com/v19.0/${firstFormId}/leads?fields=id,created_time&limit=5&access_token=${encodeURIComponent(token)}`
      );
      if (recentLeads.ok) {
        const ml = recentLeads.data.data || [];
        console.log(`  Últimos ${ml.length} leads en Meta (form ${firstFormId}):`);
        for (const lead of ml) {
          console.log(`    - ${lead.created_time} — id: ${lead.id}`);
        }
      }
    }

    console.log(`\n--- Fin canal ${canalId} ---\n`);
  }

  console.log(`========================================`);
  console.log(`DIAGNÓSTICO COMPLETO`);
  console.log(`========================================\n`);
  process.exit(0);
})().catch(err => {
  console.error('Error fatal en diagnóstico:', err);
  process.exit(1);
});

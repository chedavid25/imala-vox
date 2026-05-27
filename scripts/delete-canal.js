/**
 * Script único para eliminar un canal específico + sus secrets.
 * Uso: node scripts/delete-canal.js <workspaceId> <canalId>
 */

const fs = require('fs');
const path = require('path');

// Cargar .env.local manualmente
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

const [wsId, canalId] = process.argv.slice(2);
if (!wsId || !canalId) {
  console.error('Uso: node scripts/delete-canal.js <workspaceId> <canalId>');
  process.exit(1);
}

(async () => {
  const canalPath = `espaciosDeTrabajo/${wsId}/canales/${canalId}`;
  const secretsPath = `${canalPath}/secrets/config`;

  // 1. Validar que existe antes de borrar
  const canalSnap = await db.doc(canalPath).get();
  if (!canalSnap.exists) {
    console.error(`❌ No existe el canal ${canalPath}`);
    process.exit(1);
  }
  const data = canalSnap.data();
  console.log('Canal a eliminar:');
  console.log(`  Path: ${canalPath}`);
  console.log(`  Tipo: ${data.tipo}`);
  console.log(`  Nombre: ${data.nombre}`);
  console.log(`  metaPageId: ${data.metaPageId || '—'}`);
  console.log(`  Creado: ${data.creadoEl?.toDate?.()?.toISOString() || '?'}`);

  // 2. Borrar secret + canal
  await db.doc(secretsPath).delete().catch(() => {});
  console.log(`✅ Secret borrado: ${secretsPath}`);
  await db.doc(canalPath).delete();
  console.log(`✅ Canal borrado: ${canalPath}`);

  process.exit(0);
})().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const wsId = "XoOuVNi5pvfqkYFIGWdB";
  console.log(`=== Mensajes de Conversaciones en ${wsId} ===`);
  
  const convsSnap = await db.collection('espaciosDeTrabajo').doc(wsId).collection('conversaciones').get();
  
  for (const doc of convsSnap.docs) {
    const convId = doc.id;
    const data = doc.data();
    console.log(`\nConversación ID: ${convId} (Canal: ${data.canal}, CanalID: ${data.canalId})`);
    
    const msgsSnap = await db.collection('espaciosDeTrabajo').doc(wsId).collection('conversaciones').doc(convId).collection('mensajes')
      .orderBy('creadoEl', 'desc').limit(3).get();
      
    console.log(`  Últimos mensajes (${msgsSnap.size}):`);
    msgsSnap.forEach(m => {
      const mData = m.data();
      const fecha = mData.creadoEl ? mData.creadoEl.toDate().toISOString() : 'N/A';
      console.log(`    - [${fecha}] From: ${mData.from}, Text: "${mData.text || 'MEDIA/OTHER'}", IsInternal: ${mData.metadata?.isInternalNote || false}`);
    });
  }
}

run().catch(console.error);

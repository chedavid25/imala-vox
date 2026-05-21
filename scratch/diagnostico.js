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
  console.log("=== Diagnóstico de Firebase (Canales y Conversaciones) ===");
  const spaces = await db.collection('espaciosDeTrabajo').get();
  
  for (const ws of spaces.docs) {
    const wsId = ws.id;
    console.log(`\nWorkspace: ${wsId}`);
    
    // Canales
    const canalesSnap = await db.collection('espaciosDeTrabajo').doc(wsId).collection('canales').get();
    console.log(`  Canales (${canalesSnap.size}):`);
    canalesSnap.forEach(c => {
      const data = c.data();
      console.log(`    - ID: ${c.id}, Tipo: ${data.tipo}, Nombre: ${data.nombre}, WhatsAppID: ${data.metaPhoneNumberId || 'N/A'}`);
    });
    
    // Conversaciones
    const convsSnap = await db.collection('espaciosDeTrabajo').doc(wsId).collection('conversaciones').orderBy('ultimaActividad', 'desc').limit(5).get();
    console.log(`  Últimas Conversaciones (${convsSnap.size}):`);
    convsSnap.forEach(c => {
      const data = c.data();
      console.log(`    - ID: ${c.id}, ContactoID: ${data.contactoId}, Canal: ${data.canal}, CanalID: ${data.canalId}, Estado: ${data.estado}`);
    });
  }
}

run().catch(console.error);

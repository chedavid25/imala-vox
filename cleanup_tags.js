const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function cleanup() {
  const spaces = await db.collection('espaciosDeTrabajo').get();
  for (const ws of spaces.docs) {
    const wsId = ws.id;
    console.log(`Cleaning workspace: ${wsId}`);

    // etiquetasCRM
    const tagsSnap = await db.collection('espaciosDeTrabajo').doc(wsId).collection('etiquetasCRM').get();
    if (!tagsSnap.empty) {
      const batch = db.batch();
      tagsSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`- Deleted ${tagsSnap.size} tags from etiquetasCRM`);
    }

    // contactos.etiquetas
    const contactsSnap = await db.collection('espaciosDeTrabajo').doc(wsId).collection('contactos').get();
    if (!contactsSnap.empty) {
      const contactBatch = db.batch();
      contactsSnap.forEach(d => {
        contactBatch.update(d.ref, { etiquetas: [] });
      });
      await contactBatch.commit();
      console.log(`- Cleared tags for ${contactsSnap.size} contacts`);
    }
  }
  console.log("Cleanup finished.");
}

cleanup().catch(console.error);

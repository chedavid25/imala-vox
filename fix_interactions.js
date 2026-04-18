const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

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

async function fixLastInteraction() {
  const spaces = await db.collection('espaciosDeTrabajo').get();
  for (const ws of spaces.docs) {
    const wsId = ws.id;
    const contactsSnap = await db.collection('espaciosDeTrabajo').doc(wsId).collection('contactos').get();
    
    if (!contactsSnap.empty) {
      const batch = db.batch();
      contactsSnap.forEach(d => {
        const data = d.data();
        if (!data.ultimaInteraccion) {
          batch.update(d.ref, { 
            ultimaInteraccion: admin.firestore.FieldValue.serverTimestamp() 
          });
        }
      });
      await batch.commit();
      console.log(`Updated last interaction for ${contactsSnap.size} contacts in ${wsId}`);
    }
  }
}

fixLastInteraction().catch(console.error);

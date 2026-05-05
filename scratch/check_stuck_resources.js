const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkProcesando() {
  console.log("Buscando todos los recursos...");
  const snapshot = await db.collectionGroup('baseConocimiento')
    .get();

  if (snapshot.empty) {
    console.log("No se encontraron recursos.");
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('---');
    console.log(`ID: ${doc.id}`);
    console.log(`Workspace: ${doc.ref.parent.parent.id}`);
    console.log(`Estado: ${data.estado}`);
    console.log(`URL: ${data.webUrl}`);
    console.log(`Creado El: ${data.creadoEl?.toDate()}`);
    console.log(`Error Info: ${data.errorInfo || 'N/A'}`);
  });
}

checkProcesando().catch(console.error);

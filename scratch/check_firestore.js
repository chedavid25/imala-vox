const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
  console.log("Checking baseConocimiento...");
  const wsSnap = await db.collection('espaciosDeTrabajo').get();
  for (const ws of wsSnap.docs) {
    const wsId = ws.id;
    const knowledgeSnap = await db.collection(`espaciosDeTrabajo/${wsId}/baseConocimiento`).where('tipo', '==', 'web').get();
    for (const doc of knowledgeSnap.docs) {
      const data = doc.data();
      console.log(`Workspace: ${wsId}, Resource: ${doc.id}, Title: ${data.titulo}, Status: ${data.estado}, Catalog Type: ${data.tipoCatalogo}`);
      if (data.errorInfo) console.log(`  Error: ${data.errorInfo}`);
      if (data.contenidoTexto) {
        console.log(`  Content length: ${data.contenidoTexto.length}`);
      } else {
        console.log(`  NO CONTENT TEXT`);
      }
      
      const objectsSnap = await db.collection(`espaciosDeTrabajo/${wsId}/objetos`).where('recursoOrigenId', '==', doc.id).get();
      console.log(`  Objects found: ${objectsSnap.size}`);
    }
  }
}

checkData().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

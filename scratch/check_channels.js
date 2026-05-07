
const { adminDb } = require('./src/lib/firebase-admin');

async function listAllChannels() {
  try {
    const snap = await adminDb.collectionGroup('canales').get();
    console.log(`Found ${snap.docs.length} channels total.`);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}, Tipo: ${data.tipo}, Status: ${data.status}, Workspace: ${doc.ref.parent.parent.id}`);
    });
  } catch (err) {
    console.error(err);
  }
}

listAllChannels();

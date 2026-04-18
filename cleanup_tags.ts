import { adminDb } from './src/lib/firebase-admin.ts';
import { COLLECTIONS } from './src/lib/types/firestore.ts';

async function cleanup() {
  const workspaces = await adminDb.collection(COLLECTIONS.ESPACIOS).get();
  for (const ws of workspaces.docs) {
    const wsId = ws.id;
    console.log(`Cleaning workspace: ${wsId}`);

    // 1. Delete labels in etiquetasCRM
    const tagsSnap = await adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection('etiquetasCRM').get();
    if (!tagsSnap.empty) {
        const batch = adminDb.batch();
        tagsSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Deleted ${tagsSnap.size} tags from etiquetasCRM`);
    }

    // 2. Clear etiquetas array in contacts
    const contactsSnap = await adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection(COLLECTIONS.CONTACTOS).get();
    if (!contactsSnap.empty) {
        const contactBatch = adminDb.batch();
        contactsSnap.forEach(doc => {
          contactBatch.update(doc.ref, { etiquetas: [] });
        });
        await contactBatch.commit();
        console.log(`Cleared tags for ${contactsSnap.size} contacts`);
    }
  }
  console.log("Cleanup finished.");
}

cleanup().catch(console.error);

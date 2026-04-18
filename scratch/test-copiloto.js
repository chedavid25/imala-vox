const admin = require('firebase-admin');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyStr = env.split('FIREBASE_SERVICE_ACCOUNT_KEY=\\'')[1].split('\\'')[0];
const key = JSON.parse(keyStr);
admin.initializeApp({ credential: admin.credential.cert(key) });

async function run() {
  const ag = await admin.firestore().collectionGroup('agentes').where(admin.firestore.FieldPath.documentId(), '==', 'qTI7Ir27fhgxt8auhSfm').get();
  console.log('AGENTE modoDefault:', ag.docs[0].data().modoDefault);
  const cv = await admin.firestore().collectionGroup('conversaciones').where(admin.firestore.FieldPath.documentId(), '==', 'kLziOFTCjAVWhHwOf1ki').get();
  console.log('CONV modoIA:', cv.docs[0].data().modoIA);
  process.exit();
}
run();

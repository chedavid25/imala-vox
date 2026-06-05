const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    const workspacesSnap = await db.collection('espaciosDeTrabajo').get();
    if (workspacesSnap.empty) {
      console.log('No se encontraron workspaces.');
      return;
    }

    for (const wsDoc of workspacesSnap.docs) {
      const wsId = wsDoc.id;
      console.log(`\n--- Buscando en Workspace: ${wsDoc.data().nombre} (ID: ${wsId}) ---`);

      const convsSnap = await db.collection(`espaciosDeTrabajo/${wsId}/conversaciones`)
        .orderBy('ultimaActividad', 'desc')
        .limit(5)
        .get();

      if (convsSnap.empty) {
        console.log('No se encontraron conversaciones en este workspace.');
        continue;
      }

      convsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  Conversación ID: ${doc.id}`);
        console.log('  Último Mensaje:', data.ultimoMensaje);
        console.log('  Último Mensaje Cliente El:', data.ultimoMensajeClienteEl ? data.ultimoMensajeClienteEl.toDate() : 'N/A');
        console.log('  Primer Mensaje Cliente El:', data.primerMensajeClienteEl ? data.primerMensajeClienteEl.toDate() : 'N/A');
        console.log('  Tiempo Primera Respuesta:', data.tiempoPrimeraRespuesta);
        console.log('  Respuestas Humano Contador:', data.respuestasHumanoContador);
        console.log('  Tiempo Respuesta Humano Acumulado:', data.tiempoRespuestaHumanoAcumulado);
        console.log('  Respuestas IA Contador:', data.respuestasIAContador);
        console.log('  Tiempo Respuesta IA Acumulado:', data.tiempoRespuestaIAAcumulado);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

run();

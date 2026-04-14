/**
 * Firebase Admin SDK — para uso exclusivo en Server Actions y API Routes.
 * NUNCA importar este archivo desde componentes del cliente.
 *
 * Requiere la variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY con el
 * contenido JSON minificado de la service account (sin saltos de línea).
 *
 * Para configurarla localmente, ejecuta en la raíz del proyecto:
 *   node -e "const j=require('./firebase-service-account.json'); process.stdout.write('FIREBASE_SERVICE_ACCOUNT_KEY='+JSON.stringify(j))" >> .env.local
 */
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error(
      "Firebase Admin: Variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY no encontrada. " +
      "Agregá el contenido JSON de la service account a .env.local"
    );
  }

  const serviceAccount = JSON.parse(serviceAccountKey);
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminApp = initAdminApp();
export const adminDb = getFirestore(adminApp);

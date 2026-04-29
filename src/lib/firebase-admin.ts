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

  let serviceAccountKeyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;
  
  if (!serviceAccountKeyB64) {
    console.error("❌ Firebase Admin: Variable FIREBASE_SERVICE_ACCOUNT_KEY_B64 no encontrada.");
    throw new Error("Firebase Admin: Variable de entorno no encontrada.");
  }

  try {
    // Limpiar posibles comillas o espacios accidentales
    serviceAccountKeyB64 = serviceAccountKeyB64.trim().replace(/^["']|["']$/g, '');
    
    // Decodificar Base64 a string
    const decodedKey = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(decodedKey);
    
    // IMPORTANTE: Asegurarse de que los saltos de línea literales se conviertan a saltos de línea reales (\n)
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    console.log("🔥 Firebase Admin: Inicializado con éxito para el proyecto", serviceAccount.project_id);

    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error: any) {
    console.error("❌ Error CRÍTICO al inicializar Firebase Admin:", error.message);
    throw new Error(`Error al inicializar Firebase Admin: ${error.message}`);
  }
}

const adminApp = initAdminApp();
export const adminDb = getFirestore(adminApp);

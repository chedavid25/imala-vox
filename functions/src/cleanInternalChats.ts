import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Cloud Function que corre diariamente a las 03:00 AM para limpiar chats de equipo de más de 60 días
export const cleanOldInternalChats = functions.pubsub
  .schedule("0 3 * * *")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async (context) => {
    const db = admin.firestore();
    const sesentaDiasAtras = new Date();
    sesentaDiasAtras.setDate(sesentaDiasAtras.getDate() - 60);

    const timestampLimite = admin.firestore.Timestamp.fromDate(sesentaDiasAtras);
    console.log(`Iniciando limpieza de chats de equipo. Eliminando mensajes anteriores a: ${sesentaDiasAtras.toISOString()}`);

    try {
      // Buscar todos los espacios (workspaces)
      const espaciosSnap = await db.collection("espaciosDeTrabajo").get();
      let totalEliminados = 0;

      for (const espacioDoc of espaciosSnap.docs) {
        const workspaceId = espacioDoc.id;
        const chatsEquipoRef = db.collection("espaciosDeTrabajo").doc(workspaceId).collection("chatsEquipo");
        const chatsSnap = await chatsEquipoRef.get();

        for (const chatDoc of chatsSnap.docs) {
          const chatId = chatDoc.id;
          const mensajesRef = chatsEquipoRef.doc(chatId).collection("mensajes");
          
          // Buscar mensajes más viejos que 60 días
          const oldMessagesSnap = await mensajesRef
            .where("creadoEl", "<", timestampLimite)
            .get();

          if (oldMessagesSnap.empty) continue;

          console.log(`Espacio: ${workspaceId}, Chat: ${chatId} - Encontrados ${oldMessagesSnap.size} mensajes para eliminar.`);

          // Eliminar por lotes (batches) para evitar límites de Firestore
          const chunks = chunkArray(oldMessagesSnap.docs, 400);
          for (const chunk of chunks) {
            const batch = db.batch();
            chunk.forEach((docSnap) => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
            totalEliminados += chunk.length;
          }
        }
      }

      console.log(`Limpieza completada exitosamente. Total de mensajes eliminados: ${totalEliminados}`);
      return { success: true, eliminados: totalEliminados };
    } catch (error) {
      console.error("Error ejecutando la limpieza de chats de equipo:", error);
      throw error;
    }
  });

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

"use server";

import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";

// Polyfill para evitar error "DOMMatrix is not defined" en pdf-parse
if (typeof global.DOMMatrix === "undefined") {
  // @ts-ignore
  global.DOMMatrix = class DOMMatrix {};
}

export async function subirYProcesarArchivoAction(
  wsId: string,
  formData: FormData
) {
  try {
    const file = formData.get("file") as File;
    if (!file || !wsId) throw new Error("Faltan datos de archivo o workspace.");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let extractedText = "";

    // 1. Extraer texto según el tipo de archivo (Carga diferida de librerías)
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const pdf = require("pdf-parse");
      const data = await pdf(buffer);
      extractedText = data.text;
    } 
    else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } 
    else if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      extractedText = buffer.toString("utf-8");
    } 
    else {
      throw new Error("Formato de archivo no soportado para extracción de texto.");
    }

    if (!extractedText.trim()) {
      throw new Error("No se pudo extraer texto legible del archivo.");
    }

    // 2. Subir a Firebase Storage si está configurado
    let archivoUrl: string | null = null;
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (bucketName) {
      try {
        const token = crypto.randomUUID();
        const bucket = adminStorage.bucket(bucketName);
        const storagePath = `workspaces/${wsId}/conocimiento/${Date.now()}_${file.name}`;
        const fileRef = bucket.file(storagePath);
        
        await fileRef.save(buffer, { 
          metadata: { contentType: file.type || "application/octet-stream" }, 
          resumable: false 
        });
        
        await fileRef.setMetadata({ 
          metadata: { firebaseStorageDownloadTokens: token } 
        });
        
        const encodedPath = encodeURIComponent(storagePath);
        archivoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
      } catch (storageErr) {
        console.error("Error al subir archivo a Storage:", storageErr);
      }
    }

    // 3. Guardar en Firestore (Base de Conocimiento Global)
    const docRef = await adminDb
      .collection(COLLECTIONS.ESPACIOS)
      .doc(wsId)
      .collection(COLLECTIONS.CONOCIMIENTO)
      .add({
        tipo: 'archivo',
        titulo: file.name,
        archivoNombre: file.name,
        archivoTamano: file.size,
        archivoTipo: file.type,
        archivoUrl, // URL del archivo en Storage
        contenidoTexto: extractedText, // AQUí ESTÁ EL CEREBRO
        estado: 'activo',
        descripcion: `Archivo procesado automáticamente: ${file.name}`,
        creadoEl: Timestamp.now(),
        actualizadoEl: Timestamp.now(),
        creadoPor: "admin"
      });

    return {
      success: true,
      id: docRef.id,
      message: "Archivo procesado y guardado correctamente."
    };

  } catch (error: any) {
    console.error("Error procesando conocimiento:", error);
    return {
      success: false,
      error: error.message || "Error al procesar el archivo."
    };
  }
}


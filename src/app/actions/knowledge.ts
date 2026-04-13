"use server";

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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

    // 2. Guardar en Firestore (Base de Conocimiento Global)
    const docRef = await addDoc(collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONOCIMIENTO), {
      tipo: 'archivo',
      titulo: file.name,
      archivoNombre: file.name,
      archivoTamano: file.size,
      archivoTipo: file.type,
      contenidoTexto: extractedText, // AQUí ESTÁ EL CEREBRO
      estado: 'activo',
      descripcion: `Archivo procesado automáticamente: ${file.name}`,
      creadoEl: serverTimestamp(),
      actualizadoEl: serverTimestamp(),
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

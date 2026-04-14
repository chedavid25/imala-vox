"use server";

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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

export async function scrapearWebAction(
  wsId: string,
  recursoId: string,
  url: string
) {
  try {
    if (!wsId || !recursoId || !url) throw new Error("Faltan parámetros de scraping.");

    const docRef = doc(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONOCIMIENTO, recursoId);

    // 1. Marcar como procesando
    await updateDoc(docRef, { 
      estado: 'procesando',
      errorMensaje: null 
    });

    console.log(`Iniciando scraping profundo vía Cloud Function para: ${url}`);
    
    // 2. Ejecutar la función en la nube
    const functions = getFunctions();
    const scrapeFunc = httpsCallable(functions, 'ejecutarScrapingWeb');
    
    const result: any = await scrapeFunc({ wsId, recursoId, url });

    if (!result.data?.success) {
      throw new Error(result.data?.error || "Error desconocido en la Cloud Function.");
    }

    return {
      success: true,
      message: `Scraping completado. Se indexaron ${result.data.propertyCount} propiedades.`
    };

  } catch (error: any) {
    console.error("Error en scrapearWebAction:", error);
    
    // Registrar el error en el documento para que el usuario lo vea
    if (recursoId && wsId) {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONOCIMIENTO, recursoId);
      await updateDoc(docRef, { 
        estado: 'error',
        errorMensaje: error.message 
      });
    }

    return {
      success: false,
      error: error.message || "Error al procesar el sitio web."
    };
  }
}

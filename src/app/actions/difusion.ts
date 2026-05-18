"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";

export async function despacharCampaña(wsId: string, campañaId: string) {
  await adminDb
    .doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.DIFUSIONES}/${campañaId}`)
    .update({
      estado: "en_progreso",
      actualizadoEl: Timestamp.now(),
    });
}

export async function cancelarCampaña(wsId: string, campañaId: string) {
  await adminDb
    .doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.DIFUSIONES}/${campañaId}`)
    .update({
      estado: "pausada",
      actualizadoEl: Timestamp.now(),
    });
}

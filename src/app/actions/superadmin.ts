'use server'

import { SignJWT } from 'jose';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS, PlataformaConfig } from '@/lib/types/firestore';
import { cookies } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';

const secretKey = process.env.ADMIN_JWT_SECRET;
if (!secretKey && process.env.NODE_ENV === 'production') {
  throw new Error('ADMIN_JWT_SECRET env var is required in production');
}
const ADMIN_JWT_SECRET = new TextEncoder().encode(secretKey || 'fallback-secret-dev-only');

// --- HELPERS ---

/**
 * Función para serializar recursivamente los Timestamps de Firestore
 * y otros tipos complejos para que Next.js los acepte en Client Components.
 */
const serializeFirestoreData = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Si es un Timestamp de Firestore
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeFirestoreData);
  }
  
  const res: any = {};
  Object.keys(obj).forEach(key => {
    res[key] = serializeFirestoreData(obj[key]);
  });
  return res;
};

// --- AUTH ACTIONS ---

export async function verificarYSetearAdmin(uid: string, email?: string): Promise<boolean> {
  try {
    const configSnap = await adminDb.doc(COLLECTIONS.PLATAFORMA_CONFIG).get();
    const config = configSnap.data() as PlataformaConfig | undefined;
    const uidsPermitidos = config?.superAdminUids || [];
    const emailsPermitidos = config?.adminEmails || [];

    const esAdminPorUid = uidsPermitidos.includes(uid);
    const esAdminPorEmail = !!(email && emailsPermitidos.includes(email));
    const esAdmin = esAdminPorUid || esAdminPorEmail;

    // Si es admin por email pero el UID no está registrado aún, lo agrega automáticamente
    if (esAdminPorEmail && !esAdminPorUid) {
      await adminDb.doc(COLLECTIONS.PLATAFORMA_CONFIG).update({
        superAdminUids: [...uidsPermitidos, uid],
      });
    }

    if (esAdmin) {
      const token = await new SignJWT({ uid })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('8h')
        .sign(ADMIN_JWT_SECRET);

      const cookieStore = await cookies();
      cookieStore.set('imala-admin-session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 8,
        path: '/',
        sameSite: 'lax',
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error verificando admin:", error);
    return false;
  }
}

export async function removerSesionAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('imala-admin-session');
}

// --- DATA ACTIONS ---

export async function obtenerMetricasSuperAdmin() {
  try {
    const wsSnap = await adminDb.collection(COLLECTIONS.ESPACIOS).get();
    const workspaces = wsSnap.docs.map(d => ({
      ...serializeFirestoreData(d.data()),
      id: d.id
    }));

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const activos = workspaces.filter(w => w.estado === 'activo');
    const enPrueba = workspaces.filter(w => w.estado === 'prueba');
    const cancelados = workspaces.filter(w => w.estado === 'cancelado');
    const nuevosEsteMes = workspaces.filter(w => 
      w.creadoEl ? new Date(w.creadoEl) >= inicioMes : false
    );

    const mrr = activos.reduce((acc: number, w: any) => {
      return acc + (w.facturacion?.precioUSD || 0);
    }, 0);

    return {
      workspaces,
      metricas: {
        mrr,
        arr: mrr * 12,
        totalWorkspaces: workspaces.length,
        workspacesActivos: activos.length,
        workspacesEnPrueba: enPrueba.length,
        workspacesCancelados: cancelados.length,
        nuevosEsteMes: nuevosEsteMes.length,
        churnEsteMes: cancelados.filter((w: any) => 
          w.actualizadoEl ? new Date(w.actualizadoEl) >= inicioMes : false
        ).length,
      }
    };
  } catch (error) {
    console.error("Error obteniendo métricas superadmin:", error);
    throw new Error("No se pudieron obtener las métricas.");
  }
}

export async function obtenerEventosFacturacionGlobales() {
  try {
    const snap = await adminDb.collectionGroup(COLLECTIONS.EVENTOS_FACT)
      .orderBy("creadoEl", "desc")
      .limit(100)
      .get();
    
    return snap.docs.map(doc => ({
      id: doc.id,
      wsId: doc.ref.parent.parent?.id,
      ...serializeFirestoreData(doc.data())
    }));
  } catch (error) {
    console.error("Error eventos facturacion:", error);
    return [];
  }
}

export async function obtenerEventosGlobales() {
  try {
    const snap = await adminDb.collectionGroup("eventosFact") 
      .orderBy("creadoEl", "desc")
      .limit(200)
      .get();

    return snap.docs.map(doc => ({
      id: doc.id,
      wsId: doc.ref.parent.parent?.id,
      ...serializeFirestoreData(doc.data())
    }));
  } catch (error) {
    console.error("Error eventos globales:", error);
    return [];
  }
}

// --- MANAGEMENT ACTIONS ---

export async function cambiarPlanManual(wsId: string, plan: string) {
  await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
    plan,
    actualizadoEl: Timestamp.now()
  });
  return { success: true };
}

export async function extenderPrueba(wsId: string, diasExtra: number) {
  const wsDoc = adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`);
  const wsSnap = await wsDoc.get();
  const data = wsSnap.data();
  
  const currentEnd = data?.pruebaTerminaEl?.toDate() || new Date();
  const newEnd = new Date(currentEnd.getTime() + (diasExtra * 86400000));
  
  await wsDoc.update({
    pruebaTerminaEl: Timestamp.fromDate(newEnd),
    actualizadoEl: Timestamp.now()
  });
  return { success: true };
}

export async function bloquearWorkspace(wsId: string) {
  await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
    estado: 'cancelado',
    actualizadoEl: Timestamp.now()
  });
  return { success: true };
}

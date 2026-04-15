'use server'

import { SignJWT } from 'jose';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS, PlataformaConfig } from '@/lib/types/firestore';
import { cookies } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';

const ADMIN_JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'fallback-secret-imala-vox-2026');

export async function verificarYSetearAdmin(uid: string): Promise<boolean> {
  try {
    const configSnap = await adminDb.doc(COLLECTIONS.PLATAFORMA_CONFIG).get();
    const config = configSnap.data() as PlataformaConfig | undefined;
    const esAdmin = config?.superAdminUids?.includes(uid) || false;

    if (esAdmin) {
      // Crear JWT firmado
      const token = await new SignJWT({ uid })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('8h')
        .sign(ADMIN_JWT_SECRET);

      // Setear cookie de sesión admin (httpOnly, 8 horas)
      const cookieStore = await cookies();
      cookieStore.set('imala-admin-session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 8,
        path: '/',
      });
    }

    return esAdmin;
  } catch (error) {
    console.error("Error verificando admin:", error);
    return false;
  }
}

export async function removerSesionAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('imala-admin-session');
}

export async function obtenerMetricasSuperAdmin() {
  try {
    // Obtener todos los workspaces
    const wsSnap = await adminDb.collection(COLLECTIONS.ESPACIOS).get();
    const workspaces = wsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const activos = workspaces.filter(w => w.estado === 'activo');
    const enPrueba = workspaces.filter(w => w.estado === 'prueba');
    const cancelados = workspaces.filter(w => w.estado === 'cancelado');
    const nuevosEsteMes = workspaces.filter(w => 
      w.creadoEl?.toDate() >= inicioMes
    );

    // Calcular MRR
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
          w.actualizadoEl?.toDate() >= inicioMes
        ).length,
      }
    };
  } catch (error) {
    console.error("Error obteniendo métricas superadmin:", error);
    throw new Error("No se pudieron obtener las métricas.");
  }
}

// ACCIONES MANUALES
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
    estado: 'prueba',
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

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const configRef = adminDb.doc(COLLECTIONS.PLATAFORMA_CONFIG);
    
    // Configuración inicial por defecto
    const defaultConfig = {
      planes: {
        starter: {
          precioUSD: 19,
          precioARS: 22000,
          cotizacionUsada: 1150,
          fijadoEl: Timestamp.now(),
          convCountIA: 500
        },
        pro: {
          precioUSD: 49,
          precioARS: 56000,
          cotizacionUsada: 1150,
          fijadoEl: Timestamp.now(),
          convCountIA: 2000
        },
        agencia: {
          precioUSD: 149,
          precioARS: 171000,
          cotizacionUsada: 1150,
          fijadoEl: Timestamp.now(),
          convCountIA: 10000
        }
      },
      superAdminUids: ["WVyH5j52mJOOKr21H6M3THI67bZ2"], // Agregamos tu UID automáticamente
      overageRate: 0.018,
      trialDias: 7,
      proximoAjusteARS: Timestamp.fromDate(new Date(2026, 6, 1)), // Julio 2026
      configuracionGlobal: {
        mantenimiento: false,
        spreadARS: 1.10 // 10% de recargo sobre blue
      }
    };

    await configRef.set(defaultConfig, { merge: true });

    return NextResponse.json({ 
      success: true, 
      message: "¡Configuración de Imalá Vox completada con éxito!",
      detalles: "Se han creado los planes, precios y el acceso de SuperAdmin.",
      proximo_paso: "Ya puedes ir a http://localhost:3000/superadmin"
    });
  } catch (error: any) {
    console.error("Setup Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

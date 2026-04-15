'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS, EventoFacturacion } from '@/lib/types/firestore';
import { PLAN_LIMITS } from '@/lib/planLimits';
import { revalidatePath } from 'next/cache';

// --- OBTENER TOKEN DE ACCOSO (SANDBOX VS PROD) ---
const getMPAccessToken = () => {
  return process.env.NODE_ENV === 'development' 
    ? process.env.MP_ACCESS_TOKEN_TEST 
    : process.env.MP_ACCESS_TOKEN;
};

// ─── OBTENER COTIZACIÓN DÓLAR BLUE ───────────────────────────────────────────

export async function obtenerCotizacionBlue(): Promise<number> {
  try {
    const res = await fetch('https://api.bluelytics.com.ar/v2/latest', {
      next: { revalidate: 3600 } // cache 1 hora
    });
    const data = await res.json();
    return Math.round(data.blue?.value_sell || 1200);
  } catch {
    // Fallback a dolarapi.com
    try {
      const res2 = await fetch('https://dolarapi.com/v1/dolares/blue');
      const data2 = await res2.json();
      return Math.round(data2.venta || 1200);
    } catch {
      return 1200; // fallback hardcoded si ambas APIs fallan
    }
  }
}

// ─── CALCULAR PRECIO ARS ─────────────────────────────────────────────────────

export async function calcularPrecioARS(precioUSD: number, spread = 1.10): Promise<{
  precioARS: number;
  cotizacion: number;
}> {
  const cotizacion = await obtenerCotizacionBlue();
  return {
    precioARS: Math.round(precioUSD * cotizacion * spread),
    cotizacion,
  };
}

// ─── CREAR SUSCRIPCIÓN MERCADOPAGO ────────────────────────────────────────────

export async function crearSuscripcionMP(wsId: string, plan: 'starter' | 'pro' | 'agencia', ciclo: 'mensual' | 'anual') {
  try {
    const planConfig = PLAN_LIMITS[plan];
    const precioUSD = ciclo === 'anual'
      ? planConfig.priceYearly   
      : planConfig.priceMonthly;

    const { precioARS, cotizacion } = await calcularPrecioARS(precioUSD);
    const accessToken = getMPAccessToken();

    if (!accessToken) throw new Error("MercadoPago Access Token not configured");

    // Crear suscripción en MercadoPago
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: `Imalá Vox — Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${ciclo})`,
        auto_recurring: {
          frequency: ciclo === 'anual' ? 12 : 1,
          frequency_type: 'months', 
          transaction_amount: ciclo === 'anual' ? Math.round(precioARS * 12) : precioARS,
          currency_id: 'ARS',
        },
        back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ajustes/facturacion`,
        status: 'pending',
      }),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      throw new Error(`MP Error: ${err}`);
    }

    const mpData = await mpRes.json();

    // Actualizar workspace con datos de facturación
    await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
      'facturacion.metodo': 'mercadopago',
      'facturacion.moneda': 'ARS',
      'facturacion.precioUSD': precioUSD,
      'facturacion.precioARS': precioARS,
      'facturacion.cotizacionUsada': cotizacion,
      'facturacion.precioFijadoEl': Timestamp.now(),
      'facturacion.mpSuscripcionId': mpData.id,
      'facturacion.ciclo': ciclo,
      'facturacion.proximaActualizacion': calcularProximoTrimestre(),
      plan,
      actualizadoEl: Timestamp.now(),
    });

    // Registrar evento de facturación
    await registrarEventoFact(wsId, {
      tipo: 'suscripcion_creada',
      monto: precioARS,
      montoUSD: precioUSD,
      cotizacionUsada: cotizacion,
      mpSuscripcionId: mpData.id,
      descripcion: `Suscripción Plan ${plan} ${ciclo} creada`,
    });

    return { success: true, initPoint: mpData.init_point, suscripcionId: mpData.id };
  } catch (error: any) {
    console.error("Error en crearSuscripcionMP:", error);
    return { success: false, error: error.message };
  }
}

// ─── CANCELAR SUSCRIPCIÓN ────────────────────────────────────────────────────

export async function cancelarSuscripcionMP(wsId: string) {
  try {
    const wsSnap = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).get();
    const ws = wsSnap.data();
    const suscripcionId = ws?.facturacion?.mpSuscripcionId;
    const accessToken = getMPAccessToken();

    if (suscripcionId && accessToken) {
      await fetch(`https://api.mercadopago.com/preapproval/${suscripcionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
    }

    await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
      estado: 'cancelado',
      actualizadoEl: Timestamp.now(),
    });

    await registrarEventoFact(wsId, {
      tipo: 'suscripcion_cancelada',
      monto: 0,
      montoUSD: 0,
      descripcion: 'Suscripción cancelada por el usuario',
    });

    revalidatePath('/dashboard/ajustes/facturacion');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── CAMBIO DE PLAN ──────────────────────────────────────────────────────────

export async function cambiarPlan(wsId: string, planNuevo: 'starter' | 'pro' | 'agencia') {
  try {
    const wsSnap = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).get();
    const ws = wsSnap.data();
    const planAnterior = ws?.plan;
    const suscripcionId = ws?.facturacion?.mpSuscripcionId;
    const accessToken = getMPAccessToken();

    // Cancelar suscripción anterior en MP
    if (suscripcionId && accessToken) {
      await fetch(`https://api.mercadopago.com/preapproval/${suscripcionId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${accessToken}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
    }

    // Crear nueva suscripción con el nuevo plan
    const resultado = await crearSuscripcionMP(wsId, planNuevo, ws?.facturacion?.ciclo || 'mensual');

    if (!resultado.success) throw new Error(resultado.error);

    await registrarEventoFact(wsId, {
      tipo: (planNuevo === 'agencia' || (planNuevo === 'pro' && planAnterior === 'starter')) ? 'upgrade' : 'downgrade',
      monto: 0,
      montoUSD: PLAN_LIMITS[planNuevo].priceMonthly,
      planAnterior,
      planNuevo,
      descripcion: `Cambio de plan: ${planAnterior} → ${planNuevo}`,
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/ajustes/facturacion');
    return { success: true, initPoint: resultado.initPoint };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function calcularProximoTrimestre(): Timestamp {
  const hoy = new Date();
  const mes = hoy.getMonth();
  // Trimestres: enero(0), abril(3), julio(6), octubre(9)
  const trimestres = [0, 3, 6, 9];
  const proximo = trimestres.find(t => t > mes) ?? 0;
  const anio = proximo === 0 ? hoy.getFullYear() + 1 : hoy.getFullYear();
  return Timestamp.fromDate(new Date(anio, proximo, 1));
}

async function registrarEventoFact(wsId: string, evento: Partial<EventoFacturacion>) {
  await adminDb
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)
    .collection(COLLECTIONS.EVENTOS_FACT)
    .add({ ...evento, creadoEl: Timestamp.now() });
}

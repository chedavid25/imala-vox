'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS, EventoFacturacion } from '@/lib/types/firestore';
import { PLAN_LIMITS } from '@/lib/planLimits';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

// --- OBTENER TOKEN DE ACCOSO (SANDBOX VS PROD) ---
const getMPAccessToken = () => {
  const token = process.env.NODE_ENV === 'development' 
    ? process.env.MP_ACCESS_TOKEN_TEST 
    : process.env.MP_ACCESS_TOKEN;
  return token?.trim();
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

    const wsSnap = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).get();
    if (!wsSnap.exists) throw new Error("Workspace not found");
    const ws = wsSnap.data() as any;

    // Cancelar suscripción existente para evitar cobros duplicados.
    // Esto cubre el caso pago_vencido donde el cliente elige otro plan o tarjeta.
    const existingSubId = ws.facturacion?.mpSuscripcionId;
    if (existingSubId && accessToken) {
      try {
        await fetch(`https://api.mercadopago.com/preapproval/${existingSubId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } catch {
        // Si ya estaba cancelada o no existe, continuar igual
      }
    }

    // MercadoPago requiere HTTPS para el back_url en suscripciones, incluso en sandbox.
    // Usamos una URL de dominio válido como fallback para desarrollo.
    const backUrl = process.env.NODE_ENV === 'development'
      ? 'https://imala-vox.vercel.app/dashboard/ajustes/facturacion'
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ajustes/facturacion`;

    // MercadoPago requiere obligatoriamente un payer_email para suscripciones.
    // Usamos el de prueba en desarrollo (asegurando formato mail) y el del propietario en producción.
    let devPayerEmail = process.env.MP_TEST_USER_EMAIL || 'test_user_imala_checkout@testuser.com';
    if (process.env.NODE_ENV === 'development' && !devPayerEmail.includes('@')) {
      devPayerEmail = `${devPayerEmail}@testuser.com`;
    }

    const payerEmail = process.env.NODE_ENV === 'development'
      ? devPayerEmail
      : (ws.propietarioEmail || ws.email || null);

    const transactionAmount = ciclo === 'anual'
      ? Math.round(precioARS * 12)
      : precioARS;

    if (!transactionAmount || transactionAmount <= 0) {
      throw new Error(`Monto inválido calculado: ${transactionAmount} ARS (cotizacion: ${cotizacion})`);
    }

    const mpBody: Record<string, unknown> = {
      reason: `Imala Vox ${plan} ${ciclo}`,
      auto_recurring: {
        frequency: ciclo === 'anual' ? 12 : 1,
        frequency_type: 'months',
        transaction_amount: transactionAmount,
        currency_id: 'ARS',
      },
      back_url: backUrl,
    };

    // payer_email es opcional en preapproval — omitirlo si es indefinido
    // evita el error 500 cuando seller y buyer tienen el mismo email
    if (payerEmail) {
      mpBody.payer_email = payerEmail;
    }

    console.log("[billing] Creando preapproval MP:", JSON.stringify({
      plan, ciclo, precioARS, transactionAmount, payerEmail, backUrl, env: process.env.NODE_ENV
    }));

    // Crear suscripción en MercadoPago
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mpBody),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.error("[billing] MP API Error:", mpRes.status, err);
      console.error("[billing] Request body was:", JSON.stringify(mpBody));
      throw new Error(`MP Error ${mpRes.status}: ${err}`);
    }

    const mpData = await mpRes.json();

    // Actualizar workspace con datos de facturación PERO NO CAMBIAR EL PLAN AÚN
    // El plan solo se cambiará cuando el webhook de MP confirme el pago.
    // Actualizar workspace con la "intención" de suscripción.
    // IMPORTANTE: NO actualizamos facturacion.precioUSD ni precioARS acá.
    // Esos campos se actualizarán en el Webhook solo cuando el pago esté confirmado.
    await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
      'facturacion.metodo': 'mercadopago',
      'facturacion.moneda': 'ARS',
      'facturacion.mpSuscripcionId': mpData.id,
      'facturacion.ciclo': ciclo,
      'facturacion.planPendiente': plan,
      cancelacionPendiente: false,
      cancelaEl: null,
      actualizadoEl: Timestamp.now(),
    });

    // Registrar evento de intención
    await registrarEventoFact(wsId, {
      tipo: 'suscripcion_creada',
      monto: precioARS,
      montoUSD: precioUSD,
      cotizacionUsada: cotizacion,
      mpSuscripcionId: mpData.id,
      descripcion: `Intención de suscripción Plan ${plan} ${ciclo} creada (Pendiente de pago)`,
    });

    return { success: true, initPoint: mpData.init_point, suscripcionId: mpData.id };
  } catch (error: any) {
    console.error("Error en crearSuscripcionMP:", error);
    return { success: false, error: error.message };
  }
}

// ─── SINCRONIZAR ESTADO DESDE MERCADOPAGO ────────────────────────────────────
// Útil cuando el webhook no llega: consulta MP directamente y actualiza el plan.

export async function sincronizarSuscripcionMP(wsId: string) {
  try {
    const wsSnap = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).get();
    if (!wsSnap.exists) throw new Error("Workspace no encontrado");

    const ws = wsSnap.data() as any;
    const suscripcionId = ws.facturacion?.mpSuscripcionId;
    if (!suscripcionId) throw new Error("No hay suscripción MP registrada para este workspace");

    const accessToken = getMPAccessToken();
    if (!accessToken) throw new Error("Access Token de MP no configurado");

    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${suscripcionId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      throw new Error(`MP API error: ${err}`);
    }

    const suscripcion = await mpRes.json();
    console.log(`[billing] Sync MP status para ${wsId}: ${suscripcion.status}`);

    const estadoMap: Record<string, string> = {
      authorized: 'activo',
      paused: 'pago_vencido',
      cancelled: 'cancelado',
      pending: 'prueba',
    };

    const nuevoEstado = estadoMap[suscripcion.status] || 'pago_vencido';
    const ciclo = ws.facturacion?.ciclo || 'mensual';
    const periodoHasta = new Date();
    if (ciclo === 'anual') periodoHasta.setFullYear(periodoHasta.getFullYear() + 1);
    else periodoHasta.setMonth(periodoHasta.getMonth() + 1);

    const updates: any = {
      estado: nuevoEstado,
      periodoVigenteHasta: Timestamp.fromDate(periodoHasta),
      actualizadoEl: Timestamp.now(),
    };

    if (nuevoEstado === 'activo' && ws.facturacion?.planPendiente) {
      const planPend = ws.facturacion.planPendiente as 'starter' | 'pro' | 'agencia';
      const precioUSD = ciclo === 'anual' ? PLAN_LIMITS[planPend].priceYearly : PLAN_LIMITS[planPend].priceMonthly;
      updates.plan = planPend;
      updates['facturacion.planPendiente'] = null;
      updates['facturacion.precioUSD'] = precioUSD;
      updates['facturacion.precioARS'] = suscripcion.auto_recurring?.transaction_amount || 0;
      updates['facturacion.precioFijadoEl'] = Timestamp.now();
    }

    await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update(updates);

    if (nuevoEstado === 'activo' && updates.plan) {
      await registrarEventoFact(wsId, {
        tipo: 'pago_exitoso',
        monto: suscripcion.auto_recurring?.transaction_amount || 0,
        montoUSD: updates['facturacion.precioUSD'] || 0,
        mpSuscripcionId: suscripcionId,
        descripcion: `Sync manual: Plan ${updates.plan} activado (MP status: ${suscripcion.status})`,
      });

      await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`)
        .collection(COLLECTIONS.NOTIFICACIONES).add({
          tipo: 'info',
          titulo: 'Pago confirmado',
          mensaje: 'Tu suscripción está activa. ¡Gracias!',
          visto: false,
          creadoEl: Timestamp.now(),
        });
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/ajustes/facturacion');
    return { success: true, estado: nuevoEstado, plan: updates.plan || ws.plan, mpStatus: suscripcion.status };
  } catch (error: any) {
    console.error("[billing] Error en sincronizarSuscripcionMP:", error);
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

    // Cancelar en MercadoPago (detiene futuros cobros)
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

    // El acceso continúa hasta periodoVigenteHasta (ya fue abonado).
    // Solo marcamos cancelación pendiente; el gate bloquea cuando esa fecha pasa.
    const cancelaEl = ws?.periodoVigenteHasta ?? Timestamp.now();

    await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
      cancelacionPendiente: true,
      cancelaEl,
      actualizadoEl: Timestamp.now(),
    });

    await registrarEventoFact(wsId, {
      tipo: 'suscripcion_cancelada',
      monto: 0,
      montoUSD: 0,
      descripcion: `Suscripción cancelada por el usuario. Acceso vigente hasta ${cancelaEl.toDate().toLocaleDateString('es-AR')}`,
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

    // Comparación robusta de Upgrade/Downgrade usando índices de jerarquía
    const ORDEN_PLANES = { starter: 0, pro: 1, agencia: 2 };
    const esUpgrade = ORDEN_PLANES[planNuevo] > ORDEN_PLANES[planAnterior as keyof typeof ORDEN_PLANES];

    await registrarEventoFact(wsId, {
      tipo: esUpgrade ? 'upgrade' : 'downgrade',
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

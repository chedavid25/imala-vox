import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import { PLAN_LIMITS } from '@/lib/planLimits';
import crypto from 'crypto';

// --- OBTENER TOKEN DE ACCESO (SANDBOX VS PROD) ---
const getMPAccessToken = () => {
  return process.env.NODE_ENV === 'development' 
    ? process.env.MP_ACCESS_TOKEN_TEST 
    : process.env.MP_ACCESS_TOKEN;
};

export async function POST(request: NextRequest) {
  try {
    // --- VERIFICACIÓN DE FIRMA HMAC ---
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;

    if (xSignature && webhookSecret && webhookSecret !== 'xxxx') {
      try {
        const parts = xSignature.split(',');
        const tsPart = parts.find(p => p.startsWith('ts='));
        const v1Part = parts.find(p => p.startsWith('v1='));
        
        const ts = tsPart?.split('=')[1];
        const v1 = v1Part?.split('=')[1];
        
        if (ts && v1) {
          const manifest = `id:${xRequestId};request-date:${ts};`;
          const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
          
          if (v1 !== expected) {
            console.error("MP Webhook: Invalid HMAC Signature");
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
          }
        }
      } catch (err) {
        console.error("MP Webhook: Error parsing signature", err);
      }
    }

    const body = await request.json();
    const tipo = body.type;
    const dataId = body.data?.id;

    if (!dataId) return NextResponse.json({ ok: true });

    const accessToken = getMPAccessToken();
    if (!accessToken) {
      console.error("MP Webhook Error: Access Token not configured");
      return NextResponse.json({ ok: true }); // No bloqueamos a MP
    }

    if (tipo === 'subscription_preapproval') {
      // Obtener datos de la suscripción desde MP
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval/${dataId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      if (!mpRes.ok) {
        console.error(`MP Webhook Error fetching preapproval: ${mpRes.statusText}`);
        return NextResponse.json({ ok: true });
      }

      const suscripcion = await mpRes.json();

      // Buscar workspace por mpSuscripcionId
      const wsQuery = await adminDb
        .collection(COLLECTIONS.ESPACIOS)
        .where('facturacion.mpSuscripcionId', '==', dataId)
        .limit(1)
        .get();

      if (wsQuery.empty) {
        console.warn(`MP Webhook: No workspace found for suscripcion ${dataId}`);
        return NextResponse.json({ ok: true });
      }

      const wsDoc = wsQuery.docs[0];
      
      // Mapear estado MP → estado Imalá Vox
      const estadoMap: Record<string, string> = {
        'authorized': 'activo',
        'paused': 'pago_vencido',
        'cancelled': 'cancelado',
        'pending': 'prueba',
      };

      const nuevoEstado = estadoMap[suscripcion.status] || 'pago_vencido';

      // Calcular próximo período basándose en el ciclo (Opción A - Reinicio de ciclo)
      const wsData = wsDoc.data();
      const ciclo = wsData.facturacion?.ciclo || 'mensual';
      const periodoHasta = new Date();
      
      if (ciclo === 'anual') {
        periodoHasta.setFullYear(periodoHasta.getFullYear() + 1);
      } else {
        periodoHasta.setMonth(periodoHasta.getMonth() + 1);
      }

      const updates: any = {
        estado: nuevoEstado,
        periodoVigenteHasta: Timestamp.fromDate(periodoHasta),
        actualizadoEl: Timestamp.now(),
      };

      // Si el pago es exitoso, activamos el plan que estaba pendiente y fijamos el precio
      if (nuevoEstado === 'activo' && wsData.facturacion?.planPendiente) {
        const transAmount = suscripcion.auto_recurring?.transaction_amount || 0;
        
        updates.plan = wsData.facturacion.planPendiente;
        updates['facturacion.planPendiente'] = null; // Limpiamos el pendiente
        
        // Actualizamos los precios oficiales del workspace basados en este pago
        updates['facturacion.precioARS'] = transAmount;
        // El monto real en USD depende del ciclo (anual/mensual) y del plan
        const planPend = wsData.facturacion.planPendiente as 'starter' | 'pro' | 'agencia';
        const pUSD = (wsData.facturacion.ciclo === 'anual') ? PLAN_LIMITS[planPend].priceYearly : PLAN_LIMITS[planPend].priceMonthly;
        updates['facturacion.precioUSD'] = pUSD;
        updates['facturacion.precioFijadoEl'] = Timestamp.now();
      }

      await wsDoc.ref.update(updates);

      // Registrar evento
      await wsDoc.ref.collection(COLLECTIONS.EVENTOS_FACT).add({
        tipo: nuevoEstado === 'activo' ? 'pago_exitoso' : 'pago_fallido',
        monto: suscripcion.auto_recurring?.transaction_amount || 0,
        montoUSD: updates['facturacion.precioUSD'] || 0,
        mpPagoId: dataId,
        descripcion: `Webhook MP: suscripción ${suscripcion.status} - Activación de Plan ${updates.plan || wsData.plan}`,
        creadoEl: Timestamp.now(),
      });

      // Si se activó, crear notificación para el usuario
      if (nuevoEstado === 'activo') {
        await wsDoc.ref.collection(COLLECTIONS.NOTIFICACIONES).add({
          tipo: 'info',
          titulo: 'Pago confirmado',
          mensaje: 'Tu suscripción está activa. ¡Gracias!',
          visto: false,
          creadoEl: Timestamp.now(),
        });
      }

      // Si se canceló, crear alerta
      if (nuevoEstado === 'cancelado') {
        await wsDoc.ref.collection(COLLECTIONS.NOTIFICACIONES).add({
          tipo: 'alerta',
          titulo: 'Suscripción cancelada',
          mensaje: 'Tu acceso finalizará al término del período actual.',
          visto: false,
          creadoEl: Timestamp.now(),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook MP:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}

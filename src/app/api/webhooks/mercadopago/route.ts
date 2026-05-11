import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import { PLAN_LIMITS } from '@/lib/planLimits';
import crypto from 'crypto';

const getMPAccessToken = () =>
  process.env.NODE_ENV === 'development'
    ? process.env.MP_ACCESS_TOKEN_TEST
    : process.env.MP_ACCESS_TOKEN;

// ─── ACTUALIZAR WORKSPACE A PARTIR DE UN PREAPPROVAL ─────────────────────────

async function procesarPreapproval(suscripcionId: string, accessToken: string, sourceEvent: string) {
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${suscripcionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mpRes.ok) {
    console.error(`[webhook] Error fetching preapproval ${suscripcionId}: ${mpRes.status}`);
    return;
  }

  const suscripcion = await mpRes.json();
  console.log(`[webhook] Preapproval ${suscripcionId} status: ${suscripcion.status} (via ${sourceEvent})`);

  const wsQuery = await adminDb
    .collection(COLLECTIONS.ESPACIOS)
    .where('facturacion.mpSuscripcionId', '==', suscripcionId)
    .limit(1)
    .get();

  if (wsQuery.empty) {
    console.warn(`[webhook] Workspace no encontrado para suscripcion ${suscripcionId}`);
    return;
  }

  const wsDoc = wsQuery.docs[0];
  const wsData = wsDoc.data();

  const estadoMap: Record<string, string> = {
    authorized: 'activo',
    paused: 'pago_vencido',
    cancelled: 'cancelado',
    pending: 'prueba',
  };

  const nuevoEstado = estadoMap[suscripcion.status] ?? 'pago_vencido';
  const ciclo = wsData.facturacion?.ciclo || 'mensual';
  const periodoHasta = new Date();
  if (ciclo === 'anual') periodoHasta.setFullYear(periodoHasta.getFullYear() + 1);
  else periodoHasta.setMonth(periodoHasta.getMonth() + 1);

  const updates: Record<string, any> = {
    estado: nuevoEstado,
    periodoVigenteHasta: Timestamp.fromDate(periodoHasta),
    actualizadoEl: Timestamp.now(),
  };

  if (nuevoEstado === 'activo' && wsData.facturacion?.planPendiente) {
    const planPend = wsData.facturacion.planPendiente as 'starter' | 'pro' | 'agencia';
    const pUSD = ciclo === 'anual' ? PLAN_LIMITS[planPend].priceYearly : PLAN_LIMITS[planPend].priceMonthly;
    updates.plan = planPend;
    updates['facturacion.planPendiente'] = null;
    updates['facturacion.precioUSD'] = pUSD;
    updates['facturacion.precioARS'] = suscripcion.auto_recurring?.transaction_amount || 0;
    updates['facturacion.precioFijadoEl'] = Timestamp.now();
  }

  await wsDoc.ref.update(updates);

  await wsDoc.ref.collection(COLLECTIONS.EVENTOS_FACT).add({
    tipo: nuevoEstado === 'activo' ? 'pago_exitoso' : 'pago_fallido',
    monto: suscripcion.auto_recurring?.transaction_amount || 0,
    montoUSD: updates['facturacion.precioUSD'] ?? 0,
    mpSuscripcionId: suscripcionId,
    descripcion: `Webhook (${sourceEvent}): suscripción ${suscripcion.status} — Plan ${updates.plan || wsData.plan}`,
    creadoEl: Timestamp.now(),
  });

  if (nuevoEstado === 'activo') {
    await wsDoc.ref.collection(COLLECTIONS.NOTIFICACIONES).add({
      tipo: 'info',
      titulo: 'Pago confirmado',
      mensaje: '¡Tu suscripción está activa. Gracias!',
      visto: false,
      creadoEl: Timestamp.now(),
    });
  }

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

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Verificación de firma HMAC
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;

    if (webhookSecret && webhookSecret !== 'xxxx') {
      if (!xSignature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const parts = xSignature.split(',');
      const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
      const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];
      if (!ts || !v1) {
        return NextResponse.json({ error: 'Invalid signature format' }, { status: 401 });
      }
      const manifest = `id:${xRequestId};request-date:${ts};`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
      if (v1 !== expected) {
        console.error('[webhook] HMAC inválido');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = await request.json();
    const tipo = body.type;
    const dataId = String(body.data?.id ?? '');
    console.log(`[webhook] Evento recibido: type=${tipo} id=${dataId}`);

    if (!dataId) return NextResponse.json({ ok: true });

    const accessToken = getMPAccessToken();
    if (!accessToken) {
      console.error('[webhook] Access Token no configurado');
      return NextResponse.json({ ok: true });
    }

    // ── Evento de suscripción directo ──────────────────────────────────────
    if (tipo === 'subscription_preapproval') {
      await procesarPreapproval(dataId, accessToken, 'subscription_preapproval');
      return NextResponse.json({ ok: true });
    }

    // ── Evento de pago (cubre cobros de suscripciones vía "Pagos") ─────────
    if (tipo === 'payment') {
      const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!payRes.ok) {
        console.warn(`[webhook] No se pudo obtener pago ${dataId}: ${payRes.status}`);
        return NextResponse.json({ ok: true });
      }

      const pago = await payRes.json();
      console.log(`[webhook] Pago ${dataId} status=${pago.status} preapproval_id=${pago.preapproval_id}`);

      // Solo nos interesan pagos aprobados vinculados a una suscripción
      if (pago.status === 'approved' && pago.preapproval_id) {
        await procesarPreapproval(pago.preapproval_id, accessToken, 'payment');
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[webhook] Error:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}

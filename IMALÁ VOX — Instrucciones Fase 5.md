IMALÁ VOX — Instrucciones Fase 5  
Billing MercadoPago \+ SuperAdmin \+ Gestión de Plan

CONTEXTO DEL ESTADO ACTUAL  
El proyecto ya tiene:

FacturacionConfig definida en firestore.ts con los campos de MercadoPago  
WorkspaceStatus con los estados prueba | activo | pago\_vencido | cancelado  
El onboarding crea el workspace con plan: 'pro' y estado: 'prueba' correctamente  
NotificationBanner funcional con Firestore en tiempo real  
adminDb con Firebase Admin configurado y listo  
PLAN\_LIMITS con todos los límites definidos por plan

Lo que falta construir es todo el flujo de billing real y el panel SuperAdmin.

PARTE 1 — VARIABLES DE ENTORNO  
Agregar a .env.local:  
MP\_ACCESS\_TOKEN=          \# Token de producción de MercadoPago  
MP\_WEBHOOK\_SECRET=        \# Secret para validar webhooks de MP  
BLUELYTICS\_API=https://api.bluelytics.com.ar/v2/latest  
NEXT\_PUBLIC\_APP\_URL=https://tu-dominio.com

PARTE 2 — TIPOS Y COLECCIONES NUEVAS  
2.1 Actualizar firestore.ts  
Agregar al objeto COLLECTIONS:  
typescriptEVENTOS\_FACT: 'eventosFact',  
PLATAFORMA\_PLANES: 'plataforma',  
SUPERADMIN\_EVENTOS: 'eventosPlataforma',  
Agregar interfaces nuevas:  
typescriptexport interface EventoFacturacion {  
  id?: string;  
  tipo: 'pago\_exitoso' | 'pago\_fallido' | 'suscripcion\_creada' |  
        'suscripcion\_cancelada' | 'upgrade' | 'downgrade' |  
        'trial\_iniciado' | 'trial\_vencido' | 'ajuste\_ars' | 'exceso\_conversaciones';  
  monto: number;             // en ARS  
  montoUSD: number;          // equivalente en USD  
  cotizacionUsada?: number;  // solo para pagos ARS  
  mpSuscripcionId?: string;  
  mpPagoId?: string;  
  planAnterior?: string;  
  planNuevo?: string;  
  descripcion: string;  
  creadoEl: Timestamp;  
}

export interface PlataformaConfig {  
  planes: {  
    starter: { precioUSD: number; precioARS: number; cotizacionUsada: number; fijadoEl: Timestamp };  
    pro:     { precioUSD: number; precioARS: number; cotizacionUsada: number; fijadoEl: Timestamp };  
    agencia: { precioUSD: number; precioARS: number; cotizacionUsada: number; fijadoEl: Timestamp };  
  };  
  proximoAjusteARS: Timestamp;  
  superAdminUids: string\[\];  
  overageRate: number;        // 0.018 — costo por conversación extra en plan Agencia  
  trialDias: number;          // 7  
}

export interface SuperAdminMetrics {  
  mrr: number;  
  arr: number;  
  totalWorkspaces: number;  
  workspacesActivos: number;  
  workspacesEnPrueba: number;  
  workspacesCancelados: number;  
  churnEsteMes: number;  
  nuevosEsteMes: number;  
}

PARTE 3 — SERVER ACTIONS DE BILLING  
Crear src/app/actions/billing.ts:  
typescript'use server'

import { adminDb } from '@/lib/firebase-admin';  
import { Timestamp } from 'firebase-admin/firestore';  
import { COLLECTIONS } from '@/lib/types/firestore';  
import { PLAN\_LIMITS } from '@/lib/planLimits';  
import { revalidatePath } from 'next/cache';

// ─── OBTENER COTIZACIÓN DÓLAR BLUE ───────────────────────────────────────────

export async function obtenerCotizacionBlue(): Promise\<number\> {  
  try {  
    const res \= await fetch('https://api.bluelytics.com.ar/v2/latest', {  
      next: { revalidate: 3600 } // cache 1 hora  
    });  
    const data \= await res.json();  
    return Math.round(data.blue?.value\_sell || 1200);  
  } catch {  
    // Fallback a dolarapi.com  
    try {  
      const res2 \= await fetch('https://dolarapi.com/v1/dolares/blue');  
      const data2 \= await res2.json();  
      return Math.round(data2.venta || 1200);  
    } catch {  
      return 1200; // fallback hardcoded si ambas APIs fallan  
    }  
  }  
}

// ─── CALCULAR PRECIO ARS ─────────────────────────────────────────────────────

export async function calcularPrecioARS(precioUSD: number, spread \= 1.10): Promise\<{  
  precioARS: number;  
  cotizacion: number;  
}\> {  
  const cotizacion \= await obtenerCotizacionBlue();  
  return {  
    precioARS: Math.round(precioUSD \* cotizacion \* spread),  
    cotizacion,  
  };  
}

// ─── CREAR SUSCRIPCIÓN MERCADOPAGO ────────────────────────────────────────────

export async function crearSuscripcionMP(wsId: string, plan: 'starter' | 'pro' | 'agencia', ciclo: 'mensual' | 'anual') {  
  try {  
    const planConfig \= PLAN\_LIMITS\[plan\];  
    const precioUSD \= ciclo \=== 'anual'  
      ? planConfig.priceYearly   // precio mensual equivalente en plan anual  
      : planConfig.priceMonthly;

    const { precioARS, cotizacion } \= await calcularPrecioARS(precioUSD);

    // Crear suscripción en MercadoPago  
    const mpRes \= await fetch('https://api.mercadopago.com/preapproval', {  
      method: 'POST',  
      headers: {  
        'Authorization': \`Bearer ${process.env.MP\_ACCESS\_TOKEN}\`,  
        'Content-Type': 'application/json',  
      },  
      body: JSON.stringify({  
        reason: \`Imalá Vox — Plan ${plan.charAt(0).toUpperCase() \+ plan.slice(1)} (${ciclo})\`,  
        auto\_recurring: {  
          frequency: ciclo \=== 'mensual' ? 1 : 12,  
          frequency\_type: ciclo \=== 'mensual' ? 'months' : 'months',  
          transaction\_amount: precioARS,  
          currency\_id: 'ARS',  
        },  
        back\_url: \`${process.env.NEXT\_PUBLIC\_APP\_URL}/dashboard/ajustes/facturacion\`,  
        status: 'pending',  
      }),  
    });

    if (\!mpRes.ok) {  
      const err \= await mpRes.text();  
      throw new Error(\`MP Error: ${err}\`);  
    }

    const mpData \= await mpRes.json();

    // Actualizar workspace con datos de facturación  
    await adminDb.doc(\`${COLLECTIONS.ESPACIOS}/${wsId}\`).update({  
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
      tipo: 'suscripcion\_creada',  
      monto: precioARS,  
      montoUSD: precioUSD,  
      cotizacionUsada: cotizacion,  
      mpSuscripcionId: mpData.id,  
      descripcion: \`Suscripción Plan ${plan} ${ciclo} creada\`,  
    });

    return { success: true, initPoint: mpData.init\_point, suscripcionId: mpData.id };  
  } catch (error: any) {  
    return { success: false, error: error.message };  
  }  
}

// ─── CANCELAR SUSCRIPCIÓN ────────────────────────────────────────────────────

export async function cancelarSuscripcionMP(wsId: string) {  
  try {  
    const wsSnap \= await adminDb.doc(\`${COLLECTIONS.ESPACIOS}/${wsId}\`).get();  
    const ws \= wsSnap.data();  
    const suscripcionId \= ws?.facturacion?.mpSuscripcionId;

    if (suscripcionId) {  
      await fetch(\`https://api.mercadopago.com/preapproval/${suscripcionId}\`, {  
        method: 'PUT',  
        headers: {  
          'Authorization': \`Bearer ${process.env.MP\_ACCESS\_TOKEN}\`,  
          'Content-Type': 'application/json',  
        },  
        body: JSON.stringify({ status: 'cancelled' }),  
      });  
    }

    await adminDb.doc(\`${COLLECTIONS.ESPACIOS}/${wsId}\`).update({  
      estado: 'cancelado',  
      actualizadoEl: Timestamp.now(),  
    });

    await registrarEventoFact(wsId, {  
      tipo: 'suscripcion\_cancelada',  
      monto: 0,  
      montoUSD: 0,  
      descripcion: 'Suscripción cancelada por el usuario',  
    });

    return { success: true };  
  } catch (error: any) {  
    return { success: false, error: error.message };  
  }  
}

// ─── CAMBIO DE PLAN ──────────────────────────────────────────────────────────

export async function cambiarPlan(wsId: string, planNuevo: 'starter' | 'pro' | 'agencia') {  
  try {  
    const wsSnap \= await adminDb.doc(\`${COLLECTIONS.ESPACIOS}/${wsId}\`).get();  
    const ws \= wsSnap.data();  
    const planAnterior \= ws?.plan;  
    const suscripcionId \= ws?.facturacion?.mpSuscripcionId;

    // Cancelar suscripción anterior en MP  
    if (suscripcionId) {  
      await fetch(\`https://api.mercadopago.com/preapproval/${suscripcionId}\`, {  
        method: 'PUT',  
        headers: { 'Authorization': \`Bearer ${process.env.MP\_ACCESS\_TOKEN}\`, 'Content-Type': 'application/json' },  
        body: JSON.stringify({ status: 'cancelled' }),  
      });  
    }

    // Crear nueva suscripción con el nuevo plan  
    const resultado \= await crearSuscripcionMP(wsId, planNuevo, ws?.facturacion?.ciclo || 'mensual');

    if (\!resultado.success) throw new Error(resultado.error);

    await registrarEventoFact(wsId, {  
      tipo: planNuevo \> planAnterior ? 'upgrade' : 'downgrade',  
      monto: 0,  
      montoUSD: PLAN\_LIMITS\[planNuevo\].priceMonthly,  
      planAnterior,  
      planNuevo,  
      descripcion: \`Cambio de plan: ${planAnterior} → ${planNuevo}\`,  
    });

    revalidatePath('/dashboard');  
    return { success: true, initPoint: resultado.initPoint };  
  } catch (error: any) {  
    return { success: false, error: error.message };  
  }  
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function calcularProximoTrimestre(): Timestamp {  
  const hoy \= new Date();  
  const mes \= hoy.getMonth();  
  // Trimestres: enero(0), abril(3), julio(6), octubre(9)  
  const trimestres \= \[0, 3, 6, 9\];  
  const proximo \= trimestres.find(t \=\> t \> mes) ?? 0;  
  const anio \= proximo \=== 0 ? hoy.getFullYear() \+ 1 : hoy.getFullYear();  
  return Timestamp.fromDate(new Date(anio, proximo, 1));  
}

async function registrarEventoFact(wsId: string, evento: Partial\<EventoFacturacion\>) {  
  await adminDb  
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)  
    .collection(COLLECTIONS.EVENTOS\_FACT)  
    .add({ ...evento, creadoEl: Timestamp.now() });  
}

PARTE 4 — WEBHOOK DE MERCADOPAGO  
Crear src/app/api/webhooks/mercadopago/route.ts:  
typescriptimport { NextRequest, NextResponse } from 'next/server';  
import { adminDb } from '@/lib/firebase-admin';  
import { Timestamp } from 'firebase-admin/firestore';  
import { COLLECTIONS } from '@/lib/types/firestore';

export async function POST(request: NextRequest) {  
  const body \= await request.json();  
  const tipo \= body.type;  
  const dataId \= body.data?.id;

  if (\!dataId) return NextResponse.json({ ok: true });

  try {  
    if (tipo \=== 'subscription\_preapproval') {  
      // Obtener datos de la suscripción desde MP  
      const mpRes \= await fetch(  
        \`https://api.mercadopago.com/preapproval/${dataId}\`,  
        { headers: { 'Authorization': \`Bearer ${process.env.MP\_ACCESS\_TOKEN}\` } }  
      );  
      const suscripcion \= await mpRes.json();

      // Buscar workspace por mpSuscripcionId  
      const wsQuery \= await adminDb  
        .collection(COLLECTIONS.ESPACIOS)  
        .where('facturacion.mpSuscripcionId', '==', dataId)  
        .limit(1)  
        .get();

      if (wsQuery.empty) return NextResponse.json({ ok: true });

      const wsDoc \= wsQuery.docs\[0\];  
      const wsId \= wsDoc.id;

      // Mapear estado MP → estado Imalá Vox  
      const estadoMap: Record\<string, string\> \= {  
        'authorized': 'activo',  
        'paused': 'pago\_vencido',  
        'cancelled': 'cancelado',  
        'pending': 'prueba',  
      };

      const nuevoEstado \= estadoMap\[suscripcion.status\] || 'pago\_vencido';

      // Calcular próximo período  
      const periodoHasta \= new Date();  
      periodoHasta.setMonth(periodoHasta.getMonth() \+ 1);

      await wsDoc.ref.update({  
        estado: nuevoEstado,  
        periodoVigenteHasta: Timestamp.fromDate(periodoHasta),  
        actualizadoEl: Timestamp.now(),  
      });

      // Registrar evento  
      await wsDoc.ref.collection(COLLECTIONS.EVENTOS\_FACT).add({  
        tipo: nuevoEstado \=== 'activo' ? 'pago\_exitoso' : 'pago\_fallido',  
        monto: suscripcion.auto\_recurring?.transaction\_amount || 0,  
        montoUSD: 0,  
        mpPagoId: dataId,  
        descripcion: \`Webhook MP: suscripción ${suscripcion.status}\`,  
        creadoEl: Timestamp.now(),  
      });

      // Si se activó, crear notificación para el usuario  
      if (nuevoEstado \=== 'activo') {  
        await wsDoc.ref.collection(COLLECTIONS.NOTIFICACIONES).add({  
          tipo: 'info',  
          titulo: 'Pago confirmado',  
          mensaje: 'Tu suscripción está activa. ¡Gracias\!',  
          visto: false,  
          creadoEl: Timestamp.now(),  
        });  
      }

      // Si se canceló, crear alerta  
      if (nuevoEstado \=== 'cancelado') {  
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

PARTE 5 — PÁGINA DE FACTURACIÓN DEL CLIENTE  
Crear src/app/dashboard/ajustes/facturacion/page.tsx.  
Agregar "Facturación" al sidebar bajo AJUSTES.  
La página tiene tres secciones:  
Sección 1 — Plan actual  
tsx// Mostrar:  
// \- Nombre del plan (Starter / Pro / Agencia) con badge de estado (Prueba / Activo / Vencido)  
// \- Si está en prueba: contador de días restantes con barra de progreso  
//   calcular con: pruebaTerminaEl.toDate() \- new Date()  
// \- Precio actual en USD y ARS  
// \- Ciclo (mensual / anual)  
// \- Próxima fecha de cobro o renovación  
// \- Próximo ajuste de precio ARS (fecha del próximo trimestre)  
Sección 2 — Comparador de planes con upgrade/downgrade  
tsx// Mostrar los 3 planes (Starter / Pro / Agencia) como cards  
// El plan actual destacado con borde accent  
// Botón "Cambiar a este plan" en los otros dos  
// Toggle mensual/anual con ahorro mostrado  
// Al hacer clic en "Cambiar": llamar a cambiarPlan() y redirigir al init\_point de MP  
Sección 3 — Historial de pagos  
tsx// Leer de eventosFact del workspace  
// Tabla: Fecha | Concepto | Monto ARS | Monto USD | Estado  
// Ordenado por fecha descendente  
// Solo mostrar eventos tipo: pago\_exitoso, pago\_fallido, upgrade, downgrade  
Lógica del banner de prueba  
En NotificationBanner.tsx o en AppLayout.tsx, agregar detección del estado de prueba para mostrar un banner persistente:  
tsx// Si workspace.estado \=== 'prueba':  
// Calcular días restantes  
const diasRestantes \= workspace?.pruebaTerminaEl  
  ? Math.ceil((workspace.pruebaTerminaEl.toDate().getTime() \- Date.now()) / 86400000\)  
  : 0;

// Si diasRestantes \<= 3: banner rojo urgente  
// Si diasRestantes \<= 7: banner naranja  
// Siempre mostrar en la parte superior del dashboard (no en el sidebar)  
// Texto: "Tu período de prueba vence en X días · Suscribite para no perder el acceso"  
// Botón: "Ver planes" → navega a /dashboard/ajustes/facturacion

PARTE 6 — PANEL SUPERADMIN  
Crear ruta protegida src/app/superadmin/ — completamente separada del dashboard de clientes.  
6.1 Middleware de protección SuperAdmin  
Actualizar src/middleware.ts para agregar:  
typescript// Proteger rutas /superadmin — verificar que el UID esté en plataforma/config.superAdminUids  
// Como el middleware de Next.js no puede verificar Firestore, usar una cookie especial  
// que se setea al hacer login si el UID está en la lista de admins  
if (pathname.startsWith('/superadmin')) {  
  const adminCookie \= request.cookies.get('imala-admin-session');  
  if (\!adminCookie) {  
    return NextResponse.redirect(new URL('/auth', request.url));  
  }  
}  
6.2 Server Action para verificar SuperAdmin  
Crear src/app/actions/superadmin.ts:  
typescript'use server'

import { adminDb } from '@/lib/firebase-admin';  
import { COLLECTIONS } from '@/lib/types/firestore';  
import { cookies } from 'next/headers';

export async function verificarYSetearAdmin(uid: string): Promise\<boolean\> {  
  try {  
    const configSnap \= await adminDb.doc(COLLECTIONS.PLATAFORMA\_CONFIG).get();  
    const config \= configSnap.data();  
    const esAdmin \= config?.superAdminUids?.includes(uid) || false;

    if (esAdmin) {  
      // Setear cookie de sesión admin (httpOnly, 8 horas)  
      const cookieStore \= await cookies();  
      cookieStore.set('imala-admin-session', uid, {  
        httpOnly: true,  
        secure: process.env.NODE\_ENV \=== 'production',  
        maxAge: 60 \* 60 \* 8,  
        path: '/',  
      });  
    }

    return esAdmin;  
  } catch {  
    return false;  
  }  
}

export async function obtenerMetricasSuperAdmin() {  
  // Obtener todos los workspaces  
  const wsSnap \= await adminDb.collection(COLLECTIONS.ESPACIOS).get();  
  const workspaces \= wsSnap.docs.map(d \=\> ({ id: d.id, ...d.data() })) as any\[\];

  const hoy \= new Date();  
  const inicioMes \= new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const activos \= workspaces.filter(w \=\> w.estado \=== 'activo');  
  const enPrueba \= workspaces.filter(w \=\> w.estado \=== 'prueba');  
  const cancelados \= workspaces.filter(w \=\> w.estado \=== 'cancelado');  
  const nuevosEsteMes \= workspaces.filter(w \=\>  
    w.creadoEl?.toDate() \>= inicioMes  
  );

  // Calcular MRR  
  const mrr \= activos.reduce((acc: number, w: any) \=\> {  
    return acc \+ (w.facturacion?.precioUSD || 0);  
  }, 0);

  return {  
    workspaces,  
    metricas: {  
      mrr,  
      arr: mrr \* 12,  
      totalWorkspaces: workspaces.length,  
      workspacesActivos: activos.length,  
      workspacesEnPrueba: enPrueba.length,  
      workspacesCancelados: cancelados.length,  
      nuevosEsteMes: nuevosEsteMes.length,  
      churnEsteMes: cancelados.filter((w: any) \=\>  
        w.actualizadoEl?.toDate() \>= inicioMes  
      ).length,  
    }  
  };  
}  
6.3 Layout del SuperAdmin  
Crear src/app/superadmin/layout.tsx — completamente distinto del AppLayout del dashboard:  
tsx// Layout simple, fondo \--bg-sidebar completo, tipografía compacta  
// Header: "Imalá Vox — SuperAdmin" con badge "ADMIN" en accent  
// Sidebar mínimo:  
//   → Resumen  
//   → Espacios de trabajo  
//   → Facturación  
//   → Uso y límites  
//   → Registro de eventos  
// Footer: nombre \+ email del admin \+ botón "Salir del panel"  
6.4 Páginas del SuperAdmin  
Crear las siguientes páginas usando el diseño del widget del SuperAdmin  
que ya fue diseñado previamente (con métricas, tablas, filtros de fecha):  
src/app/superadmin/page.tsx — Resumen

4 métricas: MRR, espacios activos, en prueba, cancelaciones  
Acumulado anual: total facturado, ARR proyectado, tasa de cancelación  
Distribución por plan con barras  
Alertas: workspaces con trial por vencer, pagos fallidos, excesos de conversaciones

src/app/superadmin/espacios/page.tsx — Espacios de trabajo

Tabla con todos los workspaces  
Columnas: Cliente | Plan | Estado | MRR | Conv. usadas | Método pago | Acciones  
Filtros: plan, estado, rango de fechas  
Búsqueda por nombre o email  
Acción "Ver detalle" → abre sheet con toda la info del workspace y acciones manuales

src/app/superadmin/facturacion/page.tsx — Facturación

Acumulado anual  
Log de todos los pagos de todos los workspaces  
Filtro por método (MP), tipo de evento, rango de fechas

src/app/superadmin/uso/page.tsx — Uso y límites

Barras de progreso de conversaciones por workspace  
Alertas de workspaces cerca del límite (\>80%)

src/app/superadmin/eventos/page.tsx — Registro de eventos

Log global de todos los eventos del sistema  
Filtro por tipo (pago, upgrade, cancelación, trial, exceso)

6.5 Acciones manuales del SuperAdmin  
En el sheet de detalle de cada workspace, botones de acción:  
typescript// Todas son Server Actions en superadmin.ts  
cambiarPlanManual(wsId, nuevoPlan)      // cambio manual sin pago  
extenderPrueba(wsId, diasExtra)         // \+ X días al trial  
reactivarWorkspace(wsId)               // cancelado → activo  
bloquearWorkspace(wsId)                // activo → cancelado forzado  
ajustarPrecioARS(wsId, nuevoPrecioARS) // excepción individual

PARTE 7 — CRON JOBS (Cloud Functions)  
Crear functions/src/index.ts con tres funciones programadas:  
Cron 1 — Reinicio mensual de contadores (día 1 de cada mes)  
typescriptexport const reiniciarUsoMensual \= onSchedule('0 0 1 \* \*', async () \=\> {  
  const wsSnap \= await adminDb.collection('espaciosDeTrabajo').get();

  for (const ws of wsSnap.docs) {  
    const data \= ws.data();

    // Calcular exceso de conversaciones para plan Agencia  
    if (data.plan \=== 'agencia' && data.uso?.convCount \> 10000\) {  
      const exceso \= data.uso.convCount \- 10000;  
      const cargoExtra \= Math.ceil(exceso / 100\) \* 1.80; // $1.80 por cada 100  
      // Registrar cargo extra en eventosFact  
      await ws.ref.collection('eventosFact').add({  
        tipo: 'exceso\_conversaciones',  
        monto: Math.round(cargoExtra \* data.facturacion?.cotizacionUsada || 1200),  
        montoUSD: cargoExtra,  
        descripcion: \`Exceso de ${exceso} conversaciones · $${cargoExtra} USD\`,  
        creadoEl: Timestamp.now(),  
      });  
    }

    // Resetear contador  
    await ws.ref.update({  
      'uso.convCount': 0,  
      usoReiniciaEl: calcularProximoMes(),  
      actualizadoEl: Timestamp.now(),  
    });  
  }  
});  
Cron 2 — Ajuste trimestral de precios ARS (1 de enero, abril, julio, octubre)  
typescriptexport const ajusteArsTrimetral \= onSchedule('0 0 1 1,4,7,10 \*', async () \=\> {  
  // Obtener cotización blue promedio últimos 7 días  
  const res \= await fetch('https://api.bluelytics.com.ar/v2/evolution.json');  
  const datos \= await res.json();  
  const ultimos7 \= datos.filter((d: any) \=\> d.source \=== 'Blue').slice(0, 7);  
  const promedio \= Math.round(ultimos7.reduce((a: number, b: any) \=\> a \+ b.value\_sell, 0\) / ultimos7.length);  
  const spread \= 1.10;

  // Actualizar precios en plataforma/config  
  const nuevosPrecios \= {  
    'planes.starter.precioARS': Math.round(29 \* promedio \* spread),  
    'planes.pro.precioARS': Math.round(79 \* promedio \* spread),  
    'planes.agencia.precioARS': Math.round(179 \* promedio \* spread),  
    'planes.starter.cotizacionUsada': promedio,  
    'planes.pro.cotizacionUsada': promedio,  
    'planes.agencia.cotizacionUsada': promedio,  
    proximoAjusteARS: calcularProximoTrimestre(),  
  };

  await adminDb.doc('plataforma/config').update(nuevosPrecios);

  // Para cada workspace activo con método MP: recrear suscripción con nuevo precio  
  const wsActivos \= await adminDb.collection('espaciosDeTrabajo')  
    .where('estado', '==', 'activo')  
    .where('facturacion.metodo', '==', 'mercadopago')  
    .get();

  for (const ws of wsActivos.docs) {  
    // Registrar evento de ajuste  
    await ws.ref.collection('eventosFact').add({  
      tipo: 'ajuste\_ars',  
      monto: nuevosPrecios\[\`planes.${ws.data().plan}.precioARS\`\],  
      montoUSD: PLAN\_LIMITS\[ws.data().plan as keyof typeof PLAN\_LIMITS\].priceMonthly,  
      cotizacionUsada: promedio,  
      descripcion: \`Ajuste trimestral ARS · cotización $${promedio}\`,  
      creadoEl: Timestamp.now(),  
    });

    // Crear notificación para el cliente  
    await ws.ref.collection('notificaciones').add({  
      tipo: 'info',  
      titulo: 'Actualización de precio en pesos',  
      mensaje: \`Tu plan se ajustó al nuevo valor en pesos: $${nuevosPrecios\[\`planes.${ws.data().plan}.precioARS\`\].toLocaleString('es-AR')} ARS/mes\`,  
      visto: false,  
      creadoEl: Timestamp.now(),  
    });  
  }  
});  
Cron 3 — Verificar trials por vencer (todos los días a las 9am)  
typescriptexport const verificarTrials \= onSchedule('0 9 \* \* \*', async () \=\> {  
  const hoy \= new Date();  
  const en3Dias \= new Date(hoy.getTime() \+ 3 \* 86400000);

  const trialsVenciendo \= await adminDb.collection('espaciosDeTrabajo')  
    .where('estado', '==', 'prueba')  
    .where('pruebaTerminaEl', '\<=', Timestamp.fromDate(en3Dias))  
    .get();

  for (const ws of trialsVenciendo.docs) {  
    const diasRestantes \= Math.ceil(  
      (ws.data().pruebaTerminaEl.toDate() \- hoy) / 86400000  
    );

    // Solo notificar una vez por cada umbral (3 días y 1 día)  
    if (diasRestantes \<= 3 && diasRestantes \> 0\) {  
      await ws.ref.collection('notificaciones').add({  
        tipo: 'alerta',  
        titulo: \`Tu prueba vence en ${diasRestantes} ${diasRestantes \=== 1 ? 'día' : 'días'}\`,  
        mensaje: 'Suscribite para no perder el acceso a tus agentes y contactos.',  
        visto: false,  
        creadoEl: Timestamp.now(),  
      });  
    }

    // Si ya venció, cambiar estado  
    if (diasRestantes \<= 0\) {  
      await ws.ref.update({  
        estado: 'pago\_vencido',  
        actualizadoEl: Timestamp.now(),  
      });  
    }  
  }  
});

PARTE 8 — ORDEN DE IMPLEMENTACIÓN

Actualizar firestore.ts con nuevos tipos y colecciones  
Crear billing.ts Server Action completo  
Crear webhook /api/webhooks/mercadopago/route.ts  
Crear página /dashboard/ajustes/facturacion/page.tsx  
Agregar "Facturación" al sidebar bajo AJUSTES  
Agregar banner de trial en AppLayout.tsx  
Crear superadmin.ts Server Actions  
Crear layout y páginas del SuperAdmin  
Actualizar middleware.ts con protección de rutas /superadmin  
Crear Cloud Functions en /functions/src/index.ts  
Crear documento inicial plataforma/config en Firestore con tu UID como superAdminUid

NOTA FINAL — Documento plataforma/config inicial  
Una vez que tengas tu UID de Firebase Auth, crear manualmente en Firestore Console este documento en la ruta plataforma/config:  
json{  
  "superAdminUids": \["TU\_UID\_AQUI"\],  
  "overageRate": 0.018,  
  "trialDias": 7,  
  "planes": {  
    "starter": { "precioUSD": 29, "precioARS": 35380, "cotizacionUsada": 1220 },  
    "pro":     { "precioUSD": 79, "precioARS": 96338, "cotizacionUsada": 1220 },  
    "agencia": { "precioUSD": 179, "precioARS": 218218, "cotizacionUsada": 1220 }  
  }  
}  
Los valores de ARS se actualizan automáticamente con el cron trimestral. El valor inicial usa cotización de $1.220 \+ 10% spread como definimos.
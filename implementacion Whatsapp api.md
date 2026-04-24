# **Plan de Implementación: Canal WhatsApp Business API**

## **Diagnóstico del estado actual**

El backend de WhatsApp está **85% completo**. El webhook recibe mensajes correctamente, el envío funciona, los tipos de Firestore están definidos. Lo que **falta completamente** es:

1. **Flujo de conexión en la UI** — No hay ninguna forma de conectar un canal WhatsApp desde el dashboard (el botón "Conectar Meta" solo maneja Facebook/Instagram via OAuth, flujo incompatible con WhatsApp Cloud API).  
2. **Sync de webhooks para WhatsApp** — `sincronizarWebhooks` llama `/{pageId}/subscribed_apps`, que no aplica a WhatsApp.  
3. **Bugs menores en el webhook handler** — historial vacío, versión API v18 en lugar de v19, modo copiloto no implementado, `contactoNombre` no se actualiza en conversación existente.

---

## **Archivos a modificar (NO crear archivos nuevos)**

| Archivo | Cambios |
| ----- | ----- |
| `src/app/actions/channels.ts` | Agregar `sincronizarWebhooksWhatsApp`, fix API v18→v19 |
| `src/app/api/webhooks/meta/route.ts` | Fix historial, copiloto, contactoNombre, increment convCount |
| `src/app/dashboard/ajustes/canales/page.tsx` | Modal de conexión WhatsApp \+ fix botón sync \+ fix modal config |

---

## **CAMBIO 1 — `src/app/actions/channels.ts`**

### **1a. Fix API version (línea 294\)**

**Buscar:**

```ts
url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
```

**Reemplazar con:**

```ts
url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
```

### **1b. Agregar función `sincronizarWebhooksWhatsApp`**

Insertar esta función **antes** de `enviarMensajeAccion` (antes de la línea 267), después del cierre de `configurarCanalIA`:

```ts
/**
 * Para WhatsApp Cloud API, el webhook se registra a nivel de App en el panel de Meta.
 * Esta función verifica que el token tenga acceso al Phone Number ID y marca el canal como verificado.
 */
export async function sincronizarWebhooksWhatsApp(wsId: string, canalId: string) {
  try {
    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    const canalSnap = await adminDb.doc(canalPath).get();
    if (!canalSnap.exists) throw new Error("Canal no encontrado");

    const canalData = canalSnap.data() as any;
    const phoneNumberId = canalData.metaPhoneNumberId;

    const secretSnap = await adminDb.doc(`${canalPath}/secrets/config`).get();
    if (!secretSnap.exists) throw new Error("No se encontraron los secretos del canal");

    const { metaAccessToken } = secretSnap.data() as any;
    if (!metaAccessToken || !phoneNumberId) {
      throw new Error("Faltan credenciales de WhatsApp (Phone Number ID o Access Token)");
    }

    // Verificar que el token tiene acceso al Phone Number ID en Meta
    const verifyRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${metaAccessToken}`
    );
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || verifyData.error) {
      return {
        success: false,
        error: verifyData.error?.message || "No se pudo verificar el número. Revisá el Phone Number ID y el token."
      };
    }

    await adminDb.doc(canalPath).update({
      webhookVerified: true,
      cuenta: verifyData.display_phone_number || canalData.cuenta,
      actualizadoEl: Timestamp.now()
    });

    revalidatePath('/dashboard/ajustes/canales');
    return { success: true, phoneNumber: verifyData.display_phone_number };
  } catch (error: any) {
    console.error("Error en sincronizarWebhooksWhatsApp:", error);
    return { success: false, error: error.message };
  }
}
```

---

## **CAMBIO 2 — `src/app/api/webhooks/meta/route.ts`**

Reemplazar **completamente** la función `procesarMensajeWhatsapp` (líneas 492–620) con esta versión corregida:

```ts
/**
 * Procesa mensajes entrantes de WhatsApp Cloud API.
 */
async function procesarMensajeWhatsapp(value: any, wabaId: string) {
  try {
    const message = value.messages?.[0];
    const contact = value.contacts?.[0];
    
    if (!message || message.type !== 'text') return;

    const senderId = message.from;
    const text = message.text.body;
    const contactoNombreIncoming = contact?.profile?.name || senderId;

    // 1. Identificar Workspace y Canal
    const wsQuery = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where('metaPhoneNumberId', '==', value.metadata.phone_number_id)
      .where('tipo', '==', 'whatsapp')
      .where('status', '==', 'connected')
      .limit(1)
      .get();

    if (wsQuery.empty) {
      console.warn(`❌ Mensaje de WA ${senderId} ignorado: Canal no encontrado para phone_number_id ${value.metadata.phone_number_id}`);
      return;
    }

    const canalDoc = wsQuery.docs[0];
    const canalId = canalDoc.id;
    const wsId = canalDoc.ref.parent.parent!.id;
    const canalData = canalDoc.data() as any;

    // 2. Obtener o crear contacto
    const contactosRef = adminDb.collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CONTACTOS}`);
    let contactoId = "";
    let contactoNombre = contactoNombreIncoming;

    const contactSnap = await contactosRef.where('telefono', '==', senderId).limit(1).get();

    if (contactSnap.empty) {
      const res = await contactosRef.add({
        nombre: contactoNombre,
        telefono: senderId,
        canalOrigen: 'whatsapp',
        aiBlocked: false,
        esContactoCRM: false,
        creadoEl: Timestamp.now()
      });
      contactoId = res.id;
    } else {
      const cDoc = contactSnap.docs[0];
      contactoId = cDoc.id;
      contactoNombre = cDoc.data().nombre || contactoNombre;
    }

    // 3. Obtener o crear conversación
    const convRef = adminDb.collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CONVERSACIONES}`);
    let convId = "";
    const convSnap = await convRef
      .where('contactoId', '==', contactoId)
      .where('canalId', '==', canalId)
      .limit(1)
      .get();

    if (convSnap.empty) {
      const res = await convRef.add({
        contactoId,
        contactoNombre,
        canal: 'whatsapp',
        canalId,
        agenteId: canalData.agenteId || null,
        ultimoMensaje: text,
        ultimaActividad: Timestamp.now(),
        unreadCount: 1,
        modoIA: 'auto',
        creadoEl: Timestamp.now()
      });
      convId = res.id;
      console.log(`🆕 Conversación WA creada: ${convId}`);
    } else {
      convId = convSnap.docs[0].id;
      console.log(`💬 Conversación WA existente: ${convId}`);
      await convRef.doc(convId).update({
        ultimoMensaje: text,
        contactoNombre,
        ultimaActividad: Timestamp.now(),
        unreadCount: (convSnap.docs[0].data().unreadCount || 0) + 1
      });
    }

    // 4. Guardar mensaje
    await convRef.doc(convId).collection(COLLECTIONS.MENSAJES).add({
      text,
      from: 'user',
      creadoEl: Timestamp.now(),
      visto: false
    });

    // 5. Trigger IA
    if (canalData.aiEnabled && canalData.agenteId) {
      const cDocSnap = await contactosRef.doc(contactoId).get();
      if (cDocSnap.exists) {
        const isBlocked = await isAIBlockedForContact(wsId, cDocSnap.data());
        if (isBlocked) {
          console.log(`Contacto WA ${senderId} bloqueado para IA. Sin respuesta automática.`);
          return;
        }
      }

      const convDocSnap = await convRef.doc(convId).get();
      const convData = convDocSnap.data();

      if (convData?.modoIA !== 'auto') {
        console.log(`IA en modo ${convData?.modoIA || 'desconocido'}. No se enviará respuesta automática.`);
        return;
      }

      let modoAgenteDefault = 'auto';
      const agenteDoc = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.AGENTES}/${canalData.agenteId}`).get();
      if (agenteDoc.exists) {
        modoAgenteDefault = agenteDoc.data()?.modoDefault || 'auto';
      }

      const isCopiloto = convData?.modoIA === 'copiloto' || modoAgenteDefault === 'copiloto';

      const historialSnap = await convRef.doc(convId)
        .collection(COLLECTIONS.MENSAJES)
        .orderBy('creadoEl', 'desc')
        .limit(30)
        .get();

      const historial = historialSnap.docs.reverse().map(d => ({
        from: d.data().from,
        text: d.data().text
      }));
      if (historial.length > 0) historial.pop();

      const { procesarMensajeConIA } = await import('@/lib/ai/engine');
      const { enviarMensajeAccion } = await import('@/app/actions/channels');

      try {
        await enviarMensajeAccion(wsId, canalId, senderId, message.id, undefined, 'mark_read');

        const respuestaIA = await procesarMensajeConIA({
          wsId,
          agenteId: canalData.agenteId,
          conversacionId: convId,
          textoUsuario: text,
          historial,
          isCopiloto,
          contactoNombre
        });

        if (!isCopiloto && respuestaIA) {
          await enviarMensajeAccion(wsId, canalId, senderId, respuestaIA);

          const FieldValue = require('firebase-admin').firestore.FieldValue;
          await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
            "uso.convCount": FieldValue.increment(1)
          });

          console.log(`✅ Respuesta IA completada para WhatsApp - sender: ${senderId}`);
        }
      } catch (e) {
        console.error("Error IA WA:", e);
      }
    }
  } catch (err) {
    console.error('Error procesando WA:', err);
  }
}
```

---

## **CAMBIO 3 — `src/app/dashboard/ajustes/canales/page.tsx`**

Este es el cambio más grande. Reemplazar el archivo completo con la versión siguiente. Los cambios clave son:

* **Import `Input`** del componente UI  
* **Import `sincronizarWebhooksWhatsApp` y `conectarCanalManual`** desde actions  
* **Nuevo estado** para el modal de conexión WhatsApp  
* **Nueva función `handleConnectWhatsApp`**  
* **Botón adicional** "Conectar WhatsApp" en el header  
* **Nuevo `<Dialog>` para WhatsApp** con formulario de 3 campos  
* **Fix en `handleSyncWebhooks`** — branching por tipo de canal para llamar la función correcta  
* **Fix en el modal de config** — mostrar `metaPhoneNumberId` para WhatsApp en lugar de `metaPageId`

```ts
"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Instagram, 
  MessageCircle, 
  Plus, 
  Loader2,
  MoreVertical,
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
  UserCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, Canal } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";
import { 
  eliminarCanal, 
  sincronizarWebhooks, 
  sincronizarWebhooksWhatsApp,
  configurarCanalIA,
  conectarCanalManual
} from "@/app/actions/channels";

const CANALES_CONFIG = [
  {
    tipo: 'whatsapp' as const,
    nombre: 'WhatsApp Business',
    color: '#25D366',
    icon: MessageSquare,
  },
  {
    tipo: 'instagram' as const,
    nombre: 'Instagram Direct',
    color: '#E1306C',
    icon: Instagram,
  },
  {
    tipo: 'facebook' as const,
    nombre: 'Facebook Messenger',
    color: '#1877F2',
    icon: MessageCircle,
  },
];

export default function CanalesPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [canales, setCanales] = useState<(Canal & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCanal, setSelectedCanal] = useState<(Canal & { id: string }) | null>(null);
  const [agentes, setAgentes] = useState<{ id: string; nombre: string; rolAgente: string }[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Estado para el modal de conexión WhatsApp
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waDisplayName, setWaDisplayName] = useState('');
  const [isConnectingWA, setIsConnectingWA] = useState(false);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CANALES);
    const unsubscribe = onSnapshot(q, (snap) => {
      setCanales(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando canales:", error);
      setLoading(false);
      toast.error("Error al sincronizar canales");
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES);
    const unsubscribe = onSnapshot(q, (snap) => {
      setAgentes(snap.docs.map(d => ({ 
        id: d.id, 
        nombre: d.data().nombre,
        rolAgente: d.data().rolAgente
      })));
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success("¡Meta OAuth completado! Tus canales se están sincronizando.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get('error')) {
      toast.error(`Error de conexión: ${params.get('error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOAuthConnect = () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = `${window.location.origin}/api/auth/meta/callback`;
    const scope = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_messaging',
      'leads_retrieval',
      'ads_management',
      'business_management',
      'instagram_basic',
      'instagram_manage_messages',
      'ads_read'
    ].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${currentWorkspaceId}`;
    window.location.href = authUrl;
  };

  const handleConnectWhatsApp = async () => {
    if (!currentWorkspaceId) return;
    if (!waPhoneNumberId.trim() || !waAccessToken.trim()) {
      toast.error("El Phone Number ID y el Access Token son obligatorios");
      return;
    }

    setIsConnectingWA(true);
    try {
      const res = await conectarCanalManual(currentWorkspaceId, {
        tipo: 'whatsapp',
        nombre: waDisplayName.trim() || 'WhatsApp Business',
        cuenta: waPhoneNumberId.trim(),
        metaPhoneNumberId: waPhoneNumberId.trim(),
        accessToken: waAccessToken.trim(),
      });

      if (res.success) {
        toast.success("Canal de WhatsApp conectado. Ahora verificá los webhooks desde 'Configurar'.");
        setIsWAModalOpen(false);
        setWaPhoneNumberId('');
        setWaAccessToken('');
        setWaDisplayName('');
      } else {
        toast.error(res.error || "No se pudo conectar el canal");
      }
    } catch (error) {
      toast.error("Error de red al conectar WhatsApp");
    } finally {
      setIsConnectingWA(false);
    }
  };

  const handleDelete = async (canalId: string) => {
    if (!currentWorkspaceId) return;
    if (!confirm("¿Deseas eliminar permanentemente esta conexión y todos sus datos?")) return;

    try {
      const res = await eliminarCanal(currentWorkspaceId, canalId);
      if (res.success) {
        toast.success("Canal eliminado permanentemente");
      } else {
        toast.error(res.error || "No se pudo eliminar el canal");
      }
    } catch (error) {
      toast.error("Error al eliminar canal");
    }
  };

  const handleSyncWebhooks = async () => {
    if (!currentWorkspaceId || !selectedCanal) return;
    setIsSyncing(true);
    try {
      let res;
      if (selectedCanal.tipo === 'whatsapp') {
        res = await sincronizarWebhooksWhatsApp(currentWorkspaceId, selectedCanal.id);
      } else {
        res = await sincronizarWebhooks(currentWorkspaceId, selectedCanal.id);
      }
      if (res.success) {
        toast.success(selectedCanal.tipo === 'whatsapp' ? "Número de WhatsApp verificado correctamente" : "Webhooks sincronizados en Meta");
        setIsConfigModalOpen(false);
      } else {
        toast.error(res.error || "Error al sincronizar");
      }
    } catch (error) {
      toast.error("Error de red");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateAIConfig = async (enabled: boolean, agenteId: string | null) => {
    if (!currentWorkspaceId || !selectedCanal) return;
    setIsSavingConfig(true);
    try {
      const res = await configurarCanalIA(currentWorkspaceId, selectedCanal.id, {
        aiEnabled: enabled,
        agenteId: agenteId
      });
      if (res.success) {
        toast.success("Configuración de IA actualizada");
        setSelectedCanal(prev => prev ? { ...prev, aiEnabled: enabled, agenteId: agenteId } : null);
      } else {
        toast.error(res.error || "Error al guardar");
      }
    } catch (error) {
      toast.error("Error de red");
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (!currentWorkspaceId) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--accent)]">Canales de Atención</h1>
          <p className="text-[var(--text-secondary-light)] mt-2">
            Administra tus conexiones con Facebook, Instagram y WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsWAModalOpen(true)}
            variant="outline"
            className="rounded-2xl font-bold px-5 h-12 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 transition-all"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Conectar WhatsApp
          </Button>
          <Button 
            onClick={handleOAuthConnect}
            className="rounded-2xl bg-[var(--accent)] font-bold px-6 h-12 shadow-lg shadow-[var(--accent)]/20 hover:brightness-110 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Conectar Meta (FB / IG)
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canales.length === 0 ? (
              <div className="col-span-full p-20 text-center border-2 border-dashed border-[var(--border-light)] rounded-3xl space-y-4 bg-white/50">
                <p className="text-sm text-[var(--text-tertiary-light)] font-medium">No hay canales conectados aún.</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Button onClick={() => setIsWAModalOpen(true)} variant="outline" className="rounded-xl border-[#25D366] text-[#25D366] font-bold">
                    Conectar WhatsApp
                  </Button>
                  <Button onClick={handleOAuthConnect} variant="outline" className="rounded-xl border-[var(--accent)] text-[var(--accent)] font-bold">
                    Conectar Facebook / Instagram
                  </Button>
                </div>
              </div>
            ) : (
              canales.map((canal) => {
                const config = CANALES_CONFIG.find(c => c.tipo === canal.tipo) || CANALES_CONFIG[0];
                const isConnected = canal.status === 'connected';

                return (
                  <div 
                    key={canal.id}
                    className={cn(
                      "group relative flex flex-col p-6 rounded-3xl border transition-all duration-300",
                      isConnected 
                        ? "bg-white border-[var(--accent)]/30 shadow-sm" 
                        : "bg-[var(--bg-card)]/50 border-[var(--border-light)] grayscale opacity-80 hover:grayscale-0 hover:opacity-100 hover:bg-white"
                    )}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div 
                        className="p-3 rounded-2xl"
                        style={{ backgroundColor: isConnected ? `${config.color}15` : '#f3f4f6' }}
                      >
                        <config.icon className="w-6 h-6" style={{ color: isConnected ? config.color : '#9ca3af' }} />
                      </div>
                      {isConnected ? (
                        <Badge className="bg-green-50 text-green-700 border-green-100 px-3 py-1 text-[10px] uppercase font-black">
                          Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[var(--text-tertiary-light)] border-[var(--border-light)] px-3 py-1 text-[10px] uppercase font-bold">
                          {canal.status === 'disconnected' ? 'Desconectado' : canal.status}
                        </Badge>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 mb-8">
                      <h3 className="font-bold text-[15px]">{canal.nombre || config.nombre}</h3>
                      <div className="space-y-1">
                        <p className="text-[11px] text-[var(--text-secondary-light)] font-medium truncate">
                           {canal.cuenta || (canal.tipo === 'facebook' ? 'Página de Facebook' : 'Cuenta vinculada')}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", canal.webhookVerified ? "bg-green-500" : "bg-amber-500")} />
                          <span className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase">
                             {canal.webhookVerified ? "Webhooks OK" : "Sincro Pendiente"}
                          </span>
                          {canal.aiEnabled && (
                            <Badge className="ml-auto bg-[var(--accent)]/5 text-[var(--accent)] border-none text-[8px] h-4 scale-90">
                              IA ACTIVA
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedCanal(canal);
                          setIsConfigModalOpen(true);
                        }}
                        className="flex-1 h-9 text-[11px] font-bold rounded-xl border-[var(--border-light-strong)]"
                      >
                        Configurar
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-9 w-9 rounded-xl hover:bg-[var(--bg-input)] flex items-center justify-center transition-colors">
                          <MoreVertical className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl min-w-[200px]">
                          <DropdownMenuItem 
                            onClick={() => handleDelete(canal.id)}
                            className="text-red-600 font-bold"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar definitivamente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal conexión WhatsApp */}
      <Dialog open={isWAModalOpen} onOpenChange={setIsWAModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none bg-white shadow-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-[#25D366]" />
              Conectar WhatsApp Business
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary-light)] text-sm">
              Necesitás el Phone Number ID y un System User Access Token de tu cuenta de WhatsApp Business API en el panel de Meta for Developers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[var(--text-tertiary-light)]">Phone Number ID *</Label>
              <Input
                placeholder="Ej: 123456789012345"
                value={waPhoneNumberId}
                onChange={(e) => setWaPhoneNumberId(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[10px] text-[var(--text-tertiary-light)]">Encontralo en Meta for Developers → Tu App → WhatsApp → Configuración de la API</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[var(--text-tertiary-light)]">Access Token permanente *</Label>
              <Input
                placeholder="EAAxxxxxx..."
                value={waAccessToken}
                onChange={(e) => setWaAccessToken(e.target.value)}
                type="password"
                className="h-11 rounded-xl"
              />
              <p className="text-[10px] text-[var(--text-tertiary-light)]">Generá un System User Token en Meta Business Suite → Configuración del negocio → Usuarios del sistema</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[var(--text-tertiary-light)]">Nombre para mostrar (opcional)</Label>
              <Input
                placeholder="Ej: Soporte WhatsApp"
                value={waDisplayName}
                onChange={(e) => setWaDisplayName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-[11px] text-amber-800 space-y-1">
              <p className="font-bold">Antes de conectar, asegurate que en Meta for Developers:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-amber-700">
                <li>El Webhook URL esté configurado a: <code className="font-mono bg-amber-100 px-1 rounded">/api/webhooks/meta</code></li>
                <li>El Verify Token sea: <code className="font-mono bg-amber-100 px-1 rounded">imala-vox-webhook-2026</code></li>
                <li>El campo <code className="font-mono bg-amber-100 px-1 rounded">messages</code> esté suscripto en Webhooks</li>
              </ol>
            </div>

            <Button
              onClick={handleConnectWhatsApp}
              disabled={isConnectingWA || !waPhoneNumberId.trim() || !waAccessToken.trim()}
              className="w-full h-12 rounded-2xl font-bold bg-[#25D366] hover:bg-[#22c55e] text-white"
            >
              {isConnectingWA ? <Loader2 className="animate-spin w-5 h-5" /> : "Conectar WhatsApp"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de configuración de canal (existente, con fix para WhatsApp) */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none bg-white shadow-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Activity className="w-6 h-6 text-[var(--accent)]" />
              Estado del Canal
            </DialogTitle>
          </DialogHeader>

          {selectedCanal && (
            <div className="space-y-6 mt-6">
              <div className={cn(
                "p-4 rounded-2xl flex items-start gap-4 border",
                selectedCanal.webhookVerified ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"
              )}>
                {selectedCanal.webhookVerified ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
                <div className="space-y-1">
                  <h4 className={cn("text-xs font-black uppercase tracking-tighter", selectedCanal.webhookVerified ? "text-green-800" : "text-amber-800")}>
                    {selectedCanal.webhookVerified ? "Webhook Verificado" : "Webhook Pendiente"}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary-light)]">
                    {selectedCanal.webhookVerified ? "Meta está enviando datos correctamente." : "Debes sincronizar para recibir mensajes."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-[var(--text-tertiary-light)]">
                    {selectedCanal.tipo === 'whatsapp' ? 'Phone Number ID' : 'Meta Page ID'}
                  </Label>
                  <div className="flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-light)]">
                    <code className="text-xs font-mono flex-1 truncate">
                      {selectedCanal.tipo === 'whatsapp' ? selectedCanal.metaPhoneNumberId : selectedCanal.metaPageId}
                    </code>
                    <button onClick={() => { 
                      const val = selectedCanal.tipo === 'whatsapp' ? selectedCanal.metaPhoneNumberId : selectedCanal.metaPageId;
                      navigator.clipboard.writeText(val || ''); 
                      toast.success("Copiado"); 
                    }}>
                      <Copy className="w-4 h-4 text-[var(--text-tertiary-light)] hover:text-[var(--accent)]" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Respuesta Automática IA</Label>
                    <p className="text-[10px] text-[var(--text-secondary-light)]">Activa el agente para este canal.</p>
                  </div>
                  <Switch 
                    disabled={isSavingConfig}
                    checked={!!selectedCanal.aiEnabled}
                    onCheckedChange={(val) => handleUpdateAIConfig(val, selectedCanal.agenteId || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-[var(--text-tertiary-light)]">Agente Asignado</Label>
                  <Select 
                    disabled={isSavingConfig || !selectedCanal.aiEnabled}
                    value={selectedCanal.agenteId || ""}
                    onValueChange={(val) => handleUpdateAIConfig(!!selectedCanal.aiEnabled, val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Seleccionar un agente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agentes.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex flex-col items-start py-0.5">
                            <span className="font-bold text-xs">{a.nombre}</span>
                            <span className="text-[9px] text-[var(--text-tertiary-light)]">{a.rolAgente}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSyncWebhooks}
                    disabled={isSyncing}
                    variant="outline"
                    className="w-full h-11 rounded-2xl font-bold border-[var(--accent)] text-[var(--accent)]"
                  >
                    {isSyncing ? <Loader2 className="animate-spin" /> : (
                      selectedCanal.tipo === 'whatsapp' ? "Verificar número de WhatsApp" : "Sincronizar Webhooks en Meta"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## **Configuración requerida en Meta for Developers (manual, una sola vez)**

Esto NO es código — son pasos que el operador de Imala-Vox debe hacer en el panel de Meta:

1. **Ir a** [developers.facebook.com](https://developers.facebook.com/) → Tu App → WhatsApp → Configuración de la API  
2. **Webhook URL**: `https://<dominio-produccion>/api/webhooks/meta`  
3. **Verify Token**: `imala-vox-webhook-2026` (ya está en `META_WEBHOOK_VERIFY_TOKEN`)  
4. **Suscribir campo**: `messages` (obligatorio para recibir mensajes)  
5. **App Secret**: asegurarse que `META_APP_SECRET` en las env vars coincide con el App Secret de la app

---

## **Variables de entorno — sin cambios**

Las env vars existentes ya son suficientes para WhatsApp:

```
META_WEBHOOK_VERIFY_TOKEN=imala-vox-webhook-2026
META_APP_SECRET=<ya configurado>
NEXT_PUBLIC_META_APP_ID=<ya configurado>
```

---

## **Orden de ejecución para Google Antigravity**

1. Aplicar **Cambio 1** (`channels.ts`) — fix v18→v19 \+ nueva función `sincronizarWebhooksWhatsApp`  
2. Aplicar **Cambio 2** (`webhooks/meta/route.ts`) — reemplazar `procesarMensajeWhatsapp` completa  
3. Aplicar **Cambio 3** (`canales/page.tsx`) — reemplazar archivo completo  
4. Verificar que TypeScript compila sin errores (`pnpm tsc --noEmit`)  
5. **No crear archivos nuevos**

---

El núcleo del trabajo está en el **Cambio 3** (UI de conexión) y el **Cambio 2** (fix del webhook handler). El Cambio 1 es menor pero necesario para consistencia de versión API y para que el botón "Verificar" del modal funcione correctamente para WhatsApp


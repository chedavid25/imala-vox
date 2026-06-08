"use client";

import React, { useState, useEffect } from "react";
import { ChatList } from "@/components/inbox/ChatList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { ContextPanel } from "@/components/layout/ContextPanel";
import { useConversaciones } from "@/hooks/useConversaciones";
import { useMensajes } from "@/hooks/useMensajes";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, Timestamp, getDocs, limit, query as firestoreQuery, where, setDoc } from "firebase/firestore";
import { COLLECTIONS, Contacto } from "@/lib/types/firestore";
import { enviarMensajeAccion } from "@/app/actions/channels";
import { getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ConvLimitBanner } from "@/components/layout/ConvLimitBanner";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileInboxContainer } from "@/components/mobile/inbox/MobileInboxContainer";

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-tertiary-light)]" />
      </div>
    }>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const searchParams = useSearchParams();
  const targetContactoId = searchParams.get('contactoId');
  
  const { conversaciones, loading: loadingConvs } = useConversaciones();
  const { currentWorkspaceId, setSelectedContactId, selectedChatId, setSelectedChatId } = useWorkspaceStore();
  const { mensajes, loading: loadingMsgs } = useMensajes(selectedChatId);
  const isMobile = useMobileLayout();
  const [isRequestingSuggestion, setIsRequestingSuggestion] = useState(false);

  const workspaceIdRef = React.useRef(currentWorkspaceId);
  workspaceIdRef.current = currentWorkspaceId;

  const selectedChatIdRef = React.useRef(selectedChatId);
  selectedChatIdRef.current = selectedChatId;

  const conversacionesRef = React.useRef(conversaciones);
  conversacionesRef.current = conversaciones;

  // Sincronizar el contacto seleccionado en el store global cuando cambia el chat
  useEffect(() => {
    const selectedChat = conversaciones.find(c => c.id === selectedChatId);
    if (selectedChat?.contactoId) {
      setSelectedContactId(selectedChat.contactoId);
    } else {
      setSelectedContactId(null);
    }
  }, [selectedChatId, conversaciones, setSelectedContactId]);

  // Lógica para seleccionar automáticamente el chat si viene un contactoId por URL
  useEffect(() => {
    if (!loadingConvs && targetContactoId && conversaciones.length > 0) {
      const targetConv = conversaciones.find(c => c.contactoId === targetContactoId);
      if (targetConv && targetConv.id !== selectedChatId) {
        setSelectedChatId(targetConv.id);
      }
    }
  }, [targetContactoId, conversaciones, loadingConvs, selectedChatId, setSelectedChatId]);
  
  // Reseteo automático de mensajes no leídos al entrar en la charla
  useEffect(() => {
    if (!currentWorkspaceId || !selectedChatId) return;
    
    const resetUnread = async () => {
      try {
        const convRef = doc(
          db, 
          COLLECTIONS.ESPACIOS, currentWorkspaceId, 
          COLLECTIONS.CONVERSACIONES, selectedChatId
        );
        await updateDoc(convRef, { unreadCount: 0 });
      } catch (err) {
        console.warn("Error al resetear unreadCount:", err);
      }
    };

    resetUnread();
  }, [selectedChatId, currentWorkspaceId]);

  const selectedChat = conversaciones.find(c => c.id === selectedChatId);

  const selectedChatRef = React.useRef(selectedChat);
  selectedChatRef.current = selectedChat;

  const handleRequestSuggestion = async () => {
    if (!currentWorkspaceId || !selectedChatId) return;
    const { pedirSugerenciaIAAction } = await import("@/app/actions/ai");
    
    setIsRequestingSuggestion(true);
    try {
      const res = await pedirSugerenciaIAAction(currentWorkspaceId, selectedChatId);
      if (res.success) {
        toast.success("Sugerencia solicitada a la IA");
      } else {
        toast.error(res.error || "No se pudo generar la sugerencia");
      }
    } catch (error) {
      toast.error("Error al conectar con la IA");
    } finally {
      setIsRequestingSuggestion(false);
    }
  };

  const handleSendMessage = async (text: string, isInternal: boolean = false, replyToMsg?: any) => {
    const wsId = workspaceIdRef.current;
    const chatId = selectedChatIdRef.current;

    console.log("[handleSendMessage] Iniciando envío:", { wsId, chatId, isInternal, textLength: text?.length, replyToMsgId: replyToMsg?.id });

    if (!wsId || !chatId) {
      console.warn("[handleSendMessage] wsId o chatId nulos, abortando");
      return;
    }

    // Usar la conversación seleccionada síncronamente desde el ref
    let chatActual = selectedChatRef.current;
    let actualChatId = chatId;

    console.log("[handleSendMessage] Chat actual obtenido del ref:", chatActual);

    try {
      if (!chatActual) {
        console.log("[handleSendMessage] Chat actual no encontrado en el ref, intentando inicializar conversación...");
        // Para notas internas, necesitamos el chatId si ya existe
        // Si no existe y es nota interna, tal vez deberíamos crearla igual o manejar el error
        if (isInternal) {
           // Si es interna y no hay chat, no podemos guardarla en un chat que no existe
           // Por ahora, asumimos que si es interna debe existir el chat.
           if (!actualChatId) throw new Error("No se puede guardar una nota en una conversación inexistente");
        } else {
          // Buscar el primer canal disponible para iniciar el chat
          const channelsRef = collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CANALES);
          const channelsSnap = await getDocs(firestoreQuery(channelsRef, limit(1)));
          
          if (channelsSnap.empty) throw new Error("No hay canales configurados para enviar mensajes");
          
          const canalDoc = channelsSnap.docs[0];
          const canalData = canalDoc.data();
          console.log("[handleSendMessage] Canal por defecto para chat nuevo:", canalDoc.id, canalData.tipo);

          // Crear la conversación en Firestore
          const convsRef = collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONVERSACIONES);
          const newConvDoc = await addDoc(convsRef, {
            contactoId: chatId,
            canal: canalData.tipo || 'whatsapp',
            canalId: canalDoc.id,
            estado: 'abierto',
            ultimaActividad: Timestamp.now(),
            ultimoMensaje: text,
            unreadCount: 0,
            creadoEl: Timestamp.now()
          });

          actualChatId = newConvDoc.id;
          setSelectedChatId(actualChatId);
          
          // Creamos un objeto virtual para que el resto de la lógica funcione
          chatActual = {
            id: actualChatId,
            contactoId: chatId,
            canal: canalData.tipo || 'whatsapp',
            canalId: canalDoc.id
          };
          console.log("[handleSendMessage] Creado chat virtual:", chatActual);
        }
      }

      const messagesRef = collection(
        db, 
        COLLECTIONS.ESPACIOS, wsId, 
        COLLECTIONS.CONVERSACIONES, actualChatId, 
        COLLECTIONS.MENSAJES
      );

      const convRef = doc(
        db, 
        COLLECTIONS.ESPACIOS, wsId, 
        COLLECTIONS.CONVERSACIONES, actualChatId
      );
      if (isInternal) {
        // 1. Guardar nota interna en la conversación (timeline del chat)
        await addDoc(messagesRef, {
          text,
          from: 'system',
          creadoEl: Timestamp.now(),
          metadata: { isInternalNote: true }
        });

        // 2. Sincronizar con el historial de SALUD (interacciones)
        const interactionsRef = collection(
          db, 
          COLLECTIONS.ESPACIOS, wsId, 
          COLLECTIONS.CONTACTOS, chatActual.contactoId, 
          "interacciones"
        );
        
        await addDoc(interactionsRef, {
          tipo: 'nota',
          contenido: text,
          fuente: 'chat',
          conversacionId: actualChatId,
          creadoPor: "Operador",
          creadoEl: Timestamp.now()
        });

        // 3. Mantener compatibilidad con notas_internas si es necesario
        const contactNotesRef = collection(
          db, 
          COLLECTIONS.ESPACIOS, wsId, 
          COLLECTIONS.CONTACTOS, chatActual.contactoId, 
          "notas_internas"
        );
        
        await addDoc(contactNotesRef, {
          text,
          fuente: chatActual.canal || 'desconocido',
          conversacionId: actualChatId,
          creadoEl: Timestamp.now()
        });

        toast.info("Nota sincronizada en el perfil y salud del contacto");
        return;
      }

      // Verificar ventana de 24hs para WhatsApp
      if (chatActual.canal === 'whatsapp') {
        const ultimoMensajeCliente = chatActual.ultimoMensajeCliente?.toDate?.();
        const windowExpired = !ultimoMensajeCliente || Date.now() - ultimoMensajeCliente.getTime() > 24 * 60 * 60 * 1000;
        if (windowExpired) {
          toast.error("La ventana de 24hs expiró. El cliente debe escribirte primero para poder responder.");
          return;
        }
      }

      // Proceso de envío real para mensajes públicos
      console.log("[handleSendMessage] Buscando contacto:", chatActual.contactoId);
      const contactSnap = await getDoc(doc(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONTACTOS, chatActual.contactoId));
      if (!contactSnap.exists()) throw new Error("Contacto no encontrado");
      
      const contactData = contactSnap.data() as Contacto;
      const destinatario = (contactData as any).metaId || contactData.telefono;

      if (!destinatario) throw new Error("No se pudo determinar el destinatario");

      // Validar si el canalId asociado a la conversación existe en Firestore
      let canalIdValido = chatActual.canalId;
      const canalRef = doc(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CANALES, chatActual.canalId);
      const canalSnap = await getDoc(canalRef);

      if (!canalSnap.exists()) {
        console.warn(`[handleSendMessage] Canal con ID ${chatActual.canalId} no existe en Firestore. Buscando canal alternativo del tipo ${chatActual.canal}...`);
        
        const canalesRef = collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CANALES);
        const qCanal = firestoreQuery(canalesRef, where("tipo", "==", chatActual.canal));
        const qSnap = await getDocs(qCanal);

        if (qSnap.empty) {
          const canalTipoVisual = chatActual.canal ? chatActual.canal.toUpperCase() : "chat";
          throw new Error(`No se pudo enviar el mensaje. No tienes un canal de ${canalTipoVisual} configurado o activo en este Workspace. Por favor, configúralo en Ajustes.`);
        }

        const canalDoc = qSnap.docs[0];
        canalIdValido = canalDoc.id;
        console.log(`[handleSendMessage] Canal alternativo encontrado: ${canalIdValido}. Actualizando conversación en Firestore.`);

        // Actualizar el canal en el documento de la conversación para repararla
        await updateDoc(convRef, {
          canalId: canalIdValido
        });

        // Actualizar el canalId en memoria local
        chatActual.canalId = canalIdValido;
      }

      console.log("[handleSendMessage] Destinatario:", destinatario, "CanalID Final:", canalIdValido);

      console.log("[handleSendMessage] Llamando a enviarMensajeAccion...");
      const res = await enviarMensajeAccion(wsId, canalIdValido, destinatario, text, undefined, undefined, undefined, replyToMsg?.id);
      console.log("[handleSendMessage] Respuesta de enviarMensajeAccion:", res);
      
      if (!res.success) {
        toast.error(`Error de envío: ${res.error}`);
        return;
      }

      // Preparar metadata para guardar la cita si replyToMsg existe
      const metadataPayload: Record<string, any> = {};
      if (replyToMsg) {
        metadataPayload.replyToId = replyToMsg.id;
        metadataPayload.replyToFrom = replyToMsg.from;
        metadataPayload.replyToText = replyToMsg.text;
      }

      const msgPayload: Record<string, any> = {
        text,
        from: 'operator',
        creadoEl: Timestamp.now()
      };
      if (replyToMsg) {
        msgPayload.metadata = metadataPayload;
      }

      // Si Meta devuelve el ID del mensaje enviado, lo usamos como ID del documento en Firestore
      if (res.messageId) {
        await setDoc(doc(messagesRef, res.messageId), msgPayload);
      } else {
        await addDoc(messagesRef, msgPayload);
      }

      await updateDoc(convRef, {
        ultimoMensaje: text,
        ultimaActividad: Timestamp.now(),
        modoIA: 'pausado', // Pausar IA al intervenir humano
        unreadCount: 0
      });

    } catch (error: any) {
      console.error("Error en handleSendMessage:", error);
      toast.error(error.message || "Error al procesar el mensaje");
    }
  };

  if (isMobile) {
    return (
      <MobileInboxContainer 
        conversaciones={conversaciones}
        selectedChatId={selectedChatId}
        onSelectChat={(id) => setSelectedChatId(id)}
        onSendMessage={handleSendMessage}
        onRequestSuggestion={handleRequestSuggestion}
        isRequestingSuggestion={isRequestingSuggestion}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-[var(--bg-main)]">
      <ConvLimitBanner />
    <div className="flex flex-1 w-full overflow-hidden">
      {/* Columna 1: Listado de Chats */}
      <div className="w-1/4 min-w-[320px] max-w-[400px] border-r border-[var(--border-light)] flex flex-col h-full overflow-hidden">
        <ChatList 
          conversaciones={conversaciones}
          selectedId={selectedChatId || undefined}
          onSelect={async (id) => {
            setSelectedChatId(id);
            // Reseteo inmediato al seleccionar
            if (currentWorkspaceId && id) {
              try {
                const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, id);
                await updateDoc(convRef, { unreadCount: 0 });
              } catch (e) {
                console.warn("Error reset unread:", e);
              }
            }
          }}
        />
      </div>
      
      {/* Columna 2: Ventana de Chat */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--bg-card)]">
        <ChatWindow 
          conversacion={selectedChat}
          mensajes={mensajes}
          onSendMessage={handleSendMessage}
        />
      </div>
      
      {/* Columna 3: Panel de Contexto (CRM) */}
      <ContextPanel onSendMessage={handleSendMessage} />
    </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { ChatList } from "@/components/inbox/ChatList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { ContextPanel } from "@/components/layout/ContextPanel";
import { useConversaciones } from "@/hooks/useConversaciones";
import { useMensajes } from "@/hooks/useMensajes";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, Contacto } from "@/lib/types/firestore";
import { enviarMensajeAccion } from "@/app/actions/channels";
import { getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileInboxContainer } from "@/components/mobile/inbox/MobileInboxContainer";

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
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

  const handleSendMessage = async (text: string, isInternal: boolean = false) => {
    if (!currentWorkspaceId || !selectedChatId || !selectedChat) return;

    const messagesRef = collection(
      db, 
      COLLECTIONS.ESPACIOS, currentWorkspaceId, 
      COLLECTIONS.CONVERSACIONES, selectedChatId, 
      COLLECTIONS.MENSAJES
    );

    const convRef = doc(
      db, 
      COLLECTIONS.ESPACIOS, currentWorkspaceId, 
      COLLECTIONS.CONVERSACIONES, selectedChatId
    );

    try {
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
          COLLECTIONS.ESPACIOS, currentWorkspaceId, 
          COLLECTIONS.CONTACTOS, selectedChat.contactoId, 
          "interacciones"
        );
        
        await addDoc(interactionsRef, {
          tipo: 'nota',
          contenido: text,
          fuente: 'chat',
          conversacionId: selectedChatId,
          creadoPor: "Operador",
          creadoEl: Timestamp.now()
        });

        // 3. Mantener compatibilidad con notas_internas si es necesario
        const contactNotesRef = collection(
          db, 
          COLLECTIONS.ESPACIOS, currentWorkspaceId, 
          COLLECTIONS.CONTACTOS, selectedChat.contactoId, 
          "notas_internas"
        );
        
        await addDoc(contactNotesRef, {
          text,
          fuente: selectedChat.canal || 'desconocido',
          conversacionId: selectedChatId,
          creadoEl: Timestamp.now()
        });

        toast.info("Nota sincronizada en el perfil y salud del contacto");
        return;
      }

      // Proceso de envío real para mensajes públicos
      const contactSnap = await getDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedChat.contactoId));
      if (!contactSnap.exists()) throw new Error("Contacto no encontrado");
      
      const contactData = contactSnap.data() as Contacto;
      const destinatario = (contactData as any).metaId || contactData.telefono;

      if (!destinatario) throw new Error("No se pudo determinar el destinatario");

      const res = await enviarMensajeAccion(currentWorkspaceId, selectedChat.canalId, destinatario, text);
      
      if (!res.success) {
        toast.error(`Error de envío: ${res.error}`);
        return;
      }

      await addDoc(messagesRef, {
        text,
        from: 'operator',
        creadoEl: Timestamp.now()
      });

      await updateDoc(convRef, {
        ultimoMensaje: text,
        ultimaActividad: Timestamp.now(),
        modoIA: 'pausado' // Pausar IA al intervenir humano
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
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[var(--bg-main)]">
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
    </div>
  );
}

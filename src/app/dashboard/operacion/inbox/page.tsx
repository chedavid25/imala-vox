"use client";

import React, { useState } from "react";
import { ChatList } from "@/components/inbox/ChatList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { useConversaciones } from "@/hooks/useConversaciones";
import { useMensajes } from "@/hooks/useMensajes";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";

export default function InboxPage() {
  const { conversaciones, loading: loadingConvs } = useConversaciones();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { currentWorkspaceId } = useWorkspaceStore();
  const { mensajes, loading: loadingMsgs } = useMensajes(selectedChatId);

  const selectedChat = conversaciones.find(c => c.id === selectedChatId);

  const handleSendMessage = async (text: string) => {
    if (!currentWorkspaceId || !selectedChatId) return;

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

    // 1. Guardar mensaje del operador
    await addDoc(messagesRef, {
      text,
      from: 'operator',
      creadoEl: Timestamp.now()
    });

    // 2. Actualizar último mensaje en la conversación (denormalización para la lista)
    await updateDoc(convRef, {
      ultimoMensaje: text,
      ultimaActividad: Timestamp.now()
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg-main)]">
      <ChatList 
        conversaciones={conversaciones}
        selectedId={selectedChatId || undefined}
        onSelect={setSelectedChatId}
      />
      
      <ChatWindow 
        conversacion={selectedChat}
        mensajes={mensajes}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

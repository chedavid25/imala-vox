"use client";

import React from "react";
import { MobileConversationList } from "./MobileConversationList";
import { MobileConversationView } from "./MobileConversationView";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useConversaciones } from "@/hooks/useConversaciones";
import { useMensajes } from "@/hooks/useMensajes";

interface MobileInboxContainerProps {
  conversaciones: any[];
  selectedChatId: string | null;
  onSelectChat: (id: string | null) => void;
  onSendMessage: (text: string, isInternal?: boolean) => void;
  onRequestSuggestion: () => void;
  isRequestingSuggestion: boolean;
}

export function MobileInboxContainer({
  conversaciones,
  selectedChatId,
  onSelectChat,
  onSendMessage,
  onRequestSuggestion,
  isRequestingSuggestion
}: MobileInboxContainerProps) {
  const { mensajes } = useMensajes(selectedChatId);
  const selectedChat = conversaciones.find(c => c.id === selectedChatId) || 
                   conversaciones.find(c => c.contactoId === selectedChatId); // Caso donde pasamos el contactoId

  if (selectedChatId && (selectedChat || (selectedChatId.length > 10))) { 
    // Si tenemos un ID y o es un chat existente o parece un ID de contacto (UID de Firebase suele ser largo)
    return (
      <MobileConversationView 
        conversacion={selectedChat || { contactoId: selectedChatId, nuevo: true }}
        mensajes={mensajes}
        onSendMessage={onSendMessage}
        onBack={() => onSelectChat(null)}
        onOpenIAAssistant={onRequestSuggestion}
        isRequestingSuggestion={isRequestingSuggestion}
      />
    );
  }

  return (
    <MobileConversationList 
      conversaciones={conversaciones}
      onSelect={onSelectChat}
    />
  );
}

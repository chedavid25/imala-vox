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
  const selectedChat = conversaciones.find(c => c.id === selectedChatId);

  if (selectedChatId && selectedChat) {
    return (
      <MobileConversationView 
        conversacion={selectedChat}
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

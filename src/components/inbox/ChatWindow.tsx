import React, { useState, useRef, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import { IndicadorIA } from "@/components/ui/IndicadorIA";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, Bot } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ChatWindowProps {
  conversacion: any;
  mensajes: any[];
  onSendMessage: (text: string) => void;
  onLoadMore?: () => void;
}

export function ChatWindow({ conversacion, mensajes, onSendMessage, onLoadMore }: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const virtuosoRef = useRef<any>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  if (!conversacion) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-card)] text-[var(--text-tertiary-light)]">
        Selecciona una conversación para comenzar
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-card)]">
      {/* Header del Chat */}
      <header className="h-[var(--header-height)] border-b border-[var(--border-light)] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-input)] flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--text-tertiary-light)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary-light)]">
              {conversacion.contactoNombre || "Desconocido"}
            </h3>
            <div className="flex items-center gap-2">
              <CanalBadge canal={conversacion.canal || 'whatsapp'} className="scale-75 origin-left" />
              <IndicadorIA status={conversacion.iaStatus || 'activo'} className="scale-75 origin-left" />
            </div>
          </div>
        </div>
      </header>

      {/* Ventana de Mensajes con Scroll Infinito */}
      <div className="flex-1 min-h-0">
        <Virtuoso
          ref={virtuosoRef}
          data={mensajes}
          initialTopMostItemIndex={mensajes.length - 1}
          firstItemIndex={10000 - mensajes.length} // Necesario para "prepend" items
          startReached={onLoadMore}
          itemContent={(index, msg) => (
            <MessageItem key={msg.id} message={msg} />
          )}
          style={{ height: '100%' }}
          followOutput="smooth"
        />
      </div>

      {/* Composer de Mensajes */}
      <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 bg-[var(--bg-input)] rounded-lg px-3 py-1">
          <Input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm h-10"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="rounded-full w-8 h-8 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: any }) {
  const isBot = message.from === 'bot';
  const isOperator = message.from === 'operator';
  const isUser = message.from === 'user';

  return (
    <div className={cn(
      "flex w-full mb-4 px-6",
      isUser ? "justify-start" : "justify-end"
    )}>
      <div className={cn(
        "max-w-[80%] flex flex-col",
        isUser ? "items-start" : "items-end"
      )}>
        <div className={cn(
          "px-4 py-2 rounded-2xl text-[13px] shadow-sm",
          isUser 
            ? "bg-[var(--bg-input)] text-[var(--text-primary-light)] rounded-tl-none" 
            : "bg-[var(--accent)] text-[var(--accent-text)] rounded-tr-none font-medium"
        )}>
          {message.text}
        </div>
        <div className="flex items-center gap-1.5 mt-1 px-1">
          {isBot && <Bot className="w-3 h-3 text-[var(--text-tertiary-light)]" />}
          <span className="text-[10px] text-[var(--text-tertiary-light)] font-medium">
            {format(message.creadoEl?.toDate() || new Date(), 'HH:mm', { locale: es })}
          </span>
        </div>
      </div>
    </div>
  );
}

// Utility to merge classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

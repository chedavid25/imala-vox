import React from "react";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ChatListProps {
  conversaciones: any[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ChatList({ conversaciones, selectedId, onSelect }: ChatListProps) {
  return (
    <div className="w-[340px] border-r border-[var(--border-light)] flex flex-col h-full bg-[var(--bg-main)]">
      <div className="p-4 border-b border-[var(--border-light)] bg-[var(--bg-card)]">
        <h2 className="text-[15px] font-bold text-[var(--text-primary-light)]">Conversaciones</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversaciones.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-tertiary-light)] text-sm">
            No hay conversaciones activas.
          </div>
        ) : (
          conversaciones.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              className={cn(
                "w-full p-4 border-b border-[var(--border-light)] text-left transition-colors flex flex-col gap-1",
                selectedId === chat.id 
                  ? "bg-[var(--bg-card)] shadow-inner" 
                  : "hover:bg-[var(--bg-card)]/50 bg-transparent"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-[var(--text-primary-light)] truncate max-w-[160px]">
                  {chat.contactoNombre || chat.id}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary-light)] font-medium uppercase text-right shrink-0">
                  {chat.ultimaActividad ? formatDistanceToNow(chat.ultimaActividad.toDate(), { addSuffix: true, locale: es }) : ''}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <p className="text-[12px] text-[var(--text-secondary-light)] truncate flex-1">
                  {chat.ultimoMensaje || 'Sin mensajes aún'}
                </p>
                <CanalBadge canal={chat.canal || 'whatsapp'} showIcon={false} className="scale-75 origin-right" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

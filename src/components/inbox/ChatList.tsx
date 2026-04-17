"use client";

import React, { useState } from "react";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { useContactos } from "@/hooks/useContactos";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Filter, MessageSquare, Mail, User2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatListProps {
  conversaciones: any[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ChatList({ conversaciones, selectedId, onSelect }: ChatListProps) {
  const { contactos } = useContactos();
  const [filter, setFilter] = useState<'all' | 'mine' | 'unread'>('all');
  const [search, setSearch] = useState("");

  const getContactInfo = (contactoId: string, defaultNombre: string) => {
    const contact = contactos.find(c => c.id === contactoId);
    return {
      nombre: contact?.nombre || defaultNombre || "Desconocido",
      foto: contact?.avatarUrl || null
    };
  };

  const filteredConversations = conversaciones.filter(conv => {
    // Por defecto ocultamos las resueltas a menos que haya búsqueda o filtro específico
    const isResolved = conv.estado === 'resuelto';
    const matchesSearch = (conv.contactoNombre || '').toLowerCase().includes(search.toLowerCase()) || 
                          (conv.ultimoMensaje || '').toLowerCase().includes(search.toLowerCase());
    
    // Si hay búsqueda, mostramos todo lo que coincida
    if (search.trim() !== "") return matchesSearch;

    // Si no hay búsqueda, aplicamos filtros de estado
    if (isResolved) return false; // Ocultar resueltas en vista normal

    if (filter === 'unread') return matchesSearch && conv.unreadCount > 0;
    // 'mine' se puede implementar cuando tengamos auth del agente actual
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header con Búsqueda */}
      <div className="p-4 border-b border-[var(--border-light)] bg-[var(--bg-card)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[var(--text-primary-light)] tracking-tight">Buzón</h2>
          <button className="p-1.5 hover:bg-[var(--bg-input)] rounded-md text-[var(--text-tertiary-light)] transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary-light)]" />
          <Input 
            placeholder="Buscar conversaciones..." 
            className="pl-9 bg-[var(--bg-input)] border-transparent focus:border-[var(--accent)] text-sm h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-light)] bg-[var(--bg-main)] overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'Todos', icon: MessageSquare },
          { id: 'mine', label: 'Míos', icon: User2 },
          { id: 'unread', label: 'Sin leer', icon: Mail },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id as any)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border",
              filter === btn.id 
                ? "bg-[var(--accent)] text-[var(--accent-text)] border-transparent shadow-sm" 
                : "bg-transparent text-[var(--text-secondary-light)] border-[var(--border-light)] hover:bg-[var(--bg-card)]"
            )}
          >
            <btn.icon className="w-3 h-3" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Lista de Chats */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-2 opacity-60">
            <MessageSquare className="w-8 h-8 text-[var(--text-tertiary-light)]" />
            <p className="text-xs font-medium text-[var(--text-tertiary-light)]">No se encontraron chats</p>
          </div>
        ) : (
          filteredConversations.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              className={cn(
                "w-full p-3.5 border-b border-[var(--border-light)] text-left transition-all flex items-start gap-3 relative",
                selectedId === chat.id 
                  ? "bg-[#1F1F1E] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[var(--accent)]" 
                  : "hover:bg-[var(--bg-input)]/40 bg-transparent"
              )}
            >
              {/* Avatar Mockup */}
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm relative transition-all duration-300",
                selectedId === chat.id 
                  ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30" 
                  : "bg-gradient-to-br from-[var(--bg-input)] to-[var(--bg-main)] border border-[var(--border-light)]"
              )}>
                {getContactInfo(chat.contactoId, chat.contactoNombre).foto ? (
                  <img 
                    src={getContactInfo(chat.contactoId, chat.contactoNombre).foto!} 
                    alt="avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className={cn(
                    "text-xs font-black",
                    selectedId === chat.id ? "text-[var(--accent)]" : "text-[var(--text-primary-light)]"
                  )}>
                    {getContactInfo(chat.contactoId, chat.contactoNombre).nombre.charAt(0).toUpperCase()}
                  </span>
                )}
                {/* Indicador de Red Social */}
                <div className="absolute -bottom-1 -right-1 flex items-center justify-center shadow-2xl">
                  <CanalBadge canal={chat.canal || 'whatsapp'} showText={false} className="border-2 border-[#121212] scale-[0.85]" />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "text-[13.5px] truncate font-bold tracking-tight",
                    selectedId === chat.id ? "text-white" : "text-[var(--text-primary-light)]"
                  )}>
                    {getContactInfo(chat.contactoId, chat.contactoNombre).nombre}
                  </span>
                  <span className={cn(
                    "text-[10px] font-semibold tabular-nums",
                    selectedId === chat.id ? "text-white/40" : "text-[var(--text-tertiary-light)]"
                  )}>
                    {chat.ultimaActividad ? formatDistanceToNow(chat.ultimaActividad.toDate(), { addSuffix: false, locale: es }) : ''}
                  </span>
                </div>
                
                <div className="flex justify-between items-center gap-2">
                  <p className={cn(
                    "text-[12px] truncate flex-1 leading-snug",
                    selectedId === chat.id 
                      ? "text-white/60 font-medium" 
                      : chat.unreadCount > 0 
                        ? "font-bold text-[var(--text-primary-light)]" 
                        : "text-[var(--text-secondary-light)]"
                  )}>
                    {chat.ultimoMensaje || 'Sin mensajes aún'}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-[var(--accent)] text-[var(--accent-text)] text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm ring-1 ring-white/10 shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

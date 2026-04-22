"use client";

import React, { useState } from "react";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { useContactos } from "@/hooks/useContactos";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, isToday, format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, MessageSquare, Bot, Check, CheckCheck, MoreVertical, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MobileConversationListProps {
  conversaciones: any[];
  onSelect: (id: string) => void;
}

export function MobileConversationList({ conversaciones, onSelect }: MobileConversationListProps) {
  const { contactos } = useContactos();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'unread' | 'escalated'>('all');

  const getContactInfo = (contactoId: string, defaultNombre: string) => {
    const contact = contactos.find(c => c.id === contactoId);
    return {
      nombre: contact?.nombre || defaultNombre || "Desconocido",
      foto: contact?.avatarUrl || null
    };
  };

  const filteredConversations = conversaciones.filter(conv => {
    const matchesSearch = (conv.contactoNombre || '').toLowerCase().includes(search.toLowerCase()) || 
                          (conv.ultimoMensaje || '').toLowerCase().includes(search.toLowerCase());
    
    if (search.trim() !== "") return matchesSearch;

    if (filter === 'unread') return matchesSearch && (conv.unreadCount || 0) > 0;
    if (filter === 'escalated') return matchesSearch && conv.necesitaHumano === true;
    if (conv.estado === 'resuelto') return false;

    return matchesSearch;
  });

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    if (isToday(date)) {
      return format(date, "HH:mm");
    }
    return format(date, "d MMM");
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F4] relative">
      {/* Header Estilo WhatsApp Moderno */}
      <div className="bg-white px-5 pt-6 pb-4 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conversaciones</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Bandeja Centralizada</p>
           </div>
           <div className="flex items-center gap-2">
              <button className="size-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 active:bg-[var(--accent)] active:text-black transition-colors">
                <Search size={20} />
              </button>
              <button className="size-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <Plus size={20} strokeWidth={2} />
              </button>
           </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            placeholder="Buscar chats o mensajes..." 
            className="pl-11 bg-slate-50 border-none focus:bg-white text-sm h-12 rounded-2xl shadow-inner transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filtros Rápidos (Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'Todos', count: conversaciones.length },
            { id: 'unread', label: 'Sin leer', count: conversaciones.filter(c => (c.unreadCount || 0) > 0).length },
            { id: 'escalated', label: 'Por atender', count: conversaciones.filter(c => c.necesitaHumano).length }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all border-2 shrink-0",
                filter === f.id 
                  ? "bg-[var(--accent)] border-[var(--accent)] text-slate-900 shadow-sm" 
                  : "bg-white border-slate-50 text-slate-400"
              )}
            >
              {f.label}
              {f.count > 0 && (
                 <span className="ml-1.5 opacity-40 tabular-nums">{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Chats */}
      <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar bg-white">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center px-10">
            <div className="size-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-slate-300" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Bandeja Vacía</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-2">No hay conversaciones en esta sección.</p>
          </div>
        ) : (
          filteredConversations.map((chat) => {
            const info = getContactInfo(chat.contactoId, chat.contactoNombre);
            const hasUnread = (chat.unreadCount || 0) > 0;
            
            return (
              <button
                key={chat.id}
                onClick={() => onSelect(chat.id)}
                className="w-full px-5 py-4 flex items-center gap-4 active:bg-slate-50 transition-colors border-b border-slate-50 group relative"
              >
                {/* Avatar Premium */}
                <div className="relative shrink-0">
                  <div className="size-14 rounded-[22px] bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm transition-transform group-active:scale-95">
                    {info.foto ? (
                      <img src={info.foto} alt={info.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-slate-400">
                        {info.nombre.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Badge Canal */}
                  <div className="absolute -bottom-1 -right-1">
                    <CanalBadge canal={chat.canal || 'whatsapp'} showText={false} className="border-[3px] border-white scale-90 shadow-sm" />
                  </div>
                </div>

                {/* Info Mensaje */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={cn(
                      "text-[15px] truncate tracking-tight transition-all",
                      hasUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                    )}>
                      {info.nombre}
                    </h3>
                    <span className={cn(
                      "text-[9px] font-semibold tabular-nums uppercase tracking-tighter",
                      hasUnread ? "text-emerald-500" : "text-slate-400"
                    )}>
                      {formatTime(chat.ultimaActividad)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {/* Check de estado */}
                      {!hasUnread && chat.ultimoMensajeFrom === 'operator' && (
                        <CheckCheck size={14} className="text-blue-500 shrink-0" />
                      )}
                      {chat.necesitaHumano && (
                         <div className="size-1.5 bg-rose-500 rounded-full shrink-0 animate-pulse" />
                      )}
                      <p className={cn(
                        "text-[13px] truncate leading-snug",
                        hasUnread ? "font-bold text-slate-900" : "text-slate-400 font-medium"
                      )}>
                        {chat.ultimoMensaje || "Sin mensajes"}
                      </p>
                    </div>
                    
                    {hasUnread && (
                      <div className="size-5 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-in zoom-in">
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>

                {/* Indicador de selección visual rápida */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--accent)] rounded-r-full opacity-0 group-active:opacity-100 transition-opacity" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

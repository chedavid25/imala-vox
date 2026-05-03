"use client";

import React, { useState } from "react";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { useContactos } from "@/hooks/useContactos";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Filter, MessageSquare, Mail, User2, Check, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";
import { Avatar } from "@/components/ui/Avatar";

interface ChatListProps {
  conversaciones: any[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ChatList({ conversaciones, selectedId, onSelect }: ChatListProps) {
  const { contactos } = useContactos();
  const [filter, setFilter] = useState<'all' | 'mine' | 'unread' | 'escalated'>('all');
  const [search, setSearch] = useState("");
  const [canalFilter, setCanalFilter] = useState<'all' | 'whatsapp' | 'instagram' | 'facebook'>('all');
  const [showResolved, setShowResolved] = useState(false);

  const currentUserId = auth.currentUser?.uid;
  const hasActiveFilters = canalFilter !== 'all' || showResolved;

  const getContactInfo = (contactoId: string, defaultNombre: string) => {
    const contact = contactos.find(c => c.id === contactoId);
    return {
      nombre: contact?.nombre || defaultNombre || "Desconocido",
      foto: contact?.avatarUrl || null
    };
  };

  const filteredConversations = conversaciones.filter(conv => {
    const isResolved = conv.estado === 'resuelto';
    const matchesSearch =
      (conv.contactoNombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (conv.ultimoMensaje || '').toLowerCase().includes(search.toLowerCase());

    if (search.trim() !== "") return matchesSearch;

    if (!showResolved && isResolved) return false;

    if (canalFilter !== 'all' && conv.canal !== canalFilter) return false;

    if (filter === 'escalated') return conv.necesitaHumano === true;
    if (filter === 'unread') return (conv.unreadCount || 0) > 0;
    if (filter === 'mine') return currentUserId ? conv.asignadoA === currentUserId : true;

    return true;
  });

  const canalLabels: Record<string, string> = {
    all: 'Todos los canales',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header con Búsqueda */}
      <div className="p-4 border-b border-[var(--border-light)] bg-[var(--bg-card)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[var(--text-primary-light)] tracking-tight">Buzón</h2>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "p-1.5 rounded-md transition-colors relative outline-none",
                hasActiveFilters
                  ? "bg-[var(--bg-sidebar)] border border-[var(--border-dark)] text-[var(--accent)]"
                  : "hover:bg-[var(--bg-input)] text-[var(--text-tertiary-light)]"
              )}
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent)] rounded-full" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl border border-[var(--border-light)] bg-white shadow-xl">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[9px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest px-2 py-1.5">
                  Canal
                </DropdownMenuLabel>
                {(['all', 'whatsapp', 'instagram', 'facebook'] as const).map(c => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() => setCanalFilter(c)}
                    className="flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-[var(--bg-input)]"
                  >
                    <div className={cn("w-3.5 h-3.5 flex items-center justify-center", canalFilter === c ? "text-[var(--text-primary-light)]" : "text-transparent")}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    {canalLabels[c]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[var(--border-light)] my-1" />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[9px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest px-2 py-1.5">
                  Estado
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setShowResolved(v => !v)}
                  className="flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-[var(--bg-input)]"
                >
                  {showResolved
                    ? <Eye className="w-3.5 h-3.5 text-[var(--text-primary-light)]" />
                    : <EyeOff className="w-3.5 h-3.5 text-[var(--text-tertiary-light)]" />
                  }
                  {showResolved ? 'Ocultar resueltas' : 'Mostrar resueltas'}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Pill indicadora de filtros activos */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {canalFilter !== 'all' && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-sidebar)] text-[var(--accent)] text-[10px] font-black rounded-full border border-[var(--border-dark)]">
                {canalLabels[canalFilter]}
                <button onClick={() => setCanalFilter('all')} className="ml-0.5 hover:text-red-500">×</button>
              </span>
            )}
            {showResolved && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-sidebar)] text-[var(--accent)] text-[10px] font-black rounded-full border border-[var(--border-dark)]">
                Con resueltas
                <button onClick={() => setShowResolved(false)} className="ml-0.5 hover:text-red-500">×</button>
              </span>
            )}
          </div>
        )}

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
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-[var(--border-light)] bg-[var(--bg-main)]">
        {[
          { id: 'all', label: 'Todos', icon: MessageSquare },
          { id: 'escalated', label: 'Por Atender', icon: Filter },
          { id: 'mine', label: 'Míos', icon: User2 },
          { id: 'unread', label: 'Sin leer', icon: Mail },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id as any)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shadow-sm",
              filter === btn.id
                ? "bg-[var(--accent)] text-[var(--accent-text)] border-transparent"
                : "bg-[var(--bg-card)] text-[var(--text-secondary-light)] border-[var(--border-light)] hover:bg-[var(--bg-input)] hover:border-[var(--border-light-strong)]"
            )}
          >
            <btn.icon className="w-3.5 h-3.5" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Lista de Chats */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 space-y-3 opacity-60">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-light)]
                            flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-[var(--text-tertiary-light)]" />
            </div>
            <p className="text-sm font-bold text-[var(--text-secondary-light)]">Sin conversaciones</p>
            <p className="text-xs text-[var(--text-tertiary-light)] text-center max-w-[200px]">
              No se encontraron chats que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          filteredConversations.map((chat) => {
            const contactInfo = getContactInfo(chat.contactoId, chat.contactoNombre);
            const isResolved = chat.estado === 'resuelto';
            return (
              <button
                key={chat.id}
                onClick={() => onSelect(chat.id)}
                className={cn(
                  "w-full p-3.5 border-b border-[var(--border-light)] text-left transition-all flex items-start gap-3 relative cursor-pointer",
                  selectedId === chat.id
                    ? "bg-[var(--bg-sidebar)] border border-[var(--accent)]/20 shadow-sm"
                    : "hover:bg-[var(--bg-input)]/40 bg-transparent",
                  isResolved && "opacity-60"
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar 
                    src={contactInfo.foto} 
                    name={contactInfo.nombre} 
                    size="lg"
                    className={cn(
                      "transition-all duration-300",
                      selectedId === chat.id && "border-[var(--accent)]/30 ring-2 ring-[var(--accent)]/10"
                    )}
                  />
                  <div className="absolute -bottom-1 -right-1 flex items-center justify-center shadow-2xl">
                    <CanalBadge canal={chat.canal || 'whatsapp'} showText={false} className={cn(
                      "border-2 scale-[0.85]",
                      selectedId === chat.id ? "border-[var(--bg-sidebar)]" : "border-white"
                    )} />
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex justify-between items-center gap-1">
                    <span className={cn(
                      "text-[13.5px] truncate font-bold tracking-tight",
                      selectedId === chat.id ? "text-[var(--text-primary-dark)]" : "text-[var(--text-primary-light)]"
                    )}>
                      {contactInfo.nombre}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {isResolved && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      <span className={cn(
                        "text-[10px] font-semibold tabular-nums",
                        selectedId === chat.id ? "text-[var(--text-tertiary-dark)]" : "text-[var(--text-tertiary-light)]"
                      )}>
                        {chat.ultimaActividad ? formatDistanceToNow(chat.ultimaActividad.toDate(), { addSuffix: false, locale: es }) : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    <p className={cn(
                      "text-[12px] truncate flex-1 leading-snug",
                      selectedId === chat.id
                        ? "text-[var(--text-secondary-dark)] font-medium"
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
            );
          })
        )}
      </div>
    </div>
  );
}

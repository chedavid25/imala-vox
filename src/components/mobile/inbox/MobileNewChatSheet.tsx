"use client";

import React, { useState, useMemo } from "react";
import { BottomSheet } from "../shared/BottomSheet";
import { useContactos } from "@/hooks/useContactos";
import { Search, User, MessageCircle, ArrowRight, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";

interface MobileNewChatSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectContact: (contactoId: string) => void;
}

export function MobileNewChatSheet({ open, onClose, onSelectContact }: MobileNewChatSheetProps) {
  const { contactos, loading } = useContactos();
  const [search, setSearch] = useState("");

  const filteredContacts = useMemo(() => {
    return (contactos || []).filter(c => 
      (c.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono || "").includes(search)
    );
  }, [contactos, search]);

  return (
    <BottomSheet 
      open={open} 
      onClose={onClose} 
      title="Nueva Conversación"
    >
      <div className="flex flex-col h-[70vh]">
        <div className="px-5 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre o teléfono..." 
              className="pl-11 bg-slate-50 border-none focus:bg-white text-sm h-12 rounded-2xl shadow-inner transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 text-[var(--accent)] animate-spin" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando contactos...</p>
            </div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  onSelectContact(contact.id!);
                  onClose();
                }}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-50 active:bg-slate-50 transition-all group"
              >
                <div className="relative">
                  <Avatar 
                    src={contact.avatarUrl} 
                    name={contact.nombre} 
                    className="size-12 rounded-full border-2 border-slate-50"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-slate-900 text-[15px]">{contact.nombre}</h4>
                  <p className="text-[11px] text-slate-400 font-medium">{contact.telefono}</p>
                </div>
                <div className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-active:bg-[var(--accent)] group-active:text-black transition-colors">
                  <MessageCircle size={16} />
                </div>
              </button>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center px-10">
              <div className="size-16 rounded-[24px] bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
                <User size={32} />
              </div>
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-tight">No se encontraron contactos</p>
              <p className="text-[11px] text-slate-400 mt-1">Intenta con otro nombre o agrega uno nuevo.</p>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

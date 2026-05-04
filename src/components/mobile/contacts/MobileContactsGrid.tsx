"use client";

import React, { useState } from "react";
import { Contacto, EtiquetaCRM, CategoriaCRM } from "@/lib/types/firestore";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

interface MobileContactsGridProps {
  contactos: (Contacto & { id: string })[];
  tags: EtiquetaCRM[];
  categories: CategoriaCRM[];
  onSelect: (id: string) => void;
}

export function MobileContactsGrid({ contactos, tags, categories, onSelect }: MobileContactsGridProps) {
  return (
    <div className="flex flex-col gap-3 pb-24">
      {contactos.map((contact) => (
        <ContactCard 
          key={contact.id} 
          contact={contact} 
          tags={tags}
          categories={categories}
          onClick={() => onSelect(contact.id)} 
        />
      ))}
    </div>
  );
}

function ContactCard({ contact, tags, categories, onClick }: { 
  contact: Contacto & { id: string }, 
  tags: EtiquetaCRM[], 
  categories: CategoriaCRM[],
  onClick: () => void 
}) {
  const getContactHealth = (contacto: Contacto) => {
    if (!contacto.ultimaInteraccion) return { status: 'none', days: 0 };
    const lastDate = contacto.ultimaInteraccion.toDate();
    const daysSince = differenceInDays(new Date(), lastDate);
    
    let minThreshold = 30;
    (contacto.etiquetas || []).forEach(tId => {
      const tag = tags.find(t => t.id === tId);
      if (tag) {
        if (tag.alertaDias) minThreshold = Math.min(minThreshold, tag.alertaDias);
        else {
          const cat = categories.find(c => c.id === tag.categoriaId);
          if (cat?.alertaDiasDefault) minThreshold = Math.min(minThreshold, cat.alertaDiasDefault);
        }
      }
    });

    if (daysSince >= minThreshold) return { status: 'rojo', days: daysSince };
    if (daysSince >= (minThreshold - 3)) return { status: 'amarillo', days: daysSince };
    return { status: 'verde', days: daysSince };
  };

  const [imgError, setImgError] = useState(false);
  const health = getContactHealth(contact);
  const colors = ["bg-blue-50 text-blue-500", "bg-rose-50 text-rose-500", "bg-amber-50 text-amber-500", "bg-emerald-50 text-emerald-500", "bg-indigo-50 text-indigo-500", "bg-purple-50 text-purple-500"];
  const colorIndex = (contact.nombre?.charCodeAt(0) || 0) % colors.length;
  const avatarStyle = colors[colorIndex];

  return (
    <div 
      onClick={onClick}
      className="bg-white p-3 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all relative overflow-hidden group"
    >
      {/* Salud Relacional (Borde lateral) */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        health.status === 'verde' ? "bg-emerald-500" :
        health.status === 'amarillo' ? "bg-amber-500" :
        health.status === 'rojo' ? "bg-rose-500" : "bg-slate-100"
      )} />

      {/* Avatar */}
      <div className={cn("size-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-inner", avatarStyle)}>
        {contact.avatarUrl && !imgError ? (
          <img 
            src={contact.avatarUrl} 
            alt={contact.nombre} 
            className="w-full h-full object-cover rounded-2xl" 
            onError={() => setImgError(true)}
          />
        ) : (
          contact.nombre?.charAt(0).toUpperCase()
        )}
      </div>

      {/* Info Principal */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <h3 className="font-bold text-slate-900 text-[14px] leading-tight truncate">
          {contact.nombre}
        </h3>
        <p className="text-[11px] font-medium text-slate-400 truncate">
          {contact.telefono || "Sin teléfono"}
        </p>
        
        {/* Etiquetas (Vista rápida de las primeras 2) */}
        <div className="flex flex-wrap gap-1 mt-1">
          {(contact.etiquetas || []).slice(0, 2).map(tId => {
            const tag = tags.find(t => t.id === tId);
            if (!tag) return null;
            return (
              <div key={tId} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded-md">
                <div className="size-1 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                <span className="text-[8px] font-black uppercase text-slate-500">{tag.nombre}</span>
              </div>
            );
          })}
          {(contact.etiquetas?.length || 0) > 2 && (
            <span className="text-[8px] font-black text-slate-300 py-0.5">+{contact.etiquetas!.length - 2}</span>
          )}
        </div>
      </div>

      {/* Indicador de Tiempo y Salud */}
      <div className="flex flex-col items-end gap-1.5 shrink-0 pr-1">
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
          health.status === 'verde' ? "bg-emerald-50 text-emerald-600" :
          health.status === 'amarillo' ? "bg-amber-50 text-amber-600 animate-pulse" :
          health.status === 'rojo' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
        )}>
           <Clock className="size-2.5" />
           {health.days}d
        </div>
        
        <div className="flex gap-1.5">
           <div className="size-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <MessageCircle size={14} />
           </div>
           <div className="size-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <Phone size={14} />
           </div>
        </div>
      </div>
    </div>
  );
}

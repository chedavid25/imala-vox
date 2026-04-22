"use client";

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
    <div className="grid grid-cols-2 gap-3 pb-20">
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
  // Lógica de Salud Relacional
  const getContactHealth = (contacto: Contacto) => {
    if (!contacto.ultimaInteraccion) return { status: 'none', days: 0 };
    
    const lastDate = contacto.ultimaInteraccion.toDate();
    const daysSince = differenceInDays(new Date(), lastDate);
    
    let minThreshold = 30; // Default
    (contacto.etiquetas || []).forEach(tId => {
      const tag = tags.find(t => t.id === tId);
      if (tag) {
        if (tag.alertaDias) {
          minThreshold = Math.min(minThreshold, tag.alertaDias);
        } else {
          const cat = categories.find(c => c.id === tag.categoriaId);
          if (cat?.alertaDiasDefault) {
            minThreshold = Math.min(minThreshold, cat.alertaDiasDefault);
          }
        }
      }
    });

    if (daysSince >= minThreshold) return { status: 'rojo', days: daysSince };
    if (daysSince >= (minThreshold - 3)) return { status: 'amarillo', days: daysSince };
    return { status: 'verde', days: daysSince };
  };

  const health = getContactHealth(contact);

  // Colores pastel para los avatares por inicial
  const colors = [
    "bg-blue-50 text-blue-500",
    "bg-rose-50 text-rose-500",
    "bg-amber-50 text-amber-500",
    "bg-emerald-50 text-emerald-500",
    "bg-indigo-50 text-indigo-500",
    "bg-purple-50 text-purple-500",
  ];
  const colorIndex = (contact.nombre?.charCodeAt(0) || 0) % colors.length;
  const avatarStyle = colors[colorIndex];

  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3 active:scale-[0.97] transition-all relative overflow-hidden group"
    >
      {/* Indicador de Salud Relacional (Esquina) */}
      <div className={cn(
        "absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
        health.status === 'verde' ? "bg-emerald-50 text-emerald-600" :
        health.status === 'amarillo' ? "bg-amber-50 text-amber-600 animate-pulse" :
        health.status === 'rojo' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
      )}>
        <div className={cn(
          "size-1.5 rounded-full",
          health.status === 'verde' ? "bg-emerald-500" :
          health.status === 'amarillo' ? "bg-amber-500" :
          health.status === 'rojo' ? "bg-rose-500" : "bg-slate-300"
        )} />
        {health.days}d
      </div>

      <div className={cn("size-16 rounded-full flex items-center justify-center font-black text-2xl shadow-inner mt-2", avatarStyle)}>
        {contact.avatarUrl ? (
          <img src={contact.avatarUrl} alt={contact.nombre} className="w-full h-full object-cover rounded-full" />
        ) : (
          contact.nombre?.charAt(0).toUpperCase()
        )}
      </div>

      <div className="space-y-1 w-full overflow-hidden">
        <h3 className="font-bold text-slate-900 text-[13px] leading-tight truncate px-1">
          {contact.nombre}
        </h3>
        {contact.telefono && (
          <p className="text-[10px] font-medium text-slate-400 truncate px-1">
            {contact.telefono}
          </p>
        )}
        <div className="flex items-center justify-center gap-1.5">
           {contact.relacionTag === "Lead" && (
             <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-[9px] font-black px-2 py-0 h-4 uppercase">Lead</Badge>
           )}
           {contact.relacionTag === "Laboral" && (
             <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-black px-2 py-0 h-4 uppercase">Work</Badge>
           )}
           {contact.relacionTag === "Personal" && (
             <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black px-2 py-0 h-4 uppercase">Pers</Badge>
           )}
        </div>
      </div>

      <div className="mt-auto w-full flex items-center justify-center gap-3 pt-2 border-t border-slate-50">
        <div className="flex flex-col items-center gap-1">
          <div className="size-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
             <MessageCircle size={14} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="size-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
             <Phone size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}

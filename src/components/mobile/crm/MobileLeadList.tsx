"use client";

import React, { useState } from "react";
import { Search, Plus, Target, Flame, MessageCircle, Phone, Edit2, MoreVertical, ExternalLink, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { MobileLeadDetailSheet } from "./MobileLeadDetailSheet";
import { toast } from "sonner";

interface MobileLeadListProps {
  leads: any[];
  etapas: any[];
  onSelect: (lead: any) => void;
  onNewLead: () => void;
  onConvert: (lead: any) => void;
  onWhatsApp: (lead: any) => void;
}

export function MobileLeadList({ leads, etapas, onSelect, onNewLead, onConvert, onWhatsApp }: MobileLeadListProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<'todos' | 'meta_ads' | 'organico'>('todos');
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.nombre || "").toLowerCase().includes(search.toLowerCase()) || 
                          (l.telefono || "").includes(search);
    const matchesFilter = activeFilter === 'todos' || l.origen === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getEtapaColor = (etapaId: string) => {
    return etapas.find(e => e.id === etapaId)?.color || "#ccc";
  };

  const getEtapaNombre = (etapaId: string) => {
    return etapas.find(e => e.id === etapaId)?.nombre || "Sin etapa";
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F4] relative">
      {/* Detalle Sheet */}
      <MobileLeadDetailSheet 
        open={!!selectedLead}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onConvert={() => {
          onConvert(selectedLead);
          setSelectedLead(null);
        }}
        onWhatsApp={() => {
          onWhatsApp(selectedLead);
          setSelectedLead(null);
        }}
        etapas={etapas}
      />

      {/* Header Premium */}
      <div className="bg-white px-5 pt-6 pb-4 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Oportunidades</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Leads e Intereses</p>
           </div>
           <button 
             onClick={onNewLead}
             className="size-11 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
           >
             <Plus size={24} strokeWidth={2} />
           </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nombre o teléfono..." 
            className="pl-11 bg-slate-50 border-none focus:bg-white text-sm h-12 rounded-2xl shadow-inner transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'todos', label: 'Todos', count: leads.length },
            { id: 'meta_ads', label: 'Meta Ads', count: leads.filter(l => l.origen === 'meta_ads').length },
            { id: 'organico', label: 'Orgánico', count: leads.filter(l => l.origen === 'organico').length }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all border-2 shrink-0",
                activeFilter === f.id 
                  ? "bg-[var(--accent)] border-[var(--accent)] text-slate-900 shadow-sm" 
                  : "bg-white border-slate-50 text-slate-400"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Cards */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-24 custom-scrollbar">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center px-10">
            <Target size={64} strokeWidth={1} className="text-slate-400 mb-4" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Sin oportunidades</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-2">No encontramos leads con ese criterio.</p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div 
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 active:scale-[0.98] transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {/* Temperatura */}
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shadow-sm",
                    lead.temperatura === 'caliente' ? "bg-rose-50 text-rose-500" :
                    lead.temperatura === 'tibio' ? "bg-orange-50 text-orange-500" : "bg-sky-50 text-sky-500"
                  )}>
                    <Flame size={20} className={lead.temperatura === 'caliente' ? "fill-rose-500" : ""} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-[15px] tracking-tight leading-tight">{lead.nombre}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                         {lead.origen === 'meta_ads' ? 'Meta Ads' : 'Orgánico'}
                       </span>
                       <div className="size-1 rounded-full bg-slate-200" />
                       <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                         {lead.creadoEl ? formatDistanceToNow(lead.creadoEl.toDate(), { addSuffix: false, locale: es }) : 'Recién'}
                       </span>
                    </div>
                  </div>
                </div>
                
                <Badge 
                  className="text-[9px] font-semibold px-2 py-1 rounded-lg border-none shadow-none uppercase tracking-tighter"
                  style={{ backgroundColor: getEtapaColor(lead.etapaId) + '15', color: getEtapaColor(lead.etapaId) }}
                >
                  {getEtapaNombre(lead.etapaId)}
                </Badge>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (lead.telefono) {
                      window.location.href = `tel:${lead.telefono.replace(/\s+/g, '')}`;
                    } else {
                      toast.error("No hay número de teléfono para llamar");
                    }
                  }}
                  className="flex-1 h-12 bg-slate-50 rounded-2xl flex items-center justify-center gap-2 text-slate-600 font-semibold text-xs active:bg-slate-100 transition-all"
                >
                  <Phone size={16} />
                  Llamar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (lead.telefono) {
                      window.location.href = `https://wa.me/${lead.telefono.replace(/\D/g, '')}`;
                    } else {
                      toast.error("No hay número de teléfono para enviar WhatsApp");
                    }
                  }}
                  className="flex-1 h-12 bg-[#25D366]/10 rounded-2xl flex items-center justify-center gap-2 text-[#25D366] font-semibold text-xs active:bg-[#25D366]/20 transition-all"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLead(lead);
                  }}
                  className="size-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                >
                  <Edit2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  ShieldAlert, 
  Zap, 
  UserPlus, 
  UserMinus,
  ArrowUpRight,
  Loader2,
  Search
} from "lucide-react";
import { 
  Table as UITable, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collectionGroup, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { EventoFacturacion } from "@/lib/types/firestore";

export default function EventosGlobalesPage() {
  const [events, setEvents] = useState<(EventoFacturacion & { wsId?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Escuchar eventos de facturación como proxy de eventos importantes del sistema
    const q = query(
      collectionGroup(db, "eventosFact"), // Usamos el string literal por simplicidad en collectionGroup
      orderBy("creadoEl", "desc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(doc => ({
        id: doc.id,
        wsId: doc.ref.parent.parent?.id,
        ...doc.data() as EventoFacturacion
      })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filtered = events.filter(e => 
    e.tipo?.toLowerCase().includes(search.toLowerCase()) ||
    e.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
    e.wsId?.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'upgrade': return <ArrowUpRight className="size-4 text-emerald-500" />;
      case 'downgrade': return <UserMinus className="size-4 text-amber-500" />;
      case 'suscripcion_cancelada': return <ShieldAlert className="size-4 text-rose-500" />;
      case 'trial_iniciado': return <UserPlus className="size-4 text-blue-500" />;
      default: return <Zap className="size-4 text-[var(--accent)]" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Registro de Eventos Globales</h1>
          <p className="text-white/40 text-sm font-medium mt-1">Audit trail de cambios de plan, suscripciones y alertas críticas.</p>
        </div>
        
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
           <Input 
             placeholder="Buscar evento o workspace..." 
             className="bg-white/5 border-white/5 pl-10 h-10 w-80 text-white rounded-xl focus:ring-[var(--accent)]"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-black/40 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="size-8 text-[var(--accent)] animate-spin" />
          </div>
        ) : (
          <UITable>
            <TableHeader className="bg-white/5 border-b border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60">Evento</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60">Workspace</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60">Detalle</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-right">Fecha / Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((event) => (
                <TableRow key={event.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell>
                     <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center">
                           {getTypeIcon(event.tipo)}
                        </div>
                        <Badge className="bg-white/5 border-transparent text-white font-black text-[9px] uppercase tracking-wider px-2">
                           {event.tipo.replace('_', ' ')}
                        </Badge>
                     </div>
                  </TableCell>
                  <TableCell>
                     <span className="text-[10px] font-mono font-bold text-white/30 tracking-tight uppercase">
                       {event.wsId}
                     </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-white/80">
                     {event.descripcion}
                  </TableCell>
                  <TableCell className="text-right text-[10px] font-bold text-white/40 uppercase">
                     {event.creadoEl?.toDate().toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        )}
      </div>
    </div>
  );
}

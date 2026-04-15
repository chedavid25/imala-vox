"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  History,
  Search,
  DollarSign,
  Loader2,
  Calendar
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collectionGroup, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { EventoFacturacion, COLLECTIONS } from "@/lib/types/firestore";
import { cn } from "@/lib/utils";

export default function FacturacionAdminPage() {
  const [events, setEvents] = useState<(EventoFacturacion & { wsId?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Usamos collectionGroup para traer eventos de todos los workspaces
    const q = query(
      collectionGroup(db, COLLECTIONS.EVENTOS_FACT),
      orderBy("creadoEl", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(doc => ({
        id: doc.id,
        wsId: doc.ref.parent.parent?.id,
        ...doc.data() as EventoFacturacion
      })) as (EventoFacturacion & { wsId?: string })[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalARS = events
    .filter(e => e.tipo === 'pago_exitoso')
    .reduce((acc, e) => acc + (e.monto || 0), 0);

  const filtered = events.filter(e => 
    e.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
    e.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight text-glow">Registro Global de Facturación</h1>
          <p className="text-white/40 text-sm font-medium mt-1">Historial transaccional consolidado de toda la plataforma.</p>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-[2rem] p-4 group">
             <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Recaudación ARS (Muestra)</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-4xl font-black text-emerald-400 tracking-tighter">${totalARS.toLocaleString('es-AR')}</div>
                <p className="text-[10px] text-emerald-500/40 font-bold uppercase mt-2">Basado en los últimos 100 eventos</p>
             </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20 rounded-[2rem] p-4">
             <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-500/60">Pagos Exitosos</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-4xl font-black text-blue-400 tracking-tighter">
                   {events.filter(e => e.tipo === 'pago_exitoso').length}
                </div>
                <p className="text-[10px] text-blue-500/40 font-bold uppercase mt-2">Transacciones aprobadas</p>
             </CardContent>
          </Card>
          <Card className="bg-rose-500/10 border-rose-500/20 rounded-[2rem] p-4">
             <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-rose-500/60">Alertas de Pago</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-4xl font-black text-rose-400 tracking-tighter">
                   {events.filter(e => e.tipo === 'pago_fallido').length}
                </div>
                <p className="text-[10px] text-rose-500/40 font-bold uppercase mt-2">Fallas o cancelaciones</p>
             </CardContent>
          </Card>
      </div>

      {/* LOG TABLE */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <History className="size-5 text-[var(--accent)]" />
             Log de Transacciones
           </h3>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
             <Input 
               placeholder="Filtrar por concepto..." 
               className="bg-white/5 border-white/5 pl-10 h-10 w-64 text-white rounded-xl focus:ring-[var(--accent)]"
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
            <Table>
              <TableHeader className="bg-white/5 border-b border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60">Fecha</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60">Workspace ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60">Concepto</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-center">Tipo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-right">Monto ARS</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-right">Monto USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((event) => (
                  <TableRow key={event.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="text-xs font-bold text-white/60">
                      {event.creadoEl?.toDate().toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-tighter">
                      {event.wsId}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-white">
                      {event.descripcion}
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge className={cn(
                         "rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-widest border",
                         event.tipo === 'pago_exitoso' || event.tipo === 'upgrade' || event.tipo === 'suscripcion_creada'
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                       )}>
                         {event.tipo.replace('_', ' ')}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-white text-xs">
                      ${event.monto?.toLocaleString('es-AR') || "-"}
                    </TableCell>
                    <TableCell className="text-right font-black text-[var(--accent)] text-xs">
                      ${event.montoUSD?.toLocaleString() || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

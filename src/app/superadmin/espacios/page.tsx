"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowUpRight,
  Loader2,
  Mail,
  Users,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { obtenerMetricasSuperAdmin, bloquearWorkspace, extenderPrueba } from "@/app/actions/superadmin";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Workspace } from "@/lib/types/firestore";

export default function EspaciosAdminPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { workspaces: ws } = await obtenerMetricasSuperAdmin();
      setWorkspaces(ws);
    } catch (e) {
      toast.error("Error al cargar workspaces");
    } finally {
      setLoading(false);
    }
  }

  const filtered = workspaces.filter(w => {
    const matchesSearch = w.nombre?.toLowerCase().includes(search.toLowerCase()) || 
                          w.propietarioEmail?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || w.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusMap: Record<string, { label: string, color: string }> = {
    prueba: { label: "Prueba", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    activo: { label: "Activo", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    pago_vencido: { label: "Vencido", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
    cancelado: { label: "Bloqueado", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  };

  const handleBloquear = async (id: string) => {
    if(confirm("¿Seguro que quieres bloquear este workspace?")) {
      await bloquearWorkspace(id);
      toast.success("Workspace bloqueado");
      load();
    }
  };

  const handleExtender = async (id: string) => {
    const dias = prompt("Días a extender la prueba:", "7");
    if (dias) {
      await extenderPrueba(id, parseInt(dias));
      toast.success(`Prueba extendida ${dias} días`);
      load();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Espacios de Trabajo</h1>
          <p className="text-white/40 text-sm font-medium mt-1">Gestión individual y monitoreo de clientes ({filtered.length})</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
             <Input 
               placeholder="Buscar por nombre o email..." 
               className="bg-white/5 border-white/5 pl-10 h-10 w-64 text-white rounded-xl focus:ring-[var(--accent)]"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
          </div>
          <select 
            className="bg-white/5 border-white/5 h-10 px-4 rounded-xl text-xs font-bold uppercase text-white outline-none focus:ring-1 focus:ring-[var(--accent)]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all" className="bg-zinc-900">Todos los estados</option>
            <option value="activo" className="bg-zinc-900">Activos</option>
            <option value="prueba" className="bg-zinc-900">En Prueba</option>
            <option value="pago_vencido" className="bg-zinc-900">Vencidos</option>
            <option value="cancelado" className="bg-zinc-900">Bloqueados</option>
          </select>
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
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60">Cliente / Workspace</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-center">Plan</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-center">Estado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-center">MRR (USD)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-center">Uso Conv.</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-white/60 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ws) => (
                <TableRow key={ws.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center font-black text-xs group-hover:bg-[var(--accent)] group-hover:text-black transition-all">
                        {ws.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white tracking-tight">{ws.nombre}</p>
                        <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-wide">
                          <Mail className="size-3" />
                          {ws.propietarioEmail}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                     <Badge className="bg-white/5 border-white/10 text-white font-black text-[10px] uppercase tracking-widest py-1 px-3">
                       {ws.plan}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn("rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border", statusMap[ws.estado]?.color)}>
                      {statusMap[ws.estado]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-black text-white text-sm">
                    ${ws.facturacion?.precioUSD || 0}
                  </TableCell>
                  <TableCell className="text-center font-bold text-white/60 text-xs">
                    {ws.uso?.convCount?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="hover:bg-white/10 group-hover:text-[var(--accent)] transition-all">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/5 text-white rounded-2xl p-2 shadow-2xl">
                         <DropdownMenuItem 
                            className="gap-3 px-4 py-3 rounded-xl hover:bg-white/10 cursor-pointer"
                            onClick={() => toast.info(`Detalles de ${ws.nombre}: ID ${ws.id}`)}
                         >
                            <Eye className="size-4 text-blue-400" />
                            <span className="text-sm font-bold">Ver Detalles</span>
                         </DropdownMenuItem>
                         {ws.estado === 'prueba' && (
                           <DropdownMenuItem className="gap-3 px-4 py-3 rounded-xl hover:bg-white/10 cursor-pointer" onClick={() => handleExtender(ws.id)}>
                              <Clock className="size-4 text-amber-400" />
                              <span className="text-sm font-bold">Extender Prueba</span>
                           </DropdownMenuItem>
                         )}
                         <DropdownMenuItem className="gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/20 text-rose-400 cursor-pointer" onClick={() => handleBloquear(ws.id)}>
                            <ShieldAlert className="size-4" />
                            <span className="text-sm font-bold">Bloquear Acceso</span>
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

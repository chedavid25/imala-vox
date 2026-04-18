"use client";

import React, { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  orderBy
} from "firebase/firestore";
import { COLLECTIONS, TareaCRM } from "@/lib/types/firestore";
import { Bell, Clock, AlertCircle, ChevronRight, Check } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format, isBefore, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

export function AvisosHeader() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [tareasPendientes, setTareasPendientes] = useState<TareaCRM[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const today = startOfToday();
    const tareasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM");
    
    // Consultar tareas no completadas (sin orderBy para no requerir índice)
    const q = query(
      tareasRef, 
      where("completada", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPending = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as TareaCRM));
      
      // Ordenar en memoria por fecha de vencimiento
      allPending.sort((a, b) => a.venceEl.toMillis() - b.venceEl.toMillis());

      // Filtrar por las que son de hoy o están atrasadas
      const dueTodayOrOverdue = allPending.filter(t => {
        const taskDate = new Date(t.fecha + "T00:00:00");
        return isBefore(taskDate, new Date()) || format(taskDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
      });
      setTareasPendientes(dueTodayOrOverdue);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  if (tareasPendientes.length === 0) {
    return (
      <Button variant="ghost" size="icon" className="size-9 rounded-full text-slate-400 hover:bg-slate-50 transition-all">
        <Bell className="size-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon" className="size-9 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all relative">
          <Bell className="size-4 animate-swing" />
          <span className="absolute -top-1 -right-1 size-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {tareasPendientes.length}
          </span>
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-[320px] p-2 bg-white border-slate-100 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
           Tareas Pendientes
           <Badge variant="outline" className="text-rose-500 border-rose-100 bg-rose-50 font-black text-[9px] px-1.5 py-0 h-4">Urgente</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-50 mx-2" />
        
        <div className="max-h-[350px] overflow-y-auto no-scrollbar py-1">
          {tareasPendientes.map(tarea => (
            <DropdownMenuItem 
              key={tarea.id}
              onClick={() => router.push("/dashboard/operacion/tareas")}
              className="px-3 py-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border-b border-transparent last:border-none group"
            >
              <div className="flex gap-3 w-full">
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center shrink-0 border border-white shadow-sm",
                  tarea.prioridad === 'alta' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                )}>
                  {tarea.prioridad === 'alta' ? <AlertCircle className="size-4" /> : <Clock className="size-4" />}
                </div>
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  <p className="text-[13px] font-bold text-slate-700 truncate group-hover:text-[var(--accent)] transition-colors">
                    {tarea.titulo}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
                    {format(new Date(tarea.fecha + "T00:00:00"), "d 'de' MMMM", { locale: es })} • {tarea.hora || "Sin hora"}
                  </p>
                </div>
                <ChevronRight className="size-3 text-slate-200 mt-1" />
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuGroup>
      <DropdownMenuSeparator className="bg-slate-50 mx-2" />
        <div className="p-1">
          <Button 
            variant="ghost" 
            className="w-full text-[11px] font-black uppercase text-slate-400 hover:text-[var(--accent)] rounded-xl h-10"
            onClick={() => router.push("/dashboard/operacion/tareas")}
          >
            Ver todas las tareas
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

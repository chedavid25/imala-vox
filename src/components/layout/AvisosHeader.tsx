"use client";

import React, { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, TareaCRM } from "@/lib/types/firestore";
import { Bell, Clock, AlertCircle, ChevronRight, CheckCircle2, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isBefore, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function AvisosHeader() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [tareasPendientes, setTareasPendientes] = useState<TareaCRM[]>([]);
  const [viewedCount, setViewedCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const tareasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM");
    const q = query(tareasRef, where("completada", "==", false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPending = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as TareaCRM));
      allPending.sort((a, b) => a.venceEl.toMillis() - b.venceEl.toMillis());

      const dueTodayOrOverdue = allPending.filter(t => {
        const taskDate = new Date(t.fecha + "T00:00:00");
        return (
          isBefore(taskDate, new Date()) ||
          format(taskDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
        );
      });
      setTareasPendientes(dueTodayOrOverdue);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  const badgeCount = Math.max(0, tareasPendientes.length - viewedCount);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setViewedCount(tareasPendientes.length);
  };

  const isVencida = (fecha: string) => {
    const taskDate = new Date(fecha + "T00:00:00");
    return isBefore(taskDate, new Date()) && !isToday(taskDate);
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      {/* TRIGGER — Aplicamos estilos directamente al Trigger para evitar anidamiento */}
      <DropdownMenuTrigger
        className={cn(
          "relative size-10 rounded-xl flex items-center justify-center transition-all duration-300 border outline-none shadow-sm active:scale-95",
          badgeCount > 0
            ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent-active)] hover:bg-[var(--accent)]/20"
            : "bg-[var(--bg-input)]/50 border-[var(--border-light)] text-[var(--text-tertiary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)] hover:border-[var(--border-light-strong)]"
        )}
      >
        <Bell className={cn("size-4 transition-transform duration-300", isOpen && "scale-90")} />
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white leading-none animate-in zoom-in-50 duration-300 shadow-[0_4px_12px_rgba(239,68,68,0.4)]">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[340px] p-0 bg-white border border-[var(--border-light)] shadow-[0_20px_60px_rgba(0,0,0,0.12)] rounded-[24px] overflow-hidden"
      >
        {/* HEADER DEL PANEL */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border-light)] bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                <Bell className="size-3.5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[11px] font-black text-[var(--text-primary-light)] uppercase tracking-widest">Notificaciones</p>
                <p className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">Tareas de hoy y vencidas</p>
              </div>
            </div>
            {tareasPendientes.length > 0 && (
              <span className="text-[9px] font-black text-red-500 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
                {tareasPendientes.length} pendiente{tareasPendientes.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* CONTENIDO */}
        {tareasPendientes.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3 flex flex-col items-center">
            <div className="size-14 rounded-[1.5rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--text-primary-light)]">¡Todo al día!</p>
              <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium leading-relaxed">
                No tienes tareas pendientes para hoy.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto no-scrollbar py-2 px-2 space-y-1">
            {tareasPendientes.map(tarea => {
              const vencida = isVencida(tarea.fecha);
              return (
                <DropdownMenuItem
                  key={tarea.id}
                  onClick={() => router.push("/dashboard/operacion/tareas")}
                  className="px-3 py-3.5 rounded-2xl hover:bg-[var(--bg-input)] cursor-pointer transition-all group outline-none"
                >
                  <div className="flex gap-3 w-full items-start">
                    {/* ICONO DE PRIORIDAD */}
                    <div className={cn(
                      "size-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
                      tarea.prioridad === "alta" || vencida
                        ? "bg-red-50 text-red-500 border-red-100"
                        : tarea.prioridad === "media"
                        ? "bg-amber-50 text-amber-500 border-amber-100"
                        : "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20"
                    )}>
                      {tarea.prioridad === "alta" || vencida
                        ? <AlertCircle className="size-4" />
                        : <Clock className="size-4" />
                      }
                    </div>

                    {/* CONTENIDO */}
                    <div className="flex-1 space-y-1 overflow-hidden min-w-0">
                      <p className="text-[12px] font-bold text-[var(--text-primary-light)] truncate group-hover:text-[var(--accent)] transition-colors leading-tight">
                        {tarea.titulo}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary-light)]">
                          {format(new Date(tarea.fecha + "T00:00:00"), "d 'de' MMMM", { locale: es })}
                          {tarea.hora ? ` · ${tarea.hora}` : ""}
                        </span>
                        {vencida && (
                          <span className="text-[8px] font-black text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                            Vencida
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="size-3.5 text-[var(--text-tertiary-light)] shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all mt-1" />
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        {/* FOOTER */}
        <div className="p-3 border-t border-[var(--border-light)] bg-slate-50/30">
          <button
            onClick={() => router.push("/dashboard/operacion/tareas")}
            className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-xl h-10 transition-all cursor-pointer"
          >
            <Zap className="size-3" />
            Ver todas las tareas
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, TareaCRM } from "@/lib/types/firestore";
import { Bell, Clock, AlertCircle, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function AvisosHeader() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [tareasPendientes, setTareasPendientes] = useState<TareaCRM[]>([]);
  const [viewedCount, setViewedCount] = useState(0);
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
    if (open) setViewedCount(tareasPendientes.length);
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-9 rounded-xl transition-all relative",
              badgeCount > 0
                ? "bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20"
                : "text-[var(--text-tertiary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
            )}
          >
            <Bell className="size-4" />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 border-2 border-white leading-none">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </Button>
        }
      />

      <DropdownMenuContent
        align="end"
        className="w-[300px] p-2 bg-white border border-[var(--border-light)] shadow-2xl rounded-2xl"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">
              Tareas pendientes
            </span>
            {tareasPendientes.length > 0 && (
              <span className="text-[9px] font-black text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full uppercase">
                {tareasPendientes.length} urgente{tareasPendientes.length !== 1 ? "s" : ""}
              </span>
            )}
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-[var(--border-light)] mx-2" />

          {tareasPendientes.length === 0 ? (
            <div className="px-3 py-8 text-center space-y-2">
              <Bell className="w-6 h-6 text-[var(--text-tertiary-light)] mx-auto opacity-30" />
              <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">
                Sin tareas pendientes para hoy
              </p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto no-scrollbar py-1 space-y-0.5">
              {tareasPendientes.map(tarea => (
                <DropdownMenuItem
                  key={tarea.id}
                  onClick={() => router.push("/dashboard/operacion/tareas")}
                  className="px-3 py-3 rounded-xl hover:bg-[var(--bg-input)] cursor-pointer transition-all group"
                >
                  <div className="flex gap-3 w-full">
                    <div className={cn(
                      "size-8 rounded-xl flex items-center justify-center shrink-0 border",
                      tarea.prioridad === "alta"
                        ? "bg-red-50 text-red-500 border-red-100"
                        : "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20"
                    )}>
                      {tarea.prioridad === "alta"
                        ? <AlertCircle className="size-3.5" />
                        : <Clock className="size-3.5" />
                      }
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      <p className="text-[12px] font-bold text-[var(--text-primary-light)] truncate group-hover:text-[var(--accent)] transition-colors">
                        {tarea.titulo}
                      </p>
                      <p className="text-[10px] font-medium text-[var(--text-tertiary-light)]">
                        {format(new Date(tarea.fecha + "T00:00:00"), "d 'de' MMMM", { locale: es })} • {tarea.hora || "Sin hora"}
                      </p>
                    </div>
                    <ChevronRight className="size-3 text-[var(--text-tertiary-light)] mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[var(--border-light)] mx-2" />
        <div className="p-1">
          <Button
            variant="ghost"
            className="w-full text-[11px] font-black uppercase text-[var(--text-tertiary-light)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-xl h-9"
            onClick={() => router.push("/dashboard/operacion/tareas")}
          >
            Ver todas las tareas
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { BottomSheet } from "./BottomSheet";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, writeBatch } from "firebase/firestore";
import { COLLECTIONS, NotificacionSistema } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Bell, AlertCircle, Info, AlertTriangle, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  open: boolean;
  onClose: () => void;
}

const tipoConfig = {
  alerta: { icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-100", iconColor: "text-amber-500", dot: "bg-amber-400" },
  info:   { icon: Info,          bg: "bg-blue-50",  border: "border-blue-100",  iconColor: "text-blue-500",  dot: "bg-blue-400"  },
  error:  { icon: AlertCircle,   bg: "bg-rose-50",  border: "border-rose-100",  iconColor: "text-rose-500",  dot: "bg-rose-400"  },
};

export function MobileNotificacionesSheet({ open, onClose }: Props) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [notifs, setNotifs] = useState<(NotificacionSistema & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!currentWorkspaceId || !open) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.NOTIFICACIONES),
      orderBy("creadoEl", "desc"),
      limit(30)
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [currentWorkspaceId, open]);

  const markAllRead = async () => {
    if (!currentWorkspaceId) return;
    const unread = notifs.filter(n => !n.visto);
    if (!unread.length) return;
    setMarking(true);
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.NOTIFICACIONES, n.id), { visto: true });
      });
      await batch.commit();
    } finally {
      setMarking(false);
    }
  };

  const markOne = async (id: string) => {
    if (!currentWorkspaceId) return;
    await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.NOTIFICACIONES, id), { visto: true });
  };

  const unreadCount = notifs.filter(n => !n.visto).length;

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="88dvh">
      <div className="space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Notificaciones</h3>
            {unreadCount > 0 && (
              <p className="text-[11px] text-slate-400">{unreadCount} sin leer</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={marking}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
            >
              {marking ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
              Marcar todo
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={28} className="animate-spin text-slate-300" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <div className="size-16 rounded-[24px] bg-slate-50 flex items-center justify-center">
              <Bell size={28} className="text-slate-200" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Sin notificaciones</p>
            <p className="text-[11px] text-slate-300">Todo está en orden por ahora.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => {
              const cfg = tipoConfig[n.tipo] || tipoConfig.info;
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => !n.visto && markOne(n.id)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98]",
                    cfg.bg, cfg.border,
                    !n.visto && "shadow-sm"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    <Icon size={18} className={cfg.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-slate-800 truncate">{n.titulo}</p>
                      {!n.visto && <span className={cn("size-2 rounded-full shrink-0", cfg.dot)} />}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.mensaje}</p>
                    {n.creadoEl && (
                      <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                        {format((n.creadoEl as any).toDate?.() || new Date(n.creadoEl as any), "d MMM · HH:mm", { locale: es })}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

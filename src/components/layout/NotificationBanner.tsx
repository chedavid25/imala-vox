"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { COLLECTIONS, NotificacionSistema } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { AlertCircle, X, ExternalLink, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBanner() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [notificaciones, setNotificaciones] = useState<(NotificacionSistema & { id: string })[]>([]);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.NOTIFICACIONES),
      where("visto", "==", false),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificaciones(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    }, (error) => {
      console.error("Error en snapshot de notificaciones:", error);
      // Fallback silencioso si hay problemas de índices
      setNotificaciones([]);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  const markAsSeen = async (id: string) => {
    if (!currentWorkspaceId) return;
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.NOTIFICACIONES, id);
      await updateDoc(docRef, { visto: true });
    } catch (err) {
      console.error("Error al marcar notificación como vista:", err);
    }
  };

  if (notificaciones.length === 0) return null;

  return (
    <div className="flex flex-col gap-0 border-b border-[var(--error)]/20 animate-in slide-in-from-top duration-300">
      {notificaciones.map((n) => (
        <div 
          key={n.id}
          className={cn(
            "flex items-center justify-between px-4 py-2 text-xs font-medium",
            n.tipo === 'alerta' ? "bg-[var(--error)]/10 text-[var(--error)]" : 
            n.tipo === 'error' ? "bg-red-500 text-white" : "bg-[var(--accent)] text-[var(--accent-text)]"
          )}
        >
          <div className="flex items-center gap-3">
            {n.tipo === 'alerta' ? <TriangleAlert className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="font-bold uppercase tracking-tight">{n.titulo}</span>
              <span className="opacity-90">{n.mensaje}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => markAsSeen(n.id)}
              className="w-6 h-6 rounded-full hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

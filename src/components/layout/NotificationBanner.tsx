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
import { AlertCircle, X, ExternalLink, TriangleAlert, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function NotificationBanner() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const [notificaciones, setNotificaciones] = useState<(NotificacionSistema & { id: string })[]>([]);

  // Lógica de período de prueba
  const trialEnds = workspace?.pruebaTerminaEl?.toDate();
  const isTrial = workspace?.estado === 'prueba';
  const diasRestantes = trialEnds ? Math.ceil((trialEnds.getTime() - Date.now()) / 86400000) : 0;
  const showTrialBanner = isTrial && diasRestantes >= 0 && diasRestantes <= 7;

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
    <div className="flex flex-col gap-0 border-b border-[var(--border-light)] animate-in slide-in-from-top duration-300">
      {/* Banner de Período de Prueba */}
      {showTrialBanner && (
        <div 
          className={cn(
            "flex items-center justify-between px-6 py-2.5 text-xs font-bold transition-colors",
            diasRestantes <= 3 
              ? "bg-rose-500 text-white" 
              : "bg-amber-400 text-black shadow-inner shadow-black/5"
          )}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 animate-pulse" />
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-widest">Aviso de Prueba</span>
              <span className="font-medium opacity-90 truncate max-w-[200px] sm:max-w-none">
                Tu período de prueba vence en {diasRestantes === 0 ? "unas horas" : `${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`}. Suscribite para no perder el acceso.
              </span>
            </div>
          </div>
          <Link 
            href="/dashboard/ajustes/facturacion"
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
              diasRestantes <= 3 
                ? "bg-white text-rose-500 hover:bg-rose-50 shadow-lg" 
                : "bg-black text-white hover:bg-black/80 shadow-md"
            )}
          >
            Ver Planes
          </Link>
        </div>
      )}

      {/* Notificaciones de Sistema */}
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

"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp,
  updateDoc,
  increment
} from "firebase/firestore";
import { COLLECTIONS, RecursoConocimiento, ConocimientoActivo } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  FileIcon,
  Loader2,
  ExternalLink,
  Info,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/planLimits";

export default function AgenteArchivosPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id: agentId } = useParams();
  const router = useRouter();

  const [archivosGlobales, setArchivosGlobales] = useState<(RecursoConocimiento & { id: string })[]>([]);
  const [activosMap, setActivosMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Límites del plan (hardcoded a 'agencia' por ahora o detectado del workspace)
  const limits = PLAN_LIMITS['agencia']; 
  const currentActiveCount = Object.values(activosMap).filter(v => v).length;

  useEffect(() => {
    if (!currentWorkspaceId || !agentId) return;

    // 1. Escuchar archivos totales del workspace
    const qGlobal = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "archivo")
    );

    const unsubscribeGlobal = onSnapshot(qGlobal, (snapshot) => {
      setArchivosGlobales(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    // 2. Escuchar activas este agente
    const qActivos = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string, COLLECTIONS.CONOCIMIENTO_ACTIVO);
    const unsubscribeActivos = onSnapshot(qActivos, (snapshot) => {
      const map: Record<string, boolean> = {};
      snapshot.docs.forEach(d => {
        if (d.data().activo) map[d.id] = true;
      });
      setActivosMap(map);
      setLoading(false);
    });

    return () => {
      unsubscribeGlobal();
      unsubscribeActivos();
    };
  }, [currentWorkspaceId, agentId]);

  const toggleArchivo = async (archivoId: string, currentState: boolean) => {
    if (!currentWorkspaceId || !agentId) return;

    const newState = !currentState;

    // Validar límites antes de activar
    if (newState && currentActiveCount >= limits.archivosActivosPorAgente) {
      toast.error(`Has alcanzado el límite de ${limits.archivosActivosPorAgente} archivos activos para este agente.`);
      return;
    }

    try {
      const activeRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string, COLLECTIONS.CONOCIMIENTO_ACTIVO, archivoId);
      
      if (newState) {
        await setDoc(activeRef, {
          recursoId: archivoId,
          activo: true,
          orden: currentActiveCount,
          agregadoEl: serverTimestamp()
        });
      } else {
        await deleteDoc(activeRef);
      }

      // Actualizar versión de configuración del agente para invalidar caché de Claude
      const agenteRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string);
      await updateDoc(agenteRef, {
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      });

      toast.success(newState ? "Archivo activado para este agente" : "Archivo desactivado");
    } catch (err) {
      toast.error("Error al actualizar estado del archivo");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Archivos de Entrenamiento</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">
            Selecciona qué archivos del workspace usará este agente para responder.
          </p>
        </div>
        <div className="text-right space-y-2">
          <div className="flex items-center gap-2.5 justify-end bg-[var(--bg-sidebar)] px-3 py-1.5 rounded-full border border-[var(--accent)]/30 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-tight">
              {currentActiveCount} / {limits.archivosActivosPorAgente} Activos
            </span>
          </div>
          <div className="w-48 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden border border-[var(--border-light)]">
            <div 
              className="h-full bg-[var(--accent)] transition-all duration-500" 
              style={{ width: `${(currentActiveCount / limits.archivosActivosPorAgente) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-sidebar)] border border-[var(--accent)]/20 p-5 rounded-2xl flex gap-4 shadow-md">
        <div className="shrink-0 pt-0.5"><Info className="w-5 h-5 text-[var(--accent)]" /></div>
        <div className="space-y-1">
          <p className="text-[13px] font-bold text-[var(--text-primary-dark)] tracking-tight">Arquitectura de Recursos Compartidos</p>
          <p className="text-xs text-[var(--text-secondary-dark)] leading-relaxed">
            Los archivos se suben una vez a nivel workspace y se activan selectivamente por agente. 
            Cualquier cambio en el archivo original se reflejará en todos los agentes que lo tengan activo.
          </p>
          <Button 
            variant="link" 
            onClick={() => router.push("/dashboard/cerebro/conocimiento/archivos")}
            className="p-0 h-auto text-xs text-[var(--accent)] font-bold hover:no-underline"
          >
            Ir a gestión de archivos globales →
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {archivosGlobales.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-[var(--border-light)] rounded-3xl space-y-4">
            <p className="text-sm text-[var(--text-tertiary-light)]">No hay archivos en el pool del workspace.</p>
            <Button onClick={() => router.push("/dashboard/cerebro/conocimiento/archivos")} variant="outline">
              Subir primer archivo
            </Button>
          </div>
        ) : (
          archivosGlobales.map((archivo) => {
            const isActive = !!activosMap[archivo.id];
            const isProcessing = archivo.estado === 'procesando';
            const hasError = archivo.estado === 'error';

            return (
              <div 
                key={archivo.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all duration-200",
                  !isActive 
                    ? "bg-[var(--bg-card)] border-[var(--border-light-strong)] opacity-60 hover:opacity-100" 
                    : isProcessing
                      ? "bg-[var(--bg-card)] border-[var(--border-light-strong)] opacity-80"
                      : hasError
                        ? "bg-[var(--bg-card)] border-[var(--error)]/30"
                        : "bg-[var(--bg-card)] border-[var(--accent)]/30 shadow-sm"
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300",
                    isActive 
                      ? "bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 shadow-sm" 
                      : "bg-[var(--bg-input)] border-[var(--border-light)]"
                  )}>
                    <FileIcon className={cn(
                      "w-5 h-5", 
                      isActive && !hasError ? "text-[var(--accent)]" : "text-[var(--text-tertiary-light)]"
                    )} />
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary-light)] truncate">
                        {archivo.titulo || archivo.archivoNombre}
                      </span>
                      
                      {isProcessing ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-light)] text-[9px] font-bold text-[var(--text-secondary-light)] uppercase tracking-wider">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Procesando
                        </span>
                      ) : isActive && !hasError ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" />
                          Activo
                        </span>
                      ) : hasError ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--error)]/10 border border-[var(--error)]/20 text-[9px] font-bold text-[var(--error)] uppercase tracking-wider">
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </span>
                      ) : null}
                    </div>
                    
                    <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium truncate max-w-[300px]">
                      {archivo.descripcion || "Archivo de entrenamiento entrenable"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 bg-[var(--bg-input)]/50 px-3 py-1.5 rounded-full border border-[var(--border-light)] shadow-inner">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-tight",
                      isActive ? "text-[var(--accent-active)]" : "text-[var(--text-tertiary-light)]"
                    )}>
                      {isActive ? 'Activado' : 'Inactivo'}
                    </span>
                    <Switch 
                      checked={isActive}
                      onCheckedChange={() => toggleArchivo(archivo.id, isActive)}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

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
  serverTimestamp,
  updateDoc,
  increment
} from "firebase/firestore";
import { COLLECTIONS, RecursoConocimiento } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Globe, 
  Loader2, 
  Layers,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/planLimits";

export default function AgenteWebsPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id: agentId } = useParams();
  const router = useRouter();

  const [websGlobales, setWebsGlobales] = useState<(RecursoConocimiento & { id: string })[]>([]);
  const [activosMap, setActivosMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const limits = PLAN_LIMITS['agencia']; 
  const currentActiveCount = Object.values(activosMap).filter(v => v).length;

  useEffect(() => {
    if (!currentWorkspaceId || !agentId) return;

    const qGlobal = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "web")
    );

    const unsubscribeGlobal = onSnapshot(qGlobal, (snapshot) => {
      setWebsGlobales(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

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

  const toggleWeb = async (webId: string, currentState: boolean) => {
    if (!currentWorkspaceId || !agentId) return;
    const newState = !currentState;

    if (newState && currentActiveCount >= limits.sitiosActivosPorAgente) {
      toast.error(`Has alcanzado el límite de ${limits.sitiosActivosPorAgente} sitios activos.`);
      return;
    }

    try {
      const activeRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string, COLLECTIONS.CONOCIMIENTO_ACTIVO, webId);
      if (newState) {
        await setDoc(activeRef, { 
          recursoId: webId,
          activo: true, 
          orden: currentActiveCount, 
          agregadoEl: serverTimestamp() 
        });
      } else {
        await deleteDoc(activeRef);
      }

      await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string), {
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      });
      toast.success(newState ? "Sitio web activado" : "Sitio web desactivado");
    } catch (err) {
      toast.error("Error al actualizar");
    }
  };

  const filteredWebs = websGlobales.filter(w => 
    w.webUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Sitios Web del Agente</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Activa la navegación web para que el agente aprenda de tus URLs.</p>
        </div>
        <div className="text-right space-y-2">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-bold text-[var(--text-secondary-light)]">{currentActiveCount} / {limits.sitiosActivosPorAgente} Activos</span>
          </div>
          <div className="w-48 h-1.5 bg-[var(--bg-input)] rounded-full border border-[var(--border-light)] overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(currentActiveCount / limits.sitiosActivosPorAgente) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-tertiary-light)]" />
          <Input 
            placeholder="Buscar en el pool de sitios web..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-[var(--bg-card)] border-[var(--border-light)]"
          />
        </div>
        <Button onClick={() => router.push("/dashboard/cerebro/conocimiento/webs")} variant="outline" className="border-[var(--border-light)]">
          Gestionar Pool Global
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredWebs.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-[var(--border-light)] rounded-3xl opacity-50">
            <p className="text-sm">No se encontraron sitios web.</p>
          </div>
        ) : (
          filteredWebs.map(w => {
            const isActive = !!activosMap[w.id];
            const isProcessing = w.estado === 'procesando';
            const hasError = w.estado === 'error';
            
            // Extracción de dominio para la URL corta
            let domain = w.webUrl || '';
            try {
              if (w.webUrl) {
                const urlObj = new URL(w.webUrl);
                domain = urlObj.hostname;
              }
            } catch(e) {}

            return (
              <div 
                key={w.id}
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
                    "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
                    isActive && !hasError
                      ? "bg-[var(--bg-sidebar)] border-[var(--accent)]/30 shadow-sm"
                      : "bg-[var(--bg-input)] border-[var(--border-light)]"
                  )}>
                    <Globe className={cn(
                      "w-5 h-5", 
                      isActive && !hasError ? "text-[var(--accent)]" : "text-[var(--text-tertiary-light)]"
                    )} />
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary-light)] truncate">
                        {domain}
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
                    
                    <span className="text-[11px] text-[var(--text-tertiary-light)] truncate max-w-[300px] font-medium">
                      {w.webUrl}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 bg-[var(--bg-input)]/50 px-3 py-1.5 rounded-full border border-[var(--border-light)]">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-tight",
                      isActive ? "text-[var(--accent-active)]" : "text-[var(--text-tertiary-light)]"
                    )}>
                      {isActive ? 'Activado' : 'Inactivo'}
                    </span>
                    <Switch 
                      checked={isActive}
                      onCheckedChange={() => toggleWeb(w.id, isActive)}
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

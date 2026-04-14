"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
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
  increment,
  addDoc
} from "firebase/firestore";
import { COLLECTIONS, RecursoConocimiento } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  Type,
  Loader2,
  Info,
  Layers,
  Search,
  Plus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/planLimits";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AgenteTextosPage() {
  const { currentWorkspaceId, workspace } = useWorkspaceStore();
  const { id: agentId } = useParams();
  const router = useRouter();

  const [textosGlobales, setTextosGlobales] = useState<(RecursoConocimiento & { id: string })[]>([]);
  const [activosMap, setActivosMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog "Nuevo Texto"
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);

  // Usar plan real del workspace
  const planKey = (workspace?.plan || 'starter') as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[planKey];
  const currentActiveCount = Object.values(activosMap).filter(v => v).length;

  useEffect(() => {
    if (!currentWorkspaceId || !agentId) return;

    const qGlobal = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "texto")
    );

    const unsubscribeGlobal = onSnapshot(qGlobal, (snapshot) => {
      setTextosGlobales(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
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

  const toggleTexto = async (textoId: string, currentState: boolean) => {
    if (!currentWorkspaceId || !agentId) return;
    const newState = !currentState;

    if (newState && currentActiveCount >= limits.textosActivosPorAgente) {
      toast.error(`Has alcanzado el límite de ${limits.textosActivosPorAgente} textos activos.`);
      return;
    }

    try {
      const activeRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string, COLLECTIONS.CONOCIMIENTO_ACTIVO, textoId);
      if (newState) {
        await setDoc(activeRef, { 
          recursoId: textoId,
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
      toast.success(newState ? "Texto activado" : "Texto desactivado");
    } catch (err) {
      toast.error("Error al actualizar");
    }
  };

  const crearNuevoTexto = async () => {
    if (!currentWorkspaceId || !agentId) return;
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("El título y el contenido son obligatorios");
      return;
    }
    if (currentActiveCount >= limits.textosActivosPorAgente) {
      toast.error(`Has alcanzado el límite de ${limits.textosActivosPorAgente} textos activos.`);
      return;
    }

    setCreating(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Usuario no autenticado");

      // 1. Crear en baseConocimiento
      const baseRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO);
      const nuevoDocRef = await addDoc(baseRef, {
        tipo: 'texto',
        titulo: newTitle.trim(),
        contenidoTexto: newContent.trim(),
        descripcion: '',
        estado: 'activo',
        creadoPor: uid,
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp()
      });

      // 2. Activar para este agente en conocimientoActivo
      const activeRef = doc(
        db,
        COLLECTIONS.ESPACIOS, currentWorkspaceId,
        COLLECTIONS.AGENTES, agentId as string,
        COLLECTIONS.CONOCIMIENTO_ACTIVO, nuevoDocRef.id
      );
      await setDoc(activeRef, {
        recursoId: nuevoDocRef.id,
        activo: true,
        orden: currentActiveCount,
        agregadoEl: serverTimestamp()
      });

      // 3. Incrementar configuracionVersion del agente
      await updateDoc(
        doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string),
        { configuracionVersion: increment(1), actualizadoEl: serverTimestamp() }
      );

      toast.success("Texto creado y activado para este agente");
      setShowNewDialog(false);
      setNewTitle("");
      setNewContent("");
    } catch (err) {
      console.error("Error creando texto:", err);
      toast.error("Error al crear texto");
    } finally {
      setCreating(false);
    }
  };

  const filteredTextos = textosGlobales.filter(t => 
    t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.contenidoTexto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Dialog Nuevo Texto */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg bg-[var(--bg-card)] border-[var(--border-light)] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary-light)]">
              Nuevo Texto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[var(--text-secondary-light)]">Título</Label>
              <Input
                placeholder="Ej: Política de devoluciones"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[var(--text-secondary-light)]">Contenido</Label>
              <Textarea
                placeholder="Escribe aquí el texto que el agente debe conocer..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="bg-[var(--bg-input)] border-[var(--border-light)] resize-none rounded-xl"
                style={{ minHeight: '160px' }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewDialog(false)}
              className="border-[var(--border-light)]"
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={crearNuevoTexto}
              disabled={creating || !newTitle.trim() || !newContent.trim()}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-bold"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Crear y Activar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Textos Planos del Agente</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Activa bloques de información estática para este cerebro.</p>
        </div>
        <div className="text-right space-y-2">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-bold text-[var(--text-secondary-light)]">{currentActiveCount} / {limits.textosActivosPorAgente} Activos</span>
          </div>
          <div className="w-48 h-1.5 bg-[var(--bg-input)] rounded-full border border-[var(--border-light)] overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(currentActiveCount / limits.textosActivosPorAgente) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-tertiary-light)]" />
          <Input 
            placeholder="Buscar en el pool de textos..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-[var(--bg-card)] border-[var(--border-light)]"
          />
        </div>
        <Button
          onClick={() => setShowNewDialog(true)}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-bold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Texto
        </Button>
        <Button onClick={() => router.push("/dashboard/cerebro/conocimiento/textos")} variant="outline" className="border-[var(--border-light)]">
          Gestionar Pool Global
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTextos.length === 0 ? (
          <div className="md:col-span-2 p-12 text-center border-2 border-dashed border-[var(--border-light)] rounded-3xl opacity-50">
            <p className="text-sm">No se encontraron textos con ese criterio.</p>
          </div>
        ) : (
          filteredTextos.map(t => {
            const isActive = !!activosMap[t.id];
            return (
              <div 
                key={t.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col justify-between duration-200",
                  !isActive 
                    ? "bg-[var(--bg-card)] border-[var(--border-light-strong)] opacity-60 hover:opacity-100" 
                    : "bg-[var(--bg-card)] border-[var(--accent)]/30 shadow-sm"
                )}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300",
                        isActive 
                          ? "bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 shadow-sm" 
                          : "bg-[var(--bg-input)] border-[var(--border-light)]"
                      )}>
                        <Type className={cn(
                          "w-5 h-5", 
                          isActive ? "text-[var(--accent)]" : "text-[var(--text-tertiary-light)]"
                        )} />
                      </div>
                      <h4 className="text-sm font-bold truncate max-w-[150px]">{t.titulo}</h4>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-tight",
                        isActive ? "text-[var(--accent-active)]" : "text-[var(--text-tertiary-light)]"
                      )}>
                        {isActive ? 'Activado' : 'Inactivo'}
                      </span>
                      <Switch checked={isActive} onCheckedChange={() => toggleTexto(t.id, isActive)} />
                    </div>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed line-clamp-3 text-[var(--text-secondary-light)] px-1">
                    {t.contenidoTexto}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

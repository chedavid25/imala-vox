"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { storage } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { COLLECTIONS, RecursoConocimiento } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  FilePlus,
  Trash2,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  Loader2,
  HelpCircle,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

const getIconByType = (fileName: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext || '')) return ImageIcon;
  if (['mp4','mov','avi','webm'].includes(ext || '')) return FileVideo;
  if (['mp3','wav','ogg','m4a'].includes(ext || '')) return FileAudio;
  return FileText;
};

export default function AgenteRecursosPage() {
  const { currentWorkspaceId, workspace } = useWorkspaceStore();
  const { id: agentId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recursos, setRecursos] = useState<(RecursoConocimiento & { id: string })[]>([]);
  // Map de qué recursos están activos para ESTE agente en conocimientoActivo
  const [activosMap, setActivosMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const limits = PLAN_LIMITS[workspace?.plan ?? 'starter'];
  const currentActiveCount = Object.values(activosMap).filter(v => v).length;

  useEffect(() => {
    if (!currentWorkspaceId || !agentId) return;

    // 1. Escuchar todos los recursos multimedia del workspace
    const qRecursos = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "recurso")
    );
    const unsubRecursos = onSnapshot(qRecursos, (snapshot) => {
      setRecursos(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      setLoading(false);
    });

    // 2. Escuchar conocimientoActivo del agente para saber cuáles están activados
    const qActivos = collection(
      db,
      COLLECTIONS.ESPACIOS, currentWorkspaceId,
      COLLECTIONS.AGENTES, agentId as string,
      COLLECTIONS.CONOCIMIENTO_ACTIVO
    );
    const unsubActivos = onSnapshot(qActivos, (snapshot) => {
      const map: Record<string, boolean> = {};
      snapshot.docs.forEach(d => {
        if (d.data().activo) map[d.id] = true;
      });
      setActivosMap(map);
    });

    return () => {
      unsubRecursos();
      unsubActivos();
    };
  }, [currentWorkspaceId, agentId]);

  const updateDescripcion = async (recursoId: string, desc: string) => {
    if (!currentWorkspaceId) return;
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO, recursoId);
      await updateDoc(docRef, { 
        descripcion: desc,
        actualizadoEl: serverTimestamp()
      });
      toast.success("Regla de envío actualizada");
    } catch (err) {
      toast.error("Error al actualizar");
    }
  };

  const uploadRecurso = async (file: File) => {
    if (!currentWorkspaceId || !agentId) return;

    if (currentActiveCount >= limits.recursosMultimediaPorAgente) {
      toast.error(`Has alcanzado el límite de ${limits.recursosMultimediaPorAgente} recursos activos.`);
      return;
    }

    setUploading(true);
    try {
      // 1. Subir archivo a Firebase Storage
      const timestamp = Date.now();
      const storageRef = ref(storage, `espaciosDeTrabajo/${currentWorkspaceId}/recursos/${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Obtener auth para el uid
      const auth = getAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Usuario no autenticado");

      // 3. Crear documento en baseConocimiento
      const recursoDoc = {
        tipo: 'recurso',
        titulo: file.name,
        archivoNombre: file.name,
        archivoUrl: downloadURL,
        archivoTamano: file.size,
        estado: 'activo',
        descripcion: '',
        creadoPor: uid,
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp()
      };

      const baseConocRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO);
      const nuevoRecursoRef = await addDoc(baseConocRef, recursoDoc);

      // 4. Activar automáticamente para este agente en conocimientoActivo
      const activeRef = doc(
        db,
        COLLECTIONS.ESPACIOS, currentWorkspaceId,
        COLLECTIONS.AGENTES, agentId as string,
        COLLECTIONS.CONOCIMIENTO_ACTIVO, nuevoRecursoRef.id
      );
      await setDoc(activeRef, {
        activo: true,
        orden: recursos.length,
        agregadoEl: serverTimestamp()
      });

      toast.success('Recurso subido y activado para este agente');
    } catch (err) {
      console.error('Error en upload:', err);
      toast.error('Error al subir recurso');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadRecurso(file);
    }
    // Resetear el input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleActivo = async (recursoId: string, currentState: boolean) => {
    if (!currentWorkspaceId || !agentId) return;
    try {
      const activeRef = doc(
        db,
        COLLECTIONS.ESPACIOS, currentWorkspaceId,
        COLLECTIONS.AGENTES, agentId as string,
        COLLECTIONS.CONOCIMIENTO_ACTIVO, recursoId
      );
      if (currentState) {
        // Desactivar: eliminar de conocimientoActivo
        await deleteDoc(activeRef);
      } else {
        // Validar límite antes de activar
        if (currentActiveCount >= limits.recursosMultimediaPorAgente) {
          toast.error(`Has alcanzado el límite de ${limits.recursosMultimediaPorAgente} recursos activos.`);
          return;
        }
        // Activar: crear en conocimientoActivo
        await setDoc(activeRef, {
          activo: true,
          orden: Object.keys(activosMap).length,
          agregadoEl: serverTimestamp()
        });
      }
      toast.success(currentState ? "Recurso desactivado" : "Recurso activado");
    } catch (err) {
      console.error('Error toggling:', err);
      toast.error("Error al actualizar estado");
    }
  };

  const handleDelete = async (recursoId: string) => {
    if (!currentWorkspaceId || !confirm("¿Eliminar este recurso definitivamente?")) return;
    try {
      // Eliminar de baseConocimiento
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO, recursoId));
      // También eliminar de conocimientoActivo si existía
      await deleteDoc(doc(
        db,
        COLLECTIONS.ESPACIOS, currentWorkspaceId,
        COLLECTIONS.AGENTES, agentId as string,
        COLLECTIONS.CONOCIMIENTO_ACTIVO, recursoId
      )).catch(() => {}); // Ignorar si no existía
      toast.success("Recurso eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,video/mp4,.mp4"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Recursos Multimedia</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Archivos que el agente enviará proactivamente a los clientes.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2.5 bg-[var(--bg-sidebar)] px-3 py-1.5 rounded-full border border-[var(--accent)]/30 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-tight">
              {currentActiveCount} / {limits.recursosMultimediaPorAgente} Activos
            </span>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[var(--accent)] text-[var(--accent-text)]"
          >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <FilePlus className="w-4 h-4 mr-2" />
              Subir Recurso
            </>
          )}
        </Button>
      </div>

      <div className="bg-[var(--bg-input)] border border-[var(--border-light)] p-6 rounded-3xl flex gap-4">
        <div className="shrink-0"><HelpCircle className="w-5 h-5 text-[var(--accent)]" /></div>
        <div className="space-y-1 text-xs text-[var(--text-secondary-light)] leading-relaxed font-medium">
          <p className="font-bold text-[var(--text-primary-light)] mb-1">¿Cómo funcionan los recursos?</p>
          <p>A diferencia de los archivos de entrenamiento, estos recursos el agente los adjunta en el chat. La descripción es vital: dile exactamente cuándo debe enviarlo. Ej: "Envía este PDF si el cliente pide nuestro catálogo de precios mayoristas".</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recursos.length === 0 ? (
          <div className="md:col-span-2 h-64 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-light)] rounded-3xl opacity-50 space-y-2">
            <ImageIcon className="w-8 h-8 text-[var(--text-tertiary-light)]" />
            <p className="text-sm">Aún no hay recursos multimedia.</p>
          </div>
        ) : (
          recursos.map(r => {
            const isActive = !!activosMap[r.id];
            return (
              <div 
                key={r.id}
                className={cn(
                  "bg-[var(--bg-card)] border rounded-3xl p-6 transition-all space-y-4 shadow-sm",
                  isActive
                    ? "border-[var(--accent)]/30 shadow-md scale-[1.01]"
                    : "border-slate-300 opacity-70 grayscale hover:opacity-100 hover:grayscale-0 hover:border-slate-400"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300",
                      isActive
                        ? "bg-[#1A1A18] border-[#333330] shadow-xl shadow-black/20"
                        : "bg-[var(--bg-input)] border-[var(--border-light)]"
                    )}>
                      {(() => {
                        const IconComponent = getIconByType(r.archivoNombre || '');
                        return <IconComponent className={cn("w-8 h-8", isActive ? "text-[var(--accent)]" : "text-[var(--text-tertiary-light)]")} />;
                      })()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary-light)] truncate max-w-[150px]">{r.titulo}</h4>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-tertiary-light)] text-[9px] font-bold uppercase tracking-wider border border-[var(--border-light)]">
                          {r.archivoNombre?.split('.').pop() || 'Archivo'}
                      </span>
                      <span className={cn(
                        "block mt-1 text-[10px] font-bold uppercase tracking-tight",
                        isActive ? "text-[var(--accent-active)]" : "text-[var(--text-tertiary-light)]"
                      )}>
                        {isActive ? "Activo para este agente" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch 
                      checked={isActive}
                      onCheckedChange={() => toggleActivo(r.id, isActive)} 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(r.id)}
                      className="w-8 h-8 rounded-full text-[var(--text-tertiary-light)] hover:text-[var(--error)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Regla de Envío Automático</Label>
                  </div>
                  <Textarea 
                    defaultValue={r.descripcion}
                    onBlur={(e) => updateDescripcion(r.id, e.target.value)}
                    placeholder="Ej: Enviar cuando pregunten por los medios de pago..."
                    className="bg-[var(--bg-input)] border-[var(--border-light)] text-[13px] resize-none h-20 rounded-xl"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

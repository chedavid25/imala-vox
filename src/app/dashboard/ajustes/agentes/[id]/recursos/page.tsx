"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  increment 
} from "firebase/firestore";
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
  AlertCircle,
  HelpCircle,
  Zap,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AgenteRecursosPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id: agentId } = useParams();

  const [recursos, setRecursos] = useState<(RecursoConocimiento & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!currentWorkspaceId || !agentId) return;

    // Los recursos multimedia son compartidos a nivel workspace pero filtrados por tipo 'recurso'
    // El doc menciona que el agente los referencia. Aunque el esquema sugiere subcolección conocimientoActivo,
    // para recursos multimedia el diseño de la Pantalla 4 dice que viven en baseConocimiento con tipo 'recurso'.
    // Implementaremos que se filtran los del workspace que tengan una relación con este agente o simplemente
    // seguiremos la instrucción de la Pantalla 4: Gestión de recursos multimedia.
    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "recurso")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecursos(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      setLoading(false);
    });

    return () => unsubscribe();
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

  const toggleActivo = async (recursoId: string, currentState: boolean) => {
    if (!currentWorkspaceId) return;
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO, recursoId);
      await updateDoc(docRef, { 
        estado: !currentState ? 'activo' : 'error', // Simplificación de 'activo' vs 'inactivo' usando el campo estado
        actualizadoEl: serverTimestamp()
      });
      toast.success(!currentState ? "Recurso activado" : "Recurso desactivado");
    } catch (err) {
      toast.error("Error al actualizar estado");
    }
  };

  const handleDelete = async (recursoId: string) => {
    if (!currentWorkspaceId || !confirm("¿Eliminar este recurso definitivamente?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO, recursoId));
      toast.success("Recurso eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Recursos Multimedia</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Archivos que el agente enviará proactivamente a los clientes.</p>
        </div>
        <Button className="bg-[var(--accent)] text-[var(--accent-text)]">
          <FilePlus className="w-4 h-4 mr-2" />
          Subir Recurso
        </Button>
      </div>

      <div className="bg-[var(--bg-input)] border border-[var(--border-light)] p-6 rounded-3xl flex gap-4">
        <div className="shrink-0"><HelpCircle className="w-5 h-5 text-[var(--accent)]" /></div>
        <div className="space-y-1 text-xs text-[var(--text-secondary-light)] leading-relaxed font-medium">
          <p className="font-bold text-[var(--text-primary-light)] mb-1">¿Cómo funcionan los recursos?</p>
          <p>A diferencia de los archivos de entrenamiento, estos recursos **el agente los adjunta en el chat**. La descripción es vital: dile exactamente cuándo debe enviarlo. Ej: "Envía este PDF si el cliente pide nuestro catálogo de precios mayoristas".</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recursos.length === 0 ? (
          <div className="md:col-span-2 h-64 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-light)] rounded-3xl opacity-50 space-y-2">
            <ImageIcon className="w-8 h-8 text-[var(--text-tertiary-light)]" />
            <p className="text-sm">Aún no hay recursos multimedia.</p>
          </div>
        ) : (
          recursos.map(r => (
            <div 
              key={r.id}
              className={cn(
                "bg-[var(--bg-card)] border rounded-3xl p-6 transition-all space-y-4",
                r.estado === 'activo' ? "border-[var(--border-light)] shadow-sm" : "border-[var(--border-light)] opacity-60 grayscale"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center border border-[var(--border-light)]">
                    <ImageIcon className="w-8 h-8 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary-light)] truncate max-w-[150px]">{r.titulo}</h4>
                    <p className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-wider">{r.archivoNombre?.split('.').pop() || 'Archivo'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch 
                    checked={r.estado === 'activo'} 
                    onCheckedChange={() => toggleActivo(r.id, r.estado === 'activo')} 
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
          ))
        )}
      </div>
    </div>
  );
}

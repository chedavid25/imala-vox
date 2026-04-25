"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { COLLECTIONS, EtiquetaAgente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Tag, 
  Plus, 
  Trash2, 
  AlertCircle,
  Eye,
  EyeOff,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", 
  "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"
];

export default function AgenteEtiquetasPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id: agentId } = useParams();

  const [etiquetas, setEtiquetas] = useState<(EtiquetaAgente & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [newEtiqueta, setNewEtiqueta] = useState({
    nombre: "",
    instruccionIA: "",
    color: PRESET_COLORS[0]
  });

  useEffect(() => {
    if (!currentWorkspaceId || !agentId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string, COLLECTIONS.ETIQUETAS_AGENTE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEtiquetas(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId, agentId]);

  const handleCreate = async () => {
    if (!currentWorkspaceId || !agentId || !newEtiqueta.nombre) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string, COLLECTIONS.ETIQUETAS_AGENTE), {
        nombre: newEtiqueta.nombre,
        instruccionIA: newEtiqueta.instruccionIA,
        color: newEtiqueta.color,
        activa: true
      });
      toast.success("Etiqueta inteligente creada");
      setNewEtiqueta({ nombre: "", instruccionIA: "", color: PRESET_COLORS[0] });
    } catch (err) {
      toast.error("Error al crear etiqueta");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleActiva = async (eId: string, currentState: boolean) => {
    if (!currentWorkspaceId || !agentId) return;
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string, COLLECTIONS.ETIQUETAS_AGENTE, eId);
      await updateDoc(docRef, { activa: !currentState });
    } catch (err) {
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async (eId: string) => {
    if (!currentWorkspaceId || !agentId || !confirm("¿Eliminar etiqueta?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string, COLLECTIONS.ETIQUETAS_AGENTE, eId));
      toast.success("Etiqueta eliminada");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Etiquetas Inteligentes</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Define qué etiquetas puede aplicar el agente automáticamente según el contexto.</p>
        </div>
        
        <Dialog>
          <DialogTrigger>
            <Button className="bg-[var(--accent)] text-[var(--accent-text)]">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Etiqueta
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)]">
            <DialogHeader>
              <DialogTitle>Crear Etiqueta de IA</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la etiqueta</Label>
                <Input 
                  id="nombre" 
                  value={newEtiqueta.nombre}
                  onChange={e => setNewEtiqueta({...newEtiqueta, nombre: e.target.value})}
                  placeholder="Ej: INTERESADO, QUEJA, URGENTE" 
                  className="bg-[var(--bg-input)] border-[var(--border-light)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instr">Instrucción para la IA (Cuándo aplicarla)</Label>
                <Input 
                  id="instr"
                  value={newEtiqueta.instruccionIA}
                  onChange={e => setNewEtiqueta({...newEtiqueta, instruccionIA: e.target.value})}
                  placeholder="Ej: Aplica si el cliente menciona que quiere comprar hoy..." 
                  className="bg-[var(--bg-input)] border-[var(--border-light)]"
                />
              </div>
              <div className="space-y-3">
                <Label>Color de visualización</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => setNewEtiqueta({...newEtiqueta, color: c})}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        newEtiqueta.color === c ? "border-[var(--text-primary-light)] scale-110" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button onClick={handleCreate} disabled={isAdding || !newEtiqueta.nombre} className="bg-[var(--accent)] text-[var(--accent-text)]">
                  {isAdding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Crear Etiqueta
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-[var(--bg-input)] border border-[var(--border-light)] p-5 rounded-2xl flex gap-4">
        <AlertCircle className="w-5 h-5 text-[var(--accent)] shrink-0" />
        <p className="text-[13px] text-[var(--text-secondary-light)] leading-relaxed font-medium">
          <span className="font-bold text-[var(--text-primary-light)]">Nota:</span> Estas etiquetas son exclusivas para el análisis de este agente. Son distintas de las categorías globales del CRM (Lead, Personal, etc.).
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--bg-input)]/50 border-b border-[var(--border-light)]">
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Etiqueta</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Criterio de IA</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Estado</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {etiquetas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-[var(--text-tertiary-light)]">No hay etiquetas inteligentes configuradas.</td>
              </tr>
            ) : (
              etiquetas.map(e => (
                <tr key={e.id} className="hover:bg-[var(--bg-input)]/10 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
                       <span className="text-sm font-bold text-[var(--text-primary-light)]">{e.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-[var(--text-secondary-light)] font-medium italic">"{e.instruccionIA || 'Sin instrucción...'}"</p>
                  </td>
                  <td className="px-6 py-4">
                    <Switch checked={e.activa} onCheckedChange={() => toggleActiva(e.id, e.activa)} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(e.id)}
                      className="w-8 h-8 rounded-full text-[var(--text-tertiary-light)] hover:text-[var(--error)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={cn("animate-spin", className)} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

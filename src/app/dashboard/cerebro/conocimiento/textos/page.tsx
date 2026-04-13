"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  collectionGroup,
  getDocs
} from "firebase/firestore";
import { COLLECTIONS, RecursoConocimiento } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Type, 
  Plus, 
  Trash2, 
  Heading, 
  AlignLeft,
  Loader2,
  Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

const SUGGESTIONS = [
  "Horarios de atención",
  "Preguntas frecuentes",
  "Política de precios",
  "Proceso de contratación",
  "Datos de contacto"
];

export default function TextosGlobalPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [textos, setTextos] = useState<(RecursoConocimiento & { id: string, usageCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [newTexto, setNewTexto] = useState({
    titulo: "",
    contenido: ""
  });

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "texto")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as (RecursoConocimiento & { id: string })[];
      setTextos(docs.map(d => ({ ...d, usageCount: 0 })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  const handleCreate = async () => {
    if (!currentWorkspaceId || !newTexto.titulo || !newTexto.contenido) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO), {
        tipo: 'texto',
        titulo: newTexto.titulo,
        contenidoTexto: newTexto.contenido,
        descripcion: `Contenido sobre ${newTexto.titulo}`,
        estado: 'activo',
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp(),
        creadoPor: "admin" // Reemplazar con UID real si hay auth completo
      });
      toast.success("Texto agregado al cerebro");
      setNewTexto({ titulo: "", contenido: "" });
    } catch (err) {
      toast.error("Error al crear el texto");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (t: any) => {
    if (t.usageCount > 0) {
      toast.error("Este texto está activo en uno o más agentes.");
      return;
    }
    if (!confirm("¿Eliminar este bloque de texto?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.CONOCIMIENTO, t.id));
      toast.success("Texto eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-[var(--text-primary-light)]">Gestionar Textos Estáticos</h3>
        
        <Dialog>
          <DialogTrigger render={
            <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)]">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Texto
            </Button>
          } />
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Bloque de Texto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-3">
                <Label>Sugerencias rápidas</Label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(s => (
                    <button 
                      key={s}
                      onClick={() => setNewTexto({...newTexto, titulo: s})}
                      className="px-3 py-1 bg-[var(--bg-input)] hover:bg-[var(--accent)]/10 text-[11px] font-bold text-[var(--text-tertiary-light)] hover:text-[var(--accent)] rounded-full transition-all border border-[var(--border-light)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título del recurso</Label>
                <Input 
                  id="titulo" 
                  value={newTexto.titulo}
                  onChange={e => setNewTexto({...newTexto, titulo: e.target.value})}
                  placeholder="Ej: Política de devoluciones" 
                  className="bg-[var(--bg-input)] border-[var(--border-light)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contenido">Contenido</Label>
                <Textarea 
                  id="contenido"
                  value={newTexto.contenido}
                  onChange={e => setNewTexto({...newTexto, contenido: e.target.value})}
                  placeholder="Escribe el texto que la IA debe conocer..."
                  className="bg-[var(--bg-input)] border-[var(--border-light)] min-h-[200px] resize-none"
                  maxLength={3000}
                />
                <div className="text-[10px] text-right text-[var(--text-tertiary-light)] font-bold">
                  {newTexto.contenido.length} / 3,000 caracteres
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={
                <Button onClick={handleCreate} disabled={isAdding || !newTexto.titulo} className="bg-[var(--accent)] text-[var(--accent-text)]">
                  {isAdding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Guardar Texto
                </Button>
              } />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : textos.length === 0 ? (
        <div className="p-12 text-center border border-[var(--border-light)] rounded-3xl bg-[var(--bg-card)]/50">
          <p className="text-sm text-[var(--text-tertiary-light)]">No hay textos planos registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {textos.map((t) => (
            <div 
              key={t.id}
              className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-5 hover:border-[var(--border-light-strong)] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Heading className="w-4 h-4 text-[var(--accent)]" />
                    <h4 className="text-sm font-bold text-[var(--text-primary-light)] truncate max-w-[150px]">{t.titulo}</h4>
                  </div>
                  <Badge variant="outline" className="text-[9px] border-[var(--border-light)]">
                    {t.usageCount} agentes
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-tertiary-light)] line-clamp-3 leading-relaxed">
                  {t.contenidoTexto}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border-light)] flex justify-end">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(t)}
                  className="w-8 h-8 rounded-full text-[var(--text-tertiary-light)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

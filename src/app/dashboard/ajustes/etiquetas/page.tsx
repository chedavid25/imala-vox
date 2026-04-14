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
import { COLLECTIONS } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Tags, 
  Plus, 
  Trash2, 
  Loader2, 
  Settings2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF", label: "Azul" },
  { bg: "#D1FAE5", text: "#065F46", label: "Verde" },
  { bg: "#FEE2E2", text: "#991B1B", label: "Rojo" },
  { bg: "#FEF3C7", text: "#92400E", label: "Naranja" },
  { bg: "#F3E8FF", text: "#6B21A8", label: "Violeta" },
  { bg: "#E0E7FF", text: "#3730A3", label: "Indigo" },
];

export default function CRMTagsPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [newTag, setNewTag] = useState({
    nombre: "",
    colorBg: PRESET_COLORS[0].bg,
    colorText: PRESET_COLORS[0].text
  });

  useEffect(() => {
    if (!currentWorkspaceId) return;

    // Supongamos que las etiquetas globales viven en una colección 'etiquetasCRM' en el workspace
    const q = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "etiquetasCRM"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTags(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  const handleCreate = async () => {
    if (!currentWorkspaceId || !newTag.nombre) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "etiquetasCRM"), {
        nombre: newTag.nombre,
        colorBg: newTag.colorBg,
        colorText: newTag.colorText,
        creadoEl: serverTimestamp()
      });
      toast.success("Etiqueta CRM creada");
      setNewTag({ ...newTag, nombre: "" });
    } catch (err) {
      toast.error("Error al crear");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (tId: string) => {
    if (!currentWorkspaceId || !confirm("¿Eliminar esta etiqueta global? Los contactos ya no la tendrán vinculada.")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "etiquetasCRM", tId));
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
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Etiquetas del CRM</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Gestiona las categorías globales para segmentar tus contactos.</p>
        </div>
        
        <Dialog>
          <DialogTrigger render={
            <Button className="bg-[var(--accent)] text-[var(--accent-text)]">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Etiqueta
            </Button>
          } />
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)]">
            <DialogHeader>
              <DialogTitle>Crear Etiqueta Global</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Nombre de la etiqueta</Label>
                <Input 
                  id="tag-name" 
                  value={newTag.nombre}
                  onChange={e => setNewTag({...newTag, nombre: e.target.value})}
                  placeholder="Ej: Cliente VIIP, Inversor, Referido" 
                  className="bg-[var(--bg-input)] border-[var(--border-light)]"
                />
              </div>
              <div className="space-y-3">
                <Label>Estilo visual</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_COLORS.map((c, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setNewTag({...newTag, colorBg: c.bg, colorText: c.text})}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                        newTag.colorBg === c.bg ? "border-[var(--text-primary-light)] ring-2 ring-[var(--accent)]/20" : "border-transparent opacity-70 hover:opacity-100"
                      )}
                    >
                       <div 
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: c.bg, color: c.text }}
                       >
                        Tag
                       </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={
                <Button onClick={handleCreate} disabled={isAdding || !newTag.nombre} className="bg-[var(--accent)] text-[var(--accent-text)]">
                  {isAdding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Confirmar
                </Button>
              } />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.length === 0 ? (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-[var(--border-light)] rounded-3xl opacity-50">
            <p className="text-sm">No hay etiquetas creadas.</p>
          </div>
        ) : (
          tags.map(t => (
            <div 
              key={t.id}
              className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center justify-between group hover:border-[var(--accent)] transition-all"
            >
              <div 
                className="px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ backgroundColor: t.colorBg, color: t.colorText }}
              >
                {t.nombre}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDelete(t.id)}
                className="w-7 h-7 rounded-full text-[var(--text-tertiary-light)] hover:text-[var(--error)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-light)] flex gap-4">
        <Users className="w-5 h-5 text-[var(--accent)] shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold">Uso de etiquetas</h4>
          <p className="text-xs text-[var(--text-secondary-light)] leading-relaxed font-medium">
            Estas etiquetas se utilizan para segmentar contactos en la base de datos principal. Puedes aplicarlas manualmente en la vista de Contactos o configurarlas en los Workflows para que se apliquen automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}

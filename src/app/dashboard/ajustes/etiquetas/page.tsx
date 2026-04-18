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
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { COLLECTIONS, CategoriaCRM, EtiquetaCRM } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Tags, 
  Plus, 
  Trash2, 
  Loader2, 
  Settings2,
  Users,
  LayoutGrid,
  Edit2,
  Bot,
  Clock,
  ChevronDown,
  LayoutList,
  Layers,
  CheckCircle2,
  Circle
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF", label: "Azul" },
  { bg: "#D1FAE5", text: "#065F46", label: "Verde" },
  { bg: "#FEE2E2", text: "#991B1B", label: "Rojo" },
  { bg: "#FEF3C7", text: "#92400E", label: "Naranja" },
  { bg: "#F3E8FF", text: "#6B21A8", label: "Violeta" },
  { bg: "#E0E7FF", text: "#3730A3", label: "Indigo" },
  { bg: "#F1F5F9", text: "#334155", label: "Gris" },
  { bg: "#FFF7ED", text: "#C2410C", label: "Marrón" },
];

export default function CRMTagsPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [categories, setCategories] = useState<CategoriaCRM[]>([]);
  const [tags, setTags] = useState<EtiquetaCRM[]>([]);
  const [loading, setLoading] = useState(true);

  // States para modals
  const [editingTag, setEditingTag] = useState<EtiquetaCRM | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoriaCRM | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Form states
  const [tagForm, setTagForm] = useState<Partial<EtiquetaCRM>>({
    nombre: "",
    categoriaId: "",
    colorBg: PRESET_COLORS[0].bg,
    colorText: PRESET_COLORS[0].text,
    instruccionIA: "",
    alertaDias: undefined
  });

  const [categoryForm, setCategoryForm] = useState<Partial<CategoriaCRM>>({
    nombre: "",
    tipo: "multiple",
    alertaDiasDefault: 15,
    orden: 0
  });

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const qCats = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), orderBy("orden", "asc"));
    const qTags = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM));
    
    const unsubCats = onSnapshot(qCats, (snap) => {
      setCategories(snap.docs.map(d => ({ ...d.data(), id: d.id } as CategoriaCRM)));
    });

    const unsubTags = onSnapshot(qTags, (snap) => {
      setTags(snap.docs.map(d => ({ ...d.data(), id: d.id } as EtiquetaCRM)));
      setLoading(false);
    });

    return () => {
      unsubCats();
      unsubTags();
    };
  }, [currentWorkspaceId]);

  // CATEGORIES CRUD
  const handleSaveCategory = async () => {
    if (!currentWorkspaceId || !categoryForm.nombre) return;
    try {
      if (editingCategory?.id) {
        await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM, editingCategory.id), {
          ...categoryForm,
          actualizadoEl: serverTimestamp()
        });
        toast.success("Categoría actualizada");
      } else {
        await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), {
          ...categoryForm,
          creadoEl: serverTimestamp(),
          orden: categories.length
        });
        toast.success("Categoría creada");
      }
      setIsAddingCategory(false);
      setEditingCategory(null);
      setCategoryForm({ nombre: "", tipo: "multiple", alertaDiasDefault: 15 });
    } catch (err) {
      toast.error("Error al guardar categoría");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!currentWorkspaceId || !confirm("¿Eliminar categoría? Las etiquetas vinculadas quedarán huérfanas.")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM, id));
      toast.success("Categoría eliminada");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  // TAGS CRUD
  const handleSaveTag = async () => {
    if (!currentWorkspaceId || !tagForm.nombre || !tagForm.categoriaId) {
      toast.error("Falta nombre o categoría");
      return;
    }
    try {
      if (editingTag?.id) {
        await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM, editingTag.id), {
          ...tagForm,
          actualizadoEl: serverTimestamp()
        });
        toast.success("Etiqueta actualizada");
      } else {
        await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM), {
          ...tagForm,
          creadoEl: serverTimestamp()
        });
        toast.success("Etiqueta creada");
      }
      setIsAddingTag(false);
      setEditingTag(null);
      setTagForm({ 
        nombre: "", 
        categoriaId: tagForm.categoriaId, // Mantenemos la categoría para creación rápida
        colorBg: PRESET_COLORS[0].bg, 
        colorText: PRESET_COLORS[0].text 
      });
    } catch (err) {
      toast.error("Error al guardar etiqueta");
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!currentWorkspaceId || !confirm("¿Eliminar etiqueta? Se quitará de todos los contactos.")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM, id));
      toast.success("Etiqueta eliminada");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 no-scrollbar">
      
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-[var(--text-primary-light)] flex items-center gap-2 tracking-tight">
            <Layers className="w-6 h-6 text-[var(--accent)]" /> 
            Etiquetas y Salud Relacional
          </h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Define categorías, semáforos de estado e instrucciones para la IA.</p>
        </div>
        
        <div className="flex gap-2">
           <Dialog open={isAddingCategory} onOpenChange={(o) => { if(!o) setEditingCategory(null); setIsAddingCategory(o); }}>
            <DialogTrigger render={
              <Button variant="outline" className="border-[var(--border-light)] text-[var(--text-primary-light)]">
                <LayoutList className="w-4 h-4 mr-2" />
                Nueva Categoría
              </Button>
            } />
            <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Nombre de la categoría</Label>
                  <Input 
                    value={categoryForm.nombre}
                    onChange={e => setCategoryForm({...categoryForm, nombre: e.target.value})}
                    placeholder="Ej: Interés, Prioridad, Temperatura..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comportamiento de selección</Label>
                  <Select 
                    value={categoryForm.tipo} 
                    onValueChange={(v:any) => setCategoryForm({...categoryForm, tipo: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[var(--border-light)]">
                      <SelectItem value="multiple">Multiselección (Varias etiquetas a la vez)</SelectItem>
                      <SelectItem value="exclusiva">Exclusiva (Semáforo: Solo una a la vez)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-[var(--text-tertiary-light)] px-1">
                    Las exclusivas son ideales para estados o niveles de urgencia.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Días para Alerta (Salud Relacional)
                  </Label>
                  <Input 
                    type="number"
                    value={categoryForm.alertaDiasDefault}
                    onChange={e => setCategoryForm({...categoryForm, alertaDiasDefault: parseInt(e.target.value)})}
                  />
                  <p className="text-[11px] text-[var(--text-tertiary-light)] px-1">
                    Si pasan estos días sin contacto, el semáforo se pondrá en Rojo.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveCategory} className="bg-[var(--accent)] text-[var(--accent-text)] w-full">
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddingTag} onOpenChange={(o) => { if(!o) setEditingTag(null); setIsAddingTag(o); }}>
            <DialogTrigger render={
              <Button className="bg-[var(--accent)] text-[var(--accent-text)]">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Etiqueta
              </Button>
            } />
            <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
              <DialogHeader>
                <DialogTitle>{editingTag ? 'Editar Etiqueta' : 'Crear Nueva Etiqueta'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input 
                      value={tagForm.nombre}
                      onChange={e => setTagForm({...tagForm, nombre: e.target.value})}
                      placeholder="Ej: Inversor" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select 
                      value={tagForm.categoriaId} 
                      onValueChange={v => setTagForm({...tagForm, categoriaId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[var(--border-light)]">
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id!}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Estilo visual</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.map((c, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setTagForm({...tagForm, colorBg: c.bg, colorText: c.text})}
                        className={cn(
                          "p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                          tagForm.colorBg === c.bg ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                         <div 
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: c.bg, color: c.text }}
                         >
                          ABC
                         </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-light)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-[var(--accent)]" />
                    <Label className="text-[12px] font-bold">Automatización IA (Opcional)</Label>
                  </div>
                  <Textarea 
                    placeholder="Describe cuándo la IA debe aplicar esta etiqueta..."
                    className="min-h-[80px] text-[13px] bg-white border-none focus-visible:ring-1"
                    value={tagForm.instruccionIA}
                    onChange={e => setTagForm({...tagForm, instruccionIA: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    Días de Alerta Específicos
                    <span className="text-[10px] text-[var(--text-tertiary-light)] font-normal">Opcional</span>
                  </Label>
                  <Input 
                    type="number" 
                    placeholder="Ej: 7"
                    value={tagForm.alertaDias || ""}
                    onChange={e => setTagForm({...tagForm, alertaDias: parseInt(e.target.value) || undefined})}
                  />
                </div>
              </div>
              <DialogFooter>
                 <Button onClick={handleSaveTag} className="bg-[var(--accent)] text-[var(--accent-text)] w-full py-6 rounded-2xl font-bold">
                    {editingTag ? 'Guardar Cambios' : 'Confirmar'}
                 </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-12">
        {categories.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-[var(--border-light)] rounded-[32px] bg-[var(--bg-card)]/30">
            <LayoutList className="w-12 h-12 text-[var(--text-tertiary-light)] mx-auto mb-4 opacity-20" />
            <p className="text-[15px] font-bold text-[var(--text-secondary-light)]">Aún no tienes categorías.</p>
          </div>
        ) : (
          categories.map(cat => (
            <section key={cat.id} className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-[var(--border-light)] shadow-sm">
                      {cat.tipo === 'exclusiva' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <LayoutGrid className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div>
                      <h3 className="text-[17px] font-black tracking-tight flex items-center gap-2">
                        {cat.nombre}
                        {cat.tipo === 'exclusiva' && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold">SEMÁFORO</span>}
                      </h3>
                      <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">
                        {cat.alertaDiasDefault} días • {cat.tipo === 'exclusiva' ? 'Única' : 'Múltiple'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setCategoryForm({...cat}); setIsAddingCategory(true); }} className="w-8 h-8"><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id!)} className="w-8 h-8"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tags.filter(t => t.categoriaId === cat.id).map(tag => (
                    <div key={tag.id} className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[24px] p-5 flex flex-col gap-4 group transition-all shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider" style={{ backgroundColor: tag.colorBg, color: tag.colorText }}>
                          {tag.nombre}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="icon" onClick={() => { setEditingTag(tag); setTagForm({...tag}); setIsAddingTag(true); }} className="w-7 h-7"><Edit2 className="w-3 h-3" /></Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id!)} className="w-7 h-7"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {tag.instruccionIA && <div className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 flex items-center gap-1.5"><Bot className="w-3 h-3" /> IA ON</div>}
                        {tag.alertaDias && <div className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 flex items-center gap-1.5"><Clock className="w-3 h-3" /> {tag.alertaDias} d</div>}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setTagForm({ ...tagForm, categoriaId: cat.id! }); setIsAddingTag(true); }} className="border-2 border-dashed border-[var(--border-light)] rounded-[24px] p-5 flex items-center justify-center gap-2 text-[var(--text-tertiary-light)] hover:border-[var(--accent)] hover:text-[var(--accent)] bg-[var(--bg-main)]/50 group">
                    <Plus className="w-4 h-4 group-hover:scale-110" />
                    <span className="text-[12px] font-bold">Añadir</span>
                  </button>
               </div>
            </section>
          ))
        )}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-[var(--border-light)] shadow-2xl z-50 flex gap-6 max-w-2xl w-full hidden md:flex">
        <div className="flex gap-3">
           <LayoutGrid className="size-8 text-blue-500" />
           <div className="space-y-0.5">
              <h4 className="text-[11px] font-black uppercase tracking-widest">Normal</h4>
              <p className="text-[10px] text-[var(--text-tertiary-light)]">Multiselección de etiquetas.</p>
           </div>
        </div>
        <div className="w-[1px] h-10 bg-[var(--border-light)] shrink-0" />
        <div className="flex gap-3">
           <Circle className="size-8 text-emerald-500" />
           <div className="space-y-0.5">
              <h4 className="text-[11px] font-black uppercase tracking-widest">Semáforo</h4>
              <p className="text-[10px] text-[var(--text-tertiary-light)]">Solo una por categoría.</p>
           </div>
        </div>
      </div>
    </div>
  );
}

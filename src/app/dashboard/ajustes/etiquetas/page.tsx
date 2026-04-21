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
  Circle,
  HelpCircle,
  ArrowRight
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Form states
  const [tagForm, setTagForm] = useState<Partial<EtiquetaCRM>>({
    nombre: "",
    categoriaId: "",
    colorBg: PRESET_COLORS[0].bg,
    colorText: PRESET_COLORS[0].text,
    instruccionIA: "",
    aiBlocked: false,
    alertaDias: undefined
  });

  const [categoryForm, setCategoryForm] = useState<Partial<CategoriaCRM>>({
    nombre: "",
    tipo: "multiple",
    alertaDiasDefault: 15,
    aiBlocked: false,
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
      setCategoryForm({ nombre: "", tipo: "multiple", alertaDiasDefault: 15, aiBlocked: false });
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
      toast.error("Completa el nombre de la etiqueta");
      return;
    }
    try {
      // Limpiar undefined — Firestore no los acepta
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(tagForm)) {
        if (value !== undefined && value !== "") cleanData[key] = value;
      }
      // Asegurar campos obligatorios
      cleanData.nombre = tagForm.nombre;
      cleanData.categoriaId = tagForm.categoriaId;
      cleanData.colorBg = tagForm.colorBg || PRESET_COLORS[0].bg;
      cleanData.colorText = tagForm.colorText || PRESET_COLORS[0].text;

      if (editingTag?.id) {
        await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM, editingTag.id), {
          ...cleanData,
          actualizadoEl: serverTimestamp()
        });
        toast.success("Etiqueta actualizada");
      } else {
        await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM), {
          ...cleanData,
          creadoEl: serverTimestamp()
        });
        toast.success("Etiqueta creada");
      }
      setIsAddingTag(false);
      setEditingTag(null);
      setTagForm({ 
        nombre: "", 
        categoriaId: tagForm.categoriaId,
        colorBg: PRESET_COLORS[0].bg, 
        colorText: PRESET_COLORS[0].text,
        aiBlocked: false
      });
    } catch (err) {
      console.error("Error guardando etiqueta:", err);
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

  const handleToggleIA = async (item: CategoriaCRM | EtiquetaCRM, isCategory: boolean) => {
    if (!currentWorkspaceId || !item.id) return;
    try {
      const coll = isCategory ? COLLECTIONS.CATEGORIAS_CRM : COLLECTIONS.ETIQUETAS_CRM;
      await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, coll, item.id), {
        aiBlocked: !item.aiBlocked,
        actualizadoEl: serverTimestamp()
      });
      toast.success(item.aiBlocked ? "IA Activada" : "IA Desactivada");
    } catch (err) {
      toast.error("Error al cambiar estado de IA");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 no-scrollbar">
      
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[var(--text-primary-light)] flex items-center gap-2 tracking-tight">
            <Layers className="w-6 h-6 text-[var(--accent)]" /> 
            Etiquetas y Salud Relacional
          </h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Organiza tus contactos con grupos de etiquetas y controla la salud relacional.</p>
        </div>
        
        <div className="flex gap-2">
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={() => setIsHelpOpen(true)}
             className="size-11 rounded-full border border-slate-100 text-slate-400 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all"
           >
             <HelpCircle className="size-5" />
           </Button>
           <Dialog open={isAddingCategory} onOpenChange={(o) => { if(!o) setEditingCategory(null); setIsAddingCategory(o); }}>
            <DialogTrigger render={
              <Button className="bg-[var(--accent)] text-[var(--accent-text)] rounded-full h-11 px-6 font-semibold shadow-lg shadow-[var(--accent)]/20 hover:scale-105 transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Grupo
              </Button>
            } />
            <DialogContent className="max-w-[520px] bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0">
              <DialogHeader className="bg-slate-50/50 p-8 pb-4">
                <DialogTitle className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
                    {editingCategory ? <Edit2 className="size-5" /> : <LayoutList className="size-5" />}
                  </div>
                  {editingCategory ? 'Editar Grupo' : 'Nuevo Grupo de Etiquetas'}
                </DialogTitle>
              </DialogHeader>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Nombre del grupo</Label>
                  <Input 
                    value={categoryForm.nombre}
                    onChange={e => setCategoryForm({...categoryForm, nombre: e.target.value})}
                    placeholder="Ej: Tipo de Cliente, Estado del Negocio..."
                    className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-medium focus:bg-white transition-all shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100 ring-2 ring-rose-500/10">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-rose-700">
                      <Bot className="size-3.5" />
                      Bloquear IA para este grupo
                    </Label>
                    <p className="text-[10px] text-rose-600/70">La IA no responderá a NADIE en este grupo.</p>
                  </div>
                  <Switch 
                    checked={categoryForm.aiBlocked}
                    onCheckedChange={(v) => setCategoryForm({...categoryForm, aiBlocked: v})}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">¿Cómo se asigna?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setCategoryForm({...categoryForm, tipo: 'multiple'})}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center",
                        categoryForm.tipo === 'multiple'
                          ? "border-blue-400 bg-blue-50/50 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <LayoutGrid className={cn("size-6", categoryForm.tipo === 'multiple' ? "text-blue-500" : "text-slate-300")} />
                      <div>
                        <p className={cn("text-[12px] font-semibold", categoryForm.tipo === 'multiple' ? "text-blue-700" : "text-slate-600")}>Múltiple</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Permite varias etiquetas a la vez</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setCategoryForm({...categoryForm, tipo: 'exclusiva'})}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center",
                        categoryForm.tipo === 'exclusiva'
                          ? "border-emerald-400 bg-emerald-50/50 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <CheckCircle2 className={cn("size-6", categoryForm.tipo === 'exclusiva' ? "text-emerald-500" : "text-slate-300")} />
                      <div>
                        <p className={cn("text-[12px] font-semibold", categoryForm.tipo === 'exclusiva' ? "text-emerald-700" : "text-slate-600")}>Exclusiva</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Solo una etiqueta activa (semáforo)</p>
                      </div>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
                    <strong>Múltiple:</strong> Un contacto puede tener varias etiquetas de esta categoría. Ideal para intereses o características. <br/>
                    <strong>Exclusiva:</strong> Solo una etiqueta activa por contacto. Perfecta para estados o niveles de urgencia (funciona como semáforo).
                  </p>
                </div>

                <div className="space-y-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    <Clock className="size-3.5" />
                    Días para Alerta (Salud Relacional)
                  </Label>
                  <Input 
                    type="number"
                    value={categoryForm.alertaDiasDefault}
                    onChange={e => setCategoryForm({...categoryForm, alertaDiasDefault: parseInt(e.target.value)})}
                    className="h-12 rounded-2xl bg-white border-slate-100 text-[15px] font-medium focus:bg-white transition-all shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
                    Si pasan estos días sin contacto con el cliente, el semáforo cambiará a Rojo para que tomes acción.
                  </p>
                </div>
              </div>

              <DialogFooter className="p-8 pt-0">
                <Button 
                  onClick={handleSaveCategory} 
                  className="w-full h-12 rounded-2xl font-semibold bg-[var(--accent)] text-[var(--accent-text)] shadow-xl shadow-[var(--accent)]/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {editingCategory ? 'Guardar Cambios' : 'Crear Grupo'}
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
            <p className="text-[15px] font-semibold text-[var(--text-secondary-light)]">Creá tu primer grupo de etiquetas para organizar contactos.</p>
            <p className="text-[12px] text-[var(--text-tertiary-light)] mt-1">Ej: "Tipo de Cliente" con etiquetas Inversor, Comprador, Vendedor.</p>
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
                      <h3 className="text-[17px] font-semibold tracking-tight flex items-center gap-2">
                        {cat.nombre}
                        {cat.tipo === 'exclusiva' && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-semibold">SEMÁFORO</span>}
                      </h3>
                      <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">
                        Alerta: {cat.alertaDiasDefault || '0'} días • {cat.tipo === 'exclusiva' ? 'Solo una activa' : 'Varias a la vez'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                      cat.aiBlocked ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                    )}>
                      <Bot className="size-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{cat.aiBlocked ? "IA OFF" : "IA ON"}</span>
                      <Switch 
                        checked={!cat.aiBlocked}
                        onCheckedChange={() => handleToggleIA(cat, true)}
                        className="scale-75 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-400"
                      />
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
                      <div className="space-y-4">
                        <div className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-xl border transition-all",
                          tag.aiBlocked ? "bg-rose-50/50 border-rose-100 text-rose-600" : "bg-purple-50/50 border-purple-100 text-purple-600"
                        )}>
                          <div className="flex items-center gap-2">
                            <Bot className="size-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">{tag.aiBlocked ? "IA OFF" : "IA ON"}</span>
                          </div>
                          <Switch 
                            checked={!tag.aiBlocked}
                            onCheckedChange={() => handleToggleIA(tag, false)}
                            className="scale-75 data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-rose-400"
                          />
                        </div>
                        {tag.alertaDias && <div className="text-[9px] text-orange-600 font-bold px-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Salud: {tag.alertaDias} días</div>}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setTagForm({ ...tagForm, categoriaId: cat.id! }); setIsAddingTag(true); }} className="border-2 border-dashed border-[var(--border-light)] rounded-[24px] p-5 flex items-center justify-center gap-2 text-[var(--text-tertiary-light)] hover:border-[var(--accent)] hover:text-[var(--accent)] bg-[var(--bg-main)]/50 group transition-all hover:shadow-sm">
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-[12px] font-semibold">Añadir etiqueta</span>
                  </button>
               </div>
            </section>
          ))
        )}
      </div>

      {/* Modal de Ayuda */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-[620px] bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0">
          <DialogHeader className="bg-slate-50/50 p-8 pb-4">
            <DialogTitle className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white">
                <HelpCircle className="size-5" />
              </div>
              ¿Cómo funciona?
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            
            {/* Paso 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-[11px] font-bold">1</div>
                <h3 className="text-[14px] font-semibold text-slate-800">Creá un grupo de etiquetas</h3>
              </div>
              <p className="text-[13px] text-slate-500 pl-8 leading-relaxed">
                Un grupo es como una "carpeta" para organizar etiquetas del mismo tipo. Por ejemplo: <strong>"Tipo de Cliente"</strong> o <strong>"Nivel de Interés"</strong>.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-[11px] font-bold">2</div>
                <h3 className="text-[14px] font-semibold text-slate-800">Agregá etiquetas al grupo</h3>
              </div>
              <p className="text-[13px] text-slate-500 pl-8 leading-relaxed">
                Dentro de cada grupo, creá las opciones. Hacé clic en <strong>"Añadir etiqueta"</strong> dentro del grupo.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-[11px] font-bold">3</div>
                <h3 className="text-[14px] font-semibold text-slate-800">Asigná etiquetas a tus contactos</h3>
              </div>
              <p className="text-[13px] text-slate-500 pl-8 leading-relaxed">
                Desde la ficha de cada contacto en el CRM, podés asignarle las etiquetas que necesites.
              </p>
            </div>

            {/* Separador */}
            <div className="h-px bg-slate-100" />

            {/* Ejemplos */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Ejemplos prácticos</h3>
              
              {/* Ejemplo 1: Múltiple */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="size-4 text-blue-500" />
                  <span className="text-[12px] font-semibold text-blue-700">Grupo Múltiple: "Tipo de Cliente"</span>
                </div>
                <div className="flex flex-wrap gap-2 pl-6">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Inversor</span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Comprador</span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Vendedor</span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Desarrollador</span>
                </div>
                <p className="text-[11px] text-blue-600/70 pl-6">
                  ✓ Un contacto puede ser "Inversor" y "Comprador" al mismo tiempo.
                </p>
              </div>

              {/* Ejemplo 2: Exclusiva */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-[12px] font-semibold text-emerald-700">Grupo Exclusivo: "Nivel de Interés"</span>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Caliente 🔥</span>
                  <ArrowRight className="size-3 text-slate-300" />
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Tibio ⚡</span>
                  <ArrowRight className="size-3 text-slate-300" />
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Frío 💤</span>
                </div>
                <p className="text-[11px] text-emerald-600/70 pl-6">
                  ✓ Solo una puede estar activa. Si marcás "Caliente", se desactiva "Frío".
                </p>
              </div>
            </div>

            {/* Separador */}
            <div className="h-px bg-slate-100" />

            {/* Salud Relacional */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-500" />
                <span className="text-[12px] font-semibold text-amber-700">Salud Relacional: ¿qué son los días de alerta?</span>
              </div>
              <p className="text-[11px] text-amber-700/70 pl-6 leading-relaxed">
                Cada grupo tiene un número de "días de alerta". Si pasan esos días sin que tengas contacto con un cliente, 
                el sistema te avisa automáticamente para que retomes la relación. Es como un recordatorio inteligente para no perder clientes.
              </p>
            </div>
          </div>
          <DialogFooter className="p-8 pt-0">
            <Button 
              onClick={() => setIsHelpOpen(false)} 
              className="w-full h-12 rounded-2xl font-semibold bg-[var(--accent)] text-[var(--accent-text)] shadow-xl shadow-[var(--accent)]/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              ¡Entendido!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Etiqueta — se abre desde el "+" de cada grupo */}
      <Dialog open={isAddingTag} onOpenChange={(o) => { if(!o) setEditingTag(null); setIsAddingTag(o); }}>
        <DialogContent className="max-w-[580px] bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0">
          <DialogHeader className="bg-slate-50/50 p-8 pb-4">
            <DialogTitle className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
                {editingTag ? <Edit2 className="size-5" /> : <Tags className="size-5" />}
              </div>
              {editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Nombre de la etiqueta</Label>
              <Input 
                value={tagForm.nombre}
                onChange={e => setTagForm({...tagForm, nombre: e.target.value})}
                placeholder="Ej: Inversor, Comprador, Frío..." 
                className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-medium focus:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100 ring-2 ring-rose-500/10">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-rose-700">
                  <Bot className="size-3.5" />
                  Bloquear IA para esta etiqueta
                </Label>
                <p className="text-[10px] text-rose-600/70">Silencia la IA solo para esta etiqueta específica.</p>
              </div>
              <Switch 
                checked={tagForm.aiBlocked}
                onCheckedChange={(v) => setTagForm({...tagForm, aiBlocked: v})}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((c, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setTagForm({...tagForm, colorBg: c.bg, colorText: c.text})}
                    className={cn(
                      "p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5",
                      tagForm.colorBg === c.bg ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm" : "border-slate-100 opacity-60 hover:opacity-100"
                    )}
                  >
                     <div 
                      className="px-3 py-1 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: c.bg, color: c.text }}
                     >
                      {c.label}
                     </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="size-4 text-[var(--accent)]" />
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Automatización IA (Opcional)</Label>
              </div>
              <Textarea 
                placeholder="Describe cuándo la IA debe aplicar esta etiqueta automáticamente..."
                className="min-h-[80px] text-[13px] bg-white border-slate-100 rounded-xl focus-visible:ring-1 font-medium"
                value={tagForm.instruccionIA}
                onChange={e => setTagForm({...tagForm, instruccionIA: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
                Ej: "Aplica cuando el contacto mencione inversiones o bienes raíces".
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">
                Días de Alerta
                <span className="text-[9px] text-slate-300 font-medium normal-case">Opcional — sobreescribe el del grupo</span>
              </Label>
              <Input 
                type="number" 
                placeholder="Ej: 7"
                value={tagForm.alertaDias || ""}
                onChange={e => setTagForm({...tagForm, alertaDias: parseInt(e.target.value) || undefined})}
                className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-medium focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>
          <DialogFooter className="p-8 pt-0">
             <Button 
               onClick={handleSaveTag} 
               className="w-full h-12 rounded-2xl font-semibold bg-[var(--accent)] text-[var(--accent-text)] shadow-xl shadow-[var(--accent)]/30 hover:scale-[1.02] active:scale-95 transition-all"
             >
                {editingTag ? 'Guardar Cambios' : 'Crear Etiqueta'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

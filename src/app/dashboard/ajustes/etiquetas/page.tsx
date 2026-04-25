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
  ArrowRight,
  Lightbulb,
  AlertCircle
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
  const [showHelp, setShowHelp] = useState(false);

  const ayudaEtiquetas = {
    titulo: "¿Cómo organizar tus contactos?",
    descripcion: "Usa las etiquetas para segmentar tu base de datos y controlar la salud relacional. Puedes crear grupos de etiquetas para diferentes propósitos.",
    recomendacion: "Los grupos 'Exclusivos' actúan como semáforos: solo una etiqueta puede estar activa a la vez. Ideal para estados como 'Frío', 'Tibio' o 'Caliente'.",
    items: [
      { titulo: "Grupos Múltiples", detalle: "Permiten asignar varias etiquetas del mismo grupo a un contacto (ej: Intereses)." },
      { titulo: "Grupos Exclusivos", detalle: "Solo permiten una etiqueta activa. Al marcar una, se desactiva la anterior (ej: Estados)." },
      { titulo: "Salud Relacional", detalle: "Define cada cuántos días debes contactar al cliente según su etiqueta para que el sistema te avise." },
    ]
  };

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
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Tags className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Ajustes del Sistema</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Etiquetas y Salud Relacional</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Organiza tus contactos con grupos de etiquetas y controla la salud relacional.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 h-11",
              showHelp
                ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
                : "bg-white border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            ¿Cómo funciona?
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
          </button>

          <Dialog open={isAddingCategory} onOpenChange={(o) => { if(!o) setEditingCategory(null); setIsAddingCategory(o); }}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Grupo
              </Button>
            </DialogTrigger>
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

      {/* Panel de ayuda expandible */}
      {showHelp && (
        <div className="bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-8 pt-8 pb-6 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shrink-0 shadow-sm">
                <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">{ayudaEtiquetas.titulo}</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaEtiquetas.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ayudaEtiquetas.items.map((item, i) => (
                <div key={i} className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-active)] shrink-0" />
                    <span className="text-[12px] font-bold text-[var(--text-primary-light)] uppercase tracking-tight">{item.titulo}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary-light)] leading-relaxed pl-3.5 font-medium">{item.detalle}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[12px] font-black text-amber-800 uppercase tracking-widest">Recomendación Pro</p>
                <p className="text-[12px] text-amber-700 leading-relaxed font-medium">{ayudaEtiquetas.recomendacion}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <div className="w-10 h-10 rounded-2xl bg-white border border-[var(--border-light)] shadow-sm flex items-center justify-center">
                      {cat.tipo === 'exclusiva' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <LayoutGrid className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 text-[var(--text-primary-light)]">
                        {cat.nombre}
                        {cat.tipo === 'exclusiva' && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest">SEMÁFORO</span>}
                      </h3>
                      <p className="text-[10px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest opacity-70">
                        Alerta: {cat.alertaDiasDefault || '0'} días • {cat.tipo === 'exclusiva' ? 'Exclusiva' : 'Múltiple'}
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
                        className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500 border-none shadow-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setCategoryForm({...cat}); setIsAddingCategory(true); }} className="w-9 h-9 rounded-xl hover:bg-white transition-all shadow-sm"><Edit2 className="w-4 h-4 text-slate-400 hover:text-[var(--accent)]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id!)} className="w-9 h-9 rounded-xl hover:bg-rose-50 transition-all shadow-sm"><Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500" /></Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {tags.filter(t => t.categoriaId === cat.id).map(tag => (
                    <div key={tag.id} className="bg-white border border-[var(--border-light)] rounded-[28px] p-6 flex flex-col gap-5 group transition-all shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/5 relative overflow-hidden">
                      <div className="flex items-start justify-between">
                        <div className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm" style={{ backgroundColor: tag.colorBg, color: tag.colorText }}>
                          {tag.nombre}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                           <Button variant="ghost" size="icon" onClick={() => { setEditingTag(tag); setTagForm({...tag}); setIsAddingTag(true); }} className="w-8 h-8 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"><Edit2 className="w-3.5 h-3.5 text-slate-500" /></Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id!)} className="w-8 h-8 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                        </div>
                      </div>
                      <div className="space-y-4 pt-2">
                        <div className={cn(
                          "flex items-center justify-between px-3.5 py-2 rounded-2xl border transition-all shadow-sm",
                          tag.aiBlocked ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                        )}>
                          <div className="flex items-center gap-2">
                             <Bot className="size-3.5" />
                             <span className="text-[10px] font-black uppercase tracking-wider">{tag.aiBlocked ? "IA OFF" : "IA ON"}</span>
                          </div>
                          <Switch 
                            checked={!tag.aiBlocked}
                            onCheckedChange={() => handleToggleIA(tag, false)}
                            className="scale-90 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500 border-none shadow-sm"
                          />
</div>
                        {tag.alertaDias && (
                          <div className="text-[9px] text-orange-600 font-black uppercase tracking-widest px-1 flex items-center gap-1.5 opacity-70">
                            <Clock className="w-3 h-3" /> Salud: {tag.alertaDias} días
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => { setTagForm({ ...tagForm, categoriaId: cat.id! }); setIsAddingTag(true); }} 
                    className="border-2 border-dashed border-[var(--border-light)] rounded-[28px] p-6 flex flex-col items-center justify-center gap-3 text-[var(--text-tertiary-light)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/[0.02] group transition-all hover:shadow-xl hover:shadow-[var(--accent)]/5 min-h-[160px]"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[var(--bg-input)] group-hover:bg-[var(--accent)]/10 flex items-center justify-center transition-colors">
                      <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Añadir etiqueta</span>
                  </button>
                </div>
            </section>
          ))
        )}
      </div>



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

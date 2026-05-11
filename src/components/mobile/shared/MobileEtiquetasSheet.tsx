"use client";

import React, { useState, useEffect } from "react";
import { BottomSheet } from "./BottomSheet";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS, CategoriaCRM, EtiquetaCRM } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Tags, Plus, Trash2, Edit2, Bot, Clock, ChevronRight, ChevronDown, LayoutGrid, CheckCircle2, Loader2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const PRESET_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF", label: "Azul" },
  { bg: "#D1FAE5", text: "#065F46", label: "Verde" },
  { bg: "#FEE2E2", text: "#991B1B", label: "Rojo" },
  { bg: "#FEF3C7", text: "#92400E", label: "Naranja" },
  { bg: "#F3E8FF", text: "#6B21A8", label: "Violeta" },
  { bg: "#E0E7FF", text: "#3730A3", label: "Índigo" },
  { bg: "#F1F5F9", text: "#334155", label: "Gris" },
  { bg: "#FFF7ED", text: "#C2410C", label: "Marrón" },
];

type View = 'list' | 'cat-form' | 'tag-form';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileEtiquetasSheet({ open, onClose }: Props) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [categories, setCategories] = useState<CategoriaCRM[]>([]);
  const [tags, setTags] = useState<EtiquetaCRM[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // View management
  const [view, setView] = useState<View>('list');
  const [editingCat, setEditingCat] = useState<CategoriaCRM | null>(null);
  const [editingTag, setEditingTag] = useState<EtiquetaCRM | null>(null);
  const [catForm, setCatForm] = useState<Partial<CategoriaCRM>>({ nombre: "", tipo: "multiple", alertaDiasDefault: 15, aiBlocked: false });
  const [tagForm, setTagForm] = useState<Partial<EtiquetaCRM>>({ nombre: "", categoriaId: "", colorBg: PRESET_COLORS[0].bg, colorText: PRESET_COLORS[0].text, aiBlocked: false });

  useEffect(() => {
    if (!currentWorkspaceId || !open) return;
    const qCats = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), orderBy("orden", "asc"));
    const qTags = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM));
    const u1 = onSnapshot(qCats, snap => setCategories(snap.docs.map(d => ({ ...d.data(), id: d.id } as CategoriaCRM))));
    const u2 = onSnapshot(qTags, snap => { setTags(snap.docs.map(d => ({ ...d.data(), id: d.id } as EtiquetaCRM))); setLoading(false); });
    return () => { u1(); u2(); };
  }, [currentWorkspaceId, open]);

  // Reset view on close
  useEffect(() => { if (!open) setView('list'); }, [open]);

  const openCatForm = (cat?: CategoriaCRM) => {
    setEditingCat(cat || null);
    setCatForm(cat ? { ...cat } : { nombre: "", tipo: "multiple", alertaDiasDefault: 15, aiBlocked: false });
    setView('cat-form');
  };

  const openTagForm = (catId: string, tag?: EtiquetaCRM) => {
    setEditingTag(tag || null);
    setTagForm(tag ? { ...tag } : { nombre: "", categoriaId: catId, colorBg: PRESET_COLORS[0].bg, colorText: PRESET_COLORS[0].text, aiBlocked: false });
    setView('tag-form');
  };

  const saveCategory = async () => {
    if (!currentWorkspaceId || !catForm.nombre?.trim()) { toast.error("Escribí un nombre"); return; }
    setSaving(true);
    try {
      if (editingCat?.id) {
        await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM, editingCat.id), { ...catForm, actualizadoEl: serverTimestamp() });
        toast.success("Grupo actualizado");
      } else {
        await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), { ...catForm, orden: categories.length, creadoEl: serverTimestamp() });
        toast.success("Grupo creado");
      }
      setView('list');
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const deleteCategory = async (id: string) => {
    if (!currentWorkspaceId) return;
    if (!confirm("¿Eliminar grupo? Las etiquetas vinculadas quedarán huérfanas.")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM, id));
      toast.success("Grupo eliminado");
    } catch { toast.error("Error al eliminar"); }
  };

  const saveTag = async () => {
    if (!currentWorkspaceId || !tagForm.nombre?.trim()) { toast.error("Escribí un nombre"); return; }
    setSaving(true);
    try {
      const data: Record<string, any> = { nombre: tagForm.nombre, categoriaId: tagForm.categoriaId, colorBg: tagForm.colorBg, colorText: tagForm.colorText, aiBlocked: tagForm.aiBlocked ?? false };
      if (tagForm.instruccionIA) data.instruccionIA = tagForm.instruccionIA;
      if (tagForm.alertaDias) data.alertaDias = tagForm.alertaDias;
      if (editingTag?.id) {
        await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM, editingTag.id), { ...data, actualizadoEl: serverTimestamp() });
        toast.success("Etiqueta actualizada");
      } else {
        await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM), { ...data, creadoEl: serverTimestamp() });
        toast.success("Etiqueta creada");
      }
      setView('list');
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const deleteTag = async (id: string) => {
    if (!currentWorkspaceId || !confirm("¿Eliminar etiqueta?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM, id));
      toast.success("Etiqueta eliminada");
    } catch { toast.error("Error al eliminar"); }
  };

  const toggleIA = async (item: CategoriaCRM | EtiquetaCRM, isCat: boolean) => {
    if (!currentWorkspaceId || !item.id) return;
    const coll = isCat ? COLLECTIONS.CATEGORIAS_CRM : COLLECTIONS.ETIQUETAS_CRM;
    await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, coll, item.id), { aiBlocked: !item.aiBlocked, actualizadoEl: serverTimestamp() });
  };

  // ─── VIEWS ────────────────────────────────────────────────────────────────

  const title = view === 'list' ? 'Etiquetas y Categorías' : view === 'cat-form' ? (editingCat ? 'Editar Grupo' : 'Nuevo Grupo') : (editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta');

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="94dvh">
      <div className="space-y-4 pb-8">
        {/* Header dinámico */}
        <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button onClick={() => setView('list')} className="size-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 active:scale-90 transition-all">
                <X size={16} />
              </button>
            )}
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          </div>
          {view === 'list' && (
            <button onClick={() => openCatForm()} className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
              <Plus size={13} /> Nuevo grupo
            </button>
          )}
        </div>

        {/* ── LISTA ── */}
        {view === 'list' && (
          loading ? (
            <div className="py-16 flex justify-center"><Loader2 size={28} className="animate-spin text-slate-300" /></div>
          ) : categories.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <div className="size-16 rounded-[24px] bg-slate-50 flex items-center justify-center">
                <Tags size={28} className="text-slate-200" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Sin grupos todavía</p>
              <p className="text-[11px] text-slate-300">Creá un grupo para empezar a organizar tus contactos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(cat => {
                const catTags = tags.filter(t => t.categoriaId === cat.id);
                const isExpanded = expandedCat === cat.id;
                return (
                  <div key={cat.id} className="bg-white border border-slate-100 rounded-[20px] overflow-hidden shadow-sm">
                    {/* Categoría header */}
                    <div className="flex items-center gap-3 p-4">
                      <button onClick={() => setExpandedCat(isExpanded ? null : cat.id!)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                          {cat.tipo === 'exclusiva' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <LayoutGrid size={18} className="text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{cat.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{catTags.length} etiquetas · {cat.tipo === 'exclusiva' ? 'Exclusiva' : 'Múltiple'}</p>
                        </div>
                        <ChevronDown size={16} className={cn("text-slate-300 transition-transform shrink-0", isExpanded && "rotate-180")} />
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openCatForm(cat)} className="size-8 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-all">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => deleteCategory(cat.id!)} className="size-8 rounded-xl hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-all">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Tags expandidas */}
                    {isExpanded && (
                      <div className="border-t border-slate-50 bg-slate-50/50 p-3 space-y-2">
                        {catTags.map(tag => (
                          <div key={tag.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0" style={{ backgroundColor: tag.colorBg, color: tag.colorText }}>
                              {tag.nombre}
                            </span>
                            <div className="flex-1 min-w-0">
                              {tag.alertaDias && (
                                <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                                  <Clock size={10} /> {tag.alertaDias} días
                                </p>
                              )}
                              <p className={cn("text-[10px] font-bold", tag.aiBlocked ? "text-rose-500" : "text-emerald-500")}>
                                IA {tag.aiBlocked ? "OFF" : "ON"}
                              </p>
                            </div>
                            <button onClick={() => openTagForm(cat.id!, tag)} className="size-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-all">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => deleteTag(tag.id!)} className="size-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-all">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => openTagForm(cat.id!)} className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold active:scale-[0.98] transition-all">
                          <Plus size={14} /> Añadir etiqueta
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── FORM CATEGORÍA ── */}
        {view === 'cat-form' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre del grupo</p>
              <input
                autoFocus
                type="text"
                value={catForm.nombre || ""}
                onChange={e => setCatForm({ ...catForm, nombre: e.target.value })}
                placeholder="Ej: Tipo de Cliente, Estado..."
                className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">¿Cómo se asigna?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'multiple', label: 'Múltiple', desc: 'Varias activas', icon: LayoutGrid, color: 'blue' },
                  { value: 'exclusiva', label: 'Exclusiva', desc: 'Solo una activa', icon: CheckCircle2, color: 'emerald' },
                ].map(opt => {
                  const Icon = opt.icon;
                  const active = catForm.tipo === opt.value;
                  return (
                    <button key={opt.value} onClick={() => setCatForm({ ...catForm, tipo: opt.value as any })}
                      className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        active ? `border-${opt.color}-400 bg-${opt.color}-50 shadow-sm` : "border-slate-100 bg-white"
                      )}>
                      <Icon size={22} className={active ? `text-${opt.color}-500` : "text-slate-300"} />
                      <div className="text-center">
                        <p className={cn("text-[12px] font-bold", active ? `text-${opt.color}-700` : "text-slate-500")}>{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Días de alerta (salud relacional)</p>
              <input
                type="number"
                value={catForm.alertaDiasDefault || ""}
                onChange={e => setCatForm({ ...catForm, alertaDiasDefault: parseInt(e.target.value) || 0 })}
                placeholder="15"
                className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <div>
                <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5"><Bot size={13} /> Bloquear IA para este grupo</p>
                <p className="text-[10px] text-rose-500 mt-0.5">La IA no responde a nadie con esta categoría.</p>
              </div>
              <Switch checked={!!catForm.aiBlocked} onCheckedChange={v => setCatForm({ ...catForm, aiBlocked: v })} />
            </div>

            <button onClick={saveCategory} disabled={saving}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {editingCat ? "Guardar cambios" : "Crear grupo"}
            </button>
          </div>
        )}

        {/* ── FORM ETIQUETA ── */}
        {view === 'tag-form' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre de la etiqueta</p>
              <input
                autoFocus
                type="text"
                value={tagForm.nombre || ""}
                onChange={e => setTagForm({ ...tagForm, nombre: e.target.value })}
                placeholder="Ej: Inversor, Frío, VIP..."
                className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Preview */}
            {tagForm.nombre && (
              <div className="flex items-center gap-2 px-1">
                <p className="text-[10px] text-slate-400 font-medium">Vista previa:</p>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: tagForm.colorBg, color: tagForm.colorText }}>
                  {tagForm.nombre}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Color</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((c, i) => (
                  <button key={i} onClick={() => setTagForm({ ...tagForm, colorBg: c.bg, colorText: c.text })}
                    className={cn("p-2.5 rounded-xl border-2 flex items-center justify-center transition-all",
                      tagForm.colorBg === c.bg ? "border-slate-400 scale-105 shadow-sm" : "border-slate-100 opacity-70"
                    )}>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: c.bg, color: c.text }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <div>
                <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5"><Bot size={13} /> Bloquear IA</p>
                <p className="text-[10px] text-rose-500 mt-0.5">Silencia la IA solo para esta etiqueta.</p>
              </div>
              <Switch checked={!!tagForm.aiBlocked} onCheckedChange={v => setTagForm({ ...tagForm, aiBlocked: v })} />
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Días de alerta <span className="normal-case font-normal">(opcional)</span></p>
              <input
                type="number"
                value={tagForm.alertaDias || ""}
                onChange={e => setTagForm({ ...tagForm, alertaDias: parseInt(e.target.value) || undefined })}
                placeholder="Sobreescribe el del grupo"
                className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Instrucción IA <span className="normal-case font-normal">(opcional)</span></p>
              <textarea
                value={tagForm.instruccionIA || ""}
                onChange={e => setTagForm({ ...tagForm, instruccionIA: e.target.value })}
                placeholder="Cuándo debe la IA aplicar esta etiqueta automáticamente..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700 outline-none focus:border-[var(--accent)] transition-colors resize-none"
              />
            </div>

            <button onClick={saveTag} disabled={saving}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {editingTag ? "Guardar cambios" : "Crear etiqueta"}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

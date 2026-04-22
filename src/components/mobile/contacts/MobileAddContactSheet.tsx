import React, { useState, useEffect } from "react";
import { BottomSheet } from "@/components/mobile/shared/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, CategoriaCRM, EtiquetaCRM } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";
import { Loader2, User, Phone, Mail, Tag, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileAddContactSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileAddContactSheet({ open, onClose }: MobileAddContactSheetProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  
  const [categories, setCategories] = useState<CategoriaCRM[]>([]);
  const [tags, setTags] = useState<EtiquetaCRM[]>([]);
  
  const [newContact, setNewContact] = useState({
    nombre: "",
    telefono: "",
    email: "",
    relacionTag: "Lead" as "Personal" | "Laboral" | "Lead",
    etiquetas: [] as string[],
  });

  // Cargar configuración de etiquetas
  useEffect(() => {
    if (!currentWorkspaceId || !open) return;

    const qCats = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), orderBy("orden", "asc"));
    const qTags = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM));

    const unsubCats = onSnapshot(qCats, (snap) => {
      setCategories(snap.docs.map(d => ({ ...d.data(), id: d.id } as CategoriaCRM)));
    });

    const unsubTags = onSnapshot(qTags, (snap) => {
      setTags(snap.docs.map(d => ({ ...d.data(), id: d.id } as EtiquetaCRM)));
    });

    return () => {
      unsubCats();
      unsubTags();
    };
  }, [currentWorkspaceId, open]);

  const handleAdd = async () => {
    if (!currentWorkspaceId || !newContact.nombre || !newContact.telefono) {
      toast.error("Nombre y teléfono son obligatorios");
      return;
    }

    setLoading(true);
    try {
      const contactsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS);
      await addDoc(contactsRef, {
        ...newContact,
        esContactoCRM: true,
        creadoEl: Timestamp.now(),
        ultimaInteraccion: Timestamp.now(),
      });
      toast.success("Contacto guardado");
      setNewContact({ nombre: "", telefono: "", email: "", relacionTag: "Lead", etiquetas: [] });
      onClose();
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setNewContact(prev => ({
      ...prev,
      etiquetas: prev.etiquetas.includes(tagId)
        ? prev.etiquetas.filter(id => id !== tagId)
        : [...prev.etiquetas, tagId]
    }));
  };

  const RELACIONES = [
    { value: "Lead", label: "Lead 🔥" },
    { value: "Laboral", label: "Laboral 👔" },
    { value: "Personal", label: "Personal ⭐" },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo Contacto">
      <div className="p-5 space-y-6 pb-10">
        <div className="space-y-4">
          {/* Datos básicos */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Completo</Label>
            <div className="relative">
               <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
               <Input 
                placeholder="Ej: Juan Pérez" 
                className="h-12 pl-11 rounded-2xl bg-slate-50 border-none shadow-inner"
                value={newContact.nombre}
                onChange={e => setNewContact({...newContact, nombre: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp / Tel</Label>
            <div className="relative">
               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
               <Input 
                placeholder="+54 9..." 
                className="h-12 pl-11 rounded-2xl bg-slate-50 border-none shadow-inner"
                value={newContact.telefono}
                onChange={e => setNewContact({...newContact, telefono: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email (Opcional)</Label>
            <div className="relative">
               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
               <Input 
                placeholder="juan@ejemplo.com" 
                className="h-12 pl-11 rounded-2xl bg-slate-50 border-none shadow-inner"
                value={newContact.email}
                onChange={e => setNewContact({...newContact, email: e.target.value})}
              />
            </div>
          </div>

          {/* Perfil de Relación (Chips) */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Perfil de Relación</Label>
            <div className="flex gap-2">
              {RELACIONES.map((rel) => (
                <button
                  key={rel.value}
                  onClick={() => setNewContact({...newContact, relacionTag: rel.value as any})}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-xs font-bold border-2 transition-all",
                    newContact.relacionTag === rel.value
                      ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] shadow-md"
                      : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {rel.label}
                </button>
              ))}
            </div>
          </div>

          {/* Etiquetas / Segmentación */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px] font-black uppercase text-slate-400">Segmentación</Label>
              <Tag size={12} className="text-slate-300" />
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {categories.map(cat => (
                <div key={cat.id} className="space-y-2">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50/50 py-1 px-2 rounded-md w-fit">
                    {cat.nombre}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags.filter(t => t.categoriaId === cat.id).map(tag => {
                      const isSelected = newContact.etiquetas.includes(tag.id!);
                      return (
                        <Badge
                          key={tag.id}
                          onClick={() => toggleTag(tag.id!)}
                          className={cn(
                            "cursor-pointer px-3 py-1.5 rounded-xl border-2 transition-all gap-1.5",
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-500 border-slate-100 shadow-sm"
                          )}
                          variant="outline"
                        >
                          <div className="size-1.5 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                          {tag.nombre}
                          {isSelected && <Check size={12} className="ml-0.5" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl font-bold text-slate-400">
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={loading}
            className="flex-[2] h-14 rounded-2xl bg-[var(--accent)] text-[var(--accent-text)] font-black shadow-lg shadow-[var(--accent)]/20"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Guardar Registro"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

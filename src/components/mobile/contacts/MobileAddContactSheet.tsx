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
import { Loader2, User, Phone, Mail, Tag, X, Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";

interface MobileAddContactSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileAddContactSheet({ open, onClose }: MobileAddContactSheetProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<CategoriaCRM[]>([]);
  const [tags, setTags] = useState<EtiquetaCRM[]>([]);
  
  const [newContact, setNewContact] = useState({
    nombre: "",
    telefono: "",
    email: "",
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
      setNewContact({ nombre: "", telefono: "", email: "", etiquetas: [] });
      onClose();
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: EtiquetaCRM) => {
    const cat = categories.find(c => c.id === tag.categoriaId);
    let newTags = [...newContact.etiquetas];

    if (cat?.tipo === 'exclusiva') {
      const otherTagsInCat = tags.filter(t => t.categoriaId === cat.id && t.id !== tag.id).map(t => t.id);
      newTags = newTags.filter(tId => !otherTagsInCat.includes(tId));
    }

    if (newTags.includes(tag.id!)) {
      newTags = newTags.filter(id => id !== tag.id);
    } else {
      newTags.push(tag.id!);
    }

    setNewContact(prev => ({ ...prev, etiquetas: newTags }));
  };

  const removeTag = (tagId: string) => {
    setNewContact(prev => ({
      ...prev,
      etiquetas: prev.etiquetas.filter(id => id !== tagId)
    }));
  };



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



          {/* Etiquetas / Segmentación (Estilo Escritorio) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px] font-black uppercase text-slate-400">Segmentación</Label>
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger 
                  render={
                    <button 
                      type="button"
                      onClick={() => setIsMenuOpen(true)}
                      className="size-8 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-sm flex items-center justify-center active:scale-95 transition-all outline-none"
                    />
                  }
                >
                  <Plus className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[240px] bg-white border-slate-100 max-h-[400px] overflow-y-auto no-scrollbar z-[250]">
                   <DropdownMenuGroup>
                     <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-2 py-1">Opciones</DropdownMenuLabel>
                     <DropdownMenuItem className="text-[12px] font-bold py-2" onClick={() => toast.info("Menu abierto")}>
                       <Check className="size-3 mr-2 text-emerald-500" />
                       Probar Menú
                     </DropdownMenuItem>
                   </DropdownMenuGroup>
                   <DropdownMenuSeparator className="bg-slate-50" />
                   {categories.map(cat => (
                     <div key={cat.id}>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-tighter text-slate-400 bg-slate-50 py-1">{cat.nombre}</DropdownMenuLabel>
                          {tags.filter(t => t.categoriaId === cat.id).map(tag => (
                            <DropdownMenuItem key={tag.id} onClick={() => toggleTag(tag)} className="text-[12px] font-bold gap-2 py-2">
                              <div className="size-2 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                              {tag.nombre}
                              {newContact.etiquetas.includes(tag.id!) && <Check className="size-3 ml-auto text-emerald-500" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-slate-50" />
                     </div>
                   ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl min-h-[60px]">
              {newContact.etiquetas.length > 0 ? (
                newContact.etiquetas.map(tId => {
                  const tag = tags.find(t => t.id === tId);
                  if (!tag) return null;
                  return (
                    <Badge 
                      key={tId} 
                      className="bg-white border-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg gap-1.5 shadow-sm"
                    >
                      <div className="size-1.5 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                      {tag.nombre}
                      <X 
                        className="size-3 text-slate-300 hover:text-rose-500 cursor-pointer ml-1" 
                        onClick={() => removeTag(tId)} 
                      />
                    </Badge>
                  );
                })
              ) : (
                <p className="text-[11px] text-slate-400 italic w-full text-center py-2">Sin etiquetas seleccionadas</p>
              )}
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

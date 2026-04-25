"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ContactTable } from "@/components/crm/ContactTable";
import { CSVImporter } from "@/components/crm/CSVImporter";
import { useContactos } from "@/hooks/useContactos";
import { Plus, Search, Loader2, Filter, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, Timestamp, addDoc, query, orderBy, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { COLLECTIONS, Contacto, EtiquetaCRM, CategoriaCRM } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileContactsContainer } from "@/components/mobile/contacts/MobileContactsContainer";

export default function ContactosPage() {
  const isMobile = useMobileLayout();
  const { contactos, loading: loadingContacts } = useContactos();
  const { currentWorkspaceId } = useWorkspaceStore();
  
  const [categories, setCategories] = useState<CategoriaCRM[]>([]);
  const [tags, setTags] = useState<EtiquetaCRM[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado del formulario de nuevo contacto
  const [newContact, setNewContact] = useState({
    nombre: "",
    telefono: "",
    email: "",
    fechaNacimiento: "",
    etiquetas: [] as string[],
  });

  // Cargar Configuración de CRM (Categorías y Etiquetas)
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const qCats = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), orderBy("orden", "asc"));
    const qTags = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM));

    const unsubCats = onSnapshot(qCats, (snap) => {
      setCategories(snap.docs.map(d => ({ ...d.data(), id: d.id } as CategoriaCRM)));
    });

    const unsubTags = onSnapshot(qTags, (snap) => {
      setTags(snap.docs.map(d => ({ ...d.data(), id: d.id } as EtiquetaCRM)));
      setLoadingConfig(false);
    });

    return () => {
      unsubCats();
      unsubTags();
    };
  }, [currentWorkspaceId]);

  const handleBulkImport = async (data: Partial<Contacto>[]) => {
    if (!currentWorkspaceId) return;
    const batch = writeBatch(db);
    const contactsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS);

    data.forEach(contact => {
      const newDocRef = doc(contactsRef);
      batch.set(newDocRef, {
        ...contact,
        esContactoCRM: true,
        etiquetas: contact.etiquetas || [],
        ultimaInteraccion: Timestamp.now(),
        creadoEl: Timestamp.now()
      });
    });

    try {
      await batch.commit();
      toast.success(`${data.length} contactos importados correctamente`);
    } catch (e) {
      toast.error("Error al importar");
    }
  };

  const handleAddContact = async () => {
    if (!currentWorkspaceId || !newContact.nombre || !newContact.telefono) {
      toast.error("Nombre y teléfono son obligatorios");
      return;
    }
    setIsSaving(true);
    try {
      const contactsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS);
      await addDoc(contactsRef, {
        ...newContact,
        esContactoCRM: true,
        ultimaInteraccion: Timestamp.now(),
        creadoEl: Timestamp.now()
      });
      toast.success("Contacto registrado con éxito");
      setNewContact({ nombre: "", telefono: "", email: "", fechaNacimiento: "", etiquetas: [] });
      setIsDialogOpen(false);
      setIsSaving(false);
    } catch (error) {
      toast.error("Error al registrar contacto");
      setIsSaving(false);
    }
  };

  const filteredContactos = useMemo(() => {
    if (!contactos) return [];
    return contactos.filter(c => {
      const matchesSearch = (c.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (c.telefono || "").includes(searchTerm);
      const matchesTags = selectedTagIds.length === 0 || 
                          selectedTagIds.every(tId => (c.etiquetas || []).includes(tId));
      return matchesSearch && matchesTags;
    });
  }, [contactos, searchTerm, selectedTagIds]);

  if (isMobile) {
    return <MobileContactsContainer />;
  }

  if (loadingContacts || loadingConfig) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="size-10 text-[var(--accent)] animate-spin" />
        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Cargando CRM...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Contactos CRM</h1>
          <p className="text-[13px] text-[var(--text-secondary-light)] font-medium">Gestiona tu red de contactos y salud relacional.</p>
        </div>
        <div className="flex items-center gap-3">
          <CSVImporter onImport={handleBulkImport} />
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo Contacto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white rounded-3xl border-none shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                   <div className="size-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                      <Plus className="size-5" />
                   </div>
                   Nueva Ficha de Contacto
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Completo</Label>
                    <Input 
                      placeholder="Ej: Juan Pérez" 
                      className="h-11 rounded-2xl bg-slate-50 border-none px-4"
                      value={newContact.nombre}
                      onChange={e => setNewContact({...newContact, nombre: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp / Tel</Label>
                    <Input 
                      placeholder="+54 9..." 
                      className="h-11 rounded-2xl bg-slate-50 border-none px-4"
                      value={newContact.telefono}
                      onChange={e => setNewContact({...newContact, telefono: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email (Opcional)</Label>
                      <Input 
                        placeholder="email@ejemplo.com" 
                        type="email"
                        className="h-11 rounded-2xl bg-slate-50 border-none px-4"
                        value={newContact.email}
                        onChange={e => setNewContact({...newContact, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cumpleaños</Label>
                      <Input 
                        type="date"
                        className="h-11 rounded-2xl bg-slate-50 border-none px-4"
                        value={newContact.fechaNacimiento}
                        onChange={e => setNewContact({...newContact, fechaNacimiento: e.target.value})}
                      />
                    </div>
                </div>


                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Segmentación (Etiquetas)</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-11 rounded-2xl border-dashed border-2 bg-slate-50/50 hover:bg-slate-50">
                        <span className="text-xs font-bold text-slate-400">Seleccionar etiquetas...</span>
                        <Plus className="size-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[300px] bg-white max-h-[300px] overflow-y-auto no-scrollbar border-slate-100 shadow-xl p-2 rounded-2xl">
                      {categories.map(cat => (
                        <DropdownMenuGroup key={cat.id} className="mb-2">
                          <div className="px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg">{cat.nombre}</div>
                          {tags.filter(t => t.categoriaId === cat.id).map(tag => (
                            <DropdownMenuCheckboxItem
                              key={tag.id}
                              checked={newContact.etiquetas.includes(tag.id!)}
                              onCheckedChange={() => {
                                setNewContact(prev => ({
                                  ...prev,
                                  etiquetas: prev.etiquetas.includes(tag.id!)
                                    ? prev.etiquetas.filter(id => id !== tag.id)
                                    : [...prev.etiquetas, tag.id!]
                                }));
                              }}
                              className="text-[12px] font-bold py-2.5 rounded-xl transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="size-2 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                                {tag.nombre}
                              </div>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuGroup>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl min-h-[60px]">
                    {newContact.etiquetas.length > 0 ? (
                      newContact.etiquetas.map(tId => {
                        const tag = tags.find(t => t.id === tId);
                        if (!tag) return null;
                        return (
                          <Badge key={tId} className="bg-white border-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full gap-2 shadow-sm">
                            <div className="size-1.5 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                            {tag.nombre}
                            <X className="size-3 text-slate-300 hover:text-rose-500 cursor-pointer" onClick={() => setNewContact(p => ({...p, etiquetas: p.etiquetas.filter(id => id !== tId)}))} />
                          </Badge>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-400 italic w-full text-center py-2">Sin etiquetas seleccionadas</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-12 font-bold text-slate-500">Cancelar</Button>
                <Button onClick={handleAddContact} disabled={isSaving} className="bg-[var(--accent)] text-[var(--accent-text)] rounded-2xl px-8 h-12 font-black shadow-xl shadow-[var(--accent)]/30">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Guardar Registro"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all focus-within:shadow-md">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
          <Input 
            placeholder="Buscar por nombre o teléfono..." 
            className="pl-11 h-12 border-none bg-slate-50/50 rounded-xl text-[13px] font-semibold text-[var(--text-primary-light)] focus:bg-white transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {selectedTagIds.length > 0 && (
            <Badge variant="secondary" className="bg-rose-50 text-rose-500 rounded-lg px-3 py-1.5 flex items-center gap-2 font-black text-[10px]">
              {selectedTagIds.length} FILTROS ACTIVOS
              <X className="size-3 cursor-pointer" onClick={() => setSelectedTagIds([])} />
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 rounded-xl border-slate-100 px-5 gap-2 font-semibold text-[var(--text-secondary-light)] text-[11px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all">
                <Filter className="size-3.5" /> Filtrar Segmentos
                <ChevronDown className="size-3.5 opacity-40 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px] p-2 bg-white rounded-2xl shadow-2xl border-slate-100 max-h-[400px] overflow-y-auto no-scrollbar">
              {categories.map(cat => (
                <DropdownMenuGroup key={cat.id} className="mb-2">
                  <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1.5 rounded-lg mb-1">{cat.nombre}</DropdownMenuLabel>
                  {tags.filter(t => t.categoriaId === cat.id).map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag.id}
                      checked={selectedTagIds.includes(tag.id!)}
                      onCheckedChange={() => {
                        if (selectedTagIds.includes(tag.id!)) {
                          setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                        } else {
                          setSelectedTagIds([...selectedTagIds, tag.id!]);
                        }
                      }}
                      className="rounded-xl py-2.5 font-bold text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                        {tag.nombre}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator className="bg-slate-50 mx-2" />
                </DropdownMenuGroup>
              ))}
              {selectedTagIds.length > 0 && (
                <div className="pt-2">
                  <Button variant="ghost" className="w-full text-rose-500 font-black uppercase text-[10px] h-10 rounded-xl" onClick={() => setSelectedTagIds([])}>
                    Limpiar Filtros
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ContactTable contactos={filteredContactos} tags={tags} categories={categories} />
    </div>
  );
}

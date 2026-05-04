"use client";

import React, { useState, useMemo } from "react";
import { useContactos } from "@/hooks/useContactos";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Search, Filter, Plus, Loader2, Users, X, ChevronDown, Check, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MobileContactsGrid } from "./MobileContactsGrid";
import { MobileContactSheet } from "../inbox/MobileContactSheet";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, CategoriaCRM, EtiquetaCRM, Contacto } from "@/lib/types/firestore";
import { differenceInDays } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { MobileAddContactSheet } from "./MobileAddContactSheet";

export function MobileContactsContainer() {
  const { contactos, loading } = useContactos();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedHealth, setSelectedHealth] = useState<string>("all");

  const [categories, setCategories] = useState<CategoriaCRM[]>([]);
  const [tags, setTags] = useState<EtiquetaCRM[]>([]);

  // Cargar Configuración de CRM (Categorías y Etiquetas) para los badges
  React.useEffect(() => {
    if (!currentWorkspaceId) return;

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
  }, [currentWorkspaceId]);

  function getHealthStatus(contacto: Contacto, allTags: EtiquetaCRM[], allCats: CategoriaCRM[]) {
    if (!contacto.ultimaInteraccion) return 'none';
    const lastDate = contacto.ultimaInteraccion.toDate();
    const daysSince = differenceInDays(new Date(), lastDate);
    
    let minThreshold = 30;
    (contacto.etiquetas || []).forEach(tId => {
      const tag = allTags.find(t => t.id === tId);
      if (tag) {
        if (tag.alertaDias) minThreshold = Math.min(minThreshold, tag.alertaDias);
        else {
          const cat = allCats.find(c => c.id === tag.categoriaId);
          if (cat?.alertaDiasDefault) minThreshold = Math.min(minThreshold, cat.alertaDiasDefault);
        }
      }
    });

    if (daysSince >= minThreshold) return 'rojo';
    if (daysSince >= (minThreshold - 3)) return 'amarillo';
    return 'verde';
  }

  const filteredContactos = useMemo(() => {
    return contactos
      .filter(c => {
        // Filtro de búsqueda
        const matchesSearch = (c.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (c.telefono || "").includes(searchTerm);
        
        // Filtro de etiquetas
        const matchesTags = selectedTagIds.length === 0 || 
                           selectedTagIds.every(tId => (c.etiquetas || []).includes(tId));
        
        // Filtro de salud
        let matchesHealth = true;
        if (selectedHealth !== "all") {
          const health = getHealthStatus(c, tags, categories);
          matchesHealth = health === selectedHealth;
        }

        return matchesSearch && matchesTags && matchesHealth;
      })
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [contactos, searchTerm, selectedTagIds, selectedHealth, tags, categories]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 bg-[var(--bg-main)]">
        <Loader2 className="size-8 text-[var(--accent)] animate-spin" />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargando contactos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header Fijo */}
      <div className="px-5 pt-6 pb-4 space-y-4 bg-white border-b border-[var(--border-light)] shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contactos</h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tu red de CRM</p>
          </div>
          <Button 
            onClick={() => setIsAddSheetOpen(true)}
            size="icon" 
            className="size-11 rounded-2xl bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/20"
          >
            <Plus size={20} />
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input 
              placeholder="Buscar..." 
              className="pl-11 h-12 bg-slate-50 border-none rounded-2xl text-sm font-medium shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="size-12 rounded-2xl border border-slate-100 bg-white flex items-center justify-center text-slate-500 shadow-sm active:scale-95 transition-all">
                <Filter className={cn("size-5", (selectedTagIds.length > 0 || selectedHealth !== 'all') && "text-[var(--accent)]")} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px] p-2 bg-white rounded-2xl shadow-2xl border-slate-100 max-h-[450px] overflow-y-auto no-scrollbar z-[200]">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-2 py-2">Salud Relacional</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={selectedHealth} onValueChange={setSelectedHealth}>
                  <DropdownMenuRadioItem value="all" className="rounded-xl py-2 font-bold text-xs">Todos los estados</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="rojo" className="rounded-xl py-2 font-bold text-xs text-rose-500">Atrasados (Rojo)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="amarillo" className="rounded-xl py-2 font-bold text-xs text-amber-500">Por vencer (Amarillo)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="verde" className="rounded-xl py-2 font-bold text-xs text-emerald-500">Al día (Verde)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator className="bg-slate-50 mx-2 my-2" />
              
              {categories.map(cat => (
                <DropdownMenuGroup key={cat.id}>
                  <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 bg-slate-50/50 px-2 py-1.5 rounded-lg mb-1">{cat.nombre}</DropdownMenuLabel>
                  <DropdownMenuGroup>
                  {tags.filter(t => t.categoriaId === cat.id).map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag.id}
                      checked={selectedTagIds.includes(tag.id!)}
                      onCheckedChange={() => {
                        setSelectedTagIds(prev => 
                          prev.includes(tag.id!) ? prev.filter(id => id !== tag.id) : [...prev, tag.id!]
                        );
                      }}
                      className="rounded-xl py-2.5 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                        {tag.nombre}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                  </DropdownMenuGroup>
                </DropdownMenuGroup>
              ))}

              {(selectedTagIds.length > 0 || selectedHealth !== 'all') && (
                <>
                  <DropdownMenuSeparator className="bg-slate-50 mx-2 my-2" />
                  <Button 
                    variant="ghost" 
                    className="w-full text-rose-500 font-black uppercase text-[10px] h-10 rounded-xl"
                    onClick={() => { setSelectedTagIds([]); setSelectedHealth('all'); }}
                  >
                    Limpiar Filtros
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges de Filtros Activos */}
        {(selectedTagIds.length > 0 || selectedHealth !== 'all') && (
          <div className="flex flex-wrap gap-2 pt-1">
             {selectedHealth !== 'all' && (
               <Badge variant="secondary" className="bg-slate-900 text-white rounded-lg px-2 py-1 text-[9px] font-black uppercase gap-1.5">
                 {selectedHealth === 'rojo' ? 'Atrasados' : selectedHealth === 'amarillo' ? 'Por vencer' : 'Al día'}
                 <X className="size-3" onClick={() => setSelectedHealth('all')} />
               </Badge>
             )}
             {selectedTagIds.map(tId => {
               const tag = tags.find(t => t.id === tId);
               if (!tag) return null;
               return (
                <Badge key={tId} variant="secondary" className="bg-[var(--accent)] text-[var(--accent-text)] rounded-lg px-2 py-1 text-[9px] font-black uppercase gap-1.5">
                  {tag.nombre}
                  <X className="size-3" onClick={() => setSelectedTagIds(prev => prev.filter(id => id !== tId))} />
                </Badge>
               );
             })}
          </div>
        )}
      </div>

      {/* Grid de Contactos */}
      <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar">
        {filteredContactos.length > 0 ? (
          <MobileContactsGrid 
            contactos={filteredContactos} 
            tags={tags}
            categories={categories}
            onSelect={(id) => {
              setSelectedContactId(id);
              setIsSheetOpen(true);
            }} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <div className="size-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300">
              <Users size={32} />
            </div>
            <p className="text-sm font-bold text-slate-400">No se encontraron contactos</p>
          </div>
        )}
      </div>

      {/* Agregar Contacto */}
      <MobileAddContactSheet 
        open={isAddSheetOpen} 
        onClose={() => setIsAddSheetOpen(false)} 
      />

      {/* Detalle del Contacto */}
      {selectedContactId && (
        <MobileContactSheet 
          open={isSheetOpen} 
          onClose={() => setIsSheetOpen(false)} 
          contactoId={selectedContactId} 
        />
      )}
    </div>
  );
}

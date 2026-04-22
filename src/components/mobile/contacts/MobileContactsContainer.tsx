"use client";

import React, { useState, useMemo } from "react";
import { useContactos } from "@/hooks/useContactos";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Search, Filter, Plus, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MobileContactsGrid } from "./MobileContactsGrid";
import { MobileContactSheet } from "../inbox/MobileContactSheet";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, CategoriaCRM, EtiquetaCRM } from "@/lib/types/firestore";

import { MobileAddContactSheet } from "./MobileAddContactSheet";

export function MobileContactsContainer() {
  const { contactos, loading } = useContactos();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

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

  const filteredContactos = useMemo(() => {
    return contactos
      .filter(c => 
        (c.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.telefono || "").includes(searchTerm)
      )
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [contactos, searchTerm]);

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

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nombre o teléfono..." 
            className="pl-11 h-12 bg-slate-50 border-none rounded-2xl text-sm font-medium shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
